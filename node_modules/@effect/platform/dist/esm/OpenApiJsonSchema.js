/**
 * @since 1.0.0
 */
import * as JSONSchema from "effect/JSONSchema";
import * as Record from "effect/Record";
/**
 * @category encoding
 * @since 1.0.0
 */
export const make = schema => {
  const defs = {};
  const out = makeWithDefs(schema, {
    defs
  });
  if (!Record.isEmptyRecord(defs)) {
    out.$defs = defs;
  }
  return out;
};
/**
 * Creates a schema with additional options and definitions.
 *
 * **Options**
 *
 * - `defs`: A record of definitions that are included in the schema.
 * - `defsPath`: The path to the definitions within the schema (defaults to "#/$defs/").
 * - `topLevelReferenceStrategy`: Controls the handling of the top-level reference. Possible values are:
 *   - `"keep"`: Keep the top-level reference (default behavior).
 *   - `"skip"`: Skip the top-level reference.
 * - `additionalPropertiesStrategy`: Controls the handling of additional properties. Possible values are:
 *   - `"strict"`: Disallow additional properties (default behavior).
 *   - `"allow"`: Allow additional properties.
 *
 * @category encoding
 * @since 1.0.0
 */
export const makeWithDefs = (schema, options) => fromAST(schema.ast, options);
/** @internal */
export const fromAST = (ast, options) => {
  const jsonSchema = JSONSchema.fromAST(ast, {
    definitions: options.defs,
    definitionPath: options.defsPath ?? "#/components/schemas/",
    target: "openApi3.1",
    topLevelReferenceStrategy: options.topLevelReferenceStrategy,
    additionalPropertiesStrategy: options.additionalPropertiesStrategy
  });
  return jsonSchema;
};
//# sourceMappingURL=OpenApiJsonSchema.js.map