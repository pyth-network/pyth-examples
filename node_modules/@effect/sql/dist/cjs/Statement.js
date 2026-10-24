"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withTransformerDisabled = exports.withTransformer = exports.unsafeFragment = exports.setTransformer = exports.primitiveKind = exports.or = exports.makeCompilerSqlite = exports.makeCompiler = exports.make = exports.join = exports.isFragment = exports.isCustom = exports.defaultTransforms = exports.defaultEscape = exports.custom = exports.currentTransformer = exports.csv = exports.and = exports.FragmentId = void 0;
var internal = _interopRequireWildcard(require("./internal/statement.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @category type id
 * @since 1.0.0
 */
const FragmentId = exports.FragmentId = internal.FragmentId;
/**
 * @category transformer
 * @since 1.0.0
 */
const currentTransformer = exports.currentTransformer = internal.currentTransformer;
/**
 * @category transformer
 * @since 1.0.0
 */
const withTransformer = exports.withTransformer = internal.withTransformer;
/**
 * @category transformer
 * @since 1.0.0
 */
const withTransformerDisabled = exports.withTransformerDisabled = internal.withTransformerDisabled;
/**
 * @category transformer
 * @since 1.0.0
 */
const setTransformer = exports.setTransformer = internal.setTransformer;
/**
 * @category guard
 * @since 1.0.0
 */
const isFragment = exports.isFragment = internal.isFragment;
/**
 * @category guard
 * @since 1.0.0
 */
const isCustom = exports.isCustom = internal.isCustom;
/**
 * @category constructor
 * @since 1.0.0
 */
const custom = exports.custom = internal.custom;
/**
 * @category constructor
 * @since 1.0.0
 */
const make = exports.make = internal.make;
/**
 * @category constructor
 * @since 1.0.0
 */
const unsafeFragment = exports.unsafeFragment = internal.unsafeFragment;
/**
 * @category constructor
 * @since 1.0.0
 */
const and = exports.and = internal.and;
/**
 * @category constructor
 * @since 1.0.0
 */
const or = exports.or = internal.or;
/**
 * @category constructor
 * @since 1.0.0
 */
const csv = exports.csv = internal.csv;
/**
 * @category constructor
 * @since 1.0.0
 */
const join = exports.join = internal.join;
/**
 * @category compiler
 * @since 1.0.0
 */
const makeCompiler = exports.makeCompiler = internal.makeCompiler;
/**
 * @category compiler
 * @since 1.0.0
 */
const makeCompilerSqlite = exports.makeCompilerSqlite = internal.makeCompilerSqlite;
/**
 * @since 1.0.0
 */
const defaultEscape = exports.defaultEscape = internal.defaultEscape;
/**
 * @since 1.0.0
 */
const primitiveKind = exports.primitiveKind = internal.primitiveKind;
/**
 * @since 1.0.0
 */
const defaultTransforms = exports.defaultTransforms = internal.defaultTransforms;
//# sourceMappingURL=Statement.js.map