import { FetchHttpClient } from "@effect/platform"
import { Effect, pipe, Schedule, Schema } from "effect"

import * as CoreAddress from "../../../Address.js"
import * as CoreAssets from "../../../Assets/index.js"
import * as AssetsUnit from "../../../Assets/Unit.js"
import * as Bytes from "../../../Bytes.js"
import type * as Credential from "../../../Credential.js"
import * as PlutusData from "../../../Data.js"
import type * as DatumHash from "../../../DatumHash.js"
import * as PolicyId from "../../../PolicyId.js"
import * as PoolKeyHash from "../../../PoolKeyHash.js"
import * as Redeemer from "../../../Redeemer.js"
import type * as CoreRewardAddress from "../../../RewardAddress.js"
import * as Transaction from "../../../Transaction.js"
import * as TransactionHash from "../../../TransactionHash.js"
import type * as TransactionInput from "../../../TransactionInput.js"
import type * as CoreUTxO from "../../../UTxO.js"
import type * as EvalRedeemer from "../../EvalRedeemer.js"
import * as Provider from "../Provider.js"
import * as HttpUtils from "./HttpUtils.js"
import * as _Koios from "./Koios.js"
import * as _Ogmios from "./Ogmios.js"

/**
 * Wrap errors into ProviderError
 */
const wrapError = (operation: string) => (cause: unknown) =>
  Effect.fail(
    new Provider.ProviderError({
      message: `Koios ${operation} failed`,
      cause
    })
  )

export const getProtocolParameters = (baseUrl: string, token?: string) =>
  Effect.gen(function* () {
    const url = `${baseUrl}/epoch_params?limit=1&order=epoch_no.desc`
    const schema = Schema.Array(_Koios.ProtocolParametersSchema)
    const bearerToken = token ? { Authorization: `Bearer ${token}` } : undefined
    const [result] = yield* pipe(
      HttpUtils.get(url, schema, bearerToken),
      // Allows for dependency injection and easier testing
      Effect.timeout(10_000),
      Effect.catchAll(wrapError("getProtocolParameters")),
      Effect.provide(FetchHttpClient.layer)
    )

    return {
      minFeeA: result.min_fee_a,
      minFeeB: result.min_fee_b,
      maxTxSize: result.max_tx_size,
      maxValSize: result.max_val_size,
      keyDeposit: result.key_deposit,
      poolDeposit: result.pool_deposit,
      drepDeposit: BigInt(result.drep_deposit),
      govActionDeposit: BigInt(result.gov_action_deposit),
      priceMem: result.price_mem,
      priceStep: result.price_step,
      maxTxExMem: result.max_tx_ex_mem,
      maxTxExSteps: result.max_tx_ex_steps,
      coinsPerUtxoByte: result.coins_per_utxo_size,
      collateralPercentage: result.collateral_percent,
      maxCollateralInputs: result.max_collateral_inputs,
      minFeeRefScriptCostPerByte: result.min_fee_ref_script_cost_per_byte,
      costModels: {
        PlutusV1: Object.fromEntries(result.cost_models.PlutusV1.map((value, index) => [index.toString(), value])),
        PlutusV2: Object.fromEntries(result.cost_models.PlutusV2.map((value, index) => [index.toString(), value])),
        PlutusV3: Object.fromEntries(result.cost_models.PlutusV3.map((value, index) => [index.toString(), value]))
      }
    }
  })

export const getUtxos =
  (baseUrl: string, token?: string) => (addressOrCredential: CoreAddress.Address | Credential.Credential) => {
    // Convert CoreAddress to Bech32 string for Koios API
    const addressStr =
      addressOrCredential instanceof CoreAddress.Address
        ? CoreAddress.toBech32(addressOrCredential)
        : addressOrCredential
    return pipe(
      _Koios.getUtxosEffect(baseUrl, addressStr, token ? { Authorization: `Bearer ${token}` } : undefined),
      Effect.timeout(10_000),
      Effect.catchAll(wrapError("getUtxos"))
    )
  }

export const getUtxosWithUnit =
  (baseUrl: string, token?: string) =>
  (addressOrCredential: CoreAddress.Address | Credential.Credential, unit: string) => {
    // Convert CoreAddress to Bech32 string for Koios API
    const addressStr =
      addressOrCredential instanceof CoreAddress.Address
        ? CoreAddress.toBech32(addressOrCredential)
        : addressOrCredential
    return pipe(
      _Koios.getUtxosEffect(baseUrl, addressStr, token ? { Authorization: `Bearer ${token}` } : undefined),
      Effect.map((utxos) =>
        utxos.filter((utxo) => {
          const units = CoreAssets.getUnits(utxo.assets)
          return units.length > 0 && units.includes(unit)
        })
      ),
      Effect.timeout(10_000),
      Effect.catchAll(wrapError("getUtxosWithUnit"))
    )
  }

export const getUtxoByUnit = (baseUrl: string, token?: string) => (unit: string) =>
  pipe(
    Effect.sync(() => AssetsUnit.fromUnit(unit)),
    Effect.flatMap(({ assetName, policyId }) => {
      const policyIdHex = PolicyId.toHex(policyId)
      const assetNameHex = assetName ? Bytes.toHex(assetName.bytes) : ""
      const url = `${baseUrl}/asset_addresses?_asset_policy=${policyIdHex}&_asset_name=${assetNameHex}`
      const bearerToken = token ? { Authorization: `Bearer ${token}` } : undefined

      return pipe(
        HttpUtils.get(url, Schema.Array(_Koios.AssetAddressSchema), bearerToken),
        Effect.provide(FetchHttpClient.layer),
        Effect.flatMap((addresses) =>
          addresses.length === 0
            ? Effect.fail(new Provider.ProviderError({ cause: "Unit not found", message: "Unit not found" }))
            : Effect.succeed(addresses)
        ),
        Effect.flatMap((addresses) =>
          addresses.length > 1
            ? Effect.fail(
                new Provider.ProviderError({
                  cause: "Multiple addresses found",
                  message: "Unit needs to be an NFT or only held by one address."
                })
              )
            : Effect.succeed(addresses[0])
        ),
        Effect.flatMap((address) => _Koios.getUtxosEffect(baseUrl, address.payment_address, bearerToken)),
        Effect.map((utxos) =>
          utxos.filter((utxo) => {
            const units = CoreAssets.getUnits(utxo.assets)
            return units.length > 0 && units.includes(unit)
          })
        ),
        Effect.flatMap((utxos) =>
          utxos.length > 1
            ? Effect.fail(
                new Provider.ProviderError({
                  cause: "Multiple UTxOs found",
                  message: "Unit needs to be an NFT or only held by one address."
                })
              )
            : Effect.succeed(utxos[0])
        )
      )
    }),
    Effect.timeout(10_000),
    Effect.catchAll(wrapError("getUtxoByUnit"))
  )

export const getUtxosByOutRef =
  (baseUrl: string, token?: string) => (inputs: ReadonlyArray<TransactionInput.TransactionInput>) =>
    Effect.gen(function* () {
      const url = `${baseUrl}/tx_info`
      const body = {
        _tx_hashes: [...new Set(inputs.map((input) => TransactionHash.toHex(input.transactionId)))],
        _assets: true,
        _scripts: true
      }
      const bearerToken = token ? { Authorization: `Bearer ${token}` } : undefined

      const [result] = yield* pipe(
        HttpUtils.postJson(url, body, Schema.Array(_Koios.TxInfoSchema), bearerToken),
        Effect.provide(FetchHttpClient.layer),
        Effect.timeout(10_000),
        Effect.catchAll(wrapError("getUtxosByOutRef"))
      )

      if (result) {
        const utxos = result.outputs.map((koiosInputOutput: _Koios.InputOutput) =>
          _Koios.toUTxO(
            {
              tx_hash: koiosInputOutput.tx_hash,
              tx_index: koiosInputOutput.tx_index,
              block_time: 0,
              block_height: result.block_height,
              value: koiosInputOutput.value,
              datum_hash: koiosInputOutput.datum_hash,
              inline_datum: koiosInputOutput.inline_datum,
              reference_script: koiosInputOutput.reference_script,
              asset_list: koiosInputOutput.asset_list
            } satisfies _Koios.UTxO,
            koiosInputOutput.payment_addr.bech32
          )
        )
        return utxos.filter((utxo) =>
          inputs.some(
            (input) =>
              TransactionHash.toHex(utxo.transactionId) === TransactionHash.toHex(input.transactionId) &&
              Number(utxo.index) === Number(input.index)
          )
        )
      } else {
        return []
      }
    })

export const getDelegation = (baseUrl: string, token?: string) => (rewardAddress: CoreRewardAddress.RewardAddress) =>
  Effect.gen(function* () {
    const body = {
      _stake_addresses: [rewardAddress]
    }
    const url = `${baseUrl}/account_info`
    const bearerToken = token ? { Authorization: `Bearer ${token}` } : undefined

    const result = yield* pipe(
      HttpUtils.postJson(url, body, Schema.Array(_Koios.AccountInfoSchema), bearerToken),
      Effect.provide(FetchHttpClient.layer),
      Effect.flatMap((result) =>
        result.length === 0
          ? Effect.fail(
              new Provider.ProviderError({
                cause: "No delegation found",
                message: "No Delegation Found by Reward Address"
              })
            )
          : Effect.succeed(result[0])
      ),
      Effect.timeout(10_000),
      Effect.catchAll(wrapError("getDelegation"))
    )

    return {
      poolId: result.delegated_pool ? Schema.decodeSync(PoolKeyHash.FromBech32)(result.delegated_pool) : null,
      rewards: BigInt(result.rewards_available)
    } satisfies Provider.Delegation
  })

