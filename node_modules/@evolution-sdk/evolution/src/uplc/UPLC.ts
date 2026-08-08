/**
 * UPLC (Untyped Plutus Lambda Calculus) Module
 *
 * Effect Schema-based types and transformations for UPLC programs.
 * Implements the Flat serialization format used by Plutus Core.
 *
 * @since 2.0.0
 * @module
 */
import { Data as EffectData, Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as Bytes from "../Bytes.js"
import * as CBOR from "../CBOR.js"
import * as Data from "../Data.js"

/**
 * Error class for UPLC related operations.
 *
 * @since 2.0.0
 * @category errors
 */
export class UPLCError extends EffectData.TaggedError("UPLCError")<{
  message?: string
  cause?: unknown
}> {}

/**
 * Semantic version for UPLC programs.
 *
 * @since 2.0.0
 * @category model
 */
export type SemVer = `${number}.${number}.${number}`

/**
 * Parse version components from SemVer string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const parseSemVer = (v: SemVer): { major: number; minor: number; patch: number } => {
  const [major, minor, patch] = v.split(".").map(Number) as [number, number, number]
  return { major, minor, patch }
}

/**
 * Create a SemVer string.
 *
 * @since 2.0.0
 * @category constructors
 */
export const makeSemVer = (major: number, minor: number, patch: number): SemVer =>
  `${major}.${minor}.${patch}` as SemVer

/**
 * All builtin functions supported in Plutus V3.
 * Order is significant - index is used in flat encoding.
 *
 * @since 2.0.0
 * @category constants
 */
export const BuiltinFunctions = [
  "addInteger",
  "subtractInteger",
  "multiplyInteger",
  "divideInteger",
  "quotientInteger",
  "remainderInteger",
  "modInteger",
  "equalsInteger",
  "lessThanInteger",
  "lessThanEqualsInteger",
  "appendByteString",
  "consByteString",
  "sliceByteString",
  "lengthOfByteString",
  "indexByteString",
  "equalsByteString",
  "lessThanByteString",
  "lessThanEqualsByteString",
  "sha2_256",
  "sha3_256",
  "blake2b_256",
  "verifyEd25519Signature",
  "appendString",
  "equalsString",
  "encodeUtf8",
  "decodeUtf8",
  "ifThenElse",
  "chooseUnit",
  "trace",
  "fstPair",
  "sndPair",
  "chooseList",
  "mkCons",
  "headList",
  "tailList",
  "nullList",
  "chooseData",
  "constrData",
  "mapData",
  "listData",
  "iData",
  "bData",
  "unConstrData",
  "unMapData",
  "unListData",
  "unIData",
  "unBData",
  "equalsData",
  "mkPairData",
  "mkNilData",
  "mkNilPairData",
  "serialiseData",
  "verifyEcdsaSecp256k1Signature",
  "verifySchnorrSecp256k1Signature",
  "bls12_381_G1_add",
  "bls12_381_G1_neg",
  "bls12_381_G1_scalarMul",
  "bls12_381_G1_equal",
  "bls12_381_G1_hashToGroup",
  "bls12_381_G1_compress",
  "bls12_381_G1_uncompress",
  "bls12_381_G2_add",
  "bls12_381_G2_neg",
  "bls12_381_G2_scalarMul",
  "bls12_381_G2_equal",
  "bls12_381_G2_hashToGroup",
  "bls12_381_G2_compress",
  "bls12_381_G2_uncompress",
  "bls12_381_millerLoop",
  "bls12_381_mulMlResult",
  "bls12_381_finalVerify",
  "keccak_256",
  "blake2b_224",
  "integerToByteString",
  "byteStringToInteger",
  "andByteString",
  "orByteString",
  "xorByteString",
  "complementByteString",
  "readBit",
  "writeBits",
  "replicateByte",
  "shiftByteString",
  "rotateByteString",
  "countSetBits",
  "findFirstSetBit",
  "ripemd_160"
] as const

export type BuiltinFunction = (typeof BuiltinFunctions)[number]

/**
 * Primitive UPLC data types.
 *
 * @since 2.0.0
 * @category model
 */
export type PrimitiveDataType = "Integer" | "ByteString" | "String" | "Unit" | "Bool" | "Data"

/**
 * UPLC data type (recursive for pair/list).
 *
 * @since 2.0.0
 * @category model
 */
export type DataType =
  | PrimitiveDataType
  | { readonly pair: readonly [DataType, DataType] }
  | { readonly list: DataType }

/**
 * Type tags for flat encoding.
 *
 * @since 2.0.0
 * @category constants
 */
export const DataTypeTags = {
  Integer: 0,
  ByteString: 1,
  String: 2,
  Unit: 3,
  Bool: 4,
  Data: 8
} as const

/**
 * Value types for UPLC constants.
 *
 * @since 2.0.0
 * @category model
 */
export type ConstantValue =
  | bigint
  | Uint8Array
  | string
  | boolean
  | null
  | { readonly items: ReadonlyArray<ConstantValue> }
  | { readonly index: bigint; readonly fields: ReadonlyArray<ConstantValue> }
  | ReadonlyMap<ConstantValue, ConstantValue>

/**
 * Term tags for flat encoding.
 *
 * @since 2.0.0
 * @category constants
 */
export const TermTags = {
  Var: 0,
  Delay: 1,
  Lambda: 2,
  Apply: 3,
  Constant: 4,
  Force: 5,
  Error: 6,
  Builtin: 7,
  Constr: 8,
  Case: 9
} as const

/**
 * UPLC Term - recursive union type.
 * Uses de Bruijn indices (bigint) for variable names.
 *
 * @since 2.0.0
 * @category model
 */
export type Term =
  | { readonly type: "Var"; readonly name: bigint }
  | { readonly type: "Lambda"; readonly name: bigint; readonly body: Term }
  | { readonly type: "Apply"; readonly function: Term; readonly argument: Term }
  | { readonly type: "Constant"; readonly valueType: DataType; readonly value: ConstantValue }
  | { readonly type: "Builtin"; readonly function: BuiltinFunction }
  | { readonly type: "Delay"; readonly term: Term }
  | { readonly type: "Force"; readonly term: Term }
  | { readonly type: "Constr"; readonly tag: bigint; readonly terms: ReadonlyArray<Term> }
  | { readonly type: "Case"; readonly term: Term; readonly cases: ReadonlyArray<Term> }
  | { readonly type: "Error" }

/**
 * Encoded Term type (for Schema transformation).
 *
 * @since 2.0.0
 * @category model
 */
export type TermEncoded =
  | { readonly type: "Var"; readonly name: string }
  | { readonly type: "Lambda"; readonly name: string; readonly body: TermEncoded }
  | { readonly type: "Apply"; readonly function: TermEncoded; readonly argument: TermEncoded }
  | { readonly type: "Constant"; readonly valueType: DataType; readonly value: ConstantValue }
  | { readonly type: "Builtin"; readonly function: BuiltinFunction }
  | { readonly type: "Delay"; readonly term: TermEncoded }
  | { readonly type: "Force"; readonly term: TermEncoded }
  | { readonly type: "Constr"; readonly tag: string; readonly terms: ReadonlyArray<TermEncoded> }
  | { readonly type: "Case"; readonly term: TermEncoded; readonly cases: ReadonlyArray<TermEncoded> }
  | { readonly type: "Error" }

/**
 * UPLC Program - contains version and body term.
 *
 * @since 2.0.0
 * @category model
 */
export class Program extends Schema.Class<Program>("UPLC.Program")({
  version: Schema.String.pipe(Schema.pattern(/^\d+\.\d+\.\d+$/)).annotations({
    identifier: "UPLC.SemVer",
    description: "Semantic version in format major.minor.patch"
  }),
  body: Schema.suspend((): Schema.Schema<Term, TermEncoded> => TermSchema)
}) {
  /**
   * Get the version as parsed components.
   */
  get versionParsed(): { major: number; minor: number; patch: number } {
    return parseSemVer(this.version as SemVer)
  }

  toJSON() {
    return {
      _tag: "UPLC.Program" as const,
      version: this.version,
      body: termToJSON(this.body)
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof Program && this.version === that.version && termEquals(this.body, that.body)
  }

  [Hash.symbol](): number {
    return Hash.string(this.version) ^ termHash(this.body)
  }
}

const VarSchema = Schema.Struct({
  type: Schema.Literal("Var"),
  name: Schema.BigInt
})

const LambdaSchema: Schema.Schema<
  { type: "Lambda"; name: bigint; body: Term },
  { type: "Lambda"; name: string; body: TermEncoded }
> = Schema.Struct({
  type: Schema.Literal("Lambda"),
  name: Schema.BigInt,
  body: Schema.suspend((): Schema.Schema<Term, TermEncoded> => TermSchema)
})

const ApplySchema: Schema.Schema<
  { type: "Apply"; function: Term; argument: Term },
  { type: "Apply"; function: TermEncoded; argument: TermEncoded }
> = Schema.Struct({
  type: Schema.Literal("Apply"),
  function: Schema.suspend((): Schema.Schema<Term, TermEncoded> => TermSchema),
  argument: Schema.suspend((): Schema.Schema<Term, TermEncoded> => TermSchema)
})

const ConstantSchema = Schema.Struct({
  type: Schema.Literal("Constant"),
  valueType: Schema.Unknown as Schema.Schema<DataType, DataType>,
  value: Schema.Unknown as Schema.Schema<ConstantValue, ConstantValue>
})

const BuiltinSchema = Schema.Struct({
  type: Schema.Literal("Builtin"),
  function: Schema.Literal(...BuiltinFunctions)
})

const DelaySchema: Schema.Schema<{ type: "Delay"; term: Term }, { type: "Delay"; term: TermEncoded }> = Schema.Struct({
  type: Schema.Literal("Delay"),
  term: Schema.suspend((): Schema.Schema<Term, TermEncoded> => TermSchema)
})

const ForceSchema: Schema.Schema<{ type: "Force"; term: Term }, { type: "Force"; term: TermEncoded }> = Schema.Struct({
  type: Schema.Literal("Force"),
  term: Schema.suspend((): Schema.Schema<Term, TermEncoded> => TermSchema)
})

const ConstrSchema: Schema.Schema<
  { type: "Constr"; tag: bigint; terms: ReadonlyArray<Term> },
  { type: "Constr"; tag: string; terms: ReadonlyArray<TermEncoded> }
> = Schema.Struct({
  type: Schema.Literal("Constr"),
  tag: Schema.BigInt,
  terms: Schema.Array(Schema.suspend((): Schema.Schema<Term, TermEncoded> => TermSchema))
})

const CaseSchema: Schema.Schema<
  { type: "Case"; term: Term; cases: ReadonlyArray<Term> },
  { type: "Case"; term: TermEncoded; cases: ReadonlyArray<TermEncoded> }
> = Schema.Struct({
  type: Schema.Literal("Case"),
  term: Schema.suspend((): Schema.Schema<Term, TermEncoded> => TermSchema),
  cases: Schema.Array(Schema.suspend((): Schema.Schema<Term, TermEncoded> => TermSchema))
})

const ErrorSchema = Schema.Struct({
  type: Schema.Literal("Error")
})

/**
 * Schema for UPLC Term (recursive union).
 *
 * @since 2.0.0
 * @category schemas
 */
export const TermSchema: Schema.Schema<Term, TermEncoded> = Schema.Union(
  VarSchema,
  LambdaSchema,
  ApplySchema,
  ConstantSchema,
  BuiltinSchema,
  DelaySchema,
  ForceSchema,
  ConstrSchema,
  CaseSchema,
  ErrorSchema
).annotations({
  identifier: "UPLC.Term"
})

interface DecodeState {
  readonly buffer: Uint8Array
  bitPosition: number
}

interface EncodeState {
  readonly bytes: Array<number>
  currentByte: number
  bitCount: number
}

/**
 * Pop a single bit from the decode state.
 *
 * @since 2.0.0
 * @category internal
 */
const popBit = (state: DecodeState): 0 | 1 => {
  if (state.bitPosition >= state.buffer.length * 8) {
    throw new UPLCError({ message: "No more bits available" })
  }
  const byteIndex = Math.floor(state.bitPosition / 8)
  const bitIndex = 7 - (state.bitPosition % 8)
  const bit = ((state.buffer[byteIndex]! >> bitIndex) & 1) as 0 | 1
  state.bitPosition++
  return bit
}

/**
 * Pop multiple bits from the decode state.
 *
 * @since 2.0.0
 * @category internal
 */
const popBits = (state: DecodeState, count: number): number => {
  let result = 0
  for (let i = 0; i < count; i++) {
    result = (result << 1) | popBit(state)
  }
  return result
}

/**
 * Pop a single byte from the decode state.
 *
 * @since 2.0.0
 * @category internal
 */
const popByte = (state: DecodeState): number => {
  // Align to byte boundary
  const remainder = state.bitPosition % 8
  if (remainder !== 0) {
    state.bitPosition += 8 - remainder
  }
  const byteIndex = state.bitPosition / 8
  if (byteIndex >= state.buffer.length) {
    throw new UPLCError({ message: "No more bytes available" })
  }
  const value = state.buffer[byteIndex]!
  state.bitPosition += 8
  return value
}

/**
 * Skip padding bits until byte boundary.
 *
 * @since 2.0.0
 * @category internal
 */
const _skipByte = (state: DecodeState): void => {
  // Filler format: Read bits until we hit a 1
  // The 1 should be at the end of the current byte
  // This ensures byte alignment: bits are 000...1 padding to byte boundary
  while (popBit(state) === 0) {
    // Keep reading zeros
  }
  // We've read the final 1 bit, now we should be at a byte boundary
}

/**
 * Decode a natural number from flat-encoded bits.
 *
 * @since 2.0.0
 * @category internal
 */
const decodeNatural = (state: DecodeState): bigint => {
  const chunks: Array<number> = []
  let continueReading = true
  while (continueReading) {
    continueReading = popBit(state) === 1
    const chunk = popBits(state, 7)
    chunks.push(chunk)
  }
  let result = 0n
  for (let i = 0; i < chunks.length; i++) {
    result += BigInt(chunks[i]!) << (BigInt(i) * 7n)
  }
  return result
}

/**
 * Decode an integer from flat-encoded bits.
 *
 * @since 2.0.0
 * @category internal
 */
const decodeInteger = (state: DecodeState): bigint => {
  const encoded = decodeNatural(state)
  const result = encoded % 2n === 0n ? encoded / 2n : -((encoded + 1n) / 2n)
  return result
}

/**
 * Decode a byte string from flat-encoded bits.
 *
 * @since 2.0.0
 * @category internal
 */
const decodeByteString = (state: DecodeState): Uint8Array => {
  // ByteStrings must be byte-aligned in flat encoding
  _skipByte(state)
  // Flat encoding for bytestrings uses chunks with 8-bit lengths
  const chunks: Array<Uint8Array> = []
  let chunkLength = popBits(state, 8)

  while (chunkLength !== 0) {
    const chunk = new Uint8Array(chunkLength)
    for (let i = 0; i < chunkLength; i++) {
      chunk[i] = popBits(state, 8)
    }
    chunks.push(chunk)
    chunkLength = popBits(state, 8)
  }

  // Concatenate chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return result
}

/**
 * Decode a list of items.
 *
 * @since 2.0.0
 * @category internal
 */
const decodeList = <T>(state: DecodeState, decodeItem: () => T): Array<T> => {
  const items: Array<T> = []
  // Flat encoding: '0' = empty list, '1 item1 1 item2 ... 1 itemN 0' = non-empty list
  // Read continuation bit first: 0=end, 1=has item
  let cont = popBit(state)
  while (cont === 1) {
    items.push(decodeItem())
    cont = popBit(state)
  }
  return items
}

/**
 * Decode a type from an array of 4-bit chunks (blaze-cardano approach).
 * Handles tag 7 (type application) recursively.
 * Type encoding: [7, 5, ...elementType] for List, [7, 7, 6, ...first, ...second] for Pair.
 *
 * @since 2.0.0
 * @category internal
 */
const decodeType = (type: Array<number>): [DataType, Array<number>] => {
  if (type.length === 0) {
    return ["Unit", type]
  }

  const head = type[0]

  if (head === 7) {
    // Type application
    const subtype = type[1]
    if (subtype === 5) {
      // List<T> = [7, 5, ...elementType]
      const [innerType, remainder] = decodeType(type.slice(2))
      return [{ list: innerType }, remainder]
    } else if (subtype === 7 && type[2] === 6) {
      // Pair<T, U> = [7, 7, 6, ...firstType, ...secondType]
      const [innerType, remainder] = decodeType(type.slice(3))
      const [innerType2, remainder2] = decodeType(remainder)
      return [{ pair: [innerType, innerType2] }, remainder2]
    } else {
      throw new UPLCError({ message: `decodeType: invalid type application` })
    }
  } else {
    // Simple type - map tag to DataType
    let typeName: DataType
    switch (head) {
      case 0:
        typeName = "Integer"
        break
      case 1:
        typeName = "ByteString"
        break
      case 2:
        typeName = "String"
        break
      case 3:
        typeName = "Unit"
        break
      case 4:
        typeName = "Bool"
        break
      case 8:
        typeName = "Data"
        break
      default:
        throw new UPLCError({ message: `Unknown type tag: ${head}` })
    }
    return [typeName, type.slice(1)]
  }
}

/**
 * Decode semantic version from flat-encoded bits.
 *
 * @since 2.0.0
 * @category internal
 */
/**
 * Decode semantic version from flat-encoded bits.
 *
 * @since 2.0.0
 * @category internal
 */
const decodeVersion = (state: DecodeState): SemVer => {
  const major = popByte(state)
  const minor = popByte(state)
  const patch = popByte(state)
  const version = `${major}.${minor}.${patch}` as SemVer
  return version
}

/**
 * Decode a constant value based on its type.
 *
 * @since 2.0.0
 * @category internal
 */
const decodeData = (state: DecodeState, dataType: DataType): ConstantValue => {
  if (dataType === "Integer") {
    const result = decodeInteger(state)
    return result
  }
  if (dataType === "ByteString") {
    const result = decodeByteString(state)
    return result
  }
  if (dataType === "String") {
    const bytes = decodeByteString(state)
    const result = new TextDecoder().decode(bytes)
    return result
  }
  if (dataType === "Unit") {
    return null
  }
  if (dataType === "Bool") {
    const bit = popBit(state)
    const result = { index: BigInt(bit), fields: [] }
    return result
  }
  if (dataType === "Data") {
    const result = decodeByteString(state)
    return result
  }
  if ("list" in dataType) {
    const items = decodeList(state, () => decodeData(state, dataType.list))
    return { items }
  }
  if ("pair" in dataType) {
    const first = decodeData(state, dataType.pair[0])
    const second = decodeData(state, dataType.pair[1])
    return { items: [first, second] }
  }
  throw new UPLCError({ message: `Unknown data type: ${JSON.stringify(dataType)}` })
}

/**
 * Decode a constant from encoded bits.
 *
 * @since 2.0.0
 * @category internal
 */
const decodeConst = (state: DecodeState): [DataType, ConstantValue] => {
  // Read type as flat list of 4-bit type tags
  // Standard flat list format: cont-bit (1=has item, 0=end) followed by item
  // For types: cont-bit type-tag(4bits) cont-bit type-tag(4bits) ... cont-bit(0)
  const typeBits = decodeList(state, () => popBits(state, 4))

  // Process the array to get DataType
  const [dataType, remainder] = decodeType(typeBits)

  // Blaze-cardano allows non-empty remainder in some cases (empirically observed)
  // The remainder seems to occur with String types specifically
  if (remainder.length !== 0 && !(remainder.length === 1 && remainder[0] === 0)) {
    throw new UPLCError({ message: `decodeConst: invalid type application, remaining bits: [${remainder.join(", ")}]` })
  }
  return [dataType, decodeData(state, dataType)]
}

/**
 * Decode a UPLC term from encoded bits.
 *
 * @since 2.0.0
 * @category internal
 */
const decodeTerm = (state: DecodeState, lamDepth: bigint): Term => {
  const tag = popBits(state, 4)

  switch (tag) {
    case TermTags.Var: {
      const name = decodeNatural(state)
      return { type: "Var", name }
    }
    case TermTags.Lambda: {
      const body = decodeTerm(state, lamDepth + 1n)
      return { type: "Lambda", name: lamDepth, body }
    }
    case TermTags.Apply: {
      const func = decodeTerm(state, lamDepth)
      const arg = decodeTerm(state, lamDepth)
      return { type: "Apply", function: func, argument: arg }
    }
    case TermTags.Constant: {
      const [valueType, value] = decodeConst(state)
      return { type: "Constant", valueType, value }
    }
    case TermTags.Builtin: {
      const idx = popBits(state, 7)
      if (idx >= BuiltinFunctions.length) {
        throw new UPLCError({ message: `Unknown builtin index: ${idx}` })
      }
      return { type: "Builtin", function: BuiltinFunctions[idx]! }
    }
    case TermTags.Delay: {
      const term = decodeTerm(state, lamDepth)
      return { type: "Delay", term }
    }
    case TermTags.Force: {
      const term = decodeTerm(state, lamDepth)
      return { type: "Force", term }
    }
    case TermTags.Constr: {
      const ctag = decodeNatural(state)
      const terms = decodeList(state, () => decodeTerm(state, lamDepth))
      return { type: "Constr", tag: ctag, terms }
    }
    case TermTags.Case: {
      const term = decodeTerm(state, lamDepth)
      const cases = decodeList(state, () => decodeTerm(state, lamDepth))
      return { type: "Case", term, cases }
    }
    case TermTags.Error:
      return { type: "Error" }
    default:
      throw new UPLCError({ message: `Unknown term tag: ${tag}` })
  }
}

/**
 * Decode a UPLC program from flat-encoded bits.
 *
 * @since 2.0.0
 * @category internal
 */
const decodeProgram = (state: DecodeState): Program => {
  const version = decodeVersion(state)
  const body = decodeTerm(state, 0n)
  return new Program({ version, body }, { disableValidation: true })
}

/**
 * Push a single bit to the encode state.
 *
 * @since 2.0.0
 * @category internal
 */
const pushBit = (state: EncodeState, bit: 0 | 1): void => {
  state.currentByte = (state.currentByte << 1) | bit
  state.bitCount++
  if (state.bitCount === 8) {
    state.bytes.push(state.currentByte)
    state.currentByte = 0
    state.bitCount = 0
  }
}

/**
 * Push multiple bits to the encode state.
 *
 * @since 2.0.0
 * @category internal
 */
const pushBits = (state: EncodeState, value: number, count: number): void => {
  for (let i = count - 1; i >= 0; i--) {
    pushBit(state, ((value >> i) & 1) as 0 | 1)
  }
}

/**
 * Push a single byte to the encode state.
 *
 * @since 2.0.0
 * @category internal
 */
const pushByte = (state: EncodeState, byte: number): void => {
  pushBits(state, byte, 8)
}

/**
 * Flat filler: writes 0 bits followed by a 1 bit to reach byte alignment.
 * This is the standard Flat encoding filler pattern.
 */
const pad = (state: EncodeState): void => {
  // Write 0s then a final 1 to reach byte boundary
  // If already aligned, write a full byte of 00000001
  const remaining = state.bitCount === 0 ? 8 : 8 - state.bitCount
  for (let i = 0; i < remaining - 1; i++) {
    pushBit(state, 0)
  }
  pushBit(state, 1)
}

/**
 * Get the encoded bytes from the encode state.
 *
 * @since 2.0.0
 * @category internal
 */
const getBytes = (state: EncodeState): Uint8Array => {
  const result = [...state.bytes]
  if (state.bitCount > 0) {
    result.push(state.currentByte << (8 - state.bitCount))
  }
  return new Uint8Array(result)
}

/**
 * Encode a natural number to flat-encoded bits.
 *
 * @since 2.0.0
 * @category internal
 */
const encodeNatural = (state: EncodeState, n: bigint): void => {
  if (n < 0n) throw new UPLCError({ message: `Cannot encode negative as natural: ${n}` })
  const chunks: Array<number> = []
  let remaining = n
  do {
    chunks.push(Number(remaining & 0x7fn))
    remaining = remaining >> 7n
  } while (remaining > 0n)
  for (let i = 0; i < chunks.length; i++) {
    pushBit(state, i === chunks.length - 1 ? 0 : 1)
    pushBits(state, chunks[i]!, 7)
  }
}

/**
 * Encode an integer to flat-encoded bits.
 *
 * @since 2.0.0
 * @category internal
 */
const encodeInteger = (state: EncodeState, i: bigint): void => {
  const encoded = i >= 0n ? i * 2n : -i * 2n - 1n
  encodeNatural(state, encoded)
}

/**
 * Encode a byte string to flat-encoded bits.
 *
 * @since 2.0.0
 * @category internal
 */
const encodeByteString = (state: EncodeState, bytes: Uint8Array): void => {
  pad(state)
  let offset = 0
  while (offset < bytes.length) {
    const chunkSize = Math.min(255, bytes.length - offset)
    pushByte(state, chunkSize)
    for (let i = 0; i < chunkSize; i++) {
      pushByte(state, bytes[offset + i]!)
    }
    offset += chunkSize
  }
  pushByte(state, 0)
}

/**
 * Encode a list of items.
 *
 * @since 2.0.0
 * @category internal
 */
const encodeList = <T>(state: EncodeState, items: ReadonlyArray<T>, encodeItem: (t: T) => void): void => {
  for (const item of items) {
    pushBit(state, 1)
    encodeItem(item)
  }
  pushBit(state, 0)
}

/**
 * Encode semantic version to flat-encoded bits.
 *
 * @since 2.0.0
 * @category internal
 */
const encodeVersion = (state: EncodeState, version: SemVer): void => {
  const { major, minor, patch } = parseSemVer(version)
  pushByte(state, major)
  pushByte(state, minor)
  pushByte(state, patch)
}

/**
 * Encode a data type to an array of 4-bit type tags.
 *
 * @since 2.0.0
 * @category internal
 */
const encodeDataType = (state: EncodeState, dataType: DataType): Array<number> => {
  if (dataType === "Integer") return [0]
  if (dataType === "ByteString") return [1]
  if (dataType === "String") return [2]
  if (dataType === "Unit") return [3]
  if (dataType === "Bool") return [4]
  if (dataType === "Data") return [8]
  if ("list" in dataType) return [7, 5, ...encodeDataType(state, dataType.list)]
  if ("pair" in dataType) {
    return [7, 7, 6, ...encodeDataType(state, dataType.pair[0]), ...encodeDataType(state, dataType.pair[1])]
  }
  throw new UPLCError({ message: `Unknown data type: ${JSON.stringify(dataType)}` })
}

/**
 * Encode a constant value based on its type.
 *
 * @since 2.0.0
 * @category internal
 */
const encodeData = (state: EncodeState, dataType: DataType, value: ConstantValue): void => {
  if (dataType === "Integer") {
    encodeInteger(state, value as bigint)
  } else if (dataType === "ByteString") {
    encodeByteString(state, value as Uint8Array)
  } else if (dataType === "String") {
    encodeByteString(state, new TextEncoder().encode(value as string))
  } else if (dataType === "Unit") {
    // No encoding needed
  } else if (dataType === "Bool") {
    const boolVal = value as { index: bigint }
    pushBit(state, boolVal.index === 0n ? 0 : 1)
  } else if (dataType === "Data") {
    encodeByteString(state, value as Uint8Array)
  } else if ("list" in dataType) {
    const listVal = value as { items: ReadonlyArray<ConstantValue> }
    encodeList(state, listVal.items, (item) => encodeData(state, dataType.list, item))
  } else if ("pair" in dataType) {
    const pairVal = value as { items: readonly [ConstantValue, ConstantValue] }
    encodeData(state, dataType.pair[0], pairVal.items[0])
    encodeData(state, dataType.pair[1], pairVal.items[1])
  }
}

/**
 * Encode a constant to encoded bits.
 *
 * @since 2.0.0
 * @category internal
 */
const encodeConst = (state: EncodeState, valueType: DataType, value: ConstantValue): void => {
  const typeBits = encodeDataType(state, valueType)
  encodeList(state, typeBits, (t) => pushBits(state, t, 4))
  encodeData(state, valueType, value)
}

/**
 * Encode a UPLC term to flat-encoded bits.
 *
 * @since 2.0.0
 * @category internal
 */
const encodeTerm = (state: EncodeState, term: Term): void => {
  switch (term.type) {
    case "Var":
      pushBits(state, TermTags.Var, 4)
      encodeNatural(state, term.name)
      break
    case "Lambda":
      pushBits(state, TermTags.Lambda, 4)
      encodeTerm(state, term.body)
      break
    case "Apply":
      pushBits(state, TermTags.Apply, 4)
      encodeTerm(state, term.function)
      encodeTerm(state, term.argument)
      break
    case "Constant":
      pushBits(state, TermTags.Constant, 4)
      encodeConst(state, term.valueType, term.value)
      break
    case "Builtin": {
      pushBits(state, TermTags.Builtin, 4)
      const idx = BuiltinFunctions.indexOf(term.function)
      if (idx === -1) throw new UPLCError({ message: `Unknown builtin: ${term.function}` })
      pushBits(state, idx, 7)
      break
    }
    case "Delay":
      pushBits(state, TermTags.Delay, 4)
      encodeTerm(state, term.term)
      break
    case "Force":
      pushBits(state, TermTags.Force, 4)
      encodeTerm(state, term.term)
      break
    case "Constr":
      pushBits(state, TermTags.Constr, 4)
      encodeNatural(state, term.tag)
      encodeList(state, term.terms, (t) => encodeTerm(state, t))
      break
    case "Case":
      pushBits(state, TermTags.Case, 4)
      encodeTerm(state, term.term)
      encodeList(state, term.cases, (c) => encodeTerm(state, c))
      break
    case "Error":
      pushBits(state, TermTags.Error, 4)
      break
  }
}

/**
 * Encode a UPLC program to flat-encoded bytes.
 *
 * @since 2.0.0
 * @category internal
 */
const encodeProgram = (program: Program): Uint8Array => {
  const state: EncodeState = { bytes: [], currentByte: 0, bitCount: 0 }
  encodeVersion(state, program.version as SemVer)
  encodeTerm(state, program.body)
  // Add filler at end to reach byte alignment
  pad(state)
  return getBytes(state)
}

/**
 * Transform from flat-encoded bytes to Program.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromFlatBytes = Schema.transform(Schema.Uint8ArrayFromSelf, Schema.typeSchema(Program), {
  strict: true,
  decode: (bytes) => {
    const state: DecodeState = { buffer: bytes, bitPosition: 0 }
    return decodeProgram(state)
  },
  encode: (program) => encodeProgram(program)
}).annotations({
  identifier: "UPLC.FromFlatBytes",
  title: "UPLC Program from Flat Bytes",
  description: "Transforms flat-encoded bytes to UPLC Program"
})

/**
 * Transform from flat-encoded hex string to Program.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromFlatHex = Schema.transform(Schema.Uint8ArrayFromHex, Schema.typeSchema(Program), {
  strict: true,
  decode: (bytes) => {
    const state: DecodeState = { buffer: bytes, bitPosition: 0 }
    return decodeProgram(state)
  },
  encode: (program) => encodeProgram(program)
}).annotations({
  identifier: "UPLC.FromFlatHex",
  title: "UPLC Program from Flat Hex",
  description: "Transforms flat-encoded hex string to UPLC Program"
})

/**
 * Decode a UPLC program from flat-encoded bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromFlatBytes = Schema.decodeSync(FromFlatBytes)

/**
 * Decode a UPLC program from flat-encoded hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromFlatHex = Schema.decodeSync(FromFlatHex)

/**
 * Encode a UPLC program to flat-encoded bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toFlatBytes = Schema.encodeSync(FromFlatBytes)

/**
 * Encode a UPLC program to flat-encoded hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toFlatHex = Schema.encodeSync(FromFlatHex)

/**
 * Decode a UPLC program from double CBOR-encoded hex string.
 * This is the format used by compiled Plutus scripts.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromDoubleCborEncodedHex = (hex: string): Program => {
  const flatBytes = decodeDoubleCborHexToFlat(hex)
  return fromFlatBytes(flatBytes)
}

/**
 * Convert a term to JSON representation.
 *
 * @since 2.0.0
 * @category internal
 */
const termToJSON = (term: Term): unknown => {
  switch (term.type) {
    case "Var":
      return { type: "Var", name: term.name.toString() }
    case "Lambda":
      return { type: "Lambda", name: term.name.toString(), body: termToJSON(term.body) }
    case "Apply":
      return { type: "Apply", function: termToJSON(term.function), argument: termToJSON(term.argument) }
    case "Constant":
      return { type: "Constant", valueType: term.valueType, value: constantToJSON(term.value) }
    case "Builtin":
      return { type: "Builtin", function: term.function }
    case "Delay":
      return { type: "Delay", term: termToJSON(term.term) }
    case "Force":
      return { type: "Force", term: termToJSON(term.term) }
    case "Constr":
      return { type: "Constr", tag: term.tag.toString(), terms: term.terms.map(termToJSON) }
    case "Case":
      return { type: "Case", term: termToJSON(term.term), cases: term.cases.map(termToJSON) }
    case "Error":
      return { type: "Error" }
  }
}

/**
 * Convert a constant value to JSON representation.
 *
 * @since 2.0.0
 * @category internal
 */
const constantToJSON = (value: ConstantValue): unknown => {
  if (value === null) return null
  if (typeof value === "bigint") return value.toString()
  if (typeof value === "string") return value
  if (typeof value === "boolean") return value
  if (value instanceof Uint8Array) return Bytes.toHex(value)
  if ("items" in value) return { items: (value.items as ReadonlyArray<ConstantValue>).map(constantToJSON) }
  if ("index" in value)
    return { index: value.index.toString(), fields: (value.fields as ReadonlyArray<ConstantValue>).map(constantToJSON) }
  return value
}

/**
 * Check if two terms are equal.
 *
 * @since 2.0.0
 * @category internal
 */
const termEquals = (a: Term, b: Term): boolean => {
  if (a.type !== b.type) return false
  switch (a.type) {
    case "Var":
      return a.name === (b as typeof a).name
    case "Lambda":
      return a.name === (b as typeof a).name && termEquals(a.body, (b as typeof a).body)
    case "Apply":
      return termEquals(a.function, (b as typeof a).function) && termEquals(a.argument, (b as typeof a).argument)
    case "Constant":
      return JSON.stringify(a.valueType) === JSON.stringify((b as typeof a).valueType)
    case "Builtin":
      return a.function === (b as typeof a).function
    case "Delay":
      return termEquals(a.term, (b as typeof a).term)
    case "Force":
      return termEquals(a.term, (b as typeof a).term)
    case "Constr":
      return (
        a.tag === (b as typeof a).tag &&
        a.terms.length === (b as typeof a).terms.length &&
        a.terms.every((t, i) => termEquals(t, (b as typeof a).terms[i]!))
      )
    case "Case":
      return (
        termEquals(a.term, (b as typeof a).term) &&
        a.cases.length === (b as typeof a).cases.length &&
        a.cases.every((c, i) => termEquals(c, (b as typeof a).cases[i]!))
      )
    case "Error":
      return true
  }
}

/**
 * Compute hash for a term.
 *
 * @since 2.0.0
 * @category internal
 */
const termHash = (term: Term): number => {
  switch (term.type) {
    case "Var":
      return Hash.string("Var") ^ Hash.number(Number(term.name % BigInt(Number.MAX_SAFE_INTEGER)))
    case "Lambda":
      return Hash.string("Lambda") ^ termHash(term.body)
    case "Apply":
      return Hash.string("Apply") ^ termHash(term.function) ^ termHash(term.argument)
    case "Constant":
      return Hash.string("Constant") ^ Hash.string(JSON.stringify(term.valueType))
    case "Builtin":
      return Hash.string("Builtin") ^ Hash.string(term.function)
    case "Delay":
      return Hash.string("Delay") ^ termHash(term.term)
    case "Force":
      return Hash.string("Force") ^ termHash(term.term)
    case "Constr":
      return Hash.string("Constr") ^ Hash.number(Number(term.tag % BigInt(Number.MAX_SAFE_INTEGER)))
    case "Case":
      return Hash.string("Case") ^ termHash(term.term)
    case "Error":
      return Hash.string("Error")
  }
}

/**
 * Create a variable term.
 *
 * @since 2.0.0
 * @category constructors
 */
export const varTerm = (name: bigint): Term => ({ type: "Var", name })

/**
 * Create a lambda term.
 *
 * @since 2.0.0
 * @category constructors
 */
export const lambdaTerm = (name: bigint, body: Term): Term => ({ type: "Lambda", name, body })

/**
 * Create an application term.
 *
 * @since 2.0.0
 * @category constructors
 */
export const applyTerm = (fn: Term, argument: Term): Term => ({ type: "Apply", function: fn, argument })

/**
 * Create a constant term.
 *
 * @since 2.0.0
 * @category constructors
 */
export const constantTerm = (valueType: DataType, value: ConstantValue): Term => ({
  type: "Constant",
  valueType,
  value
})

/**
 * Create a builtin term.
 *
 * @since 2.0.0
 * @category constructors
 */
export const builtinTerm = (fn: BuiltinFunction): Term => ({ type: "Builtin", function: fn })

/**
 * Create a delay term.
 *
 * @since 2.0.0
 * @category constructors
 */
export const delayTerm = (term: Term): Term => ({ type: "Delay", term })

/**
 * Create a force term.
 *
 * @since 2.0.0
 * @category constructors
 */
export const forceTerm = (term: Term): Term => ({ type: "Force", term })

/**
 * Create a constructor term.
 *
 * @since 2.0.0
 * @category constructors
 */
export const constrTerm = (tag: bigint, terms: ReadonlyArray<Term>): Term => ({ type: "Constr", tag, terms })

/**
 * Create a case term.
 *
 * @since 2.0.0
 * @category constructors
 */
export const caseTerm = (term: Term, cases: ReadonlyArray<Term>): Term => ({ type: "Case", term, cases })

/**
 * Create an error term.
 *
 * @since 2.0.0
 * @category constructors
 */
export const errorTerm: Term = { type: "Error" }

/**
 * FastCheck arbitrary for generating simple UPLC programs.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const simpleTermArbitrary: FastCheck.Arbitrary<Term> = FastCheck.oneof(
  FastCheck.bigIntN(8).map((n) => varTerm(n < 0n ? -n : n)),
  FastCheck.constant(errorTerm),
  FastCheck.constantFrom(...BuiltinFunctions).map(builtinTerm),
  FastCheck.bigInt().map((n) => constantTerm("Integer", n))
)

/**
 * FastCheck arbitrary for generating UPLC programs.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary: FastCheck.Arbitrary<Program> = FastCheck.tuple(
  FastCheck.integer({ min: 1, max: 1 }),
  FastCheck.integer({ min: 0, max: 1 }),
  FastCheck.integer({ min: 0, max: 0 }),
  simpleTermArbitrary
).map(([major, minor, patch, body]) => new Program({ version: `${major}.${minor}.${patch}`, body }))

/**
 * Check if a hex string is single CBOR encoded.
 * Single CBOR encoded means the outer structure is a CBOR bytestring.
 *
 * @since 2.0.0
 * @category cbor
 */
const isSingleCborEncoded = (hex: string): boolean => {
  try {
    const decoded = CBOR.fromCBORHex(hex)
    return decoded instanceof Uint8Array
  } catch {
    return false
  }
}

/**
 * Check if a hex string is double CBOR encoded.
 * Double CBOR encoded means the outer AND inner structures are CBOR bytestrings.
 *
 * @since 2.0.0
 * @category cbor
 */
const isDoubleCborEncoded = (hex: string): boolean => {
  try {
    const decoded = CBOR.fromCBORHex(hex)
    if (!(decoded instanceof Uint8Array)) return false
    const innerDecoded = CBOR.fromCBORBytes(decoded)
    return innerDecoded instanceof Uint8Array
  } catch {
    return false
  }
}

/**
 * Apply single CBOR encoding to a hex string if not already encoded.
 * Wraps the bytes in a CBOR bytestring.
 *
 * @since 2.0.0
 * @category cbor
 */
export const applySingleCborEncoding = (script: string): string => {
  if (isDoubleCborEncoded(script)) {
    // Already double encoded, decode once to get single encoded
    const decoded = CBOR.fromCBORHex(script)
    return Bytes.toHex(decoded as Uint8Array)
  }
  if (isSingleCborEncoded(script)) {
    return script
  }
  // Not encoded, apply single encoding
  const bytes = Bytes.fromHex(script)
  return CBOR.toCBORHex(bytes)
}

/**
 * Apply double CBOR encoding to a hex string if not already encoded.
 * Wraps the bytes in two layers of CBOR bytestring.
 *
 * @since 2.0.0
 * @category cbor
 */
export const applyDoubleCborEncoding = (script: string): string => {
  if (isDoubleCborEncoded(script)) {
    return script
  }
  if (isSingleCborEncoded(script)) {
    // Already single encoded, apply one more layer
    const bytes = Bytes.fromHex(script)
    return CBOR.toCBORHex(bytes)
  }
  // Not encoded, apply double encoding
  const bytes = Bytes.fromHex(script)
  const singleEncoded = CBOR.toCBORBytes(bytes)
  return CBOR.toCBORHex(singleEncoded)
}

/**
 * Get the CBOR encoding level of a script.
 *
 * @since 2.0.0
 * @category cbor
 */
export const getCborEncodingLevel = (script: string): "double" | "single" | "none" => {
  if (isDoubleCborEncoded(script)) return "double"
  if (isSingleCborEncoded(script)) return "single"
  return "none"
}

/**
 * Decode a double CBOR-encoded script hex to flat bytes.
 *
 * @since 2.0.0
 * @category internal
 */
export const decodeDoubleCborHexToFlat = (hex: string): Uint8Array => {
  const doubleEncoded = applyDoubleCborEncoding(hex)
  const firstDecode = CBOR.fromCBORHex(doubleEncoded)
  if (!(firstDecode instanceof Uint8Array)) {
    throw new UPLCError({ message: "Expected CBOR bytestring after first decode" })
  }
  const secondDecode = CBOR.fromCBORBytes(firstDecode)
  if (!(secondDecode instanceof Uint8Array)) {
    throw new UPLCError({ message: "Expected CBOR bytestring after second decode" })
  }
  return secondDecode
}

/**
 * Decode a CBOR-encoded script to UPLC Program.
 * Handles both single and double CBOR encoding automatically.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCborHexToProgram = (hex: string): Program => {
  const level = getCborEncodingLevel(hex)

  if (level === "double") {
    const flatBytes = decodeDoubleCborHexToFlat(hex)
    return fromFlatBytes(flatBytes)
  } else if (level === "single") {
    const decoded = CBOR.fromCBORHex(hex)
    if (!(decoded instanceof Uint8Array)) {
      throw new UPLCError({ message: "Expected CBOR bytestring" })
    }
    return fromFlatBytes(decoded)
  } else {
    // Assume it's already flat bytes
    return fromFlatBytes(Bytes.fromHex(hex))
  }
}

/**
 * Encode flat bytes to double CBOR-encoded hex.
 *
 * @since 2.0.0
 * @category internal
 */
const encodeFlatToDoubleCbor = (bytes: Uint8Array): string => {
  const singleEncoded = CBOR.toCBORBytes(bytes)
  return CBOR.toCBORHex(singleEncoded)
}

/**
 * Create a UPLC Constant term from PlutusData.
 * The data is CBOR-encoded and stored as a constant of type Data.
 *
 * Uses Aiken-compatible encoding (indefinite-length arrays/maps) by default,
 * which matches the on-chain format. An optional `options` parameter allows
 * customizing the CBOR encoding for testing or compatibility purposes.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dataConstant = (data: Data.Data, options: CBOR.CodecOptions = CBOR.AIKEN_DEFAULT_OPTIONS): Term => ({
  type: "Constant",
  valueType: "Data",
  value: Data.toCBORBytes(data, options)
})

/**
 * Applies a list of parameters (PlutusData values) to a Plutus script.
 *
 * The function takes a CBOR-encoded script and applies each parameter by wrapping
 * the script body in a series of Application nodes, where each parameter is
 * converted to a UPLC Constant of type Data.
 *
 * Uses Aiken-compatible encoding (indefinite-length arrays/maps) by default.
 * Pass custom CBOR options for compatibility with other encoding formats.
 *
 * @since 2.0.0
 * @category script
 */
export const applyParamsToScript = (
  plutusScript: string,
  params: ReadonlyArray<Data.Data>,
  options: CBOR.CodecOptions = CBOR.AIKEN_DEFAULT_OPTIONS
): string => {
  // Decode the script to a UPLC Program
  const flatBytes = decodeDoubleCborHexToFlat(plutusScript)
  const program = fromFlatBytes(flatBytes)

  // Apply each parameter as an Application node
  const appliedBody = params.reduce<Term>((body, param) => {
    const dataConst = dataConstant(param, options)
    return applyTerm(body, dataConst)
  }, program.body)

  // Create new program with applied body
  const appliedProgram = new Program({ version: program.version, body: appliedBody })

  // Encode back to double CBOR-encoded hex
  const encodedFlat = toFlatBytes(appliedProgram)
  return encodeFlatToDoubleCbor(encodedFlat)
}

/**
 * Applies a list of parameters (PlutusData values) to a Plutus script,
 * with an optional schema for type-safe parameter conversion.
 *
 * @since 2.0.0
 * @category script
 */
export const applyParamsToScriptWithSchema = <T>(
  plutusScript: string,
  params: ReadonlyArray<T>,
  toData: (value: T) => Data.Data
): string => {
  const dataParams = params.map(toData)
  return applyParamsToScript(plutusScript, dataParams)
}
