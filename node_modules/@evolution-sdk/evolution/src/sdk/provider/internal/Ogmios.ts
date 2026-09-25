import type { Record } from "effect"
import { Schema } from "effect"

import * as CoreAddress from "../../../Address.js"
import * as AssetName from "../../../AssetName.js"
import type * as CoreAssets from "../../../Assets/index.js"
import * as Bytes from "../../../Bytes.js"
import * as PlutusData from "../../../Data.js"
import type * as DatumOption from "../../../DatumOption.js"
import * as NativeScripts from "../../../NativeScripts.js"
import * as PolicyId from "../../../PolicyId.js"
import type * as CoreScript from "../../../Script.js"
import * as TransactionHash from "../../../TransactionHash.js"
import type * as CoreUTxO from "../../../UTxO.js"

export const JSONRPCSchema = <A, I, R>(schema: Schema.Schema<A, I, R>) =>
  Schema.Struct({
    jsonrpc: Schema.String,
    method: Schema.optional(Schema.String),
    id: Schema.NullOr(Schema.Number),
    result: schema
  }).annotations({ identifier: "JSONRPCSchema" })

const LovelaceAsset = Schema.Struct({
  lovelace: Schema.Number
})

const TupleNumberFromString = Schema.compose(Schema.split("/"), Schema.Array(Schema.NumberFromString))

export const ProtocolParametersSchema = Schema.Struct({
  minFeeCoefficient: Schema.Number,
  minFeeReferenceScripts: Schema.Struct({
    base: Schema.Number,
    range: Schema.Number,
    multiplier: Schema.Number
  }),
  maxReferenceScriptsSize: Schema.Struct({
    bytes: Schema.Number
  }),
  stakePoolVotingThresholds: Schema.Struct({
    noConfidence: TupleNumberFromString,
    constitutionalCommittee: Schema.Struct({
      default: TupleNumberFromString,
      stateOfNoConfidence: TupleNumberFromString
    }),
    hardForkInitiation: TupleNumberFromString,
    protocolParametersUpdate: Schema.Struct({
      security: TupleNumberFromString
    })
  }),
  delegateRepresentativeVotingThresholds: Schema.Struct({
    noConfidence: TupleNumberFromString,
    constitutionalCommittee: Schema.Struct({
      default: TupleNumberFromString,
      stateOfNoConfidence: TupleNumberFromString
    }),
    constitution: TupleNumberFromString,
    hardForkInitiation: TupleNumberFromString,
    protocolParametersUpdate: Schema.Struct({
      network: TupleNumberFromString,
      economic: TupleNumberFromString,
      technical: TupleNumberFromString,
      governance: TupleNumberFromString
    }),
    treasuryWithdrawals: TupleNumberFromString
  }),
  constitutionalCommitteeMinSize: Schema.optional(Schema.Number),
  constitutionalCommitteeMaxTermLength: Schema.Number,
  governanceActionLifetime: Schema.Number,
  governanceActionDeposit: Schema.Struct({
    ada: LovelaceAsset
  }),
  delegateRepresentativeDeposit: Schema.Struct({
    ada: LovelaceAsset
  }),
  delegateRepresentativeMaxIdleTime: Schema.Number,
  minFeeConstant: Schema.Struct({ ada: LovelaceAsset }),
  maxBlockBodySize: Schema.Struct({ bytes: Schema.Number }),
  maxBlockHeaderSize: Schema.Struct({ bytes: Schema.Number }),
  maxTransactionSize: Schema.Struct({ bytes: Schema.Number }),
  stakeCredentialDeposit: Schema.Struct({ ada: LovelaceAsset }),
  stakePoolDeposit: Schema.Struct({ ada: LovelaceAsset }),
  stakePoolRetirementEpochBound: Schema.Number,
  desiredNumberOfStakePools: Schema.Number,
  stakePoolPledgeInfluence: TupleNumberFromString,
  monetaryExpansion: TupleNumberFromString,
  treasuryExpansion: TupleNumberFromString,
  minStakePoolCost: Schema.Struct({ ada: LovelaceAsset }),
  minUtxoDepositConstant: Schema.Struct({ ada: LovelaceAsset }),
  minUtxoDepositCoefficient: Schema.Number,
  plutusCostModels: Schema.Struct({
    "plutus:v1": Schema.Array(Schema.Number),
    "plutus:v2": Schema.Array(Schema.Number),
    "plutus:v3": Schema.Array(Schema.Number)
  }),
  scriptExecutionPrices: Schema.Struct({
    memory: TupleNumberFromString,
    cpu: TupleNumberFromString
  }),
  maxExecutionUnitsPerTransaction: Schema.Struct({
    memory: Schema.Number,
    cpu: Schema.Number
  }),
  maxExecutionUnitsPerBlock: Schema.Struct({ memory: Schema.Number, cpu: Schema.Number }),
  maxValueSize: Schema.Struct({ bytes: Schema.Number }),
  collateralPercentage: Schema.Number,
  maxCollateralInputs: Schema.Number,
  version: Schema.Struct({ major: Schema.Number, minor: Schema.Number })
}).annotations({ identifier: "ProtocolParametersSchema" })

