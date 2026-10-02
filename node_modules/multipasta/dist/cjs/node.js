"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MultipastaStream = exports.FileStream = void 0;
Object.defineProperty(exports, "decodeField", {
  enumerable: true,
  get: function () {
    return MP.decodeField;
  }
});
exports.make = void 0;
var MP = /*#__PURE__*/_interopRequireWildcard(/*#__PURE__*/require("./index.js"));
var _nodeStream = /*#__PURE__*/require("node:stream");
function _interopRequireWildcard(e, t) {
  if ("function" == typeof WeakMap) var r = new WeakMap(),
    n = new WeakMap();
  return (_interopRequireWildcard = function (e, t) {
    if (!t && e && e.__esModule) return e;
    var o,
      i,
      f = {
        __proto__: null,
        default: e
      };
    if (null === e || "object" != typeof e && "function" != typeof e) return f;
    if (o = t ? n : r) {
      if (o.has(e)) return o.get(e);
      o.set(e, f);
    }
    for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);
    return f;
  })(e, t);
}
class MultipastaStream extends _nodeStream.Duplex {
  _parser;
  _canWrite = true;
  _writeCallback;
  constructor(config) {
    super({
      readableObjectMode: true
    });
    let currentError;
    let currentFile;
    this._parser = MP.make({
      ...config,
      onField: (info, value) => {
        if (currentError !== undefined) return;
        const field = {
          _tag: "Field",
          info,
          value
        };
        this.push(field);
        this.emit("field", field);
      },
      onFile: info => {
        if (currentError !== undefined) return _ => {};
        const file = new FileStream(info, this);
        currentFile = file;
        this.push(file);
        this.emit("file", file);
        return chunk => {
          this._canWrite = file.push(chunk);
          if (chunk === null && !this._canWrite) {
            currentFile = undefined;
            this._resume();
          }
        };
      },
      onError: error => {
        this.emit("error", error);
        currentFile?.emit("error", error);
        currentError = error;
      },
      onDone: () => {
        this.push(null);
      }
    });
  }
  _resume() {
    this._canWrite = true;
    if (this._writeCallback !== undefined) {
      const callback = this._writeCallback;
      this._writeCallback = undefined;
      callback();
    }
  }
  _read(_size) {}
  _write(chunk, encoding, callback) {
    this._parser.write(chunk instanceof Uint8Array ? chunk : Buffer.from(chunk, encoding));
    if (this._canWrite) {
      callback();
    } else {
      this._writeCallback = callback;
    }
  }
  _final(callback) {
    this._parser.end();
    callback();
  }
}
exports.MultipastaStream = MultipastaStream;
const make = config => new MultipastaStream(config);
exports.make = make;
class FileStream extends _nodeStream.Readable {
  info;
  _parent;
  _tag = "File";
  filename;
  constructor(info, _parent) {
    super();
    this.info = info;
    this._parent = _parent;
    this.filename = info.filename;
  }
  _read(_size) {
    if (this._parent._canWrite === false) {
      this._parent._resume();
    }
  }
}
exports.FileStream = FileStream;
//# sourceMappingURL=node.js.map