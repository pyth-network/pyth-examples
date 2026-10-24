import type { CodegenConfig } from "./codegen-config.js"
import { DEFAULT_CODEGEN_CONFIG } from "./codegen-config.js"
import type * as BlueprintTypes from "./types.js"

/**
 * Generate TSchema definitions from a Blueprint
 *
 * @since 2.0.0
 * @category blueprint
 */

/**
 * Convert a definition name to a valid TypeScript identifier (flat mode)
 */
function toIdentifier(name: string): string {
  // Replace slashes with underscores and make PascalCase
  return name
    .split("/")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
    .replace(/[^a-zA-Z0-9_]/g, "_")
}

/**
 * Get namespace path from a definition name
 * e.g., "cardano/address/Credential" -> "cardano/address"
 * e.g., "ByteArray" -> "" (primitive)
 * e.g., "List$cardano/address/Address" -> "List" (wrapper as namespace)
 * e.g., "Option$cardano/address/StakeCredential" -> "Option" (wrapper as namespace)
 * e.g., "Pairs$cardano/assets/AssetName_Int" -> "Pairs" (wrapper as namespace)
 */
function getNamespacePath(name: string): string {
  // Generic wrappers go into their own namespace (Option, List, Pairs)
  if (name.includes("$")) {
    const wrapper = name.split("$")[0]
    return wrapper.toLowerCase()
  }

  const parts = name.split("/")
  if (parts.length === 1) return "" // Primitive
  return parts.slice(0, -1).join("/")
}

/**
 * Get type name from a definition name
 * e.g., "cardano/address/Credential" -> "Credential"
 * e.g., "ByteArray" -> "ByteArray"
 * e.g., "List$cardano/address/Address" -> "OfAddress"
 * e.g., "Option$ByteArray" -> "OfByteArray"
 * e.g., "Pairs$cardano/assets/AssetName_Int" -> "OfAssetName_Int"
 */
function getTypeName(name: string): string {
  // Generic wrappers - create "OfTypeName" to avoid collisions
  if (name.includes("$")) {
    const [wrapper, rest] = name.split("$")
    if (!rest) return wrapper

    // For Pairs: "Pairs$cardano/assets/AssetName_Int" -> "OfAssetName_Int"
    if (wrapper === "Pairs") {
      const typeNames = rest.split("_").map((t) => {
        const parts = t.split("/")
        return parts[parts.length - 1]
      })
      return `Of${typeNames.join("_")}`
    }

    // For List/Option: "OfTypeName"
    const parts = rest.split("/")
    return `Of${parts[parts.length - 1]}`
  }

  const parts = name.split("/")
  return parts[parts.length - 1]
}

/**
 * Convert namespace path to TypeScript namespace reference
 * e.g., "cardano/address" -> "Cardano.Address"
 * e.g., "option" -> "Option"
 * e.g., "list" -> "List"
 */
function toNamespaceRef(namespacePath: string): string {
  if (!namespacePath) return ""

  // Special case for single-word namespaces (option, list, pairs)
  if (!namespacePath.includes("/")) {
    return namespacePath.charAt(0).toUpperCase() + namespacePath.slice(1)
  }

  return namespacePath
    .split("/")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(".")
}

/**
 * Resolve a reference to a type, optionally relative to current namespace
 * @param refName - Full definition name (e.g., "cardano/address/Credential")
 * @param currentNamespace - Current namespace path (e.g., "cardano/address")
 * @param config - Codegen configuration
 * @returns TypeScript reference string
 */
function resolveReference(refName: string, currentNamespace: string, config: CodegenConfig): string {
  // Special case: Data schema is exported as PlutusData
  if (refName === "Data") return "PlutusData"

  if (config.moduleStrategy === "flat") {
    return toIdentifier(refName)
  }

  const refNamespace = getNamespacePath(refName)
  const refType = getTypeName(refName)

  // Primitive type (no namespace)
  if (!refNamespace) {
    return refType
  }

  // Same namespace - use relative reference
  if (config.useRelativeRefs && refNamespace === currentNamespace) {
    return refType
  }

  // Different namespace - fully qualified reference
  const nsRef = toNamespaceRef(refNamespace)
  return `${nsRef}.${refType}`
}

/**
 * Recursively infer the TypeScript-level encoded type string for a blueprint schema definition.
 *
 * This corresponds to the `I` (Encoded) type parameter in `Schema.Schema<A, I, R>` and is used
 * to write accurate `Schema.suspend((): Schema.Schema<A, I> => ref)` thunk annotations for cyclic
 * types. The encoded type is the Plutus Data wire format that the TSchema combinator operates on.
 *
 * Mapping (blueprint schema → TSchema combinator → encoded type):
 *   constructor / anyOf (union)  → TSchema.Struct / TSchema.Union  → Data.Constr
 *   bytes                        → TSchema.ByteArray                → Uint8Array
 *   integer                      → TSchema.Integer                  → bigint
 *   list                         → TSchema.Array                    → readonly ItemEncoded[]
 *   map                          → TSchema.Map                      → globalThis.Map<Data.Data, Data.Data>
 *   $ref                         → (lookup + recurse)
 *   Data / unknown               → TSchema.PlutusData               → Data.Data
 */
