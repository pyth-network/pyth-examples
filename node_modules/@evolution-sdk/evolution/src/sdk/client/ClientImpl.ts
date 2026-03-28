import { Effect, Equal, ParseResult, Schema } from "effect"

import * as CoreAddress from "../../Address.js"
import * as Bytes from "../../Bytes.js"
import * as KeyHash from "../../KeyHash.js"
import type * as NativeScripts from "../../NativeScripts.js"
import type * as Network from "../../Network.js"
import * as PrivateKey from "../../PrivateKey.js"
import * as CoreRewardAccount from "../../RewardAccount.js"
import * as CoreRewardAddress from "../../RewardAddress.js"
import type * as Time from "../../Time/index.js"
import * as Transaction from "../../Transaction.js"
import * as TransactionHash from "../../TransactionHash.js"
import * as TransactionWitnessSet from "../../TransactionWitnessSet.js"
import { runEffectPromise } from "../../utils/effect-runtime.js"
import { hashTransaction, hashTransactionRaw } from "../../utils/Hash.js"
import * as CoreUTxO from "../../UTxO.js"
import * as VKey from "../../VKey.js"
import {
  makeTxBuilder,
  type ReadOnlyTransactionBuilder,
  type SigningTransactionBuilder
} from "../builders/TransactionBuilder.js"
import * as Blockfrost from "../provider/Blockfrost.js"
import * as Koios from "../provider/Koios.js"
import * as Kupmios from "../provider/Kupmios.js"
import * as Maestro from "../provider/Maestro.js"
import * as Provider from "../provider/Provider.js"
import * as Derivation from "../wallet/Derivation.js"
import * as WalletNew from "../wallet/WalletNew.js"
import {
  type ApiWalletClient,
  type ApiWalletConfig,
  type MinimalClient,
  type MinimalClientEffect,
  type NetworkId,
  type PrivateKeyWalletConfig,
  type ProviderConfig,
  type ProviderOnlyClient,
  type ReadOnlyClient,
  type ReadOnlyWalletClient,
  type ReadOnlyWalletConfig,
  type SeedWalletConfig,
  type SigningClient,
  type SigningWalletClient,
  type WalletConfig
} from "./Client.js"

/**
 * Create a provider instance from configuration.
 *
 * @since 2.0.0
 * @category utilities
 */
const createProvider = (config: ProviderConfig): Provider.Provider => {
  switch (config.type) {
    case "blockfrost":
      return Blockfrost.custom(config.baseUrl, config.projectId)
    case "kupmios":
      return new Kupmios.KupmiosProvider(config.kupoUrl, config.ogmiosUrl, config.headers)
    case "maestro":
      return new Maestro.MaestroProvider(config.baseUrl, config.apiKey, config.turboSubmit)
    case "koios":
      return new Koios.Koios(config.baseUrl, config.token)
  }
}

/**
 * Map NetworkId to numeric representation.
 * "mainnet" → 1, "preprod"/"preview" → 0, numeric values pass through unchanged.
 *
 * @since 2.0.0
 * @category transformation
 */
const normalizeNetworkId = (network: NetworkId): number => {
  if (typeof network === "number") return network
  switch (network) {
    case "mainnet":
      return 1
    case "preprod":
      return 0
    case "preview":
      return 0
    default:
      return 0
  }
}

/**
 * Map NetworkId to wallet network enumeration.
 * Returns "Mainnet" for numeric 1 or string "mainnet"; returns "Testnet" otherwise.
 *
 * @since 2.0.0
 * @category transformation
 */
const toWalletNetwork = (networkId: NetworkId): WalletNew.Network => {
  if (typeof networkId === "number") {
    return networkId === 1 ? "Mainnet" : "Testnet"
  }
  switch (networkId) {
    case "mainnet":
      return "Mainnet"
    case "preprod":
    case "preview":
      return "Testnet"
    default:
      return "Testnet"
  }
}

/**
 * Map NetworkId to Network type for slot configuration resolution.
 * Returns the correct Network variant so resolveSlotConfig picks the right preset.
 *
 * @since 2.0.0
 * @category transformation
 */
const toBuilderNetwork = (networkId: NetworkId): Network.Network => {
  if (typeof networkId === "number") {
    return networkId === 1 ? "Mainnet" : "Preview"
  }
  switch (networkId) {
    case "mainnet":
      return "Mainnet"
    case "preprod":
      return "Preprod"
    case "preview":
      return "Preview"
    default:
      return "Mainnet"
  }
}

/**
 * Construct read-only wallet from network, payment address, and optional reward address.
 *
 * @since 2.0.0
 * @category constructors
 */
