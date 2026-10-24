import { Schema } from "effect"

/**
 * CIP-57 Plutus Blueprint types defined using Effect Schema
 *
 * @see https://cips.cardano.org/cip/CIP-0057
 * @since 2.0.0
 * @category blueprint
 */

// ============================================================================
// TypeScript Types
// ============================================================================

export type BlueprintCompilerType = {
  readonly name: string
  readonly version: string
}

export type BlueprintPreambleType = {
  readonly title: string
  readonly description?: string
  readonly version: string
  readonly plutusVersion: "v1" | "v2" | "v3"
  readonly compiler?: BlueprintCompilerType
  readonly license?: string
}

export type SchemaRefType = {
  readonly $ref: string
}

export type BytesDefinitionType = {
  readonly title?: string
  readonly description?: string
  readonly dataType: "bytes"
}

export type IntegerDefinitionType = {
  readonly title?: string
  readonly description?: string
  readonly dataType: "integer"
}

export type DataDefinitionType = {
  readonly title: "Data"
  readonly description?: string
}

export type EmptySchemaType = {}

export type ConstructorFieldType = {
  readonly title?: string
  readonly description?: string
  readonly $ref?: string
  readonly schema?: SchemaDefinitionType
}

export type ConstructorDefinitionType = {
  readonly title?: string
  readonly description?: string
  readonly dataType: "constructor"
  readonly index: number
  readonly fields: ReadonlyArray<ConstructorFieldType>
}

export type UnionDefinitionType = {
  readonly title?: string
  readonly anyOf: ReadonlyArray<SchemaDefinitionType>
}

export type ListDefinitionType = {
  readonly title?: string
  readonly description?: string
  readonly dataType: "list"
  readonly items: SchemaDefinitionType | SchemaRefType
}

export type MapDefinitionType = {
  readonly title?: string
  readonly description?: string
  readonly dataType: "map"
  readonly keys: SchemaDefinitionType | SchemaRefType
  readonly values: SchemaDefinitionType | SchemaRefType
}

export type SchemaDefinitionType =
  | BytesDefinitionType
  | IntegerDefinitionType
  | DataDefinitionType
  | EmptySchemaType
  | SchemaRefType
  | ConstructorDefinitionType
  | UnionDefinitionType
  | ListDefinitionType
  | MapDefinitionType

export type ParameterSchemaType = {
  readonly title?: string
  readonly schema: SchemaDefinitionType
}

export type ValidatorDefinitionType = {
  readonly title: string
  readonly description?: string
  readonly datum?: ParameterSchemaType
  readonly redeemer?: ParameterSchemaType
  readonly parameters?: ReadonlyArray<ParameterSchemaType>
  readonly compiledCode: string
  readonly hash: string
}

export type PlutusBlueprint = {
  readonly preamble: BlueprintPreambleType
  readonly validators: ReadonlyArray<ValidatorDefinitionType>
  readonly definitions: Record<string, SchemaDefinitionType>
}

// ============================================================================
// Blueprint Preamble
// ============================================================================

export const BlueprintCompiler = Schema.Struct({
  name: Schema.String,
  version: Schema.String
})

export const BlueprintPreamble = Schema.Struct({
  title: Schema.String,
  description: Schema.optional(Schema.String),
  version: Schema.String,
  plutusVersion: Schema.Literal("v1", "v2", "v3"),
  compiler: Schema.optional(BlueprintCompiler),
  license: Schema.optional(Schema.String)
})

// export interface BlueprintPreamble extends Schema.Schema.Type<typeof BlueprintPreamble> {}

// ============================================================================
// Schema Definitions (JSON structure, not Effect Schema)
// ============================================================================

export const SchemaRef = Schema.Struct({
  $ref: Schema.String
})

export const BaseSchemaDefinition = Schema.Struct({
  title: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String)
})

export const BytesDefinition = Schema.Struct({
  ...BaseSchemaDefinition.fields,
  dataType: Schema.Literal("bytes")
})

export const IntegerDefinition = Schema.Struct({
  ...BaseSchemaDefinition.fields,
  dataType: Schema.Literal("integer")
})

export const DataDefinition = Schema.Struct({
  title: Schema.Literal("Data"),
  description: Schema.optional(Schema.String)
})

export const EmptySchema = Schema.Struct({})

// ============================================================================
// Schema Definition Types (with proper recursive type handling)
// ============================================================================

/**
 * Constructor field with optional schema reference (recursive)
 */
export class ConstructorField extends Schema.Class<ConstructorField>("ConstructorField")({
  title: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  $ref: Schema.optional(Schema.String),
  schema: Schema.optional(Schema.suspend((): Schema.Schema<SchemaDefinitionType> => SchemaDefinition))
}) {}

/**
 * Constructor definition (recursive)
 */
export class ConstructorDefinition extends Schema.Class<ConstructorDefinition>("ConstructorDefinition")({
  title: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  dataType: Schema.Literal("constructor"),
  index: Schema.Number,
  fields: Schema.Array(Schema.suspend(() => ConstructorField))
}) {}

/**
 * Union/Enum definition (recursive)
 */
export class UnionDefinition extends Schema.Class<UnionDefinition>("UnionDefinition")({
  title: Schema.optional(Schema.String),
  anyOf: Schema.Array(Schema.suspend((): Schema.Schema<SchemaDefinitionType> => SchemaDefinition))
}) {}

/**
 * List definition (recursive)
 */
export class ListDefinition extends Schema.Class<ListDefinition>("ListDefinition")({
  title: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  dataType: Schema.Literal("list"),
  items: Schema.Union(
    Schema.suspend((): Schema.Schema<SchemaDefinitionType> => SchemaDefinition),
    SchemaRef
  )
}) {}

/**
 * Map definition (recursive)
 */
export class MapDefinition extends Schema.Class<MapDefinition>("MapDefinition")({
  title: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  dataType: Schema.Literal("map"),
  keys: Schema.Union(
    Schema.suspend((): Schema.Schema<SchemaDefinitionType> => SchemaDefinition),
    SchemaRef
  ),
  values: Schema.Union(
    Schema.suspend((): Schema.Schema<SchemaDefinitionType> => SchemaDefinition),
    SchemaRef
  )
}) {}

export const SchemaDefinition = Schema.Union(
  BytesDefinition,
  IntegerDefinition,
  ConstructorDefinition,
  UnionDefinition,
  DataDefinition,
  SchemaRef,
  EmptySchema,
  ListDefinition,
  MapDefinition
)

// ============================================================================
// Validator Definitions
// ============================================================================

export const ParameterSchema = Schema.Struct({
  title: Schema.optional(Schema.String),
  schema: SchemaDefinition
})

export const ValidatorDefinition = Schema.Struct({
  title: Schema.String,
  description: Schema.optional(Schema.String),
  datum: Schema.optional(ParameterSchema),
  redeemer: Schema.optional(ParameterSchema),
  parameters: Schema.optional(Schema.Array(ParameterSchema)),
  compiledCode: Schema.String,
  hash: Schema.String
})

// ============================================================================
// Complete Blueprint
// ============================================================================

export const PlutusBlueprint = Schema.Struct({
  preamble: BlueprintPreamble,
  validators: Schema.Array(ValidatorDefinition),
  definitions: Schema.Record({ key: Schema.String, value: SchemaDefinition })
})

// ============================================================================
// Parsed Result Types
// ============================================================================

export interface ParsedBlueprint {
  schemas: Record<string, Schema.Schema.Any>
  validators: Record<string, ValidatorMetadata>
}

export interface ValidatorMetadata {
  title: string
  hash: string
  compiledCode: string
  datum?: Schema.Schema.Any
  redeemer?: Schema.Schema.Any
  parameters?: Array<Schema.Schema.Any>
}
