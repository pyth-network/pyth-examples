package pythacoin.onchain

import scalus.*
import scalus.cardano.onchain.plutus.prelude.*
import scalus.cardano.onchain.plutus.v1.Credential.{PubKeyCredential, ScriptCredential}
import scalus.cardano.onchain.plutus.v1.TokenName
import scalus.cardano.onchain.plutus.v2.OutputDatum
import scalus.cardano.onchain.plutus.v3.{DataParameterizedValidator, Validator as _, *}
import scalus.uplc.builtin.ByteString.utf8
import scalus.uplc.builtin.Data.toData
import scalus.uplc.builtin.{Builtins, ByteString, Data, FromData, ToData}
import pythacoin.onchain.StrictLookups.*

/** Inline datum stored at each CDP UTxO.
  * @param owner the public key hash of the CDP owner (who can borrow/repay/close)
  * @param debt  outstanding PUSD debt in lovelace-scale (1 PUSD = 1_000_000)
  */
case class CdpDatum(
    owner: PubKeyHash,
    debt: BigInt
) derives FromData,
      ToData

/** Script parameter baked into the compiled validator at deployment time.
  * @param pythPolicyId the Pyth oracle deployment policy ID, used to locate Pyth State UTxO
  */
case class CdpParams(
    pythPolicyId: ByteString
) derives FromData,
      ToData

/** Redeemer that selects which action the validator should enforce.
  * The same enum is used for both the spend and mint handlers.
  */
enum CdpAction derives FromData, ToData {
    case Open
    case Borrow
    case Repay
    case Close
    case Liquidate
}

/** Protocol constants compiled into the on-chain script. */
@Compile
object CdpConsts {
    val MAX_LTV: BigInt = 95       // 95% — maximum loan-to-value ratio for minting/borrowing
    val LIQ_THRESHOLD: BigInt = 90 // 90% — LTV above which a CDP can be liquidated by anyone
    val LTV_SCALE: BigInt = 100    // denominator for percentage arithmetic (100 = 100%)
    val PUSD_TOKEN_NAME: TokenName = utf8"PUSD"
    val PYTH_STATE_NAME: TokenName = utf8"Pyth State"
    val ADA_USD_FEED_ID: BigInt = 16        // Pyth Lazer feed ID for ADA/USD
    val ORACLE_SCALE: BigInt = 100_000_000  // price has 8 decimal places (exponent = -8)
}

import pythacoin.onchain.CdpConsts.*

@Compile
object CdpValidator extends DataParameterizedValidator {

    // --- Binary parsing helpers for Pyth Lazer update bytes ---
    // These convert little-endian byte slices into integers on-chain.
    // Plutus has no native LE integer parsing, so we use Builtins.byteStringToInteger
    // with endianness=false (little-endian) and manual two's complement for signed types.

    /** Parse unsigned integer from little-endian bytes at a given offset and size. */
    def leToUInt(bs: ByteString, offset: BigInt, size: BigInt): BigInt =
        Builtins.byteStringToInteger(false, bs.slice(offset, size))

    val I16_SIGN: BigInt = BigInt(32768)           // 2^15 — sign threshold for I16
    val I16_MOD: BigInt = BigInt(65536)             // 2^16 — modulus for I16 two's complement
    val I64_SIGN: BigInt = BigInt("9223372036854775808")   // 2^63 — sign threshold for I64
    val I64_MOD: BigInt = BigInt("18446744073709551616")   // 2^64 — modulus for I64 two's complement

    /** Parse signed 64-bit integer from LE bytes (two's complement). */
    def leToI64(bs: ByteString, offset: BigInt): BigInt = {
        val unsigned = leToUInt(bs, offset, BigInt(8))
        if unsigned < I64_SIGN then unsigned
        else unsigned - I64_MOD
    }

    /** Parse signed 16-bit integer from LE bytes (two's complement). */
    def leToI16(bs: ByteString, offset: BigInt): BigInt = {
        val unsigned = leToUInt(bs, offset, BigInt(2))
        if unsigned < I16_SIGN then unsigned
        else unsigned - I16_MOD
    }

    def leToU32(bs: ByteString, offset: BigInt): BigInt =
        leToUInt(bs, offset, BigInt(4))

    def leToU16(bs: ByteString, offset: BigInt): BigInt =
        leToUInt(bs, offset, BigInt(2))

    def readU8(bs: ByteString, offset: BigInt): BigInt =
        bs.at(offset)

    /** Extract ADA/USD price from Pyth update bytes.
      *
      * Message format (Solana): [4 magic][64 sig][32 key][2 payload_size][payload...]
      *
      * Payload format: [4 magic][8 timestamp_us][1 channel_id][1 feeds_len][feeds...]
      *
      * Feed format: [4 feed_id][1 props_len][props...]
      *
      * Property: [1 prop_id][data...] prop 0 = Price (I64), prop 4 = Exponent (I16)
      */
    def parsePythPrice(updateBytes: ByteString): BigInt = {
        // Skip envelope: 4 magic + 64 sig + 32 key = 100 bytes
        val payloadSize = leToU16(updateBytes, BigInt(100))
        // payload starts at offset 102
        // Skip payload header: 4 magic + 8 timestamp + 1 channel + 1 feeds_len = 14 bytes
        // First feed starts at 102 + 14 = 116
        val feedOffset = BigInt(116)
        val feedId = leToU32(updateBytes, feedOffset)
        require(feedId === ADA_USD_FEED_ID, "Expected ADA/USD feed")
        val propsLen = readU8(updateBytes, feedOffset + 4)
        // Parse first property which should be Price (prop_id = 0)
        val propOffset = feedOffset + 5
        val propId = readU8(updateBytes, propOffset)
        require(propId === BigInt(0), "First property must be Price")
        val price = leToI64(updateBytes, propOffset + 1)
        require(price > BigInt(0), "Price must be positive")
        price
    }

    /** Get Pyth price from transaction.
      *
      * 1. Find Pyth State UTxO in reference inputs 2. Extract withdraw_script hash from datum 3.
      * Find withdrawal redeemer for that script 4. Parse price from first update
      */
    def getPythPrice(tx: TxInfo, pythPolicyId: ByteString): BigInt = {
        // 1. Find Pyth State UTxO in reference inputs
        val pythState = tx.referenceInputs
            .find(ref =>
                ref.resolved.value.quantityOf(pythPolicyId, PYTH_STATE_NAME) === BigInt(1)
            )
            .getOrFail("Pyth State reference input not found")

        // 2. Extract withdraw_script hash from Pyth state datum (4th field)
        val stateDatum = pythState.resolved.datum match
            case OutputDatum.OutputDatum(d) => d
            case _                          => fail("Pyth State must have inline datum")
        val stateFields = stateDatum.toConstr.snd
        // fields: governance, trusted_signers, deprecated_withdraw_scripts, withdraw_script
        val withdrawScript = stateFields.tail.tail.tail.head.toByteString

        // 3. Find withdrawal redeemer for the Pyth withdraw script
        val withdrawRedeemer = tx.redeemers
            .get(ScriptPurpose.Rewarding(ScriptCredential(withdrawScript)))
            .getOrFail("Pyth withdrawal redeemer not found")

        // 4. Parse the redeemer (List<ByteArray>), take first update
        val updates = withdrawRedeemer.toList
        val updateBytes = updates.head.toByteString

        // 5. Parse price from the update
        parsePythPrice(updateBytes)
    }

    /** LTV check using cross-multiplication.
      *
      * LTV = debt / (collateral * price / ORACLE_SCALE) * 100 Rearranged: debt * LTV_SCALE *
      * ORACLE_SCALE <= threshold * collateral * price
      */
    def isLtvBelow(
        collateralLovelace: BigInt,
        price: BigInt,
        debt: BigInt,
        threshold: BigInt
    ): Boolean =
        debt * LTV_SCALE * ORACLE_SCALE <= threshold * collateralLovelace * price

    /** Decode inline datum from a transaction output, failing if it's a datum hash or missing. */
    def getInlineCdpDatum(d: OutputDatum): CdpDatum = d match
        case OutputDatum.OutputDatum(data) => data.to[CdpDatum]
        case _                             => fail("Expected inline datum")

    /** Find the single continuing output at the script address and verify it holds the CDP NFT.
      * Used by Borrow and Repay to ensure the CDP UTxO is preserved (not consumed without replacement).
      */
    def getContinuingCdp(
        tx: TxInfo,
        cred: Credential,
        scriptHash: PolicyId,
        nftName: TokenName
    ): TxOut = {
        val output = tx
            .findOwnOutputsByCredential(cred)
            .oneOrFail("Must leave exactly one continuing CDP output")
        require(
          output.value.quantityOf(scriptHash, nftName) === BigInt(1),
          "CDP NFT must be preserved"
        )
        output
    }

    // --- SPEND HANDLER ---
    // Validates spending of an existing CDP UTxO. Each action enforces different rules:
    //   Borrow:    owner-only, debt increases, new LTV stays under 95%
    //   Repay:     owner-only, debt decreases, LTV checked only if collateral withdrawn
    //   Close:     owner-only, all debt burned as PUSD, NFT burned, collateral returned
    //   Liquidate: permissionless, CDP must be above 90% LTV, debt burned, NFT burned
    //   Open:      rejected here (Open is handled only by the mint handler)
    inline override def spend(
        param: Data,
        datum: Option[Data],
        redeemer: Data,
        tx: TxInfo,
        ownRef: TxOutRef
    ): Unit = {
        val params = param.to[CdpParams]
        val action = redeemer.to[CdpAction]
        val cdp = datum.getOrFail("Expected CDP datum").to[CdpDatum]
        val ownInput = tx.findOwnInputOrFail(ownRef)
        val ScriptCredential(scriptHash) = ownInput.resolved.address.credential: @unchecked
        val cred = ScriptCredential(scriptHash)

        // Extract the CDP NFT name from the input being spent.
        // Each CDP holds exactly one unique NFT (non-PUSD token) under the script's policy.
        val inputTokens = ownInput.resolved.value.tokens(scriptHash)
        require(inputTokens.size === BigInt(1), "Input must contain exactly one CDP NFT")
        val nftName = inputTokens.toList.head._1
        require(inputTokens.toList.head._2 === BigInt(1), "NFT quantity must be 1")

        action match
            case CdpAction.Borrow =>
                // Borrow: owner mints additional PUSD against existing collateral.
                // The CDP must be returned with the same NFT and same owner, higher debt,
                // and the new LTV must remain under MAX_LTV (95%).
                require(tx.isSignedBy(cdp.owner), "Owner signature required")
                val price = getPythPrice(tx, params.pythPolicyId)
                val output = getContinuingCdp(tx, cred, scriptHash, nftName)
                val newDatum = getInlineCdpDatum(output.datum)
                require(newDatum.owner === cdp.owner, "Owner cannot change")
                require(newDatum.debt > cdp.debt, "Debt must increase")
                require(
                  isLtvBelow(output.value.getLovelace, price, newDatum.debt, MAX_LTV),
                  "LTV above maximum"
                )

            case CdpAction.Repay =>
                // Repay: owner burns PUSD to reduce debt.
                // Collateral withdrawal is allowed only if the resulting LTV stays under MAX_LTV.
                // If collateral stays the same or increases, no price check needed.
                require(tx.isSignedBy(cdp.owner), "Owner signature required")
                val output = getContinuingCdp(tx, cred, scriptHash, nftName)
                val newDatum = getInlineCdpDatum(output.datum)
                require(newDatum.owner === cdp.owner, "Owner cannot change")
                require(newDatum.debt < cdp.debt, "Debt must decrease")
                if output.value.getLovelace < ownInput.resolved.value.getLovelace then
                    val price = getPythPrice(tx, params.pythPolicyId)
                    require(
                      isLtvBelow(output.value.getLovelace, price, newDatum.debt, MAX_LTV),
                      "LTV above maximum"
                    )

            case CdpAction.Close =>
                // Close: owner fully repays debt and reclaims all collateral.
                // All PUSD debt must be burned, the CDP NFT burned, and collateral
                // sent back to the owner's address (sum of all outputs to owner >= collateral).
                require(tx.isSignedBy(cdp.owner), "Owner signature required")
                require(
                  tx.mint.quantityOf(scriptHash, PUSD_TOKEN_NAME) <= -cdp.debt,
                  "Must burn debt in PUSD"
                )
                require(
                  tx.mint.quantityOf(scriptHash, nftName) === BigInt(-1),
                  "Must burn CDP NFT"
                )
                require(
                  tx.outputs
                      .filter(_.address.credential === PubKeyCredential(cdp.owner))
                      .foldLeft(BigInt(0))((sum, output) => sum + output.value.getLovelace) >=
                      ownInput.resolved.value.getLovelace,
                  "All collateral must be returned to owner"
                )

            case CdpAction.Liquidate =>
                // Liquidate: anyone can liquidate a CDP whose LTV exceeds the 90% threshold.
                // The liquidator must burn enough PUSD to cover the debt and burn the NFT.
                // The collateral is released to the liquidator (enforced off-chain by the tx builder).
                val price = getPythPrice(tx, params.pythPolicyId)
                require(
                  !isLtvBelow(
                    ownInput.resolved.value.getLovelace,
                    price,
                    cdp.debt,
                    LIQ_THRESHOLD
                  ),
                  "Not liquidatable, LTV below threshold"
                )
                require(
                  tx.mint.quantityOf(scriptHash, PUSD_TOKEN_NAME) <= -cdp.debt,
                  "Must burn debt in PUSD"
                )
                require(
                  tx.mint.quantityOf(scriptHash, nftName) === BigInt(-1),
                  "Must burn CDP NFT"
                )

            case CdpAction.Open =>
                fail("Open does not spend a CDP")
    }

    // --- MINT HANDLER ---
    // Controls PUSD minting and burning, and CDP NFT lifecycle.
    // The mint handler works in concert with the spend handler:
    //   - For Borrow/Repay/Close/Liquidate: cross-checks that the spend redeemer matches
    //   - For Open: validates new CDP creation (no existing CDP may be spent)
    // This dual-validation pattern ensures both the UTxO state transition and the token
    // supply change are consistent and authorized.
    inline override def mint(
        param: Data,
        redeemer: Data,
        policyId: PolicyId,
        tx: TxInfo
    ): Unit = {
        val params = param.to[CdpParams]
        val action = redeemer.to[CdpAction]
        val vusdDelta = tx.mint.quantityOf(policyId, PUSD_TOKEN_NAME)
        val mintedTokens = tx.mint.tokens(policyId)
        // Separate NFT mints/burns from PUSD mints/burns
        val nftEntries = mintedTokens.toList.filter { case (name, _) =>
            name !== PUSD_TOKEN_NAME
        }

        action match
            case CdpAction.Open =>
                // Open: create a fresh CDP with collateral and mint PUSD.
                // Mints exactly 1 unique NFT (CDP identifier) + PUSD equal to the new debt.
                // No existing CDP UTxO may be spent (prevents re-opening).
                val price = getPythPrice(tx, params.pythPolicyId)
                val cred = ScriptCredential(policyId)
                require(
                  tx.findOwnInputsByCredential(cred).isEmpty,
                  "Open must not spend existing CDP"
                )
                val nft = nftEntries.oneOrFail("Must mint exactly one CDP NFT")
                require(nft._2 === BigInt(1), "Must mint exactly 1 NFT")
                val output = tx
                    .findOwnOutputsByCredential(cred)
                    .oneOrFail("Must create exactly one CDP output")
                val newDatum = getInlineCdpDatum(output.datum)
                require(
                  output.value.quantityOf(policyId, nft._1) === BigInt(1),
                  "CDP output must hold the freshly minted NFT"
                )
                require(vusdDelta === newDatum.debt, "PUSD must match debt")
                require(newDatum.debt > BigInt(0), "Debt must be positive")
                require(
                  isLtvBelow(output.value.getLovelace, price, newDatum.debt, MAX_LTV),
                  "LTV above maximum"
                )

            case CdpAction.Borrow =>
                // Borrow mint: verify PUSD delta equals the debt increase.
                // Cross-checks the spend redeemer to ensure the CDP is also being spent with Borrow.
                require(nftEntries.isEmpty, "Borrow must not mint/burn NFT")
                val cdpInput = tx.inputs
                    .filter(_.resolved.address.credential === ScriptCredential(policyId))
                    .oneOrFail("Must spend exactly one CDP")
                val spendAction = tx.redeemers
                    .get(ScriptPurpose.Spending(cdpInput.outRef))
                    .getOrFail("Missing spend redeemer")
                    .to[CdpAction]
                spendAction match
                    case CdpAction.Borrow => ()
                    case _                => fail("Mint and spend actions must match")
                val oldDatum = getInlineCdpDatum(cdpInput.resolved.datum)
                val cdpOutput = tx.outputs
                    .filter(_.address.credential === ScriptCredential(policyId))
                    .oneOrFail("Must have continuing output")
                val newDatum = getInlineCdpDatum(cdpOutput.datum)
                require(
                  vusdDelta === newDatum.debt - oldDatum.debt,
                  "PUSD delta must match debt change"
                )

            case CdpAction.Repay =>
                // Repay mint: verify PUSD burned (negative delta) equals the debt decrease.
                require(nftEntries.isEmpty, "Repay must not mint/burn NFT")
                val cdpInput = tx.inputs
                    .filter(_.resolved.address.credential === ScriptCredential(policyId))
                    .oneOrFail("Must spend exactly one CDP")
                val spendAction = tx.redeemers
                    .get(ScriptPurpose.Spending(cdpInput.outRef))
                    .getOrFail("Missing spend redeemer")
                    .to[CdpAction]
                spendAction match
                    case CdpAction.Repay => ()
                    case _               => fail("Mint and spend actions must match")
                val oldDatum = getInlineCdpDatum(cdpInput.resolved.datum)
                val cdpOutput = tx.outputs
                    .filter(_.address.credential === ScriptCredential(policyId))
                    .oneOrFail("Must have continuing output")
                val newDatum = getInlineCdpDatum(cdpOutput.datum)
                require(
                  vusdDelta === newDatum.debt - oldDatum.debt,
                  "PUSD delta must match debt change"
                )

            case CdpAction.Close =>
                // Close mint: burn exactly the debt amount of PUSD and burn the CDP NFT.
                val cdpInput = tx.inputs
                    .filter(_.resolved.address.credential === ScriptCredential(policyId))
                    .oneOrFail("Must spend exactly one CDP")
                val burned = nftEntries.oneOrFail("Close must burn exactly one CDP NFT")
                require(burned._2 === BigInt(-1), "Close must burn exactly one CDP NFT")
                val spendAction = tx.redeemers
                    .get(ScriptPurpose.Spending(cdpInput.outRef))
                    .getOrFail("Missing spend redeemer")
                    .to[CdpAction]
                spendAction match
                    case CdpAction.Close => ()
                    case _               => fail("Mint and spend actions must match")
                val oldDatum = getInlineCdpDatum(cdpInput.resolved.datum)
                require(vusdDelta === -oldDatum.debt, "PUSD burn must match debt")

            case CdpAction.Liquidate =>
                // Liquidate mint: supports batch liquidation of multiple CDPs in one tx.
                // All CDP NFTs must be burned, and total PUSD burned must equal total debt.
                val cdpCred = ScriptCredential(policyId)
                val cdpInputs = tx.inputs.filter(_.resolved.address.credential === cdpCred)
                require(cdpInputs.nonEmpty, "Must spend at least one CDP")
                require(
                  nftEntries.forall { case (_, qty) => qty === BigInt(-1) },
                  "All CDP NFTs must be burned"
                )
                require(
                  nftEntries.size === cdpInputs.size,
                  "NFT burn count must match CDP input count"
                )
                val totalDebt = cdpInputs.foldLeft(BigInt(0)) { (sum, cdpInput) =>
                    val spendAction = tx.redeemers
                        .get(ScriptPurpose.Spending(cdpInput.outRef))
                        .getOrFail("Missing spend redeemer")
                        .to[CdpAction]
                    spendAction match
                        case CdpAction.Liquidate => ()
                        case _                   => fail("Mint and spend actions must match")
                    val oldDatum = getInlineCdpDatum(cdpInput.resolved.datum)
                    sum + oldDatum.debt
                }
                require(vusdDelta === -totalDebt, "PUSD burn must match total debt")
    }
}
