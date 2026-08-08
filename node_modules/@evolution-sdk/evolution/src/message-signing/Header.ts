/**
 * COSE header structures (RFC 8152).
 *
 * @since 2.0.0
 * @category Message Signing
 */

import { Equal, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as CBOR from "../CBOR.js"
import type { AlgorithmId } from "./Label.js"
import { Label, labelFromInt, labelFromText } from "./Label.js"

// ============================================================================
// HeaderMap
// ============================================================================

/**
 * Map of COSE header labels to values (RFC 8152).
 *
 * @since 2.0.0
 * @category Model
 */
export class HeaderMap extends Schema.Class<HeaderMap>("HeaderMap")({
  headers: Schema.ReadonlyMapFromSelf({
    key: Schema.instanceOf(Label),
    value: Schema.Any
  })
}) {
  toJSON() {
    const entries = Array.from(this.headers.entries()).map(([label, value]) => [label.toJSON(), value])
    return { _tag: "HeaderMap" as const, headers: entries }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    if (!(that instanceof HeaderMap)) return false
    if (this.headers.size !== that.headers.size) return false
    for (const [key, value] of this.headers.entries()) {
      const otherValue = that.headers.get(key)
      if (otherValue === undefined || !Equal.equals(value, otherValue)) return false
    }
    return true
  }

  [Hash.symbol](): number {
    let hash = Hash.hash("HeaderMap")
    for (const [key, value] of this.headers.entries()) {
      hash = Hash.combine(hash)(Hash.combine(Hash.hash(key))(Hash.hash(value)))
    }
    return hash
  }

  /**
   * Set algorithm identifier header.
   *
   * @since 2.0.0
   * @category Mutators
   */
  setAlgorithmId(alg: AlgorithmId): this {
    const newHeaders = new Map(this.headers)
    newHeaders.set(labelFromInt(1n), BigInt(alg))
    return new HeaderMap({ headers: newHeaders }, { disableValidation: true }) as this
  }

  /**
   * Get algorithm identifier header.
   *
   * @since 2.0.0
   * @category Accessors
   */
  algorithmId(): AlgorithmId | undefined {
    const targetLabel = labelFromInt(1n)
    for (const [label, value] of this.headers.entries()) {
      if (Equal.equals(label, targetLabel)) {
        return value !== undefined ? Number(value) : undefined
      }
    }
    return undefined
  }

  /**
   * Set criticality header (label 2) - array of critical header labels.
   *
   * @since 2.0.0
   * @category Mutators
   */
  setCriticality(labels: ReadonlyArray<Label>): this {
    const newHeaders = new Map(this.headers)
    // Store as array of label values
    newHeaders.set(
      labelFromInt(2n),
      labels.map((l) => l.value)
    )
    return new HeaderMap({ headers: newHeaders }, { disableValidation: true }) as this
  }

  /**
   * Get criticality header (label 2) - array of critical header labels.
   *
   * @since 2.0.0
   * @category Accessors
   */
  criticality(): ReadonlyArray<Label> | undefined {
    const targetLabel = labelFromInt(2n)
    for (const [label, value] of this.headers.entries()) {
      if (Equal.equals(label, targetLabel)) {
        if (Array.isArray(value)) {
          return value.map((v) => {
            if (typeof v === "bigint") return labelFromInt(v)
            if (typeof v === "string") return labelFromText(v)
            return labelFromInt(BigInt(v))
          })
        }
        return undefined
      }
    }
    return undefined
  }

  /**
   * Set key ID header.
   *
   * @since 2.0.0
   * @category Mutators
   */
  setKeyId(kid: Uint8Array): this {
    const newHeaders = new Map(this.headers)
    newHeaders.set(labelFromInt(4n), kid)
    return new HeaderMap({ headers: newHeaders }, { disableValidation: true }) as this
  }

  /**
   * Get key ID header.
   *
   * @since 2.0.0
   * @category Accessors
   */
  keyId(): Uint8Array | undefined {
    const targetLabel = labelFromInt(4n)
    for (const [label, value] of this.headers.entries()) {
      if (Equal.equals(label, targetLabel)) {
        return value instanceof Uint8Array ? value : undefined
      }
    }
    return undefined
  }

  /**
   * Set content type header (label 3).
   *
   * @since 2.0.0
   * @category Mutators
   */
  setContentType(contentType: Label): this {
    const newHeaders = new Map(this.headers)
    newHeaders.set(labelFromInt(3n), contentType.value)
    return new HeaderMap({ headers: newHeaders }, { disableValidation: true }) as this
  }

  /**
   * Get content type header (label 3).
   *
   * @since 2.0.0
   * @category Accessors
   */
  contentType(): Label | undefined {
    const targetLabel = labelFromInt(3n)
    for (const [label, value] of this.headers.entries()) {
      if (Equal.equals(label, targetLabel)) {
        if (typeof value === "bigint") return labelFromInt(value)
        if (typeof value === "string") return labelFromText(value)
        return undefined
      }
    }
    return undefined
  }

  /**
   * Set initialization vector header (label 5).
   *
   * @since 2.0.0
   * @category Mutators
   */
  setInitVector(iv: Uint8Array): this {
    const newHeaders = new Map(this.headers)
    newHeaders.set(labelFromInt(5n), iv)
    return new HeaderMap({ headers: newHeaders }, { disableValidation: true }) as this
  }

  /**
   * Get initialization vector header (label 5).
   *
   * @since 2.0.0
   * @category Accessors
   */
  initVector(): Uint8Array | undefined {
    const targetLabel = labelFromInt(5n)
    for (const [label, value] of this.headers.entries()) {
      if (Equal.equals(label, targetLabel)) {
        return value instanceof Uint8Array ? value : undefined
      }
    }
    return undefined
  }

  /**
   * Set partial initialization vector header (label 6).
   *
   * @since 2.0.0
   * @category Mutators
   */
  setPartialInitVector(piv: Uint8Array): this {
    const newHeaders = new Map(this.headers)
    newHeaders.set(labelFromInt(6n), piv)
    return new HeaderMap({ headers: newHeaders }, { disableValidation: true }) as this
  }

  /**
   * Get partial initialization vector header (label 6).
   *
   * @since 2.0.0
   * @category Accessors
   */
  partialInitVector(): Uint8Array | undefined {
    const targetLabel = labelFromInt(6n)
    for (const [label, value] of this.headers.entries()) {
      if (Equal.equals(label, targetLabel)) {
        return value instanceof Uint8Array ? value : undefined
      }
    }
    return undefined
  }

  /**
   * Set custom header.
   *
   * @since 2.0.0
   * @category Mutators
   */
  setHeader(label: Label, value: CBOR.CBOR): this {
    const newHeaders = new Map(this.headers)
    newHeaders.set(label, value)
    return new HeaderMap({ headers: newHeaders }, { disableValidation: true }) as this
  }

  /**
   * Get custom header.
   *
   * @since 2.0.0
   * @category Accessors
   */
  header(label: Label): CBOR.CBOR | undefined {
    return this.headers.get(label)
  }

  /**
   * Get all header label keys.
   *
   * @since 2.0.0
   * @category Accessors
   */
  keys(): ReadonlyArray<Label> {
    return Array.from(this.headers.keys())
  }
}

/**
 * Create an empty HeaderMap.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const headerMapNew = (): HeaderMap =>
  new HeaderMap({ headers: new Map<Label, CBOR.CBOR>() }, { disableValidation: true })

/**
 * CBOR bytes transformation schema for HeaderMap.
 *
 * @since 2.0.0
 * @category Schemas
 */
export const HeaderMapFromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.transformOrFail(CBOR.FromBytes(options), Schema.typeSchema(HeaderMap), {
    strict: true,
    decode: (cbor, _, ast) => {
      if (!(cbor instanceof Map)) {
        return ParseResult.fail(new ParseResult.Type(ast, cbor))
      }
      const headers = new Map<Label, CBOR.CBOR>()
      for (const [key, value] of cbor.entries()) {
        let label: Label
        if (typeof key === "bigint") {
          label = labelFromInt(key)
        } else if (typeof key === "string") {
          label = labelFromText(key)
        } else {
          return ParseResult.fail(new ParseResult.Type(ast, key))
        }
        headers.set(label, value)
      }
      return ParseResult.succeed(new HeaderMap({ headers }, { disableValidation: true }))
    },
    encode: (headerMap) => {
      const cborMap = new Map<CBOR.CBOR, CBOR.CBOR>()
      for (const [label, value] of headerMap.headers.entries()) {
        cborMap.set(label.value, value)
      }
      return ParseResult.succeed(cborMap)
    }
  }).annotations({
    identifier: "HeaderMap.FromCBORBytes",
    description: "Transforms CBOR bytes to HeaderMap"
  })

/**
 * CBOR hex transformation schema for HeaderMap.
 *
 * @since 2.0.0
 * @category Schemas
 */
export const HeaderMapFromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(Schema.Uint8ArrayFromHex, HeaderMapFromCBORBytes(options)).annotations({
    identifier: "HeaderMap.FromCBORHex",
    description: "Transforms CBOR hex string to HeaderMap"
  })

/**
 * Decode HeaderMap from CBOR bytes.
 *
 * @since 2.0.0
 * @category Conversion
 */
export const headerMapFromCBORBytes = (bytes: Uint8Array, options?: CBOR.CodecOptions): HeaderMap =>
  Schema.decodeSync(HeaderMapFromCBORBytes(options))(bytes)

/**
 * Decode HeaderMap from CBOR hex.
 *
 * @since 2.0.0
 * @category Conversion
 */
export const headerMapFromCBORHex = (hex: string, options?: CBOR.CodecOptions): HeaderMap =>
  Schema.decodeSync(HeaderMapFromCBORHex(options))(hex)

/**
 * Encode HeaderMap to CBOR bytes.
 *
 * @since 2.0.0
 * @category Conversion
 */
export const headerMapToCBORBytes = (headerMap: HeaderMap, options?: CBOR.CodecOptions): Uint8Array =>
  Schema.encodeSync(HeaderMapFromCBORBytes(options))(headerMap)

/**
 * Encode HeaderMap to CBOR hex.
 *
 * @since 2.0.0
 * @category Conversion
 */
export const headerMapToCBORHex = (headerMap: HeaderMap, options?: CBOR.CodecOptions): string =>
  Schema.encodeSync(HeaderMapFromCBORHex(options))(headerMap)

// ============================================================================
// Headers
// ============================================================================

/**
 * COSE protected and unprotected headers (RFC 8152).
 *
 * @since 2.0.0
 * @category Model
 */
export class Headers extends Schema.Class<Headers>("Headers")({
  protected: Schema.instanceOf(HeaderMap),
  unprotected: Schema.instanceOf(HeaderMap)
}) {
  toJSON() {
    return {
      _tag: "Headers" as const,
      protected: this.protected.toJSON(),
      unprotected: this.unprotected.toJSON()
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return (
      that instanceof Headers &&
      Equal.equals(this.protected, that.protected) &&
      Equal.equals(this.unprotected, that.unprotected)
    )
  }

  [Hash.symbol](): number {
    return Hash.combine(Hash.hash(this.protected))(Hash.hash(this.unprotected))
  }
}

/**
 * Create Headers with protected and unprotected maps.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const headersNew = (protectedHeaders: HeaderMap, unprotectedHeaders: HeaderMap): Headers =>
  new Headers({ protected: protectedHeaders, unprotected: unprotectedHeaders }, { disableValidation: true })
