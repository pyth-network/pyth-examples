package pythacoin

import org.scalatest.funsuite.AnyFunSuite
import scalus.cardano.address.Network
import scalus.cardano.ledger.*
import scalus.cardano.node.BlockfrostProvider
import scalus.cardano.txbuilder.TransactionSigner
import scalus.cardano.wallet.hd.HdAccount
import scalus.crypto.ed25519.{Ed25519Signer, JvmEd25519Signer}
import scalus.utils.Hex.{hexToBytes, toHex}
import scalus.utils.await
import sttp.client4.*

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.*
import scala.io.Source

class PreprodCdpTest extends AnyFunSuite {

    given Ed25519Signer = JvmEd25519Signer

    private val apiBase = "http://localhost:8088"

    private def loadEnv(): Map[String, String] = {
        val envFile = Source.fromFile(".env")
        try
            envFile
                .getLines()
                .filter(_.contains("="))
                .map { line =>
                    val idx = line.indexOf('=')
                    line.substring(0, idx).trim -> line.substring(idx + 1).trim
                }
                .toMap
        finally envFile.close()
    }

    private val backend = DefaultSyncBackend()

    private def httpGet(path: String): String = {
        val url = java.net.URI.create(s"$apiBase$path")
        val response = basicRequest
            .get(uri"$url")
            .send(backend)
        response.body match
            case Right(body) => body
            case Left(error) => throw RuntimeException(s"GET $path failed: $error")
    }

    private def httpPost(path: String, json: String): String = {
        val url = java.net.URI.create(s"$apiBase$path")
        val response = basicRequest
            .post(uri"$url")
            .header("Content-Type", "application/json")
            .body(json)
            .send(backend)
        response.body match
            case Right(body) => body
            case Left(error) => throw RuntimeException(s"POST $path failed: $error")
    }

    private def extractField(json: String, field: String): String = {
        val key = s""""$field":""""
        val idx = json.indexOf(key)
        if idx < 0 then throw RuntimeException(s"Field '$field' not found in: $json")
        val start = idx + key.length
        val end = json.indexOf('"', start)
        json.substring(start, end)
    }

    test("Alice opens CDP 100 ADA / 10 PUSD, then closes it") {
        val env = loadEnv()
        val mnemonic = env("MNEMONIC")
        val blockfrostApiKey = env("BLOCKFROST_API_KEY")

        // Derive Alice's keys from mnemonic (account 0)
        val alice = HdAccount.fromMnemonic(mnemonic, "", 0)
        val aliceAddr = alice.baseAddress(Network.Testnet)
        val aliceAddrHex = aliceAddr.toBytes.toHex
        val signer = new TransactionSigner(Set(alice.paymentKeyPair))

        println(s"Alice address: ${aliceAddr.toBech32}")

        // Connect to Blockfrost for submission
        val provider = BlockfrostProvider.preprod(blockfrostApiKey).await(30.seconds)

        // --- Step 1: Open CDP ---
        println("=== Opening CDP: 100 ADA collateral, 10 PUSD borrow ===")
        val openJson =
            s"""{"collateralAda":100,"borrowPusd":10,"ownerAddress":"$aliceAddrHex"}"""
        val openResp = httpPost("/cdp/open", openJson)
        println(s"Open response: ${openResp.take(120)}...")

        val openTxHex = extractField(openResp, "txCborHex")
        val openTx = Transaction.fromCbor(openTxHex.hexToBytes)
        println(s"Open tx id: ${openTx.id.toHex}")

        val signedOpenTx = signer.sign(openTx)
        println("Signed open tx, submitting...")

        val openResult = provider.submitAndPoll(signedOpenTx).await(120.seconds)
        openResult match
            case Right(txHash) => println(s"Open CDP submitted: ${txHash.toHex}")
            case Left(error)   => fail(s"Open CDP submission failed: $error")

        // Extract NFT name from the CDP output in the open tx
        val cdpOutput = openTx.body.value.outputs.head.value
        val cdpValue: Value = cdpOutput.value
        val pusdHex = scalus.uplc.builtin.ByteString.fromString("PUSD").toHex
        val nftName = cdpValue.assets.assets.values.flatMap(_.keys)
            .map(_.bytes.toHex)
            .find(_ != pusdHex)
            .getOrElse(fail("No CDP NFT found in open tx outputs"))
        println(s"CDP NFT name (from open tx): $nftName")

        // Wait for Blockfrost UTxO index to catch up
        println("Waiting for Blockfrost to index the new UTxOs...")
        Thread.sleep(10_000)

        // --- Step 2: Verify CDP exists ---
        println("=== Querying CDPs ===")
        val cdpsJson = httpGet("/cdps")
        println(s"CDPs: $cdpsJson")
        assert(cdpsJson.contains(nftName), s"Expected CDP with NFT $nftName: $cdpsJson")

        // --- Step 3: Close CDP ---
        println("=== Closing CDP ===")
        val closeJson =
            s"""{"nftName":"$nftName","ownerAddress":"$aliceAddrHex"}"""
        val closeResp = httpPost("/cdp/close", closeJson)
        println(s"Close response: ${closeResp.take(120)}...")

        val closeTxHex = extractField(closeResp, "txCborHex")
        val closeTx = Transaction.fromCbor(closeTxHex.hexToBytes)
        println(s"Close tx id: ${closeTx.id.toHex}")

        val signedCloseTx = signer.sign(closeTx)
        println("Signed close tx, submitting...")

        val closeResult = provider.submitAndPoll(signedCloseTx).await(120.seconds)
        closeResult match
            case Right(txHash) => println(s"Close CDP submitted: ${txHash.toHex}")
            case Left(error)   => fail(s"Close CDP submission failed: $error")

        // --- Step 4: Verify CDP is gone ---
        println("=== Verifying CDP removed ===")
        val cdpsAfter = httpGet("/cdps")
        println(s"CDPs after close: $cdpsAfter")
        assert(!cdpsAfter.contains(nftName), s"CDP should be removed after close: $cdpsAfter")

        println("=== Test passed! ===")
    }
}