const createReadOnlyWallet = (
  network: WalletNew.Network,
  address: string,
  rewardAddress?: string
): WalletNew.ReadOnlyWallet => {
  const coreAddress = CoreAddress.fromBech32(address)
  const coreRewardAddress = rewardAddress ? Schema.decodeSync(CoreRewardAddress.RewardAddress)(rewardAddress) : null
  const walletEffect: WalletNew.ReadOnlyWalletEffect = {
    address: () => Effect.succeed(coreAddress),
    rewardAddress: () => Effect.succeed(coreRewardAddress)
  }

  return {
    address: () => Promise.resolve(coreAddress),
    rewardAddress: () => Promise.resolve(coreRewardAddress),
    Effect: walletEffect,
    type: "read-only"
  }
}

/**
 * Construct read-only wallet client with network metadata and combinator methods.
 *
 * @since 2.0.0
 * @category constructors
 */
const createReadOnlyWalletClient = (network: NetworkId, config: ReadOnlyWalletConfig): ReadOnlyWalletClient => {
  const walletNetwork = toWalletNetwork(network)
  const wallet = createReadOnlyWallet(walletNetwork, config.address, config.rewardAddress)
  const networkId = normalizeNetworkId(network)

  return {
    // Direct Promise properties from wallet
    address: wallet.address,
    rewardAddress: wallet.rewardAddress,
    // Metadata
    networkId,
    // Combinator methods
    attachProvider: (providerConfig) => {
      return createReadOnlyClient(network, providerConfig, config)
    },
    // Effect namespace - wallet's Effect interface
    Effect: wallet.Effect
  }
}

/**
 * Construct read-only client by composing provider and read-only wallet.
 *
 * @since 2.0.0
 * @category constructors
 */
const createReadOnlyClient = (
  network: NetworkId,
  providerConfig: ProviderConfig,
  walletConfig: ReadOnlyWalletConfig,
  slotConfig?: Time.SlotConfig
): ReadOnlyClient => {
  const provider = createProvider(providerConfig)
  const walletNetwork = toWalletNetwork(network)
  const wallet = createReadOnlyWallet(walletNetwork, walletConfig.address, walletConfig.rewardAddress)
  // Parse the bech32 address to Core Address for provider calls
  const coreAddress = CoreAddress.fromBech32(walletConfig.address)

  const result = {
    ...provider,
    address: wallet.address,
    rewardAddress: wallet.rewardAddress,
    getWalletUtxos: () => provider.getUtxos(coreAddress),
    getWalletDelegation: async () => {
      const rewardAddr = walletConfig.rewardAddress
      if (!rewardAddr) throw new Error("No reward address configured")
      const coreRewardAddr = Schema.decodeSync(CoreRewardAddress.RewardAddress)(rewardAddr)
      return provider.getDelegation(coreRewardAddr)
    },
    newTx: (): ReadOnlyTransactionBuilder => {
      return makeTxBuilder({
        wallet,
        provider,
        network: toBuilderNetwork(network),
        slotConfig
      })
    },
    Effect: {
      ...provider.Effect,
      ...wallet.Effect,
      getWalletUtxos: () => provider.Effect.getUtxos(coreAddress),
      getWalletDelegation: () => {
        const rewardAddr = walletConfig.rewardAddress
        if (!rewardAddr)
          return Effect.fail(new Provider.ProviderError({ message: "No reward address configured", cause: null }))
        const coreRewardAddr = Schema.decodeSync(CoreRewardAddress.RewardAddress)(rewardAddr)
        return provider.Effect.getDelegation(coreRewardAddr)
      }
    }
  }

  return result
}

/**
 * Extract all key hashes from a native script (recursively).
 * This traverses ALL, ANY, and N-of-K scripts to find all ScriptPubKey key hashes.
 *
 * @since 2.0.0
 * @category utilities
 */
const extractKeyHashesFromNativeScript = (script: NativeScripts.NativeScriptVariants): Set<string> => {
  const keyHashes = new Set<string>()

  const traverse = (s: NativeScripts.NativeScriptVariants): void => {
    switch (s._tag) {
      case "ScriptPubKey":
        keyHashes.add(Bytes.toHex(s.keyHash))
        break
      case "ScriptAll":
      case "ScriptAny":
        for (const nested of s.scripts) traverse(nested)
        break
      case "ScriptNOfK":
        for (const nested of s.scripts) traverse(nested)
        break
      case "InvalidBefore":
      case "InvalidHereafter":
        // Time-based scripts don't contain key hashes
        break
    }
  }

  traverse(script)
  return keyHashes
}

/**
 * Determine key hashes that must sign a transaction based on inputs, withdrawals, certificates,
 * and native scripts attached to the transaction or in reference inputs.
 *
 * @since 2.0.0
 * @category predicates
 */
const computeRequiredKeyHashesSync = (params: {
  paymentKhHex?: string
  rewardAddress?: CoreRewardAddress.RewardAddress | null
  stakeKhHex?: string
  tx: Transaction.Transaction
  utxos: ReadonlyArray<CoreUTxO.UTxO>
  referenceUtxos?: ReadonlyArray<CoreUTxO.UTxO>
}): Set<string> => {
  const required = new Set<string>()

  if (params.tx.body.requiredSigners) {
    for (const kh of params.tx.body.requiredSigners) required.add(KeyHash.toHex(kh))
  }

  // Extract key hashes from native scripts in the witness set
  if (params.tx.witnessSet.nativeScripts) {
    for (const nativeScript of params.tx.witnessSet.nativeScripts) {
      const scriptKeyHashes = extractKeyHashesFromNativeScript(nativeScript.script)
      for (const kh of scriptKeyHashes) required.add(kh)
    }
  }

  // Extract key hashes from native scripts in reference inputs
  if (params.referenceUtxos) {
    for (const utxo of params.referenceUtxos) {
      if (utxo.scriptRef && utxo.scriptRef._tag === "NativeScript") {
        const scriptKeyHashes = extractKeyHashesFromNativeScript(utxo.scriptRef.script)
        for (const kh of scriptKeyHashes) required.add(kh)
      }
    }
  }

  const ownedRefs = new Set<string>(params.utxos.map((u) => CoreUTxO.toOutRefString(u)))

  const checkInputs = (inputs?: ReadonlyArray<Transaction.Transaction["body"]["inputs"][number]>) => {
    if (!inputs || !params.paymentKhHex) return
    for (const input of inputs) {
      const txIdHex = TransactionHash.toHex(input.transactionId)
      const key = `${txIdHex}#${Number(input.index)}`
      if (ownedRefs.has(key)) required.add(params.paymentKhHex)
    }
  }
  checkInputs(params.tx.body.inputs)
  if (params.tx.body.collateralInputs) checkInputs(params.tx.body.collateralInputs)

  if (params.tx.body.withdrawals && params.rewardAddress && params.stakeKhHex) {
    const ourReward = Schema.decodeSync(CoreRewardAccount.FromBech32)(params.rewardAddress)
    for (const [rewardAcc] of params.tx.body.withdrawals.withdrawals.entries()) {
      if (Equal.equals(ourReward, rewardAcc)) {
        required.add(params.stakeKhHex)
        break
      }
    }
  }

  if (params.tx.body.certificates && params.stakeKhHex) {
    for (const cert of params.tx.body.certificates) {
      const cred =
        cert._tag === "StakeRegistration" || cert._tag === "StakeDeregistration" || cert._tag === "StakeDelegation"
          ? cert.stakeCredential
          : cert._tag === "RegCert" || cert._tag === "UnregCert"
            ? cert.stakeCredential
            : cert._tag === "StakeVoteDelegCert" ||
                cert._tag === "StakeRegDelegCert" ||
                cert._tag === "StakeVoteRegDelegCert" ||
                cert._tag === "VoteDelegCert" ||
                cert._tag === "VoteRegDelegCert"
              ? cert.stakeCredential
              : undefined
      if (cred && cred._tag === "KeyHash") {
        const khHex = KeyHash.toHex(cred)
        if (khHex === params.stakeKhHex) required.add(params.stakeKhHex)
      }
    }
  }

  return required
}

/**
 * Create signing wallet from seed phrase.
 *
 * @since 2.0.0
 * @category constructors
 */