export const getDatum = (baseUrl: string, token?: string) => (datumHash: DatumHash.DatumHash) =>
  Effect.gen(function* () {
    const datumHashHex = Bytes.toHex(datumHash.hash)
    const body = {
      _datum_hashes: [datumHashHex]
    }
    const url = `${baseUrl}/datum_info`
    const bearerToken = token ? { Authorization: `Bearer ${token}` } : undefined

    const result = yield* pipe(
      HttpUtils.postJson(url, body, Schema.Array(_Koios.DatumInfo), bearerToken),
      Effect.provide(FetchHttpClient.layer),
      Effect.flatMap((result) =>
        result.length === 0
          ? Effect.fail(
              new Provider.ProviderError({
                cause: "No datum found",
                message: "No Datum Found by Datum Hash"
              })
            )
          : Effect.succeed(result[0])
      ),
      Effect.timeout(10_000),
      Effect.catchAll(wrapError("getDatum"))
    )

    return Schema.decodeSync(PlutusData.FromCBORHex())(result.bytes)
  })

export const awaitTx =
  (baseUrl: string, token?: string) =>
  (txHash: TransactionHash.TransactionHash, checkInterval = 20000, timeout = 160_000) =>
    Effect.gen(function* () {
      const txHashHex = TransactionHash.toHex(txHash)
      const body = {
        _tx_hashes: [txHashHex]
      }
      const url = `${baseUrl}/tx_info`
      const bearerToken = token ? { Authorization: `Bearer ${token}` } : undefined

      const result = yield* pipe(
        HttpUtils.postJson(url, body, Schema.Array(_Koios.TxInfoSchema), bearerToken),
        Effect.provide(FetchHttpClient.layer),
        Effect.repeat({
          schedule: Schedule.exponential(checkInterval),
          until: (result) => result.length > 0
        }),
        Effect.timeout(timeout),
        Effect.catchAllCause(
          (cause) =>
            Effect.fail(new Provider.ProviderError({ cause, message: "Koios awaitTx failed" }))
        ),
        Effect.as(true)
      )

      return result
    })

export const submitTx = (baseUrl: string, token?: string) => (tx: Transaction.Transaction) =>
  Effect.gen(function* () {
    const txCborBytes = Transaction.toCBORBytes(tx)
    const url = `${baseUrl}/submittx`
    const bearerToken = token ? { Authorization: `Bearer ${token}` } : undefined

    const result = yield* pipe(
      HttpUtils.postUint8Array(url, txCborBytes, _Koios.TxHashSchema, bearerToken),
      Effect.provide(FetchHttpClient.layer),
      Effect.timeout(10_000),
      Effect.catchAll(wrapError("submitTx"))
    )

    return Schema.decodeSync(TransactionHash.FromHex)(result)
  })

export const evaluateTx =
  (baseUrl: string, token?: string) =>
  (
    tx: Transaction.Transaction,
    additionalUTxOs?: Array<CoreUTxO.UTxO>
  ): Effect.Effect<Array<EvalRedeemer.EvalRedeemer>, Provider.ProviderError> =>
    Effect.gen(function* () {
      const txCborHex = Transaction.toCBORHex(tx)
      const url = `${baseUrl}/ogmios`
      // Use Core UTxOs directly with Ogmios format
      const body = {
        jsonrpc: "2.0",
        method: "evaluateTransaction",
        params: {
          transaction: { cbor: txCborHex },
          additionalUtxo: _Ogmios.toOgmiosUTxOs(additionalUTxOs)
        },
        id: null
      }
      const schema = _Ogmios.JSONRPCSchema(Schema.Array(_Ogmios.RedeemerSchema))
      const bearerToken = token ? { Authorization: `Bearer ${token}` } : undefined

      const { result } = yield* pipe(
        HttpUtils.postJson(url, body, schema, bearerToken),
        Effect.provide(FetchHttpClient.layer),
        Effect.timeout(10_000),
        Effect.catchAll(wrapError("evaluateTx"))
      )

      const evalRedeemers = result.map((item) => {
        // Map Ogmios terminology to Core terminology
        const purpose = item.validator.purpose as string
        let tag: Redeemer.RedeemerTag
        if (purpose === "publish") tag = "cert"
        else if (purpose === "withdraw") tag = "reward"
        else tag = purpose as Redeemer.RedeemerTag

        return {
          ex_units: new Redeemer.ExUnits({
            mem: BigInt(item.budget.memory),
            steps: BigInt(item.budget.cpu)
          }),
          redeemer_index: item.validator.index,
          redeemer_tag: tag
        }
      })

      return evalRedeemers
    })
