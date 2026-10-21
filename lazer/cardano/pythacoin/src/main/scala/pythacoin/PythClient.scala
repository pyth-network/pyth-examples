package pythacoin

import scalus.cardano.address.{Address, Network, StakeAddress, StakePayload}
import scalus.cardano.ledger.*
import scalus.cardano.node.BlockchainProvider
import scalus.uplc.builtin.ByteString
import scalus.utils.Hex.toHex
import scalus.utils.await
import sttp.client4.*

import java.util.Base64
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.concurrent.duration.*

/** Client for interacting with the Pyth oracle on Cardano.
  *
  * Handles two concerns:
  * 1. Fetching signed price updates from the Pyth Lazer REST API (off-chain data source)
  * 2. Looking up the Pyth State UTxO and withdraw script on-chain via Blockfrost
  *
  * The Pyth integration pattern on Cardano uses a "withdrawal trick":
  * - A Pyth State UTxO holds the withdraw script hash in its datum
  * - Transactions include the price update as a withdrawal redeemer
  * - The Pyth withdraw script validates the signature on the price data
  * - Our CDP validator reads the price from the withdrawal redeemer (no sig verification needed)
  */
class PythClient(
    pythPolicyId: ScriptHash,
    pythKey: String,
    blockfrostApiKey: String,
    blockfrostBaseUrl: String,
    provider: BlockchainProvider
)(using backend: Backend[Future]) {

    private val lazerUrl = "https://pyth-lazer.dourolabs.app/v1/latest_price"

    /** Fetch signed price update bytes from Pyth Lazer REST API. */
    def fetchPriceUpdate(): ByteString = {
//        Log.info("Fetching price update from Pyth Lazer...")
        val requestBody =
            s"""{"priceFeedIds":[16],"properties":["price"],"formats":["solana"],"channel":"fixed_rate@200ms"}"""
        val response = basicRequest
            .post(uri"$lazerUrl")
            .header("Authorization", s"Bearer $pythKey")
            .header("Content-Type", "application/json")
            .body(requestBody)
            .send(backend)
            .await(30.seconds)

        response.body match
            case Right(body) =>
                val encoding = extractSolanaEncoding(body)
                val data = extractSolanaData(body)
//                Log.info(s"Pyth Lazer response encoding=$encoding, data length=${data.length}")
                encoding match
                    case "base64" => ByteString.fromArray(Base64.getDecoder.decode(data))
                    case _        => ByteString.fromHex(data)
            case Left(error) =>
                Log.error(s"Pyth Lazer API error: $error")
                throw RuntimeException(s"Pyth Lazer API error: $error")
    }

    /** Find Pyth State UTxO by looking for the NFT with "Pyth State" token name. */
    def fetchPythState(): Utxo = {
        val pythStateName = AssetName(ByteString.fromString("Pyth State"))
        val asset = pythPolicyId.toHex + pythStateName.bytes.toHex
        Log.info(s"Fetching Pyth State UTxO, asset=$asset")

        // Step 1: find addresses holding this asset via Blockfrost
        val addrResponse = basicRequest
            .get(uri"$blockfrostBaseUrl/assets/$asset/addresses")
            .header("project_id", blockfrostApiKey)
            .send(backend)
            .await(30.seconds)

        val addrJson = addrResponse.body match
            case Right(body) => body
            case Left(error) =>
                Log.error(s"Failed to find Pyth State asset: $error")
                throw RuntimeException(s"Failed to find Pyth State asset: $error")

        // Extract first address from [{"address":"addr...","quantity":"1"}]
        val addrKey = "\"address\":\""
        val idx = addrJson.indexOf(addrKey)
        if idx < 0 then throw RuntimeException(s"No address found for Pyth State asset: $addrJson")
        val start = idx + addrKey.length
        val end = addrJson.indexOf('"', start)
        val addrBech32 = addrJson.substring(start, end)
        Log.info(s"Pyth State address: $addrBech32")
        val addr = Address.fromBech32(addrBech32)

        // Step 2: query UTxOs at that address filtered by asset
        val utxos = provider.findUtxos(addr).await(30.seconds) match
            case Right(found) =>
                Log.info(s"Found ${found.size} UTxOs at Pyth State address")
                found
            case Left(error) =>
                Log.error(s"Failed to query Pyth State UTxOs: $error")
                throw RuntimeException(s"Failed to query Pyth State UTxOs: $error")

        utxos.collectFirst {
            case (input, output) if output.value.hasAsset(pythPolicyId, pythStateName) =>
                Log.info(s"Found Pyth State UTxO: ${input.transactionId.toHex}#${input.index}")
                Utxo(input, output)
        }.getOrElse(throw RuntimeException("Pyth State UTxO not found"))
    }

    /** Extract withdraw script hash from Pyth State inline datum (field 4). */
    def extractWithdrawScript(pythState: Utxo): ScriptHash = {
        import scalus.uplc.builtin.Data
        val datum: Data = pythState.output.requireInlineDatum
        val fields = datum.toConstr.snd
        // fields: governance, trusted_signers, deprecated_withdraw_scripts, withdraw_script
        val withdrawScriptBs = fields.tail.tail.tail.head.toByteString
        val hash = ScriptHash.fromHex(withdrawScriptBs.toHex)
        Log.info(s"Pyth withdraw script hash: ${hash.toHex}")
        hash
    }

    /** Fetch the Pyth withdraw PlutusScript from Blockfrost by script hash.
      *
      * Blockfrost returns CBOR-wrapped script bytes. Sometimes the hash of the raw bytes
      * doesn't match because Blockfrost double-wraps the CBOR. We try raw first, then
      * unwrap one CBOR layer if the hash doesn't match.
      */
    def fetchScript(scriptHash: ScriptHash): PlutusScript = {
        val hashHex = scriptHash.toHex
        Log.info(s"Fetching script CBOR from Blockfrost: $hashHex")
        val response = basicRequest
            .get(uri"$blockfrostBaseUrl/scripts/$hashHex/cbor")
            .header("project_id", blockfrostApiKey)
            .send(backend)
            .await(30.seconds)

        val json = response.body match
            case Right(body) => body
            case Left(error) =>
                Log.error(s"Failed to fetch script $hashHex: $error")
                throw RuntimeException(s"Failed to fetch script $hashHex: $error")

        val cborKey = "\"cbor\":\""
        val idx = json.indexOf(cborKey)
        if idx < 0 then throw RuntimeException(s"No cbor field in response: $json")
        val start = idx + cborKey.length
        val end = json.indexOf('"', start)
        val cborHex = json.substring(start, end)
        val rawBytes = ByteString.fromHex(cborHex)
        Log.info(s"Script CBOR: hexLen=${cborHex.length}, bytes=${rawBytes.size}, expected serialised_size=2745")
        Log.info(s"Script CBOR first 10 hex: ${cborHex.take(20)}, last 10 hex: ${cborHex.takeRight(20)}")

        val script = Script.PlutusV3(rawBytes)
        if script.scriptHash.toHex == hashHex then
            Log.info(s"Script hash matches: $hashHex (${rawBytes.size} bytes)")
            script
        else
            // Blockfrost sometimes double-CBOR-wraps the script — unwrap one layer
            Log.info(s"Raw hash ${script.scriptHash.toHex} != $hashHex, trying CBOR unwrap...")
            val inner = scalus.serialization.cbor.Cbor.decode[Array[Byte]](rawBytes.bytes)
            val script2 = Script.PlutusV3(ByteString.unsafeFromArray(inner))
            Log.info(s"After unwrap: hash=${script2.scriptHash.toHex}, expected=$hashHex, size=${inner.length} bytes")
            script2
    }

    /** Build the StakeAddress for the Pyth withdraw script. */
    def pythWithdrawAddress(network: Network): StakeAddress = {
        val pythState = fetchPythState()
        val withdrawHash = extractWithdrawScript(pythState)
        StakeAddress(network, StakePayload.Script(withdrawHash))
    }

    /** Parse ADA/USD price from Pyth update bytes for display (off-chain).
      * Mirrors the on-chain parsePythPrice logic but uses JVM ByteBuffer for convenience.
      * Returns price as a BigDecimal (e.g. 0.7523 for $0.7523/ADA).
      */
    def parsePrice(updateBytes: ByteString): BigDecimal = {
        import java.nio.{ByteBuffer, ByteOrder}
        val buf = ByteBuffer.wrap(updateBytes.bytes).order(ByteOrder.LITTLE_ENDIAN)
        // Solana envelope: [4 magic][64 sig][32 key][2 payload_size] = 102 bytes
        // Payload header:  [4 magic][8 timestamp][1 channel][1 feeds_len] = 14 bytes
        // Feed starts at 102 + 14 = 116
        val feedOffset = 116
        // Feed: [4 feed_id][1 props_len][1 prop_id][8 price I64 LE]
        val priceOffset = feedOffset + 6
        buf.position(priceOffset)
        val priceRaw = buf.getLong()
        BigDecimal(priceRaw) / BigDecimal(100_000_000L) // exponent = -8
    }

    /** Extract the solana.encoding field from JSON response. */
    private def extractSolanaEncoding(json: String): String = {
        val key = "\"encoding\":\""
        val idx = json.lastIndexOf(key)
        if idx < 0 then return "hex" // default
        val start = idx + key.length
        val end = json.indexOf('"', start)
        if end < 0 then "hex" else json.substring(start, end)
    }

    /** Extract the solana.data field from JSON response. */
    private def extractSolanaData(json: String): String = {
        val dataKey = "\"data\":\""
        val idx = json.lastIndexOf(dataKey)
        if idx < 0 then throw RuntimeException(s"Cannot find solana.data in response: $json")
        val start = idx + dataKey.length
        val end = json.indexOf('"', start)
        if end < 0 then throw RuntimeException(s"Malformed solana.data in response: $json")
        json.substring(start, end)
    }
}
