"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeWithDefs = exports.make = exports.fromAST = void 0;
var JSONSchema = _interopRequireWildcard(require("effect/JSONSchema"));
var Record = _interopRequireWildcard(require("effect/Record"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @category encoding
 * @since 1.0.0
 */
const make = schema => {
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
exports.make = make;
const makeWithDefs = (schema, options) => fromAST(schema.ast, options);
/** @internal */
exports.makeWithDefs = makeWithDefs;
const fromAST = (ast, options) => {
  const jsonSchema = JSONSchema.fromAST(ast, {
    definitions: options.defs,
    definitionPath: options.defsPath ?? "#/components/schemas/",
    target: "openApi3.1",
    topLevelReferenceStrategy: options.topLevelReferenceStrategy,
    additionalPropertiesStrategy: options.additionalPropertiesStrategy
  });
  return jsonSchema;
};
exports.fromAST = fromAST;
//# sourceMappingURL=OpenApiJsonSchema.js.map