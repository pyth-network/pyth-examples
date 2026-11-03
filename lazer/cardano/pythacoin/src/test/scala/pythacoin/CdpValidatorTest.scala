package pythacoin

import java.time.Instant
import org.scalatest.funsuite.AnyFunSuite
import scalus.cardano.ledger.*
import scalus.cardano.onchain.plutus.prelude.{AssocMap, List}
import scalus.cardano.onchain.plutus.v1
import scalus.cardano.onchain.plutus.v3.{ScriptContext, TxOutRef}
import scalus.cardano.txbuilder.RedeemerPurpose.{ForMint, ForSpend}
import scalus.cardano.txbuilder.txBuilder
import scalus.testing.kit.Party.{Alice, Bob}
import scalus.testing.kit.TestUtil.{genesisHash, getScriptContextV3}
import scalus.testing.kit.{ScalusTest, TestUtil}
import scalus.uplc.builtin.ByteString
import scalus.uplc.builtin.ByteString.{hex, utf8}
import scalus.uplc.builtin.Data
import scalus.uplc.builtin.Data.toData
import pythacoin.onchain.*
import pythacoin.onchain.CdpConsts.*

class CdpValidatorTest extends AnyFunSuite, ScalusTest {
    private given env: CardanoInfo = TestUtil.testEnvironment

    private val walletIn = Input(genesisHash, 0)
    private val cdpIn = Input(genesisHash, 1)
    private val pythIn = Input(genesisHash, 2)
    private val owner = v1.PubKeyHash(Alice.addrKeyHash)
    private val bobPkh = v1.PubKeyHash(Bob.addrKeyHash)

    private val nftAsset = AssetName(utf8"CDP-1")
    private val collateralAda = 5_000_000_000L // 5000 ADA
    private val pusdAsset = AssetName(utf8"PUSD")
    private val now = Instant.parse("2026-03-07T12:00:00Z")
    private val later = now.plusSeconds(30)

    // Mock Pyth policy ID
    private val pythPolicyId =
        ScriptHash.fromHex("aabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd")

    // Mock Pyth withdraw script hash (28 bytes = 56 hex chars)
    private val pythWithdrawHash =
        ScriptHash.fromHex("11223344112233441122334411223344112233441122334411223344")

    private val contract = CdpContract.withErrorTraces(pythPolicyId)
    private val policyId = contract.script.scriptHash
    private val scriptAddr = contract.address(env.network)

    // ADA/USD = $1.00 represented as 100_000_000 (8 decimal places, exponent = -8)
    private val adaUsdPrice = 100_000_000L

    // Base datum: 2000 PUSD debt
    private val baseDatum = CdpDatum(owner, BigInt(2_000_000_000L))

    /** Build mock Pyth Solana-format update bytes.
      *
      * Format: [4 magic][64 sig][32 key][2 payload_size][payload] Payload: [4 magic][8
      * timestamp_us][1 channel][1 feeds_len][feed] Feed: [4 feed_id][1 props_len][prop_price]
      * prop_price: [1 prop_id=0][8 price_i64_le]
      */
    private def mkPriceUpdateBytes(price: Long): ByteString = {
        import java.nio.{ByteBuffer, ByteOrder}

        val buf = ByteBuffer.allocate(130).order(ByteOrder.LITTLE_ENDIAN)
        // Envelope: 4 magic + 64 sig + 32 key = 100 bytes
        buf.putInt(0xb9011a82.toInt) // magic
        buf.put(new Array[Byte](64)) // fake signature
        buf.put(new Array[Byte](32)) // fake key
        // Payload size (u16 LE): 24 bytes payload
        buf.putShort(24.toShort)
        // Payload: 4 magic + 8 timestamp + 1 channel + 1 feeds_len + 4 feed_id + 1 props + 1 prop_id + 8 price = 28
        // But we said 24, let's recalculate: 4+8+1+1 = 14 header, then feed: 4+1+1+8 = 14, but we only need 10 for feed
        // Actually: feed_id(4) + props_len(1) + prop_id(1) + price(8) = 14
        // Total payload = 14 + 14 = 28? Let me just put the right size
        // Let me redo: payload size should include everything after the size field
        // Reset and recalculate
        buf.clear()
        // Envelope
        buf.putInt(0xb9011a82.toInt) // 4 bytes magic
        buf.put(new Array[Byte](64)) // 64 bytes signature
        buf.put(new Array[Byte](32)) // 32 bytes key
        // = 100 bytes so far

        // Payload: magic(4) + timestamp_us(8) + channel(1) + feeds_len(1) + feed
        // Feed: feed_id(4) + props_len(1) + prop(1+8) = 14
        // Total payload = 4+8+1+1+14 = 28
        val payloadSize: Short = 28.toShort
        buf.putShort(payloadSize) // 2 bytes payload size
        // Payload starts at 102
        buf.putInt(0x75d3c793.toInt) // 4 bytes payload magic
        buf.putLong(System.currentTimeMillis() * 1000L) // 8 bytes timestamp_us
        buf.put(0.toByte) // 1 byte channel_id
        buf.put(1.toByte) // 1 byte feeds_len = 1
        // Feed: ADA/USD = feed_id 16
        buf.putInt(16) // 4 bytes feed_id
        buf.put(1.toByte) // 1 byte props_len = 1
        // Property 0 = Price (I64 LE)
        buf.put(0.toByte) // 1 byte prop_id = 0
        buf.putLong(price) // 8 bytes price
        // Total: 100 + 2 + 28 = 130 bytes
        ByteString.unsafeFromArray(buf.array().take(buf.position()))
    }

    /** Build mock Pyth State datum as raw Data.
      *
      * Pyth datum is: Constr(0, [governance, trusted_signers, deprecated_withdraw_scripts,
      * withdraw_script])
      */
    private def mkPythStateDatum(): Data = {
        import scalus.cardano.onchain.plutus.prelude.List as PList
        // governance: Constr(0, [policy_id, emitter_chain, emitter_address, seen_sequence])
        val governance = Data.Constr(
          0,
          PList(
            Data.B(ByteString.fill(28, 0)),
            Data.I(BigInt(0)),
            Data.B(ByteString.empty),
            Data.I(BigInt(0))
          )
        )
        // trusted_signers: empty map
        val trustedSigners = Data.Map(PList.empty)
        // deprecated_withdraw_scripts: empty map
        val deprecated = Data.Map(PList.empty)
        // withdraw_script: the script hash bytes
        val withdrawScript = Data.B(pythWithdrawHash: ByteString)

        Data.Constr(0, PList(governance, trustedSigners, deprecated, withdrawScript))
    }

    /** Build mock Pyth withdrawal redeemer: List<ByteArray> containing one price update */
    private def mkPythRedeemer(price: Long): Data = {
        import scalus.cardano.onchain.plutus.prelude.List as PList
        val updateBytes = mkPriceUpdateBytes(price)
        Data.List(PList(Data.B(updateBytes)))
    }

    private def mkWallet(ada: Long): Utxo =
        Utxo(walletIn, Output(Alice.address, Value.lovelace(ada)))

    private def mkBobWallet(ada: Long): Utxo =
        Utxo(Input(genesisHash, 3), Output(Bob.address, Value.lovelace(ada)))

    private def mkPythState(): Utxo =
        Utxo(
          pythIn,
          Output(
            Alice.address,
            Value.ada(2) + Value.asset(pythPolicyId, AssetName(utf8"Pyth State"), 1L),
            mkPythStateDatum()
          )
        )

    private def mkCdp(datum: CdpDatum = baseDatum, collateral: Long = collateralAda): Utxo =
        Utxo(
          cdpIn,
          Output(
            scriptAddr,
            Value.lovelace(collateral) + Value.asset(policyId, nftAsset, 1L),
            datum.toData
          )
        )

    private def withOwnerSignature(ctx: ScriptContext) =
        ctx.copy(
          txInfo = ctx.txInfo.copy(
            signatories = List(owner)
          )
        )

    private def withBobSignature(ctx: ScriptContext) =
        ctx.copy(
          txInfo = ctx.txInfo.copy(
            signatories = List(bobPkh)
          )
        )

    private def withPythWithdrawal(ctx: ScriptContext, price: Long): ScriptContext = {
        import scalus.cardano.onchain.plutus.v1.Credential.ScriptCredential
        val redeemer = mkPythRedeemer(price)
        val withdrawalKey = ScriptCredential(pythWithdrawHash)
        ctx.copy(
          txInfo = ctx.txInfo.copy(
            redeemers = ctx.txInfo.redeemers.insert(
              scalus.cardano.onchain.plutus.v3.ScriptPurpose.Rewarding(withdrawalKey),
              redeemer
            )
          )
        )
    }

    test(s"CDP contract size is ${CdpContract.base.script.script.size}") {
        assert(CdpContract.base.script.script.size < 16384, "Contract must be under 16KB")
    }

    test("open: valid CDP") {
        val pythUtxo = mkPythState()
        val utxos = Utxos(mkWallet(10_000_000_000L), pythUtxo)
        val tx = txBuilder
            .references(pythUtxo)
            .validFrom(now)
            .validTo(later)
            .mint(
              contract,
              Map(nftAsset -> 1L, pusdAsset -> baseDatum.debt.toLong),
              CdpAction.Open
            )
            .payTo(
              scriptAddr,
              Value.lovelace(collateralAda) + Value.asset(policyId, nftAsset, 1L),
              baseDatum.toData
            )
            .draft

        val ctx = withPythWithdrawal(
          tx.getScriptContextV3(utxos, ForMint(policyId)),
          adaUsdPrice
        )
        val result = contract.eval(ctx.toData)
        assert(result.isSuccess, s"${result.logs.mkString(", ")} | $result")
    }

    test("open: over 95% LTV rejected") {
        // 5000 ADA at $1 = $5000 collateral, 95% LTV = $4750 max debt
        // Try to borrow $4800 = 4_800_000_000 PUSD
        val overLeveragedDatum = CdpDatum(owner, BigInt(4_800_000_000L))
        val pythUtxo = mkPythState()
        val utxos = Utxos(mkWallet(10_000_000_000L), pythUtxo)
        val tx = txBuilder
            .references(pythUtxo)
            .validFrom(now)
            .validTo(later)
            .mint(
              contract,
              Map(nftAsset -> 1L, pusdAsset -> overLeveragedDatum.debt.toLong),
              CdpAction.Open
            )
            .payTo(
              scriptAddr,
              Value.lovelace(collateralAda) + Value.asset(policyId, nftAsset, 1L),
              overLeveragedDatum.toData
            )
            .draft

        val ctx = withPythWithdrawal(
          tx.getScriptContextV3(utxos, ForMint(policyId)),
          adaUsdPrice
        )
        val result = contract.eval(ctx.toData)
        assert(result.isFailure)
        assert(result.logs.exists(_.contains("LTV above maximum")), result.logs.mkString(", "))
    }

    test("borrow: increase debt within 95% LTV") {
        val pythUtxo = mkPythState()
        val cdpUtxo = mkCdp()
        val borrowAmount = 500_000_000L
        val newDatum = baseDatum.copy(debt = baseDatum.debt + borrowAmount)
        val utxos = Utxos(mkWallet(10_000_000_000L), cdpUtxo, pythUtxo)
        val tx = txBuilder
            .spend(cdpUtxo, CdpAction.Borrow, contract)
            .references(pythUtxo)
            .validFrom(now)
            .validTo(later)
            .mint(contract, Map(pusdAsset -> borrowAmount), CdpAction.Borrow)
            .payTo(
              scriptAddr,
              Value.lovelace(collateralAda) + Value.asset(policyId, nftAsset, 1L),
              newDatum.toData
            )
            .draft

        val ctx = withPythWithdrawal(
          withOwnerSignature(tx.getScriptContextV3(utxos, ForSpend(cdpIn))),
          adaUsdPrice
        )
        val result = contract.eval(ctx.toData)
        assert(result.isSuccess, s"${result.logs.mkString(", ")} | $result")
    }

    test("borrow: exceed 95% LTV rejected") {
        val pythUtxo = mkPythState()
        val cdpUtxo = mkCdp()
        // Try to borrow up to 4800 PUSD total (96% LTV)
        val borrowAmount = 2_800_000_000L
        val newDatum = baseDatum.copy(debt = baseDatum.debt + borrowAmount)
        val utxos = Utxos(mkWallet(10_000_000_000L), cdpUtxo, pythUtxo)
        val tx = txBuilder
            .spend(cdpUtxo, CdpAction.Borrow, contract)
            .references(pythUtxo)
            .validFrom(now)
            .validTo(later)
            .mint(contract, Map(pusdAsset -> borrowAmount), CdpAction.Borrow)
            .payTo(
              scriptAddr,
              Value.lovelace(collateralAda) + Value.asset(policyId, nftAsset, 1L),
              newDatum.toData
            )
            .draft

        val ctx = withPythWithdrawal(
          withOwnerSignature(tx.getScriptContextV3(utxos, ForSpend(cdpIn))),
          adaUsdPrice
        )
        val result = contract.eval(ctx.toData)
        assert(result.isFailure)
        assert(result.logs.exists(_.contains("LTV above maximum")), result.logs.mkString(", "))
    }

    test("borrow: non-owner rejected") {
        val pythUtxo = mkPythState()
        val cdpUtxo = mkCdp()
        val borrowAmount = 500_000_000L
        val newDatum = baseDatum.copy(debt = baseDatum.debt + borrowAmount)
        val utxos = Utxos(mkWallet(10_000_000_000L), cdpUtxo, pythUtxo)
        val tx = txBuilder
            .spend(cdpUtxo, CdpAction.Borrow, contract)
            .references(pythUtxo)
            .validFrom(now)
            .validTo(later)
            .mint(contract, Map(pusdAsset -> borrowAmount), CdpAction.Borrow)
            .payTo(
              scriptAddr,
              Value.lovelace(collateralAda) + Value.asset(policyId, nftAsset, 1L),
              newDatum.toData
            )
            .draft

        val ctx = withPythWithdrawal(
          withBobSignature(tx.getScriptContextV3(utxos, ForSpend(cdpIn))),
          adaUsdPrice
        )
        val result = contract.eval(ctx.toData)
        assert(result.isFailure)
        assert(
          result.logs.exists(_.contains("Owner signature required")),
          result.logs.mkString(", ")
        )
    }

    test("repay: reduce debt") {
        val pythUtxo = mkPythState()
        val cdpUtxo = mkCdp()
        val repayAmount = 500_000_000L
        val newDatum = baseDatum.copy(debt = baseDatum.debt - repayAmount)
        val utxos = Utxos(mkWallet(10_000_000_000L), cdpUtxo, pythUtxo)
        val tx = txBuilder
            .spend(cdpUtxo, CdpAction.Repay, contract)
            .references(pythUtxo)
            .validFrom(now)
            .validTo(later)
            .mint(contract, Map(pusdAsset -> -repayAmount), CdpAction.Repay)
            .payTo(
              scriptAddr,
              Value.lovelace(collateralAda) + Value.asset(policyId, nftAsset, 1L),
              newDatum.toData
            )
            .draft

        val ctx = withPythWithdrawal(
          withOwnerSignature(tx.getScriptContextV3(utxos, ForSpend(cdpIn))),
          adaUsdPrice
        )
        val result = contract.eval(ctx.toData)
        assert(result.isSuccess, s"${result.logs.mkString(", ")} | $result")
    }

    test("close: full repayment, NFT burned, ADA returned") {
        val pythUtxo = mkPythState()
        val cdpUtxo = mkCdp()
        val utxos = Utxos(mkWallet(10_000_000_000L), cdpUtxo, pythUtxo)
        val tx = txBuilder
            .spend(cdpUtxo, CdpAction.Close, contract)
            .references(pythUtxo)
            .validFrom(now)
            .validTo(later)
            .mint(
              contract,
              Map(nftAsset -> -1L, pusdAsset -> -baseDatum.debt.toLong),
              CdpAction.Close
            )
            .payTo(Alice.address, Value.lovelace(collateralAda))
            .draft

        val ctx = withOwnerSignature(tx.getScriptContextV3(utxos, ForSpend(cdpIn)))
        val result = contract.eval(ctx.toData)
        assert(result.isSuccess, s"${result.logs.mkString(", ")} | $result")
    }

    test("close: non-owner rejected") {
        val pythUtxo = mkPythState()
        val cdpUtxo = mkCdp()
        val utxos = Utxos(mkWallet(10_000_000_000L), cdpUtxo, pythUtxo)
        val tx = txBuilder
            .spend(cdpUtxo, CdpAction.Close, contract)
            .references(pythUtxo)
            .validFrom(now)
            .validTo(later)
            .mint(
              contract,
              Map(nftAsset -> -1L, pusdAsset -> -baseDatum.debt.toLong),
              CdpAction.Close
            )
            .payTo(Bob.address, Value.lovelace(collateralAda))
            .draft

        val ctx = withBobSignature(tx.getScriptContextV3(utxos, ForSpend(cdpIn)))
        val result = contract.eval(ctx.toData)
        assert(result.isFailure)
        assert(
          result.logs.exists(_.contains("Owner signature required")),
          result.logs.mkString(", ")
        )
    }

    test("liquidate: LTV > 90% succeeds") {
        // ADA price drops to $0.50 -> 5000 ADA = $2500 collateral, $2000 debt = 80% LTV
        // But at $0.40 -> 5000 ADA = $2000 collateral, $2000 debt = 100% LTV > 90%
        val lowPrice = 40_000_000L // $0.40
        val pythUtxo = mkPythState()
        val cdpUtxo = mkCdp()
        val utxos = Utxos(mkBobWallet(10_000_000_000L), cdpUtxo, pythUtxo)
        val tx = txBuilder
            .spend(cdpUtxo, CdpAction.Liquidate, contract)
            .references(pythUtxo)
            .validFrom(now)
            .validTo(later)
            .mint(
              contract,
              Map(nftAsset -> -1L, pusdAsset -> -baseDatum.debt.toLong),
              CdpAction.Liquidate
            )
            .draft

        val ctx = withPythWithdrawal(
          tx.getScriptContextV3(utxos, ForSpend(cdpIn)),
          lowPrice
        )
        val result = contract.eval(ctx.toData)
        assert(result.isSuccess, s"${result.logs.mkString(", ")} | $result")
    }

    test("liquidate: LTV <= 90% rejected") {
        // ADA at $1.00 -> 5000 ADA = $5000 collateral, $2000 debt = 40% LTV (healthy)
        val pythUtxo = mkPythState()
        val cdpUtxo = mkCdp()
        val utxos = Utxos(mkBobWallet(10_000_000_000L), cdpUtxo, pythUtxo)
        val tx = txBuilder
            .spend(cdpUtxo, CdpAction.Liquidate, contract)
            .references(pythUtxo)
            .validFrom(now)
            .validTo(later)
            .mint(
              contract,
              Map(nftAsset -> -1L, pusdAsset -> -baseDatum.debt.toLong),
              CdpAction.Liquidate
            )
            .draft

        val ctx = withPythWithdrawal(
          tx.getScriptContextV3(utxos, ForSpend(cdpIn)),
          adaUsdPrice
        )
        val result = contract.eval(ctx.toData)
        assert(result.isFailure)
        assert(
          result.logs.exists(_.contains("Not liquidatable")),
          result.logs.mkString(", ")
        )
    }
}
