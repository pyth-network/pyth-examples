/**
 * Unfrack UTxO Optimization Module
 *
 * Implements Unfrack.It principles for efficient wallet structure:
 * - Token bundling: Group tokens into optimally-sized UTxOs
 * - Fungible isolation: Place each fungible token on its own UTxO
 * - NFT grouping: Group NFTs by policy ID
 * - ADA optimization: Roll up or subdivide ADA-only
 *
 * Named in respect to the Unfrack.It website
 */

import * as Effect from "effect/Effect"

import type * as CoreAddress from "../../Address.js"
import * as CoreAssets from "../../Assets/index.js"
import type * as TxOut from "../../TxOut.js"
import type { UnfrackOptions } from "./TransactionBuilder.js"
import { calculateMinimumUtxoLovelace, txOutputToTransactionOutput } from "./TxBuilderImpl.js"

// ============================================================================
// Default Unfrack Options
// ============================================================================

/**
 * Default unfrack configuration values.
 * Applied when UnfrackOptions properties are not provided.
 */
const DEFAULT_UNFRACK_OPTIONS = {
  ada: {
    subdivideThreshold: 100_000000n,
    subdividePercentages: [50, 15, 10, 10, 5, 5, 5],
    maxUtxosToConsolidate: 20 // NOTE: Not yet implemented
  },
  tokens: {
    bundleSize: 10,
    isolateFungibles: false,
    groupNftsByPolicy: false
  }
} as const

// ============================================================================
// Token Classification
// ============================================================================

/**
 * Token classification for unfracking decisions
 */
export interface TokenInfo {
  readonly policyId: string
  readonly assetName: string
  readonly quantity: bigint
  readonly isFungible: boolean // True if fungible token, false if NFT
}

/**
 * Extract tokens from assets
 */
export const extractTokens = (assets: CoreAssets.Assets): ReadonlyArray<TokenInfo> => {
  const tokens: Array<TokenInfo> = []

  for (const unit of CoreAssets.getUnits(assets)) {
    // Skip lovelace
    if (unit === "lovelace") continue

    // Parse policy ID and asset name from unit
    // PolicyId is always 56 hex characters (28 bytes), asset name is the rest
    const policyId = unit.slice(0, 56)
    const assetName = unit.slice(56)
    const quantity = CoreAssets.getByUnit(assets, unit)

    // Simple heuristic: NFTs typically have quantity of 1
    // More sophisticated detection could check metadata
    const isFungible = quantity > 1n

    tokens.push({
      policyId,
      assetName,
      quantity,
      isFungible
    })
  }

  return tokens
}

/**
 * Group tokens by policy ID
 */
export const groupByPolicy = (tokens: ReadonlyArray<TokenInfo>): Map<string, ReadonlyArray<TokenInfo>> => {
  const grouped = new Map<string, Array<TokenInfo>>()

  for (const token of tokens) {
    const existing = grouped.get(token.policyId) || []
    grouped.set(token.policyId, [...existing, token])
  }

  return grouped
}

// ============================================================================
// Token Bundling Strategy
// ============================================================================

/**
 * Bundle result - multiple UTxOs each containing bundled tokens
 */
export interface TokenBundle {
  readonly tokens: ReadonlyArray<TokenInfo>
  readonly adaAmount: bigint // Minimum ADA for this bundle
}

/**
 * Calculate minimum lovelace required for a bundle of tokens
 * Uses CBOR-based calculation for accuracy
 */
const calculateBundleMinUTxO = (
  bundleTokens: ReadonlyArray<TokenInfo>,
  changeAddress: CoreAddress.Address,
  coinsPerUtxoByte: bigint
): Effect.Effect<bigint, Error, never> =>
  Effect.gen(function* () {
    // Build Assets object with the bundle tokens using CoreAssets
    let bundleAssets = CoreAssets.zero // Start with empty assets

    for (const token of bundleTokens) {
      // Build unit as "policyId.assetName"
      const unit = token.policyId + "." + token.assetName
      const tokenAssets = yield* CoreAssets.fromUnit(unit, token.quantity)
      bundleAssets = CoreAssets.merge(bundleAssets, tokenAssets)
    }

    // Calculate minimum UTxO using CBOR
    const minUtxo = yield* calculateMinimumUtxoLovelace({
      address: changeAddress,
      assets: bundleAssets,
      coinsPerUtxoByte
    })

    return minUtxo
  })