export interface ProtocolParameters extends Schema.Schema.Type<typeof ProtocolParametersSchema> {}

export const Delegation = Schema.Array(
  Schema.Struct({
    from: Schema.String,
    credential: Schema.String,
    stakePool: Schema.optional(Schema.Struct({ id: Schema.String })),
    rewards: Schema.Struct({ ada: Schema.Struct({ lovelace: Schema.Number }) }),
    deposit: Schema.Struct({ ada: Schema.Struct({ lovelace: Schema.Number }) })
  })
)

type Script = {
  language: "native" | "plutus:v1" | "plutus:v2" | "plutus:v3"
  cbor: string
}

export type OgmiosAssets = Record<string, Record<string, number>>

export type Value = {
  ada: { lovelace: number }
} & OgmiosAssets

export type OgmiosUTxO = {
  transaction: { id: string }
  index: number
  address: string
  value: Value
  datumHash?: string | undefined
  datum?: string | undefined
  script?: Script | undefined
}

export const RedeemerSchema = Schema.Struct({
  validator: Schema.Struct({
    purpose: Schema.Literal("spend", "mint", "publish", "withdraw", "vote", "propose"),
    index: Schema.Int
  }),
  budget: Schema.Struct({
    memory: Schema.Int,
    cpu: Schema.Int
  })
}).annotations({ identifier: "RedeemerSchema" })

export const toOgmiosUTxOs = (utxos: Array<CoreUTxO.UTxO> | undefined): Array<OgmiosUTxO> => {
  // NOTE: Ogmios only works with single encoding, not double encoding.
  // You will get the following error:
  // "Invalid request: couldn't decode Plutus script."
  const toOgmiosScript = (script: CoreScript.Script | undefined): OgmiosUTxO["script"] | undefined => {
    if (script) {
      // Script type directly tells us the language
      switch (script._tag) {
        case "NativeScript":
          // For native scripts, encode the inner script structure
          return { language: "native", cbor: NativeScripts.toCBORHex(script) }
        case "PlutusV1":
          // For Plutus scripts, send only the raw script bytes without CBOR envelope
          // Ogmios v6 expects raw scripts without CBOR tags when using explicit JSON notation
          return { language: "plutus:v1", cbor: Bytes.toHex(script.bytes) }
        case "PlutusV2":
          return { language: "plutus:v2", cbor: Bytes.toHex(script.bytes) }
        case "PlutusV3":
          return { language: "plutus:v3", cbor: Bytes.toHex(script.bytes) }
      }
    }
    return undefined
  }

  const toOgmiosAssets = (assets: CoreAssets.Assets): OgmiosAssets => {
    const newAssets: OgmiosAssets = {}
    if (assets.multiAsset) {
      for (const [policyId, assetMap] of assets.multiAsset.map.entries()) {
        const policyIdHex = PolicyId.toHex(policyId)
        if (!newAssets[policyIdHex]) {
          newAssets[policyIdHex] = {}
        }
        for (const [assetName, quantity] of assetMap.entries()) {
          const assetNameHex = AssetName.toHex(assetName)
          newAssets[policyIdHex][assetNameHex || ""] = Number(quantity)
        }
      }
    }
    return newAssets
  }

  const toOgmiosDatum = (datumOption: DatumOption.DatumOption | undefined): { datumHash?: string; datum?: string } => {
    if (!datumOption) return {}
    if (datumOption._tag === "DatumHash") {
      return { datumHash: Bytes.toHex(datumOption.hash) }
    }
    if (datumOption._tag === "InlineDatum") {
      // Convert PlutusData to hex CBOR
      return { datum: PlutusData.toCBORHex(datumOption.data) }
    }
    return {}
  }

  return (utxos || []).map(
    (utxo): OgmiosUTxO => ({
      transaction: {
        id: TransactionHash.toHex(utxo.transactionId)
      },
      index: Number(utxo.index),
      address: CoreAddress.toBech32(utxo.address),
      value: {
        ada: { lovelace: Number(utxo.assets.lovelace) },
        ...toOgmiosAssets(utxo.assets)
      },
      ...toOgmiosDatum(utxo.datumOption),
      script: toOgmiosScript(utxo.scriptRef)
    })
  )
}