const createSigningWallet = (network: WalletNew.Network, config: SeedWalletConfig): WalletNew.SigningWallet => {
  const derivationEffect = Derivation.walletFromSeed(config.mnemonic, {
    addressType: config.addressType ?? "Base",
    accountIndex: config.accountIndex ?? 0,
    password: config.password,
    network
  }).pipe(Effect.mapError((cause) => new WalletNew.WalletError({ message: cause.message, cause })))

  // Effect implementations are the source of truth
  const effectInterface: WalletNew.SigningWalletEffect = {
    address: () => Effect.map(derivationEffect, (d) => d.address),
    rewardAddress: () => Effect.map(derivationEffect, (d) => d.rewardAddress ?? null),
    signTx: (
      txOrHex: Transaction.Transaction | string,
      context?: { utxos?: ReadonlyArray<CoreUTxO.UTxO>; referenceUtxos?: ReadonlyArray<CoreUTxO.UTxO> }
    ) =>
      Effect.gen(function* () {
        const derivation = yield* derivationEffect

        const tx =
          typeof txOrHex === "string"
            ? yield* ParseResult.decodeUnknownEither(Transaction.FromCBORHex())(txOrHex).pipe(
                Effect.mapError(
                  (cause) => new WalletNew.WalletError({ message: `Failed to decode transaction: ${cause}`, cause })
                )
              )
            : txOrHex
        const utxos = context?.utxos ?? []
        const referenceUtxos = context?.referenceUtxos ?? []

        // Determine required key hashes for signing
        const required = computeRequiredKeyHashesSync({
          paymentKhHex: derivation.paymentKhHex,
          rewardAddress: derivation.rewardAddress ?? null,
          stakeKhHex: derivation.stakeKhHex,
          tx,
          utxos,
          referenceUtxos
        })

        // Build witnesses for keys we have
        // When input is a hex string, hash the original CBOR bytes to preserve encoding.
        // Re-encoding via hashTransaction(tx.body) can produce different bytes and a wrong hash.
        const txHash = typeof txOrHex === "string"
          ? hashTransactionRaw(Transaction.extractBodyBytes(Bytes.fromHex(txOrHex)))
          : hashTransaction(tx.body)
        const msg = txHash.hash

        const witnesses: Array<TransactionWitnessSet.VKeyWitness> = []
        const seenVKeys = new Set<string>()
        for (const khHex of required) {
          const sk = derivation.keyStore.get(khHex)
          if (!sk) continue
          const sig = PrivateKey.sign(sk, msg)
          const vk = VKey.fromPrivateKey(sk)
          const vkHex = VKey.toHex(vk)
          if (seenVKeys.has(vkHex)) continue
          seenVKeys.add(vkHex)
          witnesses.push(new TransactionWitnessSet.VKeyWitness({ vkey: vk, signature: sig }))
        }

        return witnesses.length > 0 ? TransactionWitnessSet.fromVKeyWitnesses(witnesses) : TransactionWitnessSet.empty()
      }),
    signMessage: (_address: CoreAddress.Address | CoreRewardAddress.RewardAddress, payload: WalletNew.Payload) =>
      Effect.map(derivationEffect, (derivation) => {
        // For now, always use payment key for message signing
        const paymentSk = PrivateKey.fromBech32(derivation.paymentKey)
        const vk = VKey.fromPrivateKey(paymentSk)
        const bytes = typeof payload === "string" ? new TextEncoder().encode(payload) : payload
        const _sig = PrivateKey.sign(paymentSk, bytes)
        const sigHex = VKey.toHex(vk) // TODO: Convert signature properly
        return { payload, signature: sigHex }
      })
  }

  // Promise API runs the Effect implementations
  return {
    type: "signing",
    address: () => Effect.runPromise(effectInterface.address()),
    rewardAddress: () => Effect.runPromise(effectInterface.rewardAddress()),
    signTx: (txOrHex, context) => Effect.runPromise(effectInterface.signTx(txOrHex, context)),
    signMessage: (address, payload) => Effect.runPromise(effectInterface.signMessage(address, payload)),
    Effect: effectInterface
  }
}

/**
 * Create a signing wallet from private keys.
 *
 * @since 2.0.0
 * @category constructors
 */
const createPrivateKeyWallet = (
  network: WalletNew.Network,
  config: PrivateKeyWalletConfig
): WalletNew.SigningWallet => {
  const derivationEffect = Derivation.walletFromPrivateKey(config.paymentKey, {
    stakeKeyBech32: config.stakeKey,
    addressType: config.addressType ?? (config.stakeKey ? "Base" : "Enterprise"),
    network
  }).pipe(Effect.mapError((cause) => new WalletNew.WalletError({ message: cause.message, cause })))

  const effectInterface: WalletNew.SigningWalletEffect = {
    address: () => Effect.map(derivationEffect, (d) => d.address),
    rewardAddress: () => Effect.map(derivationEffect, (d) => d.rewardAddress ?? null),
    signTx: (
      txOrHex: Transaction.Transaction | string,
      context?: { utxos?: ReadonlyArray<CoreUTxO.UTxO>; referenceUtxos?: ReadonlyArray<CoreUTxO.UTxO> }
    ) =>
      Effect.gen(function* () {
        const derivation = yield* derivationEffect

        const tx =
          typeof txOrHex === "string"
            ? yield* ParseResult.decodeUnknownEither(Transaction.FromCBORHex())(txOrHex).pipe(
                Effect.mapError(
                  (cause) => new WalletNew.WalletError({ message: `Failed to decode transaction: ${cause}`, cause })
                )
              )
            : txOrHex
        const utxos = context?.utxos ?? []
        const referenceUtxos = context?.referenceUtxos ?? []

        const required = computeRequiredKeyHashesSync({
          paymentKhHex: derivation.paymentKhHex,
          rewardAddress: derivation.rewardAddress ?? null,
          stakeKhHex: derivation.stakeKhHex,
          tx,
          utxos,
          referenceUtxos
        })

        const txHash = typeof txOrHex === "string"
          ? hashTransactionRaw(Transaction.extractBodyBytes(Bytes.fromHex(txOrHex)))
          : hashTransaction(tx.body)
        const msg = txHash.hash

        const witnesses: Array<TransactionWitnessSet.VKeyWitness> = []
        const seenVKeys = new Set<string>()
        for (const khHex of required) {
          const sk = derivation.keyStore.get(khHex)
          if (!sk) continue
          const sig = PrivateKey.sign(sk, msg)
          const vk = VKey.fromPrivateKey(sk)
          const vkHex = VKey.toHex(vk)
          if (seenVKeys.has(vkHex)) continue
          seenVKeys.add(vkHex)
          witnesses.push(new TransactionWitnessSet.VKeyWitness({ vkey: vk, signature: sig }))
        }

        return witnesses.length > 0 ? TransactionWitnessSet.fromVKeyWitnesses(witnesses) : TransactionWitnessSet.empty()
      }),
    signMessage: (_address: CoreAddress.Address | CoreRewardAddress.RewardAddress, payload: WalletNew.Payload) =>
      Effect.map(derivationEffect, (derivation) => {
        const paymentSk = PrivateKey.fromBech32(derivation.paymentKey)
        const vk = VKey.fromPrivateKey(paymentSk)
        const bytes = typeof payload === "string" ? new TextEncoder().encode(payload) : payload
        const _sig = PrivateKey.sign(paymentSk, bytes)
        const sigHex = VKey.toHex(vk)
        return { payload, signature: sigHex }
      })
  }

  return {
    type: "signing",
    address: () => runEffectPromise(effectInterface.address()),
    rewardAddress: () => runEffectPromise(effectInterface.rewardAddress()),
    signTx: (txOrHex, context) => runEffectPromise(effectInterface.signTx(txOrHex, context)),
    signMessage: (address, payload) => runEffectPromise(effectInterface.signMessage(address, payload)),
    Effect: effectInterface
  }
}

/**
 * Create an ApiWallet wrapping a CIP-30 browser wallet API.
 *
 * @since 2.0.0
 * @category constructors
 */
const createApiWallet = (_network: WalletNew.Network, config: ApiWalletConfig): WalletNew.ApiWallet => {
  const api = config.api
  let cachedAddress: CoreAddress.Address | null = null
  let cachedReward: CoreRewardAddress.RewardAddress | null = null

  const getPrimaryAddress = Effect.gen(function* () {
    if (cachedAddress) return cachedAddress
    const used = yield* Effect.tryPromise({
      try: () => api.getUsedAddresses(),
      catch: (cause) => new WalletNew.WalletError({ message: (cause as Error).message, cause: cause as Error })
    })
    const unused = yield* Effect.tryPromise({
      try: () => api.getUnusedAddresses(),
      catch: (cause) => new WalletNew.WalletError({ message: (cause as Error).message, cause: cause as Error })
    })
    const addrStr = used[0] ?? unused[0]
    if (!addrStr) {
      return yield* Effect.fail(new WalletNew.WalletError({ message: "Wallet API returned no addresses", cause: null }))
    }
    // Convert address string to Core Address - support both Bech32 and hex formats
    try {
      cachedAddress = CoreAddress.fromBech32(addrStr)
    } catch {
      // Fallback to hex if Bech32 fails (some wallets return hex)
      try {
        cachedAddress = CoreAddress.fromHex(addrStr)
      } catch (error) {
        return yield* Effect.fail(
          new WalletNew.WalletError({
            message: `Invalid address format from wallet: ${addrStr}`,
            cause: error as Error
          })
        )
      }
    }
    return cachedAddress
  })

  const getPrimaryRewardAddress = Effect.gen(function* () {
    if (cachedReward !== null) return cachedReward
    const rewards = yield* Effect.tryPromise({
      try: () => api.getRewardAddresses(),
      catch: (cause) => new WalletNew.WalletError({ message: (cause as Error).message, cause: cause as Error })
    })
    cachedReward = rewards[0] ? Schema.decodeSync(CoreRewardAddress.RewardAddress)(rewards[0]) : null
    return cachedReward
  })

  // Effect implementations are the source of truth
  const effectInterface: WalletNew.ApiWalletEffect = {
    address: () => getPrimaryAddress,
    rewardAddress: () => getPrimaryRewardAddress,
    signTx: (txOrHex: Transaction.Transaction | string, _context?: { utxos?: ReadonlyArray<CoreUTxO.UTxO> }) =>
      Effect.gen(function* () {
        const cbor = typeof txOrHex === "string" ? txOrHex : Transaction.toCBORHex(txOrHex)
        const witnessHex = yield* Effect.tryPromise({
          try: () => api.signTx(cbor, true),
          catch: (cause) => new WalletNew.WalletError({ message: "User rejected transaction signing", cause })
        })
        return yield* ParseResult.decodeUnknownEither(TransactionWitnessSet.FromCBORHex())(witnessHex).pipe(
          Effect.mapError(
            (cause) => new WalletNew.WalletError({ message: `Failed to decode witness set: ${cause}`, cause })
          )
        )
      }),
    signMessage: (address: CoreAddress.Address | CoreRewardAddress.RewardAddress, payload: WalletNew.Payload) =>
      Effect.gen(function* () {
        // Convert Core Address to bech32 string for the CIP-30 API
        const addressStr = address instanceof CoreAddress.Address ? CoreAddress.toBech32(address) : address
        const result = yield* Effect.tryPromise({
          try: () => api.signData(addressStr, payload),
          catch: (cause) => new WalletNew.WalletError({ message: "User rejected message signing", cause })
        })
        return { payload, signature: result.signature }
      }),
    submitTx: (txOrHex: Transaction.Transaction | string) =>
      Effect.gen(function* () {
        const cbor = typeof txOrHex === "string" ? txOrHex : Transaction.toCBORHex(txOrHex)
        const txHashHex = yield* Effect.tryPromise({
          try: () => api.submitTx(cbor),
          catch: (cause) => new WalletNew.WalletError({ message: (cause as Error).message, cause: cause as Error })
        })
        // Parse the string hash to TransactionHash
        return Schema.decodeSync(TransactionHash.FromHex)(txHashHex)
      })
  }

  // Promise API runs the Effect implementations
  return {
    type: "api" as const,
    api,
    address: () => Effect.runPromise(effectInterface.address()),
    rewardAddress: () => Effect.runPromise(effectInterface.rewardAddress()),
    signTx: (txOrHex, context) => Effect.runPromise(effectInterface.signTx(txOrHex, context)),
    signMessage: (address, payload) => Effect.runPromise(effectInterface.signMessage(address, payload)),
    submitTx: (txOrHex) => Effect.runPromise(effectInterface.submitTx(txOrHex)),
    Effect: effectInterface
  }
}