/**
 * Calculate bundles based on unfrack configuration
 * Now calculates proper minUTxO for each bundle using CBOR
 */
export const calculateTokenBundles = (
  tokens: ReadonlyArray<TokenInfo>,
  options: UnfrackOptions,
  changeAddress: CoreAddress.Address,
  coinsPerUtxoByte: bigint
): Effect.Effect<ReadonlyArray<TokenBundle>, Error, never> =>
  Effect.gen(function* () {
    const bundleSize = options.tokens?.bundleSize ?? 10
    const isolateFungibles = options.tokens?.isolateFungibles ?? false
    const groupNftsByPolicy = options.tokens?.groupNftsByPolicy ?? false

    const bundles: Array<TokenBundle> = []

    // Separate fungibles and NFTs
    const fungibles = tokens.filter((t) => t.isFungible)
    const nfts = tokens.filter((t) => !t.isFungible)

    // Handle fungibles
    if (isolateFungibles) {
      // Each fungible policy gets its own UTxO
      const fungiblesByPolicy = groupByPolicy(fungibles)

      for (const [_, policyTokens] of fungiblesByPolicy) {
        const minUtxo = yield* calculateBundleMinUTxO(policyTokens, changeAddress, coinsPerUtxoByte)
        bundles.push({
          tokens: policyTokens,
          adaAmount: minUtxo
        })
      }
    } else {
      // Bundle fungibles with standard bundling rules
      const fungibleBundles = yield* bundleTokensWithRules(fungibles, bundleSize, changeAddress, coinsPerUtxoByte)
      bundles.push(...fungibleBundles)
    }

    // Handle NFTs
    if (groupNftsByPolicy) {
      // Group NFTs by policy
      const nftsByPolicy = groupByPolicy(nfts)

      for (const [_, policyNfts] of nftsByPolicy) {
        const minUtxo = yield* calculateBundleMinUTxO(policyNfts, changeAddress, coinsPerUtxoByte)
        bundles.push({
          tokens: policyNfts,
          adaAmount: minUtxo
        })
      }
    } else {
      // Bundle NFTs with standard bundling rules
      const nftBundles = yield* bundleTokensWithRules(nfts, bundleSize, changeAddress, coinsPerUtxoByte)
      bundles.push(...nftBundles)
    }

    return bundles
  })

/**
 * Bundle tokens following standard bundling rules:
 * - Same policy: up to bundleSize tokens
 * - Different policies: up to bundleSize/2 tokens
 * Now calculates proper minUTxO for each bundle
 */
const bundleTokensWithRules = (
  tokens: ReadonlyArray<TokenInfo>,
  bundleSize: number,
  changeAddress: CoreAddress.Address,
  coinsPerUtxoByte: bigint
): Effect.Effect<ReadonlyArray<TokenBundle>, Error, never> =>
  Effect.gen(function* () {
    const bundles: Array<TokenBundle> = []
    const tokensByPolicy = groupByPolicy(tokens)

    // First, handle same-policy bundles
    for (const [_, policyTokens] of tokensByPolicy) {
      if (policyTokens.length <= bundleSize) {
        // All tokens from this policy fit in one bundle
        const minUtxo = yield* calculateBundleMinUTxO(policyTokens, changeAddress, coinsPerUtxoByte)
        bundles.push({
          tokens: policyTokens,
          adaAmount: minUtxo
        })
      } else {
        // Split into multiple bundles
        for (let i = 0; i < policyTokens.length; i += bundleSize) {
          const bundleTokens = policyTokens.slice(i, i + bundleSize)
          const minUtxo = yield* calculateBundleMinUTxO(bundleTokens, changeAddress, coinsPerUtxoByte)
          bundles.push({
            tokens: bundleTokens,
            adaAmount: minUtxo
          })
        }
      }
    }

    return bundles
  })

