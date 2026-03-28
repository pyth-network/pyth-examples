/**
 * Code generation configuration
 *
 * @since 2.0.0
 * @category blueprint
 */

/**
 * Configuration for how to generate optional types `(Option<T>)`
 */
export type OptionStyle =
  | "NullOr" // TSchema.NullOr(T)
  | "UndefinedOr" // TSchema.UndefinedOr(T)
  | "Union" // Keep as Union of TaggedStruct("Some", ...) | TaggedStruct("None", ...)

/**
 * Configuration for how to generate union types with named constructors
 */
export type UnionStyle =
  | "Variant" // TSchema.Variant({ Tag1: { ... }, Tag2: { ... } }) — compact sugar
  | "Struct" // TSchema.Union(TSchema.Struct({ Tag1: TSchema.Struct({...}) }), ...) — verbose, same encoding as Variant
  | "TaggedStruct" // TSchema.Union(TaggedStruct("Tag1", ...), TaggedStruct("Tag2", ...)) — Effect _tag style

/**
 * Configuration for how to generate empty constructors
 */
export type EmptyConstructorStyle =
  | "Literal" // TSchema.Literal("Unit" as const)
  | "Struct" // TSchema.Struct({})

/**
 * Module organization strategy
 */
export type ModuleStrategy =
  | "flat" // Current: CardanoAddressCredential
  | "namespaced" // Nested namespaces: Cardano.Address.Credential

/**
 * Configuration for field naming in constructors without explicit field names
 */
export interface FieldNamingConfig {
  /**
   * Name to use for single unnamed field
   * @default "value"
   */
  singleFieldName: string

  /**
   * Pattern to use for multiple unnamed fields
   * @default "field{index}" where {index} is replaced with field number
   */
  multiFieldPattern: string
}

/**
 * Code generation configuration
 */
export interface CodegenConfig {
  /**
   * How to generate Option<T> types
   * @default "NullOr"
   */
  optionStyle: OptionStyle

  /**
   * How to generate union types with named constructors
   * @default "Variant"
   */
  unionStyle: UnionStyle

  /**
   * Custom field names for Variant constructors when Blueprint has unnamed fields
   * Map from "TypeTitle.ConstructorTitle" to array of field names
   * Example:
   * ```
   * { "Credential.VerificationKey": ["hash"], "Credential.Script": ["hash"] }
   * ```
   */
  variantFieldNames?: Record<string, Array<string>>

  /**
   * How to generate empty constructors
   * @default "Literal"
   */
  emptyConstructorStyle: EmptyConstructorStyle

  /**
   * Field naming configuration
   */
  fieldNaming: FieldNamingConfig

  /**
   * Whether to include index in TSchema constructors
   * @default false
   */
  includeIndex: boolean

  /**
   * Module organization strategy
   * - "flat": Current behavior (CardanoAddressCredential)
   * - "namespaced": Nested namespaces (Cardano.Address.Credential)
   * @default "flat"
   */
  moduleStrategy: ModuleStrategy

  /**
   * Whether to use relative references within same namespace
   * Only applies when moduleStrategy is "namespaced"
   * @default true
   */
  useRelativeRefs: boolean

  /**
   * Explicit import lines for Data, TSchema, and Schema modules
   * e.g. data: 'import { Data } from "@evolution-sdk/evolution/Data"'
   */
  imports: {
    data: string
    tschema: string
    /** Import line for Effect Schema. Used when cyclic types require `Schema.suspend`. */
    schema: string
  }

  /**
   * Indentation to use in generated code
   * @default "  " (2 spaces)
   */
  indent: string
}

/**
 * Default code generation configuration
 */
export const DEFAULT_CODEGEN_CONFIG: CodegenConfig = {
  optionStyle: "NullOr",
  unionStyle: "Variant",
  emptyConstructorStyle: "Literal",
  fieldNaming: {
    singleFieldName: "value",
    multiFieldPattern: "field{index}"
  },
  includeIndex: false,
  moduleStrategy: "flat",
  useRelativeRefs: true,
  imports: {
    data: 'import { Data } from "@evolution-sdk/evolution/Data"',
    tschema: 'import { TSchema } from "@evolution-sdk/evolution/TSchema"',
    schema: 'import { Schema } from "@evolution-sdk/evolution"'
  },
  indent: "  "
}

/**
 * Create a custom codegen configuration by merging with defaults
 */
export function createCodegenConfig(config: Partial<CodegenConfig> = {}): CodegenConfig {
  return {
    ...DEFAULT_CODEGEN_CONFIG,
    ...config,
    fieldNaming: {
      ...DEFAULT_CODEGEN_CONFIG.fieldNaming,
      ...config.fieldNaming
    },
    imports: {
      ...DEFAULT_CODEGEN_CONFIG.imports,
      ...config.imports
    },
    indent: config.indent ?? DEFAULT_CODEGEN_CONFIG.indent
  }
}