/**
 * Construct a SigningWalletClient combining a signing wallet with network metadata and combinator method.
 *
 * Returns a client with transaction signing and address access, plus a method to attach a provider for blockchain queries.
 *
 * @since 2.0.0
 * @category constructors
 */
const createSigningWalletClient = (
  network: NetworkId,
  config: SeedWalletConfig | PrivateKeyWalletConfig
): SigningWalletClient => {
  const walletNetwork = toWalletNetwork(network)
  const wallet =
    config.type === "seed" ? createSigningWallet(walletNetwork, config) : createPrivateKeyWallet(walletNetwork, config)
  const networkId = normalizeNetworkId(network)

  return {
    ...wallet,
    networkId,
    attachProvider: (providerConfig) => {
      return createSigningClient(network, providerConfig, config)
    }
  }
}

/**
 * Create an ApiWalletClient combining a CIP-30 browser wallet with network metadata and combinator method.
 *
 * @since 2.0.0
 * @category constructors
 */
const createApiWalletClient = (network: NetworkId, config: ApiWalletConfig): ApiWalletClient => {
  const walletNetwork = toWalletNetwork(network)
  const wallet = createApiWallet(walletNetwork, config)

  return {
    ...wallet,
    attachProvider: (providerConfig) => {
      return createSigningClient(network, providerConfig, config)
    }
  }
}

/**
 * Create a SigningClient by composing a provider and signing wallet.
 *
 * @since 2.0.0
 * @category constructors
 */
const createSigningClient = (
  network: NetworkId,
  providerConfig: ProviderConfig,
  walletConfig: SeedWalletConfig | PrivateKeyWalletConfig | ApiWalletConfig,
  slotConfig?: Time.SlotConfig
): SigningClient => {
  const provider = createProvider(providerConfig)
  const walletNetwork = toWalletNetwork(network)

  const wallet =
    walletConfig.type === "seed"
      ? createSigningWallet(walletNetwork, walletConfig)
      : walletConfig.type === "private-key"
        ? createPrivateKeyWallet(walletNetwork, walletConfig)
        : createApiWallet(walletNetwork, walletConfig)

  // Enhanced signTx that automatically fetches reference UTxOs from the network.
  // Passes the original txOrHex through to wallet.Effect.signTx to preserve CBOR bytes for hashing.
  const signTxWithAutoFetch = (
    txOrHex: Transaction.Transaction | string,
    context?: { utxos?: ReadonlyArray<CoreUTxO.UTxO>; referenceUtxos?: ReadonlyArray<CoreUTxO.UTxO> }
  ): Effect.Effect<TransactionWitnessSet.TransactionWitnessSet, WalletNew.WalletError> =>
    Effect.gen(function* () {
      // If referenceUtxos already provided, pass original txOrHex through
      if (context?.referenceUtxos && context.referenceUtxos.length > 0) {
        return yield* wallet.Effect.signTx(txOrHex, context)
      }

      // Decode to Transaction only if we need to check for reference inputs
      const tx =
        typeof txOrHex === "string"
          ? yield* ParseResult.decodeUnknownEither(Transaction.FromCBORHex())(txOrHex).pipe(
              Effect.mapError(
                (cause) => new WalletNew.WalletError({ message: `Failed to decode transaction: ${cause}`, cause })
              )
            )
          : txOrHex

      // Auto-fetch reference UTxOs from the network if the transaction has reference inputs
      let referenceUtxos: ReadonlyArray<CoreUTxO.UTxO> = []
      if (tx.body.referenceInputs && tx.body.referenceInputs.length > 0) {
        referenceUtxos = yield* provider.Effect.getUtxosByOutRef(tx.body.referenceInputs).pipe(
          Effect.mapError(
            (e) => new WalletNew.WalletError({ message: `Failed to fetch reference UTxOs: ${e.message}`, cause: e })
          )
        )
      }

      // Pass original txOrHex through to preserve CBOR bytes for hashing
      return yield* wallet.Effect.signTx(txOrHex, { ...context, referenceUtxos })
    })

  const effectInterface = {
    ...wallet.Effect,
    ...provider.Effect,
    // Override signTx with auto-fetch capability
    signTx: signTxWithAutoFetch,
    getWalletUtxos: () => Effect.flatMap(wallet.Effect.address(), (addr) => provider.Effect.getUtxos(addr)),
    getWalletDelegation: () =>
      Effect.flatMap(wallet.Effect.rewardAddress(), (rewardAddr) => {
        if (!rewardAddr)
          return Effect.fail(new Provider.ProviderError({ message: "No reward address configured", cause: null }))
        const coreRewardAddr = Schema.decodeSync(CoreRewardAddress.RewardAddress)(rewardAddr)
        return provider.Effect.getDelegation(coreRewardAddr)
      })
  }

  // Combine provider + signing wallet via spreading
  // Define getWalletUtxos first so we can reference it in newTx
  const getWalletUtxos = () => Effect.runPromise(effectInterface.getWalletUtxos())

  return {
    ...provider,
    ...wallet,
    // Override signTx with auto-fetch capability (must come after ...wallet to override)
    signTx: (
      txOrHex: Transaction.Transaction | string,
      context?: { utxos?: ReadonlyArray<CoreUTxO.UTxO>; referenceUtxos?: ReadonlyArray<CoreUTxO.UTxO> }
    ) => Effect.runPromise(signTxWithAutoFetch(txOrHex, context)),
    // Promise methods call Effect implementations
    getWalletUtxos,
    getWalletDelegation: () => Effect.runPromise(effectInterface.getWalletDelegation()),
    // Transaction builder - creates a new builder instance
    newTx: (): SigningTransactionBuilder => {
      // Wallet provides change address and UTxO fetching via wallet.Effect.address()
      // The wallet is passed to the builder config, which handles address and UTxO resolution automatically
      // Protocol parameters are auto-fetched from provider during build()
      return makeTxBuilder({
        provider, // Pass provider for submission
        wallet, // Pass wallet for signing
        network: toBuilderNetwork(network),
        slotConfig // Pass slot config for time conversion
      })
    },
    // Effect namespace
    Effect: effectInterface
  }
}

/**
 * Create a ProviderOnlyClient by pairing a provider with network metadata and combinator method.
 *
 * @since 2.0.0
 * @category constructors
 */
const createProviderOnlyClient = (network: NetworkId, config: ProviderConfig): ProviderOnlyClient => {
  const provider = createProvider(config)

  return {
    ...provider,
    attachWallet<T extends WalletConfig>(walletConfig: T) {
      switch (walletConfig.type) {
        case "read-only":
          return createReadOnlyClient(network, config, walletConfig) as any
        case "seed":
          return createSigningClient(network, config, walletConfig) as any
        case "api":
          return createSigningClient(network, config, walletConfig) as any
      }
    }
  }
}

/**
 * Create a MinimalClient holding network metadata and combinator methods.
 *
 * @since 2.0.0
 * @category constructors
 */
