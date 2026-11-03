package pythacoin

import scalus.cardano.address.{Address, Network as ScalusNetwork}
import scalus.cardano.ledger.*
import scalus.cardano.node.{BlockchainProvider, BlockfrostProvider}
import scalus.uplc.PlutusV3
import scalus.uplc.builtin.{ByteString, Data}
import scalus.serialization.cbor.Cbor
import scalus.utils.Hex.{hexToBytes, toHex}
import scalus.utils.{await, showDetailedHighlighted}
import sttp.client4.DefaultFutureBackend
import scalus.cardano.address.{ShelleyAddress, ShelleyPaymentPart}
import scalus.cardano.onchain.plutus.v1.PubKeyHash
import sttp.shared.Identity
import sttp.tapir.*
import sttp.tapir.generic.auto.*
import sttp.tapir.json.upickle.*
import sttp.tapir.server.ServerEndpoint
import sttp.tapir.server.netty.sync.NettySyncServer
import sttp.tapir.swagger.bundle.SwaggerInterpreter

import java.time.Instant
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.concurrent.duration.*

/** Global sttp HTTP backend used by PythClient and BlockfrostProvider. */
given sttp.client4.Backend[Future] = DefaultFutureBackend()

/** Application context holding all shared state and services.
  * Lazily initializes derived objects (policy ID, script address, clients)
  * so that construction is fast and initialization errors surface at first use.
  */
case class AppCtx(
    cardanoInfo: CardanoInfo,
    provider: BlockchainProvider,
    blockfrostApiKey: String,
    blockfrostBaseUrl: String,
    pythPolicyId: ScriptHash,
    pythKey: String,
    cdpScript: PlutusV3[Data => Unit]
) {
    /** The script hash doubles as the minting policy ID for PUSD and CDP NFTs. */
    lazy val policyId: ScriptHash = cdpScript.script.scriptHash
    /** The script address where all CDP UTxOs live. */
    lazy val scriptAddr: Address = cdpScript.address(cardanoInfo.network)
    lazy val pythClient: PythClient = PythClient(pythPolicyId, pythKey, blockfrostApiKey, blockfrostBaseUrl, provider)
    lazy val cdpQueries: CdpQueries = CdpQueries(this)
    lazy val cdpTransactions: CdpTransactions = {
        given CardanoInfo = cardanoInfo
        CdpTransactions(this, pythClient)
    }
}

object AppCtx {

    /** Create AppCtx for mainnet or preprod using Blockfrost as the chain provider. */
    def apply(
        network: ScalusNetwork,
        blockfrostApiKey: String,
        pythPolicyIdHex: String,
        pythKey: String
    ): AppCtx = {
        val (provider, baseUrl) =
            if network == ScalusNetwork.Mainnet then
                (BlockfrostProvider.mainnet(blockfrostApiKey).await(30.seconds), "https://cardano-mainnet.blockfrost.io/api/v0")
            else if network == ScalusNetwork.Testnet then
                (BlockfrostProvider.preprod(blockfrostApiKey).await(30.seconds), "https://cardano-preprod.blockfrost.io/api/v0")
            else sys.error(s"Unsupported network: $network")

        val pythPolicy = ScriptHash.fromHex(pythPolicyIdHex)
        val cdpScript = CdpContract(pythPolicy)

        new AppCtx(provider.cardanoInfo, provider, blockfrostApiKey, baseUrl, pythPolicy, pythKey, cdpScript)
    }

    /** Create AppCtx for local development using Yaci DevKit (no real Pyth oracle). */
    def yaciDevKit(pythPolicyIdHex: String): AppCtx = {
        val provider = BlockfrostProvider.localYaci().await(30.seconds)
        val pythPolicy = ScriptHash.fromHex(pythPolicyIdHex)
        val cdpScript = CdpContract(pythPolicy)

        new AppCtx(provider.cardanoInfo, provider, "", "http://localhost:8080/api/v1", pythPolicy, "", cdpScript)
    }
}

// --- Request/Response types ---
// All amounts in the API use human-readable units (ADA, PUSD) as doubles.
// The server converts to lovelace (1 ADA = 1_000_000 lovelace) internally.
// Addresses can be CIP-30 hex (from wallet) or bech32 (addr1...).

case class OpenCdpRequest(
    collateralAda: Double,
    borrowPusd: Double,
    ownerAddress: String
) derives upickle.default.ReadWriter

case class BorrowRequest(
    nftName: String,   // hex-encoded NFT asset name
    amount: Double,    // additional PUSD to borrow
    ownerAddress: String
) derives upickle.default.ReadWriter

case class RepayRequest(
    nftName: String,
    amount: Double,    // PUSD to repay
    ownerAddress: String
) derives upickle.default.ReadWriter