// ============================================================================
// ADA Subdivision Strategy
// ============================================================================

/**
 * Calculate ADA subdivision if needed
 */
/**
 * Calculate ADA subdivision amounts based on percentages
 *
 * @returns Array of bigint amounts for subdivision
 */
export const calculateAdaSubdivision = (
  leftoverAda: bigint,
  options: UnfrackOptions
): Effect.Effect<ReadonlyArray<bigint>, never, never> => {
  return Effect.gen(function* () {
    const threshold = options.ada?.subdivideThreshold ?? 100_000000n
    const percentages = options.ada?.subdividePercentages ?? [50, 15, 10, 10, 5, 5, 5]

    yield* Effect.logDebug(`[Unfrack.calculateAdaSubdivision] leftoverAda=${leftoverAda}, threshold=${threshold}`)

    // Check if subdivision is needed
    if (leftoverAda <= threshold) {
      yield* Effect.logDebug(`[Unfrack.calculateAdaSubdivision] Below threshold, returning single amount`)
      return [leftoverAda]
    }

    yield* Effect.logDebug(
      `[Unfrack.calculateAdaSubdivision] Above threshold, subdividing with ${percentages.length} percentages`
    )

    // Calculate subdivision amounts
    const amounts: Array<bigint> = []
    let remaining = leftoverAda

    for (let i = 0; i < percentages.length; i++) {
      const percentage = percentages[i]
      const amount = (leftoverAda * BigInt(percentage)) / 100n

      // Last one gets the remainder
      if (i === percentages.length - 1) {
        amounts.push(remaining)
        yield* Effect.logDebug(`[Unfrack.calculateAdaSubdivision] [${i}] ${percentage}% => ${remaining} (remainder)`)
      } else {
        amounts.push(amount)
        remaining -= amount
        yield* Effect.logDebug(`[Unfrack.calculateAdaSubdivision] [${i}] ${percentage}% => ${amount}`)
      }
    }

    yield* Effect.logDebug(`[Unfrack.calculateAdaSubdivision] Returning ${amounts.length} amounts`)
    return amounts
  })
}

// ============================================================================
// Change Output Creation with Unfracking
// ============================================================================

/**
 * Create optimized change outputs using unfracking strategies
 * Now uses CBOR-based minUTxO calculation for each bundle
 */
/**
 * Result of unfrack change output creation
 */
export type UnfrackResult = {
  /**
   * The change outputs if unfrack was affordable, undefined otherwise
   */
  changeOutputs?: ReadonlyArray<TxOut.TransactionOutput>
  /**
   * Total minimum lovelace required for all outputs
   * This is the sum of minUTxO for all N outputs
   */
  totalMinLovelace: bigint
}

/**
 * Creates optimal change outputs by distributing change assets across multiple UTxOs.
 *
 * ## First Principles:
 *
 * 1. **Single Responsibility**: Create valid change outputs that optimally distribute the given assets
 * 2. **Validity Guarantee**: All outputs MUST meet their minUTxO requirements (protocol constraint)
 * 3. **Asset Conservation**: All input assets must appear in outputs (no assets lost)
 * 4. **Token Separation**: Tokens are bundled by policy to avoid mixing unnecessary assets
 * 5. **ADA Efficiency**: Remaining ADA is either separated (if significant) or distributed (if small)
 *
 * ## Strategy:
 *
 * 1. **No tokens**: Return single ADA-only output
 * 2. **With tokens**:
 *    - Create token bundles with minimum required ADA (minUTxO)
 *    - Calculate remaining ADA after bundles
 *    - If remaining >= threshold AND affordable: Create separate ADA output (subdivision)
 *    - Otherwise: Distribute remaining across bundles (spread)
 *
 * ## Affordability Check:
 *
 * Before creating a separate ADA output, verify that:
 * - remaining >= subdivideThreshold (user preference)
 * - remaining >= minUTxO for ADA-only output (protocol requirement)
 *
 * If either check fails, fall back to spreading the remaining ADA across token bundles.
 * This ensures all outputs are always valid.
 *
 * @since 2.0.0
 * @category builders
 */