const createMinimalClient = (network: NetworkId = "mainnet"): MinimalClient => {
  const networkId = normalizeNetworkId(network)

  const effectInterface: MinimalClientEffect = {
    networkId: Effect.succeed(networkId)
  }

  return {
    networkId,
    attachProvider: (config) => {
      return createProviderOnlyClient(network, config)
    },
    attachWallet<T extends WalletConfig>(walletConfig: T) {
      // TypeScript cannot narrow conditional return types from runtime discriminants.
      // The conditional type interface provides type safety at call sites.
      switch (walletConfig.type) {
        case "read-only":
          return createReadOnlyWalletClient(network, walletConfig) as any
        case "seed":
          return createSigningWalletClient(network, walletConfig) as any
        case "api":
          return createApiWalletClient(network, walletConfig) as any
      }
    },
    attach<TW extends WalletConfig>(providerConfig: ProviderConfig, walletConfig: TW) {
      // TypeScript cannot narrow conditional return types from runtime discriminants.
      // The conditional type interface provides type safety at call sites.
      switch (walletConfig.type) {
        case "read-only":
          return createReadOnlyClient(network, providerConfig, walletConfig) as any
        case "seed":
          return createSigningClient(network, providerConfig, walletConfig) as any
        case "api":
          return createSigningClient(network, providerConfig, walletConfig) as any
      }
    },
    // Effect namespace
    Effect: effectInterface
  }
}

/**
 * Factory function producing a client instance from configuration parameters.
 *
 * Returns different client types depending on what configuration is provided:
 * provider and wallet → full-featured client; provider only → query and submission;
 * wallet only → signing with network metadata; network only → minimal context with combinators.
 *
 * @since 2.0.0
 * @category constructors
 */

// Most specific overloads first - wallet type determines client capability
// Provider + ReadOnly Wallet → ReadOnlyClient
export function createClient(config: {
  network?: NetworkId
  provider: ProviderConfig
  wallet: ReadOnlyWalletConfig
  slotConfig?: Time.SlotConfig
}): ReadOnlyClient

// Provider + Seed Wallet → SigningClient
export function createClient(config: {
  network?: NetworkId
  provider: ProviderConfig
  wallet: SeedWalletConfig
  slotConfig?: Time.SlotConfig
}): SigningClient

// Provider + PrivateKey Wallet → SigningClient
export function createClient(config: {
  network?: NetworkId
  provider: ProviderConfig
  wallet: PrivateKeyWalletConfig
  slotConfig?: Time.SlotConfig
}): SigningClient

// Provider + API Wallet → SigningClient
export function createClient(config: {
  network?: NetworkId
  provider: ProviderConfig
  wallet: ApiWalletConfig
  slotConfig?: Time.SlotConfig
}): SigningClient

// Provider only → ProviderOnlyClient
export function createClient(config: { network?: NetworkId; provider: ProviderConfig }): ProviderOnlyClient

// ReadOnly Wallet only → ReadOnlyWalletClient
export function createClient(config: { network?: NetworkId; wallet: ReadOnlyWalletConfig }): ReadOnlyWalletClient

// Seed Wallet only → SigningWalletClient
export function createClient(config: { network?: NetworkId; wallet: SeedWalletConfig }): SigningWalletClient

// Private Key Wallet only → SigningWalletClient
export function createClient(config: { network?: NetworkId; wallet: PrivateKeyWalletConfig }): SigningWalletClient

// API Wallet only → ApiWalletClient
export function createClient(config: { network?: NetworkId; wallet: ApiWalletConfig }): ApiWalletClient

// Network only or minimal → MinimalClient
export function createClient(config?: { network?: NetworkId }): MinimalClient

// Implementation signature - handles all cases (all synchronous now)
export function createClient(config?: {
  network?: NetworkId
  provider?: ProviderConfig
  wallet?: WalletConfig
  slotConfig?: Time.SlotConfig
}):
  | MinimalClient
  | ReadOnlyClient
  | SigningClient
  | ProviderOnlyClient
  | ReadOnlyWalletClient
  | SigningWalletClient
  | ApiWalletClient {
  const network = config?.network ?? "mainnet"
  const slotConfig = config?.slotConfig

  if (config?.provider && config?.wallet) {
    switch (config.wallet.type) {
      case "read-only":
        return createReadOnlyClient(network, config.provider, config.wallet, slotConfig)
      case "seed":
        return createSigningClient(network, config.provider, config.wallet, slotConfig)
      case "private-key":
        return createSigningClient(network, config.provider, config.wallet, slotConfig)
      case "api":
        return createSigningClient(network, config.provider, config.wallet, slotConfig)
    }
  }

  if (config?.wallet) {
    switch (config.wallet.type) {
      case "read-only":
        return createReadOnlyWalletClient(network, config.wallet)
      case "seed":
        return createSigningWalletClient(network, config.wallet)
      case "private-key":
        return createSigningWalletClient(network, config.wallet)
      case "api":
        return createApiWalletClient(network, config.wallet)
    }
  }

  if (config?.provider) {
    return createProviderOnlyClient(network, config.provider)
  }

  return createMinimalClient(network)
}
