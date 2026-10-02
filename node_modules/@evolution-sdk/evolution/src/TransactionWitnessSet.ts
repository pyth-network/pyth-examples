import { Effect as Eff, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as Bootstrap from "./BootstrapWitness.js"
import * as CBOR from "./CBOR.js"
import * as PlutusData from "./Data.js"
import * as Ed25519Signature from "./Ed25519Signature.js"
import * as NativeScripts from "./NativeScripts.js"
import * as PlutusV1 from "./PlutusV1.js"
import * as PlutusV2 from "./PlutusV2.js"
import * as PlutusV3 from "./PlutusV3.js"
import * as Redeemer from "./Redeemer.js"
import * as Redeemers from "./Redeemers.js"
import * as VKey from "./VKey.js"

// Helper function for array comparison
const arrayEquals = <A>(a: ReadonlyArray<A> | undefined, b: ReadonlyArray<A> | undefined): boolean => {
  if (a === b) return true
  // Treat empty arrays and undefined as equal
  const aLen = a?.length ?? 0
  const bLen = b?.length ?? 0
  if (aLen === 0 && bLen === 0) return true
  if (a === undefined || b === undefined) return false
  if (aLen !== bLen) return false
  for (let i = 0; i < aLen; i++) {
    if (!Equal.equals(a[i], b[i])) return false
  }
  return true
}

// Helper function for array hashing
const arrayHash = <A>(arr: ReadonlyArray<A> | undefined): number => {
  const len = arr?.length ?? 0
  if (len === 0) return Hash.hash(0) // Treat empty arrays and undefined the same
  let hash = Hash.hash(len)
  for (const item of arr!) {
    hash = Hash.combine(hash)(Hash.hash(item))
  }
  return hash
}

// Helper function for PlutusData array hashing (uses Data.hash instead of Hash.hash)
const plutusDataArrayHash = (arr: ReadonlyArray<PlutusData.Data> | undefined): number => {
  const len = arr?.length ?? 0
  if (len === 0) return Hash.hash(0)
  let hash = Hash.hash(len)
  for (const item of arr!) {
    hash = Hash.combine(hash)(PlutusData.hash(item))
  }
  return hash
}

// Helper function for PlutusData array comparison (uses Data.equals instead of Equal.equals)
const plutusDataArrayEquals = (
  a: ReadonlyArray<PlutusData.Data> | undefined,
  b: ReadonlyArray<PlutusData.Data> | undefined
): boolean => {
  if (a === b) return true
  const aLen = a?.length ?? 0
  const bLen = b?.length ?? 0
  if (aLen === 0 && bLen === 0) return true
  if (a === undefined || b === undefined) return false
  if (aLen !== bLen) return false
  for (let i = 0; i < aLen; i++) {
    if (!PlutusData.equals(a[i], b[i])) return false
  }
  return true
}

/**
 * VKey witness for Ed25519 signatures.
 *
 * CDDL: vkeywitness = [ vkey, ed25519_signature ]
 *
 * @since 2.0.0
 * @category model
 */
export class VKeyWitness extends Schema.Class<VKeyWitness>("VKeyWitness")({
  vkey: VKey.VKey,
  signature: Ed25519Signature.Ed25519Signature
}) {
  /**
   * @since 2.0.0
   * @category json
   */
  toJSON() {
    return { _tag: "VKeyWitness" as const, vkey: this.vkey, signature: this.signature }
  }

  /**
   * @since 2.0.0
   * @category string
   */
  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  /**
   * @since 2.0.0
   * @category inspect
   */
  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  /**
   * @since 2.0.0
   * @category equality
   */
  [Equal.symbol](that: unknown): boolean {
    return (
      that instanceof VKeyWitness && Equal.equals(this.vkey, that.vkey) && Equal.equals(this.signature, that.signature)
    )
  }

  /**
   * @since 2.0.0
   * @category hash
   */
  [Hash.symbol](): number {
    return Hash.cached(this, Hash.combine(Hash.hash(this.vkey))(Hash.hash(this.signature)))
  }
}

/**
 * Bootstrap witness for Byron-era addresses.
 *
 * CDDL: bootstrap_witness = [
 *   public_key : vkey,
 *   signature : ed25519_signature,
 *   chain_code : bytes .size 32,
 *   attributes : bytes
 * ]
 *
 * @since 2.0.0
 * @category model
 */
// BootstrapWitness moved to its own module in ./BootstrapWitness.ts

/**
 * Plutus script reference with version tag.
 *
 * ```
 * CDDL: plutus_script =
 *   [ 0, plutus_v1_script ]
 * / [ 1, plutus_v2_script ]
 * / [ 2, plutus_v3_script ]
 * ```
 *
 * @since 2.0.0
 * @category model
 */
export const PlutusScript = Schema.Union(PlutusV1.PlutusV1, PlutusV2.PlutusV2, PlutusV3.PlutusV3).annotations({
  identifier: "PlutusScript",
  description: "Plutus script with version tag"
})

export type PlutusScript = typeof PlutusScript.Type

/**
 * TransactionWitnessSet based on Conway CDDL specification.
 *
 * ```
 * CDDL: transaction_witness_set = {
 *   ? 0 : nonempty_set<vkeywitness>
 *   ? 1 : nonempty_set<native_script>
 *   ? 2 : nonempty_set<bootstrap_witness>
 *   ? 3 : nonempty_set<plutus_v1_script>
 *   ? 4 : nonempty_set<plutus_data>
 *   ? 5 : redeemers
 *   ? 6 : nonempty_set<plutus_v2_script>
 *   ? 7 : nonempty_set<plutus_v3_script>
 * }
 *
 * nonempty_set<a0> = #6.258([+ a0])/ [+ a0]
 * ```
 *
 * @since 2.0.0
 * @category model
 */
export class TransactionWitnessSet extends Schema.Class<TransactionWitnessSet>("TransactionWitnessSet")({
  vkeyWitnesses: Schema.optional(Schema.Array(VKeyWitness)),
  nativeScripts: Schema.optional(Schema.Array(NativeScripts.NativeScript)),
  bootstrapWitnesses: Schema.optional(Schema.Array(Bootstrap.BootstrapWitness)),
  plutusV1Scripts: Schema.optional(Schema.Array(PlutusV1.PlutusV1)),
  plutusData: Schema.optional(Schema.Array(PlutusData.DataSchema)),
  redeemers: Schema.optional(Schema.typeSchema(Redeemers.Redeemers)),
  plutusV2Scripts: Schema.optional(Schema.Array(PlutusV2.PlutusV2)),
  plutusV3Scripts: Schema.optional(Schema.Array(PlutusV3.PlutusV3))
}) {
  /**
   * @since 2.0.0
   * @category json
   */
  toJSON() {
    return {
      _tag: "TransactionWitnessSet" as const,
      vkeyWitnesses: this.vkeyWitnesses?.map((v) => v.toJSON()),
      nativeScripts: this.nativeScripts?.map((s) => Schema.encodeSync(NativeScripts.NativeScript)(s)),
      bootstrapWitnesses: this.bootstrapWitnesses?.map((b) => b.toJSON()),
      plutusV1Scripts: this.plutusV1Scripts,
      plutusData: this.plutusData,
      redeemers: this.redeemers?.toJSON(),
      plutusV2Scripts: this.plutusV2Scripts,
      plutusV3Scripts: this.plutusV3Scripts
    }
  }

  /**
   * @since 2.0.0
   * @category string
   */
  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  /**
   * @since 2.0.0
   * @category inspect
   */
  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  /**
   * @since 2.0.0
   * @category equality
   */
  [Equal.symbol](that: unknown): boolean {
    return (
      that instanceof TransactionWitnessSet &&
      arrayEquals(this.vkeyWitnesses, that.vkeyWitnesses) &&
      arrayEquals(this.nativeScripts, that.nativeScripts) &&
      arrayEquals(this.bootstrapWitnesses, that.bootstrapWitnesses) &&
      arrayEquals(this.plutusV1Scripts, that.plutusV1Scripts) &&
      plutusDataArrayEquals(this.plutusData, that.plutusData) &&
      Equal.equals(this.redeemers, that.redeemers) &&
      arrayEquals(this.plutusV2Scripts, that.plutusV2Scripts) &&
      arrayEquals(this.plutusV3Scripts, that.plutusV3Scripts)
    )
  }

  /**
   * @since 2.0.0
   * @category hash
   */
  [Hash.symbol](): number {
    return Hash.cached(
      this,
      Hash.combine(
        Hash.combine(
          Hash.combine(
            Hash.combine(
              Hash.combine(
                Hash.combine(Hash.combine(arrayHash(this.vkeyWitnesses))(arrayHash(this.nativeScripts)))(
                  arrayHash(this.bootstrapWitnesses)
                )
              )(arrayHash(this.plutusV1Scripts))
            )(plutusDataArrayHash(this.plutusData))
          )(Hash.hash(this.redeemers))
        )(arrayHash(this.plutusV2Scripts))
      )(arrayHash(this.plutusV3Scripts))
    )
  }
}

// Note: Individual tuple encodings are handled inline during encode/decode.

/**
 * CDDL schema for BootstrapWitness.
 *
 * @since 2.0.0
 * @category schemas
 */
// BootstrapWitness CDDL schema provided by ./BootstrapWitness.ts

/**
 * CDDL schema for TransactionWitnessSet encoded as a CBOR map with integer keys.
 * Keys and values follow Conway-era CDDL:
 * ```
 *   0: nonempty_set<vkeywitness>
 *   1: nonempty_set<native_script>
 *   2: nonempty_set<bootstrap_witness>
 *   3: nonempty_set<plutus_v1_script>
 *   4: nonempty_set<plutus_data>
 *   5: redeemers (array of [tag, index, data, ex_units])
 *   6: nonempty_set<plutus_v2_script>
 *   7: nonempty_set<plutus_v3_script>
 *
 * nonempty_set<a0> = #6.258([+ a0]) / [+ a0]
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export const CDDLSchema = Schema.declare(
  (input: unknown): input is Map<bigint, CBOR.CBOR> => input instanceof Map
).annotations({ identifier: "TransactionWitnessSet.CDDLSchema" })

/**
 * CDDL transformation schema for TransactionWitnessSet.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transformOrFail(CDDLSchema, Schema.typeSchema(TransactionWitnessSet), {
  strict: true,
  encode: (toA) =>
    Eff.gen(function* () {
      const record = new Map<bigint, CBOR.CBOR>()

      // 0: vkeywitnesses
      if (toA.vkeyWitnesses && toA.vkeyWitnesses.length > 0) {
        const vkeyWitnesses = yield* Eff.all(
          toA.vkeyWitnesses.map((witness) =>
            Eff.gen(function* () {
              const vkeyBytes = yield* ParseResult.encode(VKey.FromBytes)(witness.vkey)
              const signatureBytes = yield* ParseResult.encode(Ed25519Signature.FromBytes)(witness.signature)
              return [vkeyBytes, signatureBytes] as const
            })
          )
        )
        // Use CBOR tag 258 for nonempty_set as per CDDL spec
        record.set(0n, CBOR.Tag.make({ tag: 258, value: vkeyWitnesses }))
      }

      // 1: native_scripts
      if (toA.nativeScripts && toA.nativeScripts.length > 0) {
        const nativeScripts = yield* Eff.all(
          toA.nativeScripts.map((script) => ParseResult.encode(NativeScripts.FromCDDL)(script))
        )
        // Use CBOR tag 258 for nonempty_set as per CDDL spec
        record.set(1n, CBOR.Tag.make({ tag: 258, value: nativeScripts }))
      }

      // 2: bootstrap_witnesses
      if (toA.bootstrapWitnesses && toA.bootstrapWitnesses.length > 0) {
        const bootstrapWitnesses = yield* Eff.all(
          toA.bootstrapWitnesses.map((witness) => ParseResult.encode(Bootstrap.FromCDDL)(witness))
        )
        // Use CBOR tag 258 for nonempty_set as per CDDL spec
        record.set(2n, CBOR.Tag.make({ tag: 258, value: bootstrapWitnesses }))
      }

      // 3: plutus_v1_scripts
      if (toA.plutusV1Scripts && toA.plutusV1Scripts.length > 0) {
        const plutusV1Scripts = toA.plutusV1Scripts.map((script) => script.bytes)
        // Use CBOR tag 258 for nonempty_set as per CDDL spec
        record.set(3n, CBOR.Tag.make({ tag: 258, value: plutusV1Scripts }))
      }

      // 4: plutus_data
      if (toA.plutusData && toA.plutusData.length > 0) {
        const plutusDataCBOR = yield* Eff.all(
          toA.plutusData.map((data) => ParseResult.encode(PlutusData.FromCDDL)(data))
        )
        // Use CBOR tag 258 for nonempty_set as per CDDL spec
        record.set(4n, CBOR.Tag.make({ tag: 258, value: plutusDataCBOR }))
      }

      // 5: redeemers — format determined by the discriminated union _tag
      if (toA.redeemers && toA.redeemers.size > 0) {
        switch (toA.redeemers._tag) {
          case "RedeemerMap": {
            const encoded = yield* ParseResult.encode(Redeemers.FromMapCDDL)(toA.redeemers)
            record.set(5n, new Map(encoded as Iterable<readonly [CBOR.CBOR, CBOR.CBOR]>))
            break
          }
          case "RedeemerArray": {
            const encoded = yield* ParseResult.encode(Redeemers.FromArrayCDDL)(toA.redeemers)
            record.set(5n, encoded)
            break
          }
        }
      }

      // 6: plutus_v2_scripts
      if (toA.plutusV2Scripts && toA.plutusV2Scripts.length > 0) {
        const plutusV2Scripts = toA.plutusV2Scripts.map((script) => script.bytes)
        // Use CBOR tag 258 for nonempty_set as per CDDL spec
        record.set(6n, CBOR.Tag.make({ tag: 258, value: plutusV2Scripts }))
      }

      // 7: plutus_v3_scripts
      if (toA.plutusV3Scripts && toA.plutusV3Scripts.length > 0) {
        const plutusV3Scripts = toA.plutusV3Scripts.map((script) => script.bytes)
        // Use CBOR tag 258 for nonempty_set as per CDDL spec
        record.set(7n, CBOR.Tag.make({ tag: 258, value: plutusV3Scripts }))
      }

      return record
    }),
  decode: (fromA) =>
    Eff.gen(function* () {
      const witnessSet: {
        vkeyWitnesses?: Array<VKeyWitness>
        nativeScripts?: Array<NativeScripts.NativeScript>
        bootstrapWitnesses?: Array<Bootstrap.BootstrapWitness>
        plutusV1Scripts?: Array<PlutusV1.PlutusV1>
        plutusData?: Array<PlutusData.Data>
        redeemers?: Redeemers.Redeemers
        plutusV2Scripts?: Array<PlutusV2.PlutusV2>
        plutusV3Scripts?: Array<PlutusV3.PlutusV3>
      } = {}

      // Parse each field from the record
      // Helper to accept nonempty_set<a0> in both forms:
      // - Tagged: #6.258([+ a0])
      // - Untagged: [+ a0]
      const asNonEmptyArray = <T>(value: unknown): ReadonlyArray<T> | undefined => {
        if (value === undefined) return undefined
        if (CBOR.isTag(value)) {
          const tag = value as { _tag: "Tag"; tag: number; value: unknown }
          if (tag.tag !== 258) return undefined
          if (Array.isArray(tag.value)) return tag.value as ReadonlyArray<T>
          return undefined
        }
        if (Array.isArray(value)) return value as ReadonlyArray<T>
        return undefined
      }

      // 0: vkeywitnesses
      const vkeysArr = asNonEmptyArray<readonly [Uint8Array, Uint8Array]>(fromA.get(0n))
      if (vkeysArr !== undefined) {
        const vkeyWitnesses: Array<VKeyWitness> = []
        for (const [vkeyBytes, signatureBytes] of vkeysArr) {
          const vkey = yield* ParseResult.decode(VKey.FromBytes)(vkeyBytes)
          const signature = yield* ParseResult.decode(Ed25519Signature.FromBytes)(signatureBytes)
          vkeyWitnesses.push(new VKeyWitness({ vkey, signature }))
        }
        witnessSet.vkeyWitnesses = vkeyWitnesses
      }

      // 1: native_scripts
      const nativeArr = asNonEmptyArray<typeof NativeScripts.CDDLSchema.Type>(fromA.get(1n))
      if (nativeArr !== undefined) {
        const nativeScripts = yield* Eff.all(
          nativeArr.map((scriptCBOR) => ParseResult.decode(NativeScripts.FromCDDL)(scriptCBOR))
        )
        witnessSet.nativeScripts = nativeScripts
      }

      // 2: bootstrap_witnesses
      const bootstrapArr = asNonEmptyArray<typeof Bootstrap.CDDLSchema.Type>(fromA.get(2n))
      if (bootstrapArr !== undefined) {
        const bootstrapWitnesses: Array<Bootstrap.BootstrapWitness> = []
        for (const tuple of bootstrapArr) {
          const bw = yield* ParseResult.decode(Bootstrap.FromCDDL)(tuple)
          bootstrapWitnesses.push(bw)
        }
        witnessSet.bootstrapWitnesses = bootstrapWitnesses
      }

      // 3: plutus_v1_scripts
      const p1Arr = asNonEmptyArray<Uint8Array>(fromA.get(3n))
      if (p1Arr !== undefined) {
        const plutusV1Scripts = p1Arr.map((script) => new PlutusV1.PlutusV1({ bytes: script }))
        witnessSet.plutusV1Scripts = plutusV1Scripts
      }

      // 4: plutus_data
      const pdataArr = asNonEmptyArray<typeof PlutusData.CDDLSchema.Type>(fromA.get(4n))
      if (pdataArr !== undefined) {
        // Some real-world CBOR producers may include the simple value `undefined` inside this set.
        // Filter out such entries before decoding to strict PlutusData.
        const isDefined = <T>(x: T | undefined): x is T => x !== undefined
        const sanitized = pdataArr.filter(isDefined)
        const plutusData = yield* Eff.all(
          sanitized.map((dataCBOR) => ParseResult.decode(PlutusData.FromCDDL)(dataCBOR))
        )
        witnessSet.plutusData = plutusData
      }

      // 5: redeemers — Conway CDDL supports both array and map formats:
      //   redeemers = [ + redeemer ] / { + [tag, index] => [data, ex_units] }
      const redeemersRaw = fromA.get(5n)
      if (redeemersRaw !== undefined) {
        if (redeemersRaw instanceof Map) {
          // Map format (Conway recommended)
          // MapCDDLSchema uses MapFromSelf so it expects a JS Map directly
          const redeemersCollection = yield* ParseResult.decode(Redeemers.FromMapCDDL)(
            redeemersRaw as unknown as Schema.Schema.Encoded<typeof Redeemers.FromMapCDDL>
          )
          witnessSet.redeemers = redeemersCollection
        } else {
          // Array format (legacy, or tag-258 wrapped)
          const asRedeemersArray = (
            value: unknown
          ): ReadonlyArray<Schema.Schema.Type<typeof Redeemers.ArrayCDDLSchema>[number]> | undefined => {
            if (CBOR.isTag(value)) {
              const tag = value as { _tag: "Tag"; tag: number; value: unknown }
              if (tag.tag !== 258) return undefined
              if (Array.isArray(tag.value))
                return tag.value as ReadonlyArray<Schema.Schema.Type<typeof Redeemers.ArrayCDDLSchema>[number]>
              return undefined
            }
            if (Array.isArray(value))
              return value as ReadonlyArray<Schema.Schema.Type<typeof Redeemers.ArrayCDDLSchema>[number]>
            return undefined
          }
          const redeemersArray = asRedeemersArray(redeemersRaw)
          if (redeemersArray !== undefined) {
            const redeemersCollection = yield* ParseResult.decode(Redeemers.FromArrayCDDL)(redeemersArray)
            witnessSet.redeemers = redeemersCollection
          }
        }
      }

      // 6: plutus_v2_scripts
      const p2Arr = asNonEmptyArray<Uint8Array>(fromA.get(6n))
      if (p2Arr !== undefined) {
        const plutusV2Scripts = p2Arr.map((bytes) => new PlutusV2.PlutusV2({ bytes }))
        witnessSet.plutusV2Scripts = plutusV2Scripts
      }

      // 7: plutus_v3_scripts
      const p3Arr = asNonEmptyArray<Uint8Array>(fromA.get(7n))
      if (p3Arr !== undefined) {
        const plutusV3Scripts = p3Arr.map((bytes) => new PlutusV3.PlutusV3({ bytes }))
        witnessSet.plutusV3Scripts = plutusV3Scripts
      }

      // Build the class instance directly to allow fully empty witness sets
      return new TransactionWitnessSet(witnessSet, { disableValidation: true })
    })
})

export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(CBOR.FromBytes(options), FromCDDL).annotations({
    identifier: "TransactionWitnessSet.FromCBORBytes",
    description: "Transforms CBOR bytes to TransactionWitnessSet"
  })

export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(CBOR.FromHex(options), FromCDDL).annotations({
    identifier: "TransactionWitnessSet.FromCBORHex",
    description: "Transforms CBOR hex string to TransactionWitnessSet"
  })

/**
 * FastCheck arbitrary for generating random TransactionWitnessSet instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary: FastCheck.Arbitrary<TransactionWitnessSet> = FastCheck.record({
  vkeyWitnesses: FastCheck.option(
    FastCheck.array(
      FastCheck.record({
        vkey: VKey.arbitrary,
        signature: Ed25519Signature.arbitrary
      }).map(({ signature, vkey }) => new VKeyWitness({ vkey, signature }))
    )
  ),
  // Generate valid NativeScripts via its own arbitrary
  nativeScripts: FastCheck.option(FastCheck.array(NativeScripts.arbitrary)),
  bootstrapWitnesses: FastCheck.option(FastCheck.array(Bootstrap.arbitrary)),
  plutusV1Scripts: FastCheck.option(
    FastCheck.array(FastCheck.uint8Array({ minLength: 1, maxLength: 1000 })).map((scripts) =>
      scripts.map((bytes) => new PlutusV1.PlutusV1({ bytes }))
    )
  ),
  plutusData: FastCheck.option(FastCheck.array(PlutusData.arbitrary)),
  redeemers: FastCheck.option(
    FastCheck.uniqueArray(
      FastCheck.record({
        data: PlutusData.arbitrary,
        exUnits: FastCheck.tuple(
          FastCheck.bigInt({ min: 0n, max: 10000000n }),
          FastCheck.bigInt({ min: 0n, max: 10000000n })
        ).map(([mem, steps]) => new Redeemer.ExUnits({ mem, steps })),
        index: FastCheck.bigInt({ min: 0n, max: 1000n }),
        tag: FastCheck.constantFrom("spend" as const, "mint" as const, "cert" as const, "reward" as const)
      }).map(({ data, exUnits, index, tag }) => new Redeemer.Redeemer({ tag, index, data, exUnits })),
      {
        minLength: 1,
        maxLength: 5,
        selector: (r) => `${r.tag}:${r.index}`
      }
    ).chain((redeemers) =>
      FastCheck.constantFrom<Redeemers.Redeemers>(
        Redeemers.makeRedeemerMap(redeemers),
        new Redeemers.RedeemerArray({ value: redeemers })
      )
    )
  ),
  plutusV2Scripts: FastCheck.option(
    FastCheck.array(FastCheck.uint8Array({ minLength: 1, maxLength: 1000 })).map((scripts) =>
      scripts.map((bytes) => new PlutusV2.PlutusV2({ bytes }))
    )
  ),
  plutusV3Scripts: FastCheck.option(
    FastCheck.array(FastCheck.uint8Array({ minLength: 1, maxLength: 1000 })).map((scripts) =>
      scripts.map((bytes) => new PlutusV3.PlutusV3({ bytes }))
    )
  )
}).map((witnessSetData) => {
  // Convert null values to undefined for optional fields
  const cleanedData = Object.fromEntries(Object.entries(witnessSetData).filter(([_, value]) => value !== null))
  return TransactionWitnessSet.make(cleanedData)
})

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse a TransactionWitnessSet from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Parse a TransactionWitnessSet from CBOR bytes and return the root format tree.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytesWithFormat = (
  bytes: Uint8Array
): CBOR.DecodedWithFormat<TransactionWitnessSet> => {
  const decoded = CBOR.fromCBORBytesWithFormat(bytes)
  const value = Schema.decodeSync(FromCDDL)(decoded.value as Map<bigint, CBOR.CBOR>)

  return {
    value,
    format: decoded.format
  }
}

/**
 * Parse a TransactionWitnessSet from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORHex(options))(hex)

/**
 * Parse a TransactionWitnessSet from CBOR hex string and return the root format tree.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHexWithFormat = (
  hex: string
): CBOR.DecodedWithFormat<TransactionWitnessSet> => {
  const decoded = CBOR.fromCBORHexWithFormat(hex)
  const value = Schema.decodeSync(FromCDDL)(decoded.value as Map<bigint, CBOR.CBOR>)

  return {
    value,
    format: decoded.format
  }
}

// ============================================================================
// Encoding Functions
// ============================================================================

/**
 * Convert a TransactionWitnessSet to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (data: TransactionWitnessSet, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORBytes(options))(data)

/**
 * Convert a TransactionWitnessSet to CBOR bytes using an explicit root format tree.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytesWithFormat = (
  data: TransactionWitnessSet,
  format: CBOR.CBORFormat
): Uint8Array => {
  const cborMap = Schema.encodeSync(FromCDDL)(data)
  return CBOR.toCBORBytesWithFormat(cborMap, format)
}

/**
 * Convert a TransactionWitnessSet to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (data: TransactionWitnessSet, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORHex(options))(data)

/**
 * Convert a TransactionWitnessSet to CBOR hex string using an explicit root format tree.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHexWithFormat = (
  data: TransactionWitnessSet,
  format: CBOR.CBORFormat
): string => {
  const cborMap = Schema.encodeSync(FromCDDL)(data)
  return CBOR.toCBORHexWithFormat(cborMap, format)
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an empty TransactionWitnessSet.
 *
 * @since 2.0.0
 * @category constructors
 */
export const empty = (): TransactionWitnessSet => TransactionWitnessSet.make({})

/**
 * Create a TransactionWitnessSet with only VKey witnesses.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromVKeyWitnesses = (witnesses: Array<VKeyWitness>): TransactionWitnessSet =>
  TransactionWitnessSet.make({ vkeyWitnesses: witnesses })

/**
 * Create a TransactionWitnessSet with only native scripts.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromNativeScripts = (scripts: Array<NativeScripts.NativeScript>): TransactionWitnessSet =>
  TransactionWitnessSet.make({ nativeScripts: scripts })