export const createUnfrackedChangeOutputs = (
  changeAddress: CoreAddress.Address,
  changeAssets: CoreAssets.Assets,
  options: UnfrackOptions = {},
  coinsPerUtxoByte: bigint
): Effect.Effect<ReadonlyArray<TxOut.TransactionOutput>, Error, never> => {
  return Effect.gen(function* () {
    // Extract config values from options, applying defaults
    const subdivideThreshold = options.ada?.subdivideThreshold ?? DEFAULT_UNFRACK_OPTIONS.ada.subdivideThreshold
    const bundleSize = options.tokens?.bundleSize ?? DEFAULT_UNFRACK_OPTIONS.tokens.bundleSize
    const subdividePercentages = options.ada?.subdividePercentages ?? DEFAULT_UNFRACK_OPTIONS.ada.subdividePercentages

    const availableLovelace = CoreAssets.lovelaceOf(changeAssets)
    const tokens = extractTokens(changeAssets)

    yield* Effect.logDebug(`[Unfrack] Available: ${availableLovelace} lovelace, ${tokens.length} tokens`)

    // Special case: No tokens - check if ADA subdivision should happen
    if (tokens.length === 0) {
      // Check if ADA amount is above subdivision threshold
      if (availableLovelace >= subdivideThreshold) {
        yield* Effect.logDebug(
          `[Unfrack] No tokens, but ADA (${availableLovelace}) >= threshold (${subdivideThreshold}), checking subdivision affordability`
        )

        // Calculate minUTxO for single ADA output
        const adaMinUTxO = yield* calculateMinimumUtxoLovelace({
          address: changeAddress,
          assets: CoreAssets.fromLovelace(1_000_000n), // Use 1 ADA for minUTxO estimation
          coinsPerUtxoByte
        })

        yield* Effect.logDebug(`[Unfrack] ADA-only output minUTxO: ${adaMinUTxO}`)

        // Calculate subdivision amounts
        const percentages = subdividePercentages ?? [50, 15, 10, 10, 5, 5, 5]

        // Check if subdivision is affordable: verify smallest percentage-based output meets minUTxO
        const smallestPercentage = Math.min(...percentages)
        const smallestAmount = (availableLovelace * BigInt(smallestPercentage)) / 100n

        if (smallestAmount >= adaMinUTxO) {
          yield* Effect.logDebug(`[Unfrack] Subdivision affordable! Creating ${percentages.length} ADA outputs`)

          // Calculate amounts for each output
          const outputs: Array<TxOut.TransactionOutput> = []
          let remaining = availableLovelace

          for (let i = 0; i < percentages.length; i++) {
            const percentage = percentages[i]
            let amount: bigint

            // Last output gets remainder
            if (i === percentages.length - 1) {
              amount = remaining
            } else {
              amount = (availableLovelace * BigInt(percentage)) / 100n
              remaining = remaining - amount
            }

            const output = yield* txOutputToTransactionOutput({
              address: changeAddress,
              assets: CoreAssets.fromLovelace(amount)
            })
            outputs.push(output)
          }

          yield* Effect.logDebug(`[Unfrack] Created ${outputs.length} subdivided ADA outputs`)
          return outputs
        } else {
          yield* Effect.logDebug(
            `[Unfrack] Subdivision NOT affordable (smallest output ${smallestAmount} < minUTxO ${adaMinUTxO}), returning single ADA output`
          )
          const output = yield* txOutputToTransactionOutput({
            address: changeAddress,
            assets: CoreAssets.fromLovelace(availableLovelace)
          })
          return [output]
        }
      } else {
        yield* Effect.logDebug(`[Unfrack] No tokens, ADA below threshold, returning single ADA output`)
        const output = yield* txOutputToTransactionOutput({
          address: changeAddress,
          assets: CoreAssets.fromLovelace(availableLovelace)
        })
        return [output]
      }
    }

    // Create token bundles
    yield* Effect.logDebug(`[Unfrack] Creating token bundles (size: ${bundleSize})`)

    const bundles: Array<{ tokens: Array<TokenInfo>; minUTxO: bigint; assets: CoreAssets.Assets }> = []

    // Group tokens by policy
    const tokensByPolicy = new Map<string, Array<TokenInfo>>()
    for (const token of tokens) {
      const existing = tokensByPolicy.get(token.policyId) || []
      existing.push(token)
      tokensByPolicy.set(token.policyId, existing)
    }

    // Create bundles for each policy, respecting bundleSize
    for (const [_policyId, policyTokens] of tokensByPolicy) {
      // Split tokens into bundles of bundleSize
      if (policyTokens.length <= bundleSize) {
        // All tokens fit in one bundle
        let bundleAssets = CoreAssets.zero
        for (const token of policyTokens) {
          // Use sync helper with hex strings from TokenInfo
          const tokenAssets = CoreAssets.fromHexStrings(token.policyId, token.assetName, token.quantity)
          bundleAssets = CoreAssets.merge(bundleAssets, tokenAssets)
        }

        // Calculate minUTxO for this bundle
        const minUTxO = yield* calculateMinimumUtxoLovelace({
          address: changeAddress,
          assets: CoreAssets.merge(bundleAssets, CoreAssets.fromLovelace(1_000_000n)), // Add 1 ADA for calculation
          coinsPerUtxoByte
        })

        bundles.push({
          tokens: policyTokens,
          minUTxO,
          assets: CoreAssets.merge(bundleAssets, CoreAssets.fromLovelace(minUTxO))
        })
      } else {
        // Split into multiple bundles
        for (let i = 0; i < policyTokens.length; i += bundleSize) {
          const bundleTokens = policyTokens.slice(i, i + bundleSize)
          let bundleAssets = CoreAssets.zero

          for (const token of bundleTokens) {
            const tokenAssets = CoreAssets.fromHexStrings(token.policyId, token.assetName, token.quantity)
            bundleAssets = CoreAssets.merge(bundleAssets, tokenAssets)
          }

          // Calculate minUTxO for this bundle
          const minUTxO = yield* calculateMinimumUtxoLovelace({
            address: changeAddress,
            assets: CoreAssets.merge(bundleAssets, CoreAssets.fromLovelace(1_000_000n)), // Add 1 ADA for calculation
            coinsPerUtxoByte
          })

          bundles.push({
            tokens: bundleTokens,
            minUTxO,
            assets: CoreAssets.merge(bundleAssets, CoreAssets.fromLovelace(minUTxO))
          })
        }
      }
    }

    const bundlesMinUTxO = bundles.reduce((sum, b) => sum + b.minUTxO, 0n)
    yield* Effect.logDebug(`[Unfrack] ${bundles.length} bundles need ${bundlesMinUTxO} lovelace minimum`)

    // Calculate remaining lovelace
    const remaining = availableLovelace - bundlesMinUTxO
    yield* Effect.logDebug(`[Unfrack] Remaining after bundles: ${remaining} lovelace`)

    // Check if remaining is negative - bundles are unaffordable
    // This should never happen in production (ChangeCreation validates affordability)
    // But for unit testing, we need to handle gracefully
    if (remaining < 0n) {
      yield* Effect.logDebug(
        `[Unfrack] Insufficient lovelace for ${bundles.length} bundles! ` +
          `Need ${bundlesMinUTxO}, have ${availableLovelace}. ` +
          `Falling back to single change output (guaranteed affordable by ChangeCreation pre-flight check).`
      )

      // Return single output with all assets
      // Note: ChangeCreation's Step 4 has already verified this is affordable
      const output = yield* txOutputToTransactionOutput({
        address: changeAddress,
        assets: changeAssets
      })
      return [output]
    }

    // Decide strategy: Subdivision or Spread
    if (remaining >= subdivideThreshold) {
      yield* Effect.logDebug(
        `[Unfrack] Remaining (${remaining}) >= threshold (${subdivideThreshold}), checking subdivision affordability`
      )

      // Calculate minUTxO for ADA-only output
      const adaMinUTxO = yield* calculateMinimumUtxoLovelace({
        address: changeAddress,
        assets: CoreAssets.fromLovelace(remaining),
        coinsPerUtxoByte
      })

      yield* Effect.logDebug(`[Unfrack] ADA output minUTxO: ${adaMinUTxO}`)

      // Affordability check
      if (remaining >= adaMinUTxO) {
        // Create bundle outputs with minUTxO
        const bundleOutputs: Array<TxOut.TransactionOutput> = []
        for (const b of bundles) {
          const output = yield* txOutputToTransactionOutput({
            address: changeAddress,
            assets: b.assets
          })
          bundleOutputs.push(output)
        }

        // Check if we should subdivide the remaining ADA: verify smallest percentage meets minUTxO
        const percentages = subdividePercentages ?? [50, 15, 10, 10, 5, 5, 5]
        const smallestPercentage = Math.min(...percentages)
        const smallestAmount = (remaining * BigInt(smallestPercentage)) / 100n

        if (smallestAmount >= adaMinUTxO) {
          // Subdivide remaining ADA into multiple outputs
          yield* Effect.logDebug(
            `[Unfrack] Subdivision affordable! Creating ${bundles.length} bundles + ${percentages.length} subdivided ADA outputs`
          )

          const adaOutputs: Array<TxOut.TransactionOutput> = []
          let remainingAda = remaining

          for (let i = 0; i < percentages.length; i++) {
            const percentage = percentages[i]
            let amount: bigint

            // Last output gets remainder
            if (i === percentages.length - 1) {
              amount = remainingAda
            } else {
              amount = (remaining * BigInt(percentage)) / 100n
              remainingAda = remainingAda - amount
            }

            const output = yield* txOutputToTransactionOutput({
              address: changeAddress,
              assets: CoreAssets.fromLovelace(amount)
            })
            adaOutputs.push(output)
          }

          return [...bundleOutputs, ...adaOutputs]
        } else {
          // Create single ADA output (subdivision not affordable)
          yield* Effect.logDebug(
            `[Unfrack] Subdivision NOT affordable (smallest output ${smallestAmount} < minUTxO ${adaMinUTxO}), creating ${bundles.length} bundles + 1 ADA output`
          )

          const adaOutput = yield* txOutputToTransactionOutput({
            address: changeAddress,
            assets: CoreAssets.fromLovelace(remaining)
          })

          return [...bundleOutputs, adaOutput]
        }
      } else {
        // Remaining ADA < minUTxO for standalone output - must spread across token bundles
        yield* Effect.logDebug(
          `[Unfrack] Insufficient ADA for standalone output (${remaining} < ${adaMinUTxO}), spreading across bundles`
        )
        // Fall through to spread logic below
      }
    }

    // SPREAD: Distribute remaining across bundles
    // This happens when:
    // - remaining < subdivideThreshold, OR
    // - remaining >= subdivideThreshold BUT < minUTxO for standalone output
    yield* Effect.logDebug(`[Unfrack] Spreading ${remaining} lovelace across ${bundles.length} token bundles`)

    const numBundles = BigInt(bundles.length)
    const perBundle = remaining / numBundles
    const extraForLast = remaining % numBundles

    yield* Effect.logDebug(`[Unfrack] Each bundle gets ${perBundle} lovelace, last gets ${extraForLast} extra`)

    const spreadOutputs: Array<TxOut.TransactionOutput> = []
    for (let i = 0; i < bundles.length; i++) {
      const bundle = bundles[i]
      const extra = i === bundles.length - 1 ? perBundle + extraForLast : perBundle
      const output = yield* txOutputToTransactionOutput({
        address: changeAddress,
        assets: CoreAssets.merge(bundle.assets, CoreAssets.fromLovelace(extra))
      })
      spreadOutputs.push(output)
    }
    return spreadOutputs
  })
}
