import { Data, type Effect, type Schedule } from "effect"

import type * as CoreUTxO from "../../UTxO.js"
import type { ReadOnlyTransactionBuilder, SigningTransactionBuilder } from "../builders/TransactionBuilder.js"
import type * as Provider from "../provider/Provider.js"
import type { EffectToPromiseAPI } from "../Type.js"
import type {
  ApiWalletEffect,
  ReadOnlyWalletEffect,
  SigningWalletEffect,
  WalletApi,
  WalletError
} from "../wallet/WalletNew.js"

/**
 * Error class for provider-related operations.
 *
 * @since 2.0.0
 * @category errors
 */
export class ProviderError extends Data.TaggedError("ProviderError")<{
  message?: string
  cause?: unknown
}> {}

/**
 * MinimalClient Effect - holds network context.
 *
 * @since 2.0.0
 * @category model
 */
export interface MinimalClientEffect {
  readonly networkId: Effect.Effect<number | string, never>
}

/**
 * ReadOnlyClient Effect - provider, read-only wallet, and utility methods.
 *
 * @since 2.0.0
 * @category model
 */
export interface ReadOnlyClientEffect extends Provider.ProviderEffect, ReadOnlyWalletEffect {
  readonly getWalletUtxos: () => Effect.Effect<ReadonlyArray<CoreUTxO.UTxO>, Provider.ProviderError>
  readonly getWalletDelegation: () => Effect.Effect<Provider.Delegation, Provider.ProviderError>
}

/**
 * SigningClient Effect - provider, signing wallet, and utility methods.
 *
 * @since 2.0.0
 * @category model
 */
export interface SigningClientEffect extends Provider.ProviderEffect, SigningWalletEffect {
  readonly getWalletUtxos: () => Effect.Effect<ReadonlyArray<CoreUTxO.UTxO>, WalletError | Provider.ProviderError>
  readonly getWalletDelegation: () => Effect.Effect<Provider.Delegation, WalletError | Provider.ProviderError>
}

/**
 * MinimalClient - network context with combinator methods to attach provider and/or wallet.
 *
 * @since 2.0.0
 * @category model
 */
export interface MinimalClient {
  readonly networkId: number | string
  readonly attachProvider: (config: ProviderConfig) => ProviderOnlyClient
  readonly attachWallet: <T extends WalletConfig>(
    config: T
  ) => T extends SeedWalletConfig
    ? SigningWalletClient
    : T extends PrivateKeyWalletConfig
      ? SigningWalletClient
      : T extends ApiWalletConfig
        ? ApiWalletClient
        : ReadOnlyWalletClient
  readonly attach: <TW extends WalletConfig>(
    providerConfig: ProviderConfig,
    walletConfig: TW
  ) => TW extends SeedWalletConfig
    ? SigningClient
    : TW extends PrivateKeyWalletConfig
      ? SigningClient
      : TW extends ApiWalletConfig
        ? SigningClient
        : ReadOnlyClient
  readonly Effect: MinimalClientEffect
}

/**
 * ProviderOnlyClient - blockchain queries and transaction submission.
 *
 * @since 2.0.0
 * @category model
 */
export type ProviderOnlyClient = EffectToPromiseAPI<Provider.ProviderEffect> & {
  readonly attachWallet: <T extends WalletConfig>(
    config: T
  ) => T extends SeedWalletConfig
    ? SigningClient
    : T extends PrivateKeyWalletConfig
      ? SigningClient
      : T extends ApiWalletConfig
        ? SigningClient
        : ReadOnlyClient
  readonly Effect: Provider.ProviderEffect
}

/**
 * ReadOnlyClient - blockchain queries and wallet address operations without signing.
 * Use newTx() to build unsigned transactions.
 *
 * @since 2.0.0
 * @category model
 */
export type ReadOnlyClient = EffectToPromiseAPI<ReadOnlyClientEffect> & {
  readonly newTx: (utxos?: ReadonlyArray<CoreUTxO.UTxO>) => ReadOnlyTransactionBuilder
  readonly Effect: ReadOnlyClientEffect
}

/**
 * SigningClient - full functionality: blockchain queries, transaction signing, and submission.
 * Use newTx() to build, sign, and submit transactions.
 *
 * @since 2.0.0
 * @category model
 */
export type SigningClient = EffectToPromiseAPI<SigningClientEffect> & {
  readonly newTx: () => SigningTransactionBuilder
  readonly Effect: SigningClientEffect
}

/**
 * ApiWalletClient - CIP-30 wallet signing and submission without blockchain queries.
 * Requires attachProvider() to access blockchain data.
 *
 * @since 2.0.0
 * @category model
 */
export type ApiWalletClient = EffectToPromiseAPI<ApiWalletEffect> & {
  readonly attachProvider: (config: ProviderConfig) => SigningClient
  readonly Effect: ApiWalletEffect
}

/**
 * SigningWalletClient - transaction signing without blockchain queries.
 * Requires attachProvider() to access blockchain data.
 *
 * @since 2.0.0
 * @category model
 */
export type SigningWalletClient = EffectToPromiseAPI<SigningWalletEffect> & {
  readonly networkId: number | string
  readonly attachProvider: (config: ProviderConfig) => SigningClient
  readonly Effect: SigningWalletEffect
}

/**
 * ReadOnlyWalletClient - wallet address access without signing or blockchain queries.
 * Requires attachProvider() to access blockchain data.
 *
 * @since 2.0.0
 * @category model
 */
export type ReadOnlyWalletClient = EffectToPromiseAPI<ReadOnlyWalletEffect> & {
  readonly networkId: number | string
  readonly attachProvider: (config: ProviderConfig) => ReadOnlyClient
  readonly Effect: ReadOnlyWalletEffect
}

/**
 * Network identifier for client configuration.
 *
 * @since 2.0.0
 * @category model
 */
export type NetworkId = "mainnet" | "preprod" | "preview" | number

/**
 * Retry policy configuration with exponential backoff.
 *
 * @since 2.0.0
 * @category model
 */
export interface RetryConfig {
  readonly maxRetries: number
  readonly retryDelayMs: number
  readonly backoffMultiplier: number
  readonly maxRetryDelayMs: number
}

/**
 * Preset retry configurations for common scenarios.
 *
 * @since 2.0.0
 * @category constants
 */
export const RetryPresets = {
  none: { maxRetries: 0, retryDelayMs: 0, backoffMultiplier: 1, maxRetryDelayMs: 0 } as const,
  fast: { maxRetries: 3, retryDelayMs: 500, backoffMultiplier: 1.5, maxRetryDelayMs: 5000 } as const,
  standard: { maxRetries: 3, retryDelayMs: 1000, backoffMultiplier: 2, maxRetryDelayMs: 10000 } as const,
  aggressive: { maxRetries: 5, retryDelayMs: 1000, backoffMultiplier: 2, maxRetryDelayMs: 30000 } as const
} as const

/**
 * Retry policy - preset config, custom schedule, or preset reference.
 *
 * @since 2.0.0
 * @category model
 */
export type RetryPolicy = RetryConfig | Schedule.Schedule<any, any> | { preset: keyof typeof RetryPresets }

/**
 * Blockfrost provider configuration.
 *
 * @since 2.0.0
 * @category model
 */
export interface BlockfrostConfig {
  readonly type: "blockfrost"
  readonly baseUrl: string
  readonly projectId?: string
  readonly retryPolicy?: RetryPolicy
}

/**
 * Kupmios provider configuration (Kupo + Ogmios).
 *
 * @since 2.0.0
 * @category model
 */
export interface KupmiosConfig {
  readonly type: "kupmios"
  readonly kupoUrl: string
  readonly ogmiosUrl: string
  readonly headers?: {
    readonly ogmiosHeader?: Record<string, string>
    readonly kupoHeader?: Record<string, string>
  }
  readonly retryPolicy?: RetryPolicy
}

/**
 * Maestro provider configuration.
 *
 * @since 2.0.0
 * @category model
 */
export interface MaestroConfig {
  readonly type: "maestro"
  readonly baseUrl: string
  readonly apiKey: string
  readonly turboSubmit?: boolean
  readonly retryPolicy?: RetryPolicy
}

/**
 * Koios provider configuration.
 *
 * @since 2.0.0
 * @category model
 */
export interface KoiosConfig {
  readonly type: "koios"
  readonly baseUrl: string
  readonly token?: string
  readonly retryPolicy?: RetryPolicy
}

/**
 * Provider configuration union type.
 *
 * @since 2.0.0
 * @category model
 */
export type ProviderConfig = BlockfrostConfig | KupmiosConfig | MaestroConfig | KoiosConfig

/**
 * Seed phrase wallet configuration.
 *
 * @since 2.0.0
 * @category model
 */
export interface SeedWalletConfig {
  readonly type: "seed"
  readonly mnemonic: string
  readonly accountIndex?: number
  readonly paymentIndex?: number
  readonly stakeIndex?: number
  readonly addressType?: "Base" | "Enterprise"
  readonly password?: string
}

/**
 * Private key wallet configuration.
 *
 * @since 2.0.0
 * @category model
 */
export interface PrivateKeyWalletConfig {
  readonly type: "private-key"
  readonly paymentKey: string
  readonly stakeKey?: string
  readonly addressType?: "Base" | "Enterprise"
}

/**
 * Read-only wallet configuration.
 *
 * @since 2.0.0
 * @category model
 */
export interface ReadOnlyWalletConfig {
  readonly type: "read-only"
  readonly address: string
  readonly rewardAddress?: string
}

/**
 * CIP-30 API wallet configuration.
 *
 * @since 2.0.0
 * @category model
 */
export interface ApiWalletConfig {
  readonly type: "api"
  readonly api: WalletApi
}

/**
 * Wallet configuration union type.
 *
 * @since 2.0.0
 * @category model
 */
export type WalletConfig = SeedWalletConfig | PrivateKeyWalletConfig | ReadOnlyWalletConfig | ApiWalletConfig