function inferEncodedTypeString(
  def: BlueprintTypes.SchemaDefinitionType,
  definitions: Record<string, BlueprintTypes.SchemaDefinitionType>,
  depth = 0
): string {
  if (depth > 10) return "Data.Data"

  if ("$ref" in def) {
    const refName = def.$ref.replace("#/definitions/", "").replace(/~1/g, "/").replace(/~0/g, "~")
    if (refName === "Data") return "Data.Data"
    const refDef = definitions[refName]
    return refDef ? inferEncodedTypeString(refDef, definitions, depth + 1) : "Data.Data"
  }

  if ("title" in def && def.title === "Data") return "Data.Data"

  if ("anyOf" in def) return "Data.Constr"

  if ("dataType" in def) {
    switch (def.dataType) {
      case "constructor":
        return "Data.Constr"
      case "bytes":
        return "Uint8Array"
      case "integer":
        return "bigint"
      case "list": {
        const listDef = def as BlueprintTypes.ListDefinitionType
        if (!listDef.items) return "ReadonlyArray<Data.Data>"
        const itemEnc = inferEncodedTypeString(
          listDef.items as BlueprintTypes.SchemaDefinitionType,
          definitions,
          depth + 1
        )
        return `ReadonlyArray<${itemEnc}>`
      }
      case "map":
        // TSchema.Map encodes from/to globalThis.Map<Data.Data, Data.Data> regardless of K/V
        return "globalThis.Map<Data.Data, Data.Data>"
    }
  }

  return "Data.Data"
}

/**
 * Returns the encoded (Plutus Data) type string for a cyclic suspend thunk annotation.
 */
function getEncodedType(
  refName: string,
  definitions: Record<string, BlueprintTypes.SchemaDefinitionType>
): string {
  const def = definitions[refName]
  if (!def) return "Data.Data"
  return inferEncodedTypeString(def, definitions)
}

/**
 * Generate TSchema code for a schema definition
 */
function generateTSchema(
  def: BlueprintTypes.SchemaDefinitionType,
  definitions: Record<string, BlueprintTypes.SchemaDefinitionType>,
  config: CodegenConfig,
  currentNamespace: string = "",
  indent: string = config.indent,
  definitionKey?: string,
  cyclicNames: Set<string> = new Set()
): string {
  // Handle schema references
  if ("$ref" in def) {
    const refPath = def.$ref.replace("#/definitions/", "")
    const refName = refPath.replace(/~1/g, "/").replace(/~0/g, "~")
    // Special case: Data schema is exported as PlutusData
    if (refName === "Data") return "PlutusData"

    const refId = resolveReference(refName, currentNamespace, config)
    return cyclicNames.has(refName) ? `Schema.suspend((): Schema.Schema<${refId}, ${getEncodedType(refName, definitions)}> => ${refId})` : refId
  }

  // Handle Data type (opaque plutus data)
  if ("title" in def && def.title === "Data") {
    return "PlutusData"
  }

  // Handle primitive types
  if ("dataType" in def) {
    switch (def.dataType) {
      case "bytes":
        return "TSchema.ByteArray"

      case "integer":
        return "TSchema.Integer"

      case "constructor": {
        const constructorDef = def as BlueprintTypes.ConstructorDefinitionType

        if (!constructorDef.fields || constructorDef.fields.length === 0) {
          // Empty constructor - use configured style
          if (config.emptyConstructorStyle === "Literal") {
            const tag = constructorDef.title || definitionKey || "Unit"
            const indexOpt =
              constructorDef.index && constructorDef.index !== 0 ? `, { index: ${constructorDef.index} }` : ""
            return `TSchema.Literal("${tag}" as const${indexOpt})`
          }
          return "TSchema.Struct({})"
        }

        // Build struct fields
        const fieldSchemas: Array<string> = []

        for (let i = 0; i < constructorDef.fields.length; i++) {
          const field = constructorDef.fields[i]!
          // Use configured field naming
          const fieldName =
            field.title ||
            (constructorDef.fields.length === 1
              ? config.fieldNaming.singleFieldName
              : config.fieldNaming.multiFieldPattern.replace("{index}", String(i)))

          let fieldSchema: string
          if ("$ref" in field && field.$ref) {
            const refPath = field.$ref.replace("#/definitions/", "")
            const refName = refPath.replace(/~1/g, "/").replace(/~0/g, "~")
            // Use lazy reference for recursive types
            const refId = resolveReference(refName, currentNamespace, config)
            fieldSchema = cyclicNames.has(refName) ? `Schema.suspend((): Schema.Schema<${refId}, ${getEncodedType(refName, definitions)}> => ${refId})` : refId
          } else if (field.schema) {
            fieldSchema = generateTSchema(
              field.schema,
              definitions,
              config,
              currentNamespace,
              indent + config.indent + config.indent,
              undefined,
              cyclicNames
            )
          } else {
            fieldSchema = "PlutusData"
          }

          fieldSchemas.push(`${indent}${config.indent}${config.indent}${fieldName}: ${fieldSchema}`)
        }

        return `TSchema.Struct({\n${fieldSchemas.join(",\n")}\n${indent}${config.indent}})`
      }

      case "list": {
        const listDef = def as BlueprintTypes.ListDefinitionType
        const itemsSchema = listDef.items
        if (!itemsSchema) {
          return "TSchema.Array(PlutusData)"
        }

        const itemType = generateTSchema(
          itemsSchema as BlueprintTypes.SchemaDefinitionType,
          definitions,
          config,
          currentNamespace,
          indent,
          undefined,
          cyclicNames
        )
        return `TSchema.Array(${itemType})`
      }

      case "map": {
        const mapDef = def as BlueprintTypes.MapDefinitionType
        const keysSchema = mapDef.keys
        const valuesSchema = mapDef.values

        if (!keysSchema || !valuesSchema) {
          return "TSchema.Map(PlutusData, PlutusData)"
        }

        const keyType = generateTSchema(
          keysSchema as BlueprintTypes.SchemaDefinitionType,
          definitions,
          config,
          currentNamespace,
          indent,
          undefined,
          cyclicNames
        )
        const valueType = generateTSchema(
          valuesSchema as BlueprintTypes.SchemaDefinitionType,
          definitions,
          config,
          currentNamespace,
          indent,
          undefined,
          cyclicNames
        )
        return `TSchema.Map(${keyType}, ${valueType})`
      }

      default:
        return "PlutusData"
    }
  }

  // Handle union types (anyOf)
  if ("anyOf" in def) {
    const unionDef = def as BlueprintTypes.UnionDefinitionType
    const title = "title" in def ? (def as { title?: string }).title : undefined

    // Special transform for Bool type
    if (title === "Bool") {
      const constructors = unionDef.anyOf.filter(
        (item): item is BlueprintTypes.ConstructorDefinitionType =>
          "dataType" in item && item.dataType === "constructor"
      )
      // Check if it's the standard True/False pattern
      if (
        constructors.length === 2 &&
        constructors.some((c) => c.title === "True") &&
        constructors.some((c) => c.title === "False")
      ) {
        return "TSchema.Boolean"
      }
    }

    // Handle Option<T> transformation based on optionStyle
    if (title === "Option" && config.optionStyle !== "Union") {
      // Extract inner type from Option<T> pattern (Some/None constructors)
      const constructors = unionDef.anyOf.filter(
        (item): item is BlueprintTypes.ConstructorDefinitionType =>
          "dataType" in item && item.dataType === "constructor"
      )

      const someConstructor = constructors.find((c) => c.title === "Some")
      if (someConstructor?.fields?.[0]) {
        let innerType: string
        const field = someConstructor.fields[0]

        if (field.$ref) {
          const refPath = field.$ref.replace("#/definitions/", "")
          const refName = refPath.replace(/~1/g, "/").replace(/~0/g, "~")
          const refIdentifier = resolveReference(refName, currentNamespace, config)
          innerType = cyclicNames.has(refName) ? `Schema.suspend((): Schema.Schema<${refIdentifier}, ${getEncodedType(refName, definitions)}> => ${refIdentifier})` : refIdentifier
        } else if (field.schema) {
          innerType = generateTSchema(field.schema, definitions, config, currentNamespace, indent, undefined, cyclicNames)
        } else {
          innerType = "PlutusData"
        }

        // Generate the appropriate TSchema based on optionStyle
        const optionFn = config.optionStyle === "NullOr" ? "TSchema.NullOr" : "TSchema.UndefinedOr"
        return `${optionFn}(${innerType})`
      }
    }

    // Check if this is a Variant pattern (all members are named constructors)
    const isVariant = unionDef.anyOf.every((member) => {
      if ("dataType" in member && member.dataType === "constructor") {
        const constructorMember = member as BlueprintTypes.ConstructorDefinitionType
        // Must have fields array (title is optional for single-constructor Void pattern)
        return constructorMember.fields !== undefined
      }
      return false
    })

    if (isVariant) {
      // If only one variant, unwrap it to just a Struct or Void
      if (unionDef.anyOf.length === 1) {
        const constructorMember = unionDef.anyOf[0] as BlueprintTypes.ConstructorDefinitionType
        const fields = constructorMember.fields!

        // Special case: single constructor with no fields (Void/Unit pattern)
        if (fields.length === 0) {
          // Use constructor title, then definition key, then fallback to "Unit"
          const tag = constructorMember.title || definitionKey || "Unit"
          const indexOpt =
            constructorMember.index && constructorMember.index !== 0 ? `, { index: ${constructorMember.index} }` : ""
          return `TSchema.Literal("${tag}" as const${indexOpt})`
        }

        // Build the fields object
        const fieldSchemas: Array<string> = []
        for (let i = 0; i < fields.length; i++) {
          const field = fields[i]!
          const fieldName = field.title || (fields.length === 1 ? "value" : `field${i}`)

          let fieldSchema: string
          if (field.$ref) {
            const refPath = field.$ref.replace("#/definitions/", "")
            const refName = refPath.replace(/~1/g, "/").replace(/~0/g, "~")
            const refId = resolveReference(refName, currentNamespace, config)
            fieldSchema = cyclicNames.has(refName) ? `Schema.suspend((): Schema.Schema<${refId}, ${getEncodedType(refName, definitions)}> => ${refId})` : refId
          } else if (field.schema) {
            fieldSchema = generateTSchema(
              field.schema,
              definitions,
              config,
              currentNamespace,
              indent + config.indent + config.indent,
              undefined,
              cyclicNames
            )
          } else {
            fieldSchema = "PlutusData"
          }

          fieldSchemas.push(`${indent}${config.indent}${config.indent}${fieldName}: ${fieldSchema}`)
        }

        return `TSchema.Struct({\n${fieldSchemas.join(",\n")}\n${indent}${config.indent}})`
      }

      // Get the type title for custom field name lookup
      const typeTitle = "title" in def ? (def as { title?: string }).title : undefined

      // Check if any constructor has empty fields and emptyConstructorStyle is "Literal"
      const hasEmptyConstructors = unionDef.anyOf.some((member) => {
        const constructorMember = member as BlueprintTypes.ConstructorDefinitionType
        return constructorMember.fields?.length === 0
      })

      // When TaggedStruct style is selected and there are empty constructors with Literal style,
      // use the Union-with-literals path instead of plain TaggedStruct.
      const useUnionWithLiterals = hasEmptyConstructors && config.emptyConstructorStyle === "Literal" && config.unionStyle !== "Variant"

      const useVariant = config.unionStyle === "Variant"
      const useExplicitUnion = config.unionStyle === "Struct"

      if ((useVariant || useExplicitUnion) && !useUnionWithLiterals) {
        // Generate Variant or explicit Union — both use object-key discriminant ({ TagName: { ...fields } })
        const variantFields: Array<string> = []   // for Variant output
        const explicitUnionMembers: Array<string> = [] // for Union output

        for (const member of unionDef.anyOf) {
          const constructorMember = member as BlueprintTypes.ConstructorDefinitionType
          const tag = constructorMember.title!
          const fields = constructorMember.fields!

          // Build the fields object
          const fieldSchemas: Array<string> = []
          for (let i = 0; i < fields.length; i++) {
            const field = fields[i]!

            // Determine field name
            let fieldName: string
            if (field.title) {
              // Use explicit field name from Blueprint
              fieldName = field.title
            } else {
              // Try custom field names from config
              const lookupKey = typeTitle ? `${typeTitle}.${tag}` : tag
              const customFieldNames = config.variantFieldNames?.[lookupKey]
              if (customFieldNames && customFieldNames[i]) {
                fieldName = customFieldNames[i]!
              } else {
                // Fall back to configured naming pattern
                fieldName =
                  fields.length === 1
                    ? config.fieldNaming.singleFieldName
                    : config.fieldNaming.multiFieldPattern.replace("{index}", i.toString())
              }
            }

            let fieldSchema: string
            if (field.$ref) {
              const refPath = field.$ref.replace("#/definitions/", "")
              const refName = refPath.replace(/~1/g, "/").replace(/~0/g, "~")
              const refId = resolveReference(refName, currentNamespace, config)
              fieldSchema = cyclicNames.has(refName) ? `Schema.suspend((): Schema.Schema<${refId}, ${getEncodedType(refName, definitions)}> => ${refId})` : refId
            } else if (field.schema) {
              fieldSchema = generateTSchema(
                field.schema,
                definitions,
                config,
                currentNamespace,
                indent + config.indent + config.indent + config.indent,
                undefined,
                cyclicNames
              )
            } else {
              fieldSchema = "PlutusData"
            }

            fieldSchemas.push(`${fieldName}: ${fieldSchema}`)
          }

          if (useVariant) {
            variantFields.push(
              `${indent}${config.indent}${config.indent}${tag}: {\n${fieldSchemas.map((f) => `${indent}${config.indent}${config.indent}${config.indent}${f}`).join(",\n")}\n${indent}${config.indent}${config.indent}}`
            )
          } else {
            // Explicit Union style: TSchema.Struct({ TagName: TSchema.Struct({ ...fields }, { flatFields: true }) }, { flatInUnion: true })
            const innerFieldsStr =
              fieldSchemas.length > 0
                ? `{\n${fieldSchemas.map((f) => `${indent}${config.indent}${config.indent}${config.indent}${f}`).join(",\n")}\n${indent}${config.indent}${config.indent}}`
                : "{}"
            explicitUnionMembers.push(
              `${indent}${config.indent}TSchema.Struct({ ${tag}: TSchema.Struct(${innerFieldsStr}, { flatFields: true }) }, { flatInUnion: true })`
            )
          }
        }

        if (useVariant) {
          return `TSchema.Variant({\n${variantFields.join(",\n")}\n${indent}${config.indent}})`
        }
        return `TSchema.Union(\n${explicitUnionMembers.join(",\n")}\n${indent})`
      } else if (useUnionWithLiterals) {
        // Generate Union with mixed TSchema.Struct and TSchema.Literal for empty constructors
        const unionMembers: Array<string> = []
        for (let memberIndex = 0; memberIndex < unionDef.anyOf.length; memberIndex++) {
          const member = unionDef.anyOf[memberIndex]!
          const constructorMember = member as BlueprintTypes.ConstructorDefinitionType
          const tag = constructorMember.title!
          const fields = constructorMember.fields!

          // All constructors use TSchema.TaggedStruct (with _tag field)
          const fieldSchemas: Array<string> = []
          for (let i = 0; i < fields.length; i++) {
            const field = fields[i]!

            // Determine field name
            let fieldName: string
            if (field.title) {
              fieldName = field.title
            } else {
              const lookupKey = typeTitle ? `${typeTitle}.${tag}` : tag
              const customFieldNames = config.variantFieldNames?.[lookupKey]
              if (customFieldNames && customFieldNames[i]) {
                fieldName = customFieldNames[i]!
              } else {
                // Use constructor tag name for single field instead of "value"
                fieldName =
                  fields.length === 1
                    ? tag.charAt(0).toLowerCase() + tag.slice(1)
                    : config.fieldNaming.multiFieldPattern.replace("{index}", i.toString())
              }
            }

            let fieldSchema: string
            if (field.$ref) {
              const refPath = field.$ref.replace("#/definitions/", "")
              const refName = refPath.replace(/~1/g, "/").replace(/~0/g, "~")
              const refId = resolveReference(refName, currentNamespace, config)
              fieldSchema = cyclicNames.has(refName) ? `Schema.suspend((): Schema.Schema<${refId}, ${getEncodedType(refName, definitions)}> => ${refId})` : refId
            } else if (field.schema) {
              fieldSchema = generateTSchema(
                field.schema,
                definitions,
                config,
                currentNamespace,
                indent + config.indent + config.indent,
                undefined,
                cyclicNames
              )
            } else {
              fieldSchema = "PlutusData"
            }

            fieldSchemas.push(`${indent}${config.indent}${config.indent}${config.indent}${fieldName}: ${fieldSchema}`)
          }

          // TaggedStruct for all constructors (empty or not)
          const fieldsStr = fieldSchemas.length > 0 ? `{ ${fieldSchemas.join(", ")} }` : "{}"
          unionMembers.push(
            `${indent}${config.indent}TSchema.TaggedStruct("${tag}", ${fieldsStr}, { flatInUnion: true })`
          )
        }

        return `TSchema.Union(\n${unionMembers.join(",\n")}\n${indent})`
      } else {
        // Generate Union of TaggedStructs for unnamed fields
        const taggedStructs: Array<string> = []
        for (const member of unionDef.anyOf) {
          const constructorMember = member as BlueprintTypes.ConstructorDefinitionType
          const tag = constructorMember.title!
          const fields = constructorMember.fields!

          // Build the fields object
          const fieldSchemas: Array<string> = []
          for (let i = 0; i < fields.length; i++) {
            const field = fields[i]!
            const fieldName = field.title || (fields.length === 1 ? "value" : `field${i}`)

            let fieldSchema: string
            if (field.$ref) {
              const refPath = field.$ref.replace("#/definitions/", "")
              const refName = refPath.replace(/~1/g, "/").replace(/~0/g, "~")
              const refId = resolveReference(refName, currentNamespace, config)
              fieldSchema = cyclicNames.has(refName) ? `Schema.suspend((): Schema.Schema<${refId}, ${getEncodedType(refName, definitions)}> => ${refId})` : refId
            } else if (field.schema) {
              fieldSchema = generateTSchema(
                field.schema,
                definitions,
                config,
                currentNamespace,
                indent + config.indent + config.indent,
                undefined,
                cyclicNames
              )
            } else {
              fieldSchema = "PlutusData"
            }

            fieldSchemas.push(`${indent}${config.indent}${config.indent}${fieldName}: ${fieldSchema}`)
          }

          taggedStructs.push(
            `${indent}  TSchema.TaggedStruct("${tag}", {\n${fieldSchemas.join(",\n")}\n${indent}  }, { flatFields: true })`
          )
        }

        return `TSchema.Union(\n${taggedStructs.join(",\n")}\n${indent})`
      }
    }

    // Otherwise use regular Union
    const members = def.anyOf.map((memberDef) =>
      generateTSchema(memberDef, definitions, config, currentNamespace, indent, undefined, cyclicNames)
    )
    return `TSchema.Union(\n${indent}  ${members.join(`,\n${indent}  `)}\n${indent})`
  }

  // Handle empty schema
  if (Object.keys(def).length === 0) {
    return "PlutusData"
  }

  return "PlutusData"
}

