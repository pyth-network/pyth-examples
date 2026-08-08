package pythacoin

import pythacoin.onchain.{CdpAction, CdpDatum}
import scalus.cardano.address.{Address, Network, StakeAddress, StakePayload}
import scalus.cardano.ledger.*
import scalus.cardano.onchain.plutus.v1.PubKeyHash
import scalus.cardano.txbuilder.{TwoArgumentPlutusScriptWitness, TxBuilder, txBuilder}
import scalus.uplc.builtin.ByteString
import scalus.uplc.builtin.ByteString.utf8
import scalus.uplc.builtin.Data
import scalus.uplc.builtin.Data.toData
import scalus.utils.await

import java.time.Instant
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.*

/** Off-chain transaction builders for all CDP operations.
  *
  * Each method returns a partially-built TxBuilder that the caller completes via
  * `builder.complete(provider, changeAddress)`, which handles coin selection,
  * fee calculation, and collateral. The resulting unsigned transaction is then
  * sent to the frontend for wallet signing.
  *
  * All transactions that read the oracle price include:
  * - Pyth State UTxO as a reference input (provides the withdraw script hash)
  * - A withdrawal with zero rewards to the Pyth withdraw script address
  * - The price update bytes as the withdrawal redeemer
  * This "withdrawal trick" lets the Pyth withdraw script verify the price signature
  * once, and our validator can read the verified price from the redeemer.
  */
class CdpTransactions(ctx: AppCtx, pythClient: PythClient)(using CardanoInfo) {

    private val policyId = ctx.policyId
    private val scriptAddr = ctx.scriptAddr
    private val pusdAsset = AssetName(utf8"PUSD")

    /** Build a transaction to open a new CDP.
      * The NFT name is derived from sha2_256(firstInput.txId ++ firstInput.index).
      */
    def openCdp(
        collateralLovelace: Long,
        debtPusd: Long,
        nftName: AssetName,
        ownerPkh: PubKeyHash,
        ownerAddr: Address,
        now: Instant
    ): TxBuilder = {
        val (pythState, pythWithdrawAddr, updateBytes, pythWitness) = fetchPythInfo(now)
        val datum = CdpDatum(ownerPkh, BigInt(debtPusd))

        txBuilder
            .references(pythState)
            .withdrawRewards(pythWithdrawAddr, Coin(0), pythWitness)
            .validFrom(now.minusSeconds(600))
            .validTo(now.plusSeconds(600))
            .mint(
              ctx.cdpScript,
              Map(nftName -> 1L, pusdAsset -> debtPusd),
              CdpAction.Open
            )
            .payTo(
              scriptAddr,
              Value.lovelace(collateralLovelace) + Value.asset(policyId, nftName, 1L),
              datum.toData
            )
    }

    /** Build a transaction to borrow additional PUSD from an existing CDP. */
    def borrowPusd(
        cdpUtxo: Utxo,
        additionalPusd: Long,
        ownerAddr: Address,
        now: Instant
    ): TxBuilder = {
        val (pythState, pythWithdrawAddr, updateBytes, pythWitness) = fetchPythInfo(now)
        val oldDatum = parseCdpDatum(cdpUtxo)
        val nftName = findNftName(cdpUtxo)
        val newDatum = CdpDatum(oldDatum.owner, oldDatum.debt + additionalPusd)
        val collateral = cdpUtxo.output.value.coin.value

        txBuilder
            .references(pythState)
            .withdrawRewards(pythWithdrawAddr, Coin(0), pythWitness)
            .validFrom(now.minusSeconds(600))
            .validTo(now.plusSeconds(600))
            .spend(cdpUtxo, CdpAction.Borrow, ctx.cdpScript)
            .mint(ctx.cdpScript, Map(pusdAsset -> additionalPusd), CdpAction.Borrow)
            .payTo(
              scriptAddr,
              Value.lovelace(collateral) + Value.asset(policyId, nftName, 1L),
              newDatum.toData
            )
            .requireSignature(AddrKeyHash(oldDatum.owner.hash))
    }

    /** Build a transaction to repay PUSD debt to an existing CDP. */
    def repayPusd(
        cdpUtxo: Utxo,
        repayAmount: Long,
        ownerAddr: Address,
        now: Instant
    ): TxBuilder = {
        val oldDatum = parseCdpDatum(cdpUtxo)
        val nftName = findNftName(cdpUtxo)
        val newDatum = CdpDatum(oldDatum.owner, oldDatum.debt - repayAmount)
        val collateral = cdpUtxo.output.value.coin.value

        txBuilder
            .validFrom(now.minusSeconds(600))
            .validTo(now.plusSeconds(600))
            .spend(cdpUtxo, CdpAction.Repay, ctx.cdpScript)
            .mint(ctx.cdpScript, Map(pusdAsset -> -repayAmount), CdpAction.Repay)
            .payTo(
              scriptAddr,
              Value.lovelace(collateral) + Value.asset(policyId, nftName, 1L),
              newDatum.toData
            )
            .requireSignature(AddrKeyHash(oldDatum.owner.hash))
    }

    /** Build a transaction to close a CDP (fully repay debt, burn NFT, return collateral). */
    def closeCdp(
        cdpUtxo: Utxo,
        ownerAddr: Address,
        now: Instant
    ): TxBuilder = {
        val oldDatum = parseCdpDatum(cdpUtxo)
        val nftName = findNftName(cdpUtxo)
        val collateral = cdpUtxo.output.value.coin.value

        txBuilder
            .validFrom(now.minusSeconds(600))
            .validTo(now.plusSeconds(600))
            .spend(cdpUtxo, CdpAction.Close, ctx.cdpScript)
            .mint(
              ctx.cdpScript,
              Map(nftName -> -1L, pusdAsset -> -oldDatum.debt.toLong),
              CdpAction.Close
            )
            .payTo(ownerAddr, Value.lovelace(collateral))
            .requireSignature(AddrKeyHash(oldDatum.owner.hash))
    }

    /** Build a transaction to liquidate an under-collateralized CDP.
      * @param liquidatorPusdUtxos UTxOs from the liquidator that contain PUSD tokens to burn
      */
    def liquidateCdp(
        cdpUtxo: Utxo,
        liquidatorAddr: Address,
        liquidatorPusdUtxos: Utxos,
        now: Instant
    ): TxBuilder = {
        val (pythState, pythWithdrawAddr, updateBytes, pythWitness) = fetchPythInfo(now)
        val oldDatum = parseCdpDatum(cdpUtxo)
        val nftName = findNftName(cdpUtxo)
        val collateral = cdpUtxo.output.value.coin.value

        txBuilder
            .references(pythState)
            .withdrawRewards(pythWithdrawAddr, Coin(0), pythWitness)
            .validFrom(now.minusSeconds(600))
            .validTo(now.plusSeconds(600))
            .spend(cdpUtxo, CdpAction.Liquidate, ctx.cdpScript)
            .spend(liquidatorPusdUtxos)
            .mint(
              ctx.cdpScript,
              Map(nftName -> -1L, pusdAsset -> -oldDatum.debt.toLong),
              CdpAction.Liquidate
            )
            .payTo(liquidatorAddr, Value.lovelace(collateral))
    }

    /** Fetch Pyth oracle state and build the withdrawal witness.
      *
      * Returns everything needed to include a Pyth price in a transaction:
      * 1. The enriched Pyth State UTxO (with scriptRef manually added, since Blockfrost
      *    doesn't populate the scriptRef field on reference UTxOs)
      * 2. The stake address of the Pyth withdraw script (for the zero-reward withdrawal)
      * 3. The raw price update bytes (for off-chain display/logging)
      * 4. A TwoArgumentPlutusScriptWitness using the reference script (Conway requires
      *    using the reference script, not attaching a copy)
      */
    private def fetchPythInfo(now: Instant): (Utxo, StakeAddress, ByteString, TwoArgumentPlutusScriptWitness) = {
        Log.info("Fetching Pyth oracle info...")
        val pythState = pythClient.fetchPythState()
        val withdrawHash = pythClient.extractWithdrawScript(pythState)
        val pythWithdrawAddr = StakeAddress(ctx.cardanoInfo.network, StakePayload.Script(withdrawHash))
        Log.info(s"Pyth withdraw address: ${pythWithdrawAddr.toBech32}")
        val updateBytes = pythClient.fetchPriceUpdate()
        Log.info(s"Price update bytes: ${updateBytes.size} bytes")
        // Blockfrost doesn't populate scriptRef on UTxOs, so we manually enrich it
        val withdrawScript = pythClient.fetchScript(withdrawHash)
        val enrichedOutput = TransactionOutput.Babbage(
          pythState.output.address,
          pythState.output.value,
          pythState.output.datumOption,
          Some(ScriptRef(withdrawScript))
        )
        val enrichedPythState = Utxo(pythState.input, enrichedOutput)

        // The Pyth redeemer is a list of price update byte arrays
        import scalus.cardano.onchain.plutus.prelude.List as PList
        val pythRedeemer: Data = Data.List(PList(Data.B(updateBytes)))
        // Conway requires using reference script (not attached) — ExtraneousScriptWitnessesUTXOW error otherwise
        val pythWitness = TwoArgumentPlutusScriptWitness.reference(_ => pythRedeemer)
        Log.info("Pyth info fetched successfully")

        (enrichedPythState, pythWithdrawAddr, updateBytes, pythWitness)
    }

    /** Parse CdpDatum from a CDP UTxO's inline datum. */
    private def parseCdpDatum(utxo: Utxo): CdpDatum = {
        val data = utxo.output.requireInlineDatum
        data.to[CdpDatum]
    }

    /** Find the CDP NFT AssetName in a CDP UTxO (non-PUSD token under our policy). */
    private def findNftName(utxo: Utxo): AssetName = {
        val assets = utxo.output.value.assets.assets.getOrElse(policyId, Map.empty)
        val nftEntries = assets.filter { case (name, _) => name != pusdAsset }
        nftEntries.headOption match
            case Some((name, _)) => name
            case None => throw RuntimeException("No CDP NFT found in UTxO")
    }
}