case class CloseRequest(
    nftName: String,
    ownerAddress: String
) derives upickle.default.ReadWriter

case class LiquidateRequest(
    nftName: String,
    liquidatorAddress: String
) derives upickle.default.ReadWriter

/** Response containing an unsigned transaction CBOR for the frontend to sign. */
case class TxResponse(
    txCborHex: String
) derives upickle.default.ReadWriter

/** Request to merge wallet witness with unsigned tx and submit to the chain. */
case class SubmitTxRequest(
    txCborHex: String,      // unsigned tx CBOR from the build step
    witnessCborHex: String   // CIP-30 signTx result (TransactionWitnessSet CBOR)
) derives upickle.default.ReadWriter

case class SubmitTxResponse(
    txHash: String
) derives upickle.default.ReadWriter

/** HTTP API server built with Tapir (served by Netty).
  *
  * Endpoints follow a build-then-sign pattern:
  * 1. Frontend calls POST /cdp/open (or borrow/repay/close/liquidate) with parameters
  * 2. Server builds an unsigned transaction and returns CBOR hex
  * 3. Frontend signs via CIP-30 wallet (signTx with partial=true)
  * 4. Frontend calls POST /tx/submit with unsigned tx + wallet witness
  * 5. Server merges witnesses and submits to Blockfrost
  *
  * Auto-generated Swagger UI is available at /docs.
  */
