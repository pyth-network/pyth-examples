package pythacoin

import pythacoin.onchain.CdpDatum
import scalus.cardano.ledger.*
import scalus.uplc.builtin.ByteString
import scalus.uplc.builtin.ByteString.utf8
import scalus.utils.await

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.*

/** Read-only queries against the blockchain to discover and inspect CDPs.
  * All CDPs live at the script address and are identified by a unique NFT
  * under the script's policy ID.
  */
class CdpQueries(ctx: AppCtx) {

    private val policyId = ctx.policyId
    private val pusdAsset = AssetName(utf8"PUSD")

    /** List all CDPs at the script address. */
    def listCdps(): Seq[CdpInfo] = {
        val utxos = ctx.provider.findUtxos(ctx.scriptAddr).await(30.seconds) match
            case Right(found) => found
            case Left(error) => throw RuntimeException(s"Failed to query CDPs: $error")

        utxos.toSeq.flatMap { case (input, output) =>
            parseCdpInfo(output)
        }
    }

    /** Get a specific CDP by NFT name. */
    def getCdp(nftName: String): Option[CdpInfo] =
        listCdps().find(_.nftName == nftName)

    /** Find the UTxO for a specific CDP by NFT name. */
    def findCdpUtxo(nftName: String): Option[Utxo] = {
        val nftAsset = AssetName(ByteString.fromHex(nftName))
        val utxos = ctx.provider.findUtxos(ctx.scriptAddr).await(30.seconds) match
            case Right(found) => found
            case Left(error) => throw RuntimeException(s"Failed to query CDPs: $error")

        utxos.collectFirst {
            case (input, output) if output.value.hasAsset(policyId, nftAsset) =>
                Utxo(input, output)
        }
    }

    /** Parse CdpInfo from a transaction output, if it's a valid CDP. */
    private def parseCdpInfo(output: TransactionOutput): Option[CdpInfo] = {
        // Check that output has our policy's tokens
        val assets = output.value.assets.assets.getOrElse(policyId, Map.empty)
        val nftEntries = assets.filter { case (name, _) => name != pusdAsset }

        nftEntries.headOption.flatMap { case (nftName, _) =>
            output.inlineDatum.map { data =>
                val datum = data.to[CdpDatum]
                val collateral = output.value.coin.value
                val debt = datum.debt.toLong
                CdpInfo(
                  nftName = nftName.bytes.toHex,
                  owner = datum.owner.hash.toHex,
                  collateralLovelace = collateral,
                  debtPusd = debt,
                  ltv = 0.0 // computed by frontend with current price
                )
            }
        }
    }
}

/** CDP state returned by the /cdps endpoint.
  * LTV is set to 0 here — the frontend computes it using the current price.
  */
case class CdpInfo(
    nftName: String,
    owner: String,
    collateralLovelace: Long,
    debtPusd: Long,
    ltv: Double
) derives upickle.default.ReadWriter

/** Current ADA/USD price returned by the /price endpoint.
  * Includes the policy ID so the frontend can identify PUSD tokens in the wallet.
  */
case class PriceInfo(
    adaUsd: Double,
    timestamp: String,
    policyId: String
) derives upickle.default.ReadWriter