/**
 * Extract dependencies from a schema definition
 */
function extractDependencies(
  def: BlueprintTypes.SchemaDefinitionType,
  _definitions: Record<string, BlueprintTypes.SchemaDefinitionType>
): Set<string> {
  const deps = new Set<string>()

  function visit(node: BlueprintTypes.SchemaDefinitionType): void {
    if ("$ref" in node && node.$ref) {
      const refPath = node.$ref.replace("#/definitions/", "")
      const refName = refPath.replace(/~1/g, "/").replace(/~0/g, "~")
      if (refName !== "Data") {
        deps.add(refName)
      }
    }

    if ("dataType" in node) {
      if (node.dataType === "list" && "items" in node && node.items) {
        visit(node.items as BlueprintTypes.SchemaDefinitionType)
      }
      if (node.dataType === "map" && "keys" in node && node.keys && "values" in node && node.values) {
        visit(node.keys as BlueprintTypes.SchemaDefinitionType)
        visit(node.values as BlueprintTypes.SchemaDefinitionType)
      }
      if (node.dataType === "constructor" && "fields" in node && node.fields) {
        for (const field of node.fields) {
          if ("$ref" in field && field.$ref) {
            visit(field as BlueprintTypes.SchemaDefinitionType)
          }
          if ("schema" in field && field.schema) {
            visit(field.schema)
          }
        }
      }
    }

    if ("anyOf" in node && node.anyOf) {
      for (const member of node.anyOf) {
        visit(member)
      }
    }

    if ("fields" in node && Array.isArray(node.fields)) {
      for (const field of node.fields) {
        if ("$ref" in field && field.$ref) {
          visit(field as BlueprintTypes.SchemaDefinitionType)
        }
        if ("schema" in field && field.schema) {
          visit(field.schema)
        }
      }
    }
  }

  visit(def)
  return deps
}

/**
 * Generate a TypeScript type string for a blueprint schema definition.
 * Used to emit explicit `type` aliases before recursive `const` declarations.
 */
function generateTSType(
  def: BlueprintTypes.SchemaDefinitionType,
  definitions: Record<string, BlueprintTypes.SchemaDefinitionType>,
  currentNamespace: string,
  config: CodegenConfig,
  visitedRefs: Set<string> = new Set()
): string {
  if ("$ref" in def) {
    const refPath = (def as { $ref: string }).$ref.replace("#/definitions/", "")
    const refName = refPath.replace(/~1/g, "/").replace(/~0/g, "~")
    if (refName === "Data") return "unknown"
    // Cycle — use the qualified type name we will declare
    if (visitedRefs.has(refName)) {
      return resolveReference(refName, currentNamespace, config)
    }
    const refDef = definitions[refName]
    if (!refDef) return "unknown"
    const newVisited = new Set(visitedRefs)
    newVisited.add(refName)
    return generateTSType(refDef, definitions, getNamespacePath(refName), config, newVisited)
  }

  if ("dataType" in def) {
    switch ((def as { dataType: string }).dataType) {
      case "bytes":
        return "Uint8Array"
      case "integer":
        return "bigint"
      case "list": {
        const listDef = def as BlueprintTypes.ListDefinitionType
        const itemType = listDef.items
          ? generateTSType(
              listDef.items as BlueprintTypes.SchemaDefinitionType,
              definitions,
              currentNamespace,
              config,
              visitedRefs
            )
          : "unknown"
        return `ReadonlyArray<${itemType}>`
      }
      case "map": {
        const mapDef = def as BlueprintTypes.MapDefinitionType
        const keyType = mapDef.keys
          ? generateTSType(
              mapDef.keys as BlueprintTypes.SchemaDefinitionType,
              definitions,
              currentNamespace,
              config,
              visitedRefs
            )
          : "unknown"
        const valType = mapDef.values
          ? generateTSType(
              mapDef.values as BlueprintTypes.SchemaDefinitionType,
              definitions,
              currentNamespace,
              config,
              visitedRefs
            )
          : "unknown"
        return `ReadonlyMap<${keyType}, ${valType}>`
      }
      case "constructor": {
        const ctorDef = def as BlueprintTypes.ConstructorDefinitionType
        if (!ctorDef.fields || ctorDef.fields.length === 0) return "Record<string, never>"
        const fieldStrings = ctorDef.fields.map((f) => {
          const fname = (f as { title?: string }).title ?? "field"
          let ftype: string
          if ("$ref" in f) {
            ftype = generateTSType(f as BlueprintTypes.SchemaDefinitionType, definitions, currentNamespace, config, visitedRefs)
          } else if ("schema" in f && (f as { schema?: BlueprintTypes.SchemaDefinitionType }).schema) {
            ftype = generateTSType(
              (f as { schema: BlueprintTypes.SchemaDefinitionType }).schema,
              definitions,
              currentNamespace,
              config,
              visitedRefs
            )
          } else {
            ftype = "unknown"
          }
          return `readonly ${fname}: ${ftype}`
        })
        return `{ ${fieldStrings.join("; ")} }`
      }
    }
  }

  if ("anyOf" in def) {
    const unionDef = def as BlueprintTypes.UnionDefinitionType
    if ((def as { title?: string }).title === "Bool") return "boolean"
    const variants = unionDef.anyOf.map((variant) => {
      const ctorDef = variant as BlueprintTypes.ConstructorDefinitionType
      if ((ctorDef as { dataType?: string }).dataType !== "constructor") {
        return generateTSType(variant, definitions, currentNamespace, config, visitedRefs)
      }
      const title = (ctorDef as { title?: string }).title ?? "Unknown"
      if (!ctorDef.fields || ctorDef.fields.length === 0) {
        return `{ readonly ${title}: Record<string, never> }`
      }
      const inner = generateTSType(variant, definitions, currentNamespace, config, visitedRefs)
      return `{ readonly ${title}: ${inner} }`
    })
    return variants.join(" | ")
  }

  return "unknown"
}