class Server(ctx: AppCtx):
    private given CardanoInfo = ctx.cardanoInfo

    /** Parse address from hex (CIP-30 getUsedAddresses returns hex) or bech32 string. */
    private def parseAddress(addr: String): Address =
        val parsed = if addr.startsWith("addr") then Address.fromBech32(addr)
        else Address.fromBytes(addr.hexToBytes)
        Log.info(s"Parsed address: ${addr.take(20)}... -> $parsed")
        parsed

    // --- GET /price ---
    private val getPrice = endpoint.get
        .in("price")
        .out(jsonBody[PriceInfo])
        .errorOut(stringBody)
        .handle { _ =>
            try
                val updateBytes = ctx.pythClient.fetchPriceUpdate()
                val price = ctx.pythClient.parsePrice(updateBytes)
                Log.info(s"Fetched price from Pyth Lazer: $price USD/ADA")
                Right(PriceInfo(
                  adaUsd = price.toDouble,
                  timestamp = Instant.now().toString,
                  policyId = ctx.policyId.toHex
                ))
            catch case e: Exception => Left(e.getMessage)
        }

    // --- GET /cdps ---
    private val listCdpsEndpoint = endpoint.get
        .in("cdps")
        .out(jsonBody[Seq[CdpInfo]])
        .errorOut(stringBody)
        .handle { _ =>
            try Right(ctx.cdpQueries.listCdps())
            catch case e: Exception => Left(e.getMessage)
        }

    // --- POST /cdp/open ---
    private val openCdpEndpoint = endpoint.post
        .in("cdp" / "open")
        .in(jsonBody[OpenCdpRequest])
        .out(jsonBody[TxResponse])
        .errorOut(stringBody)
        .handle { req =>
            try
                Log.info(s"POST /cdp/open: collateral=${req.collateralAda} ADA, borrow=${req.borrowPusd} PUSD")
                val ownerAddr = parseAddress(req.ownerAddress)
                val collateralLovelace = (req.collateralAda * 1_000_000).toLong
                val debtPusd = (req.borrowPusd * 1_000_000).toLong
                val ownerPkh = ownerAddr match
                    case s: ShelleyAddress => s.payment match
                        case ShelleyPaymentPart.Key(hash) => PubKeyHash(hash: ByteString)
                        case _ => throw RuntimeException("Owner address must have a key credential")
                    case _ => throw RuntimeException("Owner address must be a Shelley address")
                Log.info(s"Owner PKH: ${ownerPkh.hash.toHex}")
                val nftName = AssetName(ByteString.fromString("CDP-" + System.currentTimeMillis()))
                Log.info(s"NFT name: ${nftName.bytes.toHex}")
                val now = Instant.now()
                Log.info("Building openCdp transaction...")
                val builder = ctx.cdpTransactions.openCdp(
                  collateralLovelace, debtPusd, nftName, ownerPkh, ownerAddr, now
                )
                Log.info("Completing transaction...")
                val completed = builder.complete(ctx.provider, ownerAddr).await(30.seconds)
                val tx = completed.transaction
                Log.info(s"Transaction built successfully:\n${tx.showDetailedHighlighted}")
                Right(TxResponse(tx.toCbor.toHex))
            catch case e: Exception =>
                Log.error(s"POST /cdp/open failed: ${e.getMessage}", e)
                Left(e.getMessage)
        }

    // --- POST /cdp/borrow ---
    private val borrowEndpoint = endpoint.post
        .in("cdp" / "borrow")
        .in(jsonBody[BorrowRequest])
        .out(jsonBody[TxResponse])
        .errorOut(stringBody)
        .handle { req =>
            try
                Log.info(s"POST /cdp/borrow: nft=${req.nftName}, amount=${req.amount}")
                val ownerAddr = parseAddress(req.ownerAddress)
                val cdpUtxo = ctx.cdpQueries.findCdpUtxo(req.nftName).getOrElse(
                  throw RuntimeException(s"CDP not found: ${req.nftName}")
                )
                val amount = (req.amount * 1_000_000).toLong
                val now = Instant.now()
                val builder = ctx.cdpTransactions.borrowPusd(cdpUtxo, amount, ownerAddr, now)
                val completed = builder.complete(ctx.provider, ownerAddr).await(30.seconds)
                val tx = completed.transaction
                Log.info(s"Borrow tx built:\n${tx.showDetailedHighlighted}")
                Right(TxResponse(tx.toCbor.toHex))
            catch case e: Exception =>
                Log.error(s"POST /cdp/borrow failed: ${e.getMessage}", e)
                Left(e.getMessage)
        }

    // --- POST /cdp/repay ---
    private val repayEndpoint = endpoint.post
        .in("cdp" / "repay")
        .in(jsonBody[RepayRequest])
        .out(jsonBody[TxResponse])
        .errorOut(stringBody)
        .handle { req =>
            try
                Log.info(s"POST /cdp/repay: nft=${req.nftName}, amount=${req.amount}")
                val ownerAddr = parseAddress(req.ownerAddress)
                val cdpUtxo = ctx.cdpQueries.findCdpUtxo(req.nftName).getOrElse(
                  throw RuntimeException(s"CDP not found: ${req.nftName}")
                )
                val amount = (req.amount * 1_000_000).toLong
                val now = Instant.now()
                val builder = ctx.cdpTransactions.repayPusd(cdpUtxo, amount, ownerAddr, now)
                val completed = builder.complete(ctx.provider, ownerAddr).await(30.seconds)
                val tx = completed.transaction
                Log.info(s"Repay tx built:\n${tx.showDetailedHighlighted}")
                Right(TxResponse(tx.toCbor.toHex))
            catch case e: Exception =>
                Log.error(s"POST /cdp/repay failed: ${e.getMessage}", e)
                Left(e.getMessage)
        }

    // --- POST /cdp/close ---
    private val closeEndpoint = endpoint.post
        .in("cdp" / "close")
        .in(jsonBody[CloseRequest])
        .out(jsonBody[TxResponse])
        .errorOut(stringBody)
        .handle { req =>
            try
                Log.info(s"POST /cdp/close: nft=${req.nftName}")
                val ownerAddr = parseAddress(req.ownerAddress)
                val cdpUtxo = ctx.cdpQueries.findCdpUtxo(req.nftName).getOrElse(
                  throw RuntimeException(s"CDP not found: ${req.nftName}")
                )
                val now = Instant.now()
                val builder = ctx.cdpTransactions.closeCdp(cdpUtxo, ownerAddr, now)
                val completed = builder.complete(ctx.provider, ownerAddr).await(30.seconds)
                val tx = completed.transaction
                Log.info(s"Close tx built:\n${tx.showDetailedHighlighted}")
                Right(TxResponse(tx.toCbor.toHex))
            catch case e: Exception =>
                Log.error(s"POST /cdp/close failed: ${e.getMessage}", e)
                Left(e.getMessage)
        }

    // --- POST /cdp/liquidate ---
    private val liquidateEndpoint = endpoint.post
        .in("cdp" / "liquidate")
        .in(jsonBody[LiquidateRequest])
        .out(jsonBody[TxResponse])
        .errorOut(stringBody)
        .handle { req =>
            try
                Log.info(s"POST /cdp/liquidate: nft=${req.nftName}")
                val liquidatorAddr = parseAddress(req.liquidatorAddress)
                val cdpUtxo = ctx.cdpQueries.findCdpUtxo(req.nftName).getOrElse(
                  throw RuntimeException(s"CDP not found: ${req.nftName}")
                )
                // Pre-check: verify the liquidator has enough PUSD to cover the CDP's debt.
                // We also collect the specific UTxOs containing PUSD so the tx builder can
                // explicitly spend them (needed because PUSD lives at the liquidator's address,
                // not at the script address, so automatic coin selection won't find them).
                val datum = cdpUtxo.output.requireInlineDatum.to[pythacoin.onchain.CdpDatum]
                val debtPusd = datum.debt.toLong
                val pusdAsset = AssetName(ByteString.fromString("PUSD"))
                val liquidatorUtxos = ctx.provider.findUtxos(liquidatorAddr).await(30.seconds) match
                    case Right(found) => found
                    case Left(error) => throw RuntimeException(s"Failed to query liquidator UTxOs: $error")
                val pusdUtxos = liquidatorUtxos.filter { case (_, output) =>
                    output.value.asset(ctx.policyId, pusdAsset) > 0
                }
                val liquidatorPusd = pusdUtxos.map(_._2.value.asset(ctx.policyId, pusdAsset)).sum
                if liquidatorPusd < debtPusd then
                    throw RuntimeException(
                      s"Insufficient PUSD: liquidator has ${liquidatorPusd / 1_000_000.0} PUSD but needs ${debtPusd / 1_000_000.0} PUSD to cover debt"
                    )
                val now = Instant.now()
                val builder = ctx.cdpTransactions.liquidateCdp(cdpUtxo, liquidatorAddr, pusdUtxos, now)
                val completed = builder.complete(ctx.provider, liquidatorAddr).await(30.seconds)
                val tx = completed.transaction
                Log.info(s"Liquidate tx built:\n${tx.showDetailedHighlighted}")
                Right(TxResponse(tx.toCbor.toHex))
            catch case e: Exception =>
                Log.error(s"POST /cdp/liquidate failed: ${e.getMessage}", e)
                Left(e.getMessage)
        }

    // --- POST /tx/submit ---
    // Merges the wallet's vkey witnesses (from CIP-30 signTx) into the unsigned transaction
    // and submits the fully signed transaction to the chain via Blockfrost.
    // This two-step pattern is needed because CIP-30 signTx(partial=true) returns only
    // the user's witness set, not a complete signed transaction.
    private val submitTxEndpoint = endpoint.post
        .in("tx" / "submit")
        .in(jsonBody[SubmitTxRequest])
        .out(jsonBody[SubmitTxResponse])
        .errorOut(stringBody)
        .handle { req =>
            try
                Log.info(s"POST /tx/submit: txCborHex=${if req.txCborHex == null then "NULL" else s"${req.txCborHex.length} chars"}, witnessCborHex=${if req.witnessCborHex == null then "NULL" else s"${req.witnessCborHex.length} chars"}")
                require(req.txCborHex != null && req.txCborHex.nonEmpty, "txCborHex is required")
                require(req.witnessCborHex != null && req.witnessCborHex.nonEmpty, "witnessCborHex is required")
                given ProtocolVersion = ProtocolVersion.conwayPV
                val unsignedTx = Transaction.fromCbor(req.txCborHex.hexToBytes)
                Log.info(s"Parsed unsigned tx: ${unsignedTx.id.toHex}")
                // Decode the wallet's TransactionWitnessSet from CBOR
                val witnessBytes = req.witnessCborHex.hexToBytes
                given OriginalCborByteArray = OriginalCborByteArray(witnessBytes)
                val walletWitnesses = Cbor.decode[TransactionWitnessSet](witnessBytes)
                Log.info(s"Wallet provided ${walletWitnesses.vkeyWitnesses.toSet.size} vkey witnesses")
                // Merge wallet vkeys with any existing witnesses (e.g. from script evaluation)
                val existing = unsignedTx.witnessSet
                val mergedVkeys = TaggedSortedSet.from(
                  existing.vkeyWitnesses.toSet ++ walletWitnesses.vkeyWitnesses.toSet
                )
                val signedTx = unsignedTx.withWitness(existing.copy(vkeyWitnesses = mergedVkeys))
                Log.info(s"Submitting tx ${signedTx.id.toHex} with ${mergedVkeys.toSet.size} vkey witnesses...")
                val result = ctx.provider.submit(signedTx).await(30.seconds)
                result match
                    case Right(txHash) =>
                        Log.info(s"Tx submitted: ${txHash.toHex}")
                        Right(SubmitTxResponse(txHash.toHex))
                    case Left(error) =>
                        Log.error(s"Tx submission failed: $error")
                        Left(s"Submission failed: $error")
            catch case e: Exception =>
                val msg = Option(e.getMessage).getOrElse(e.getClass.getName)
                Log.error(s"POST /tx/submit failed: $msg", e)
                Left(msg)
        }

    private val apiEndpoints: List[ServerEndpoint[Any, Identity]] = List(
      getPrice,
      listCdpsEndpoint,
      openCdpEndpoint,
      borrowEndpoint,
      repayEndpoint,
      closeEndpoint,
      liquidateEndpoint,
      submitTxEndpoint
    )

    private val swaggerEndpoints = SwaggerInterpreter()
        .fromServerEndpoints[Identity](apiEndpoints, "Pythacoin", "0.1")

    def start(): Unit =
        NettySyncServer()
            .port(8088)
            .addEndpoints(apiEndpoints ++ swaggerEndpoints)
            .startAndWait()