/**
 * Topologically sort definitions to ensure dependencies come first.
 * Also returns the set of definition names that participate in a cycle.
 */
function topologicalSort(
  definitions: Record<string, BlueprintTypes.SchemaDefinitionType>
): { sorted: Array<[string, BlueprintTypes.SchemaDefinitionType]>; cyclicNames: Set<string> } {
  const sorted: Array<[string, BlueprintTypes.SchemaDefinitionType]> = []
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const cyclicNames = new Set<string>()

  function visit(name: string): void {
    if (visited.has(name)) return
    if (visiting.has(name)) {
      // Circular dependency detected — mark everything in the current visiting stack
      for (const inStack of visiting) {
        cyclicNames.add(inStack)
      }
      return
    }

    visiting.add(name)

    const def = definitions[name]
    if (def) {
      const deps = extractDependencies(def, definitions)
      for (const dep of deps) {
        if (definitions[dep]) {
          visit(dep)
        }
      }
      sorted.push([name, def])
    }

    visiting.delete(name)
    visited.add(name)
  }

  for (const name of Object.keys(definitions)) {
    visit(name)
  }

  return { sorted, cyclicNames }
}

/**
 * Generate TypeScript code with TSchema from a Blueprint
 */
export function generateTypeScript(
  blueprint: BlueprintTypes.PlutusBlueprint,
  config: CodegenConfig = DEFAULT_CODEGEN_CONFIG
): string {
  const lines: Array<string> = []

  // Topologically sort definitions to ensure dependencies come first
  // (must happen before imports so we know if cyclic types exist)
  const { cyclicNames, sorted: sortedDefinitions } = topologicalSort(blueprint.definitions)

  // File header
  lines.push("/**")
  lines.push(` * Generated from Blueprint: ${blueprint.preamble.title}`)
  lines.push(` * @generated - Do not edit manually`)
  lines.push(" */")
  lines.push("")
  if (cyclicNames.size > 0) {
    lines.push(config.imports.schema)
  }
  lines.push(config.imports.data)
  lines.push(config.imports.tschema)
  lines.push("")

  // Generate schema definitions
  lines.push("// ============================================================================")
  lines.push("// Schema Definitions")
  lines.push("// ============================================================================")
  lines.push("")
  lines.push("// PlutusData schema (referenced by Data type)")
  lines.push("export const PlutusData = TSchema.PlutusData")
  lines.push("")

  if (config.moduleStrategy === "namespaced") {
    // First, topologically sort ALL definitions globally
    const globallySortedDefs = sortedDefinitions

    // Separate primitives from namespaced types
    const primitives: Array<[string, BlueprintTypes.SchemaDefinitionType]> = []
    const namespacedTypes: Array<[string, BlueprintTypes.SchemaDefinitionType]> = []

    for (const [fullName, def] of globallySortedDefs) {
      const namespacePath = getNamespacePath(fullName)
      if (namespacePath === "") {
        primitives.push([fullName, def])
      } else {
        namespacedTypes.push([fullName, def])
      }
    }

    // Export primitives at root level
    for (const [fullName, def] of primitives) {
      // Skip Data - already defined as PlutusData
      if ("title" in def && def.title === "Data") {
        continue
      }

      // Use flattened name for primitives (handles $ and / characters)
      const primitiveName = getTypeName(fullName)

      const schemaDefinition = generateTSchema(def, blueprint.definitions, config, "", "", primitiveName, cyclicNames)

      // Add JSDoc comment
      if ("title" in def && def.title) {
        lines.push("/**")
        lines.push(` * ${def.title}`)
        if ("description" in def && def.description) {
          lines.push(` * ${def.description}`)
        }
        lines.push(" */")
      }

      lines.push(`export const ${primitiveName} = ${schemaDefinition}`)
      lines.push("")
    }

    // Emit types in global topological order, opening/closing namespace blocks as each
    // type's namespace changes. TypeScript namespace declaration merging (handled by esbuild/tsc)
    // safely merges repeated same-namespace blocks, giving correct runtime initialization order
    // even when two namespaces have a mutual dependency (e.g. Option ↔ Cardano.Address).
    let currentNs = ""
    let nsIndent = ""

    const closeCurrentNs = (): void => {
      if (!currentNs) return
      const levels = currentNs.split("/")
      for (let i = levels.length - 1; i >= 0; i--) {
        nsIndent = nsIndent.slice(0, -2)
        lines.push(`${nsIndent}}`)
      }
      lines.push("")
      currentNs = ""
      nsIndent = ""
    }

    const openNs = (ns: string): void => {
      currentNs = ns
      for (const level of ns.split("/")) {
        const nsName = level.charAt(0).toUpperCase() + level.slice(1)
        lines.push(`${nsIndent}export namespace ${nsName} {`)
        nsIndent += "  "
      }
    }

    for (const [fullName, typeDef] of namespacedTypes) {
      const ns = getNamespacePath(fullName)
      if (ns !== currentNs) {
        closeCurrentNs()
        openNs(ns)
      }

      const typeName = getTypeName(fullName)
      const isCyclic = cyclicNames.has(fullName)
      const schemaDefinition = generateTSchema(
        typeDef,
        blueprint.definitions,
        config,
        ns,
        nsIndent + (isCyclic ? config.indent : ""),
        typeName,
        cyclicNames
      )

      if ("title" in typeDef && typeDef.title) {
        lines.push(`${nsIndent}/**`)
        lines.push(`${nsIndent} * ${typeDef.title}`)
        if ("description" in typeDef && typeDef.description) {
          lines.push(`${nsIndent} * ${typeDef.description}`)
        }
        lines.push(`${nsIndent} */`)
      }

      if (isCyclic) {
        const tsType = generateTSType(typeDef, blueprint.definitions, ns, config, new Set([fullName]))
        lines.push(`${nsIndent}export type ${typeName} = ${tsType}`)
        lines.push(`${nsIndent}export const ${typeName} = ${schemaDefinition}`)
      } else {
        lines.push(`${nsIndent}export const ${typeName} = ${schemaDefinition}`)
      }
      lines.push("")
    }

    closeCurrentNs()
  } else {
    // Flat mode (original behavior)
    for (const [name, def] of sortedDefinitions) {
      // Skip Data - already defined as PlutusData
      if ("title" in def && def.title === "Data") {
        continue
      }

      const schemaName = toIdentifier(name)
      const isCyclic = cyclicNames.has(name)
      const schemaDefinition = generateTSchema(
        def,
        blueprint.definitions,
        config,
        "",
        isCyclic ? config.indent : "",
        schemaName,
        cyclicNames
      )

      // Add JSDoc comment
      if ("title" in def && def.title) {
        lines.push("/**")
        lines.push(` * ${def.title}`)
        if ("description" in def && def.description) {
          lines.push(` * ${def.description}`)
        }
        lines.push(" */")
      }

      if (isCyclic) {
        const tsType = generateTSType(def, blueprint.definitions, "", config, new Set([name]))
        lines.push(`export type ${schemaName} = ${tsType}`)
        lines.push(`export const ${schemaName} = ${schemaDefinition}`)
      } else {
        lines.push(`export const ${schemaName} = ${schemaDefinition}`)
      }
      lines.push("")
    }
  }

  // Generate validator contracts
  lines.push("// ============================================================================")
  lines.push("// Validators")
  lines.push("// ============================================================================")
  lines.push("")

  for (const validator of blueprint.validators) {
    const validatorName = toIdentifier(validator.title)

    lines.push("/**")
    lines.push(` * Validator: ${validator.title}`)
    lines.push(` * Hash: ${validator.hash}`)
    lines.push(" */")
    lines.push(`export const ${validatorName} = {`)
    lines.push(`  title: "${validator.title}",`)
    lines.push(`  hash: "${validator.hash}",`)
    lines.push(`  compiledCode: "${validator.compiledCode}",`)

    if (validator.datum) {
      const datumSchema = generateTSchema(validator.datum.schema, blueprint.definitions, config, "", "  ")
      if (datumSchema === "PlutusData") {
        lines.push(`  datum: ${datumSchema},`)
      } else {
        lines.push(`  datum: Data.withSchema(${datumSchema}),`)
      }
    }

    if (validator.redeemer) {
      const redeemerSchema =
        Object.keys(validator.redeemer.schema).length === 0
          ? "PlutusData"
          : generateTSchema(validator.redeemer.schema, blueprint.definitions, config, "", "  ")
      if (redeemerSchema === "PlutusData") {
        lines.push(`  redeemer: ${redeemerSchema},`)
      } else {
        lines.push(`  redeemer: Data.withSchema(${redeemerSchema}),`)
      }
    }

    if (validator.parameters && validator.parameters.length > 0) {
      lines.push("  parameters: [")
      for (const param of validator.parameters) {
        const paramSchema = generateTSchema(param.schema, blueprint.definitions, config, "", "    ")
        lines.push(`    ${paramSchema},`)
      }
      lines.push("  ],")
    }

    lines.push("} as const")
    lines.push("")
  }

  return lines.join("\n")
}
