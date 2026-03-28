"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "decodeField", {
  enumerable: true,
  get: function () {
    return MP.decodeField;
  }
});
exports.make = void 0;
var MP = /*#__PURE__*/_interopRequireWildcard(/*#__PURE__*/require("./index.js"));
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
const make = config => {
  const headers = Object.fromEntries([...config.headers]);
  let error;
  let partBuffer = [];
  let readResolve;
  let finished = false;
  const parser = MP.make({
    ...config,
    headers,
    onField(info, value) {
      partBuffer.push({
        _tag: "Field",
        info,
        value
      });
      if (readResolve !== undefined) readResolve();
    },
    onFile(info) {
      let chunkBuffer = [];
      let chunkResolve;
      let finished = false;
      const readable = new ReadableStream({
        pull(controller) {
          if (chunkBuffer.length > 0) {
            const chunks = chunkBuffer;
            chunkBuffer = [];
            for (const chunk of chunks) {
              controller.enqueue(chunk);
            }
          } else if (finished) {
            controller.close();
          } else {
            return new Promise(resolve => {
              chunkResolve = () => {
                chunkResolve = undefined;
                resolve();
              };
            }).then(() => this.pull(controller));
          }
        }
      });
      partBuffer.push({
        _tag: "File",
        info,
        readable
      });
      if (readResolve !== undefined) readResolve();
      return function (chunk) {
        if (chunk === null) {
          finished = true;
        } else {
          chunkBuffer.push(chunk);
        }
        if (chunkResolve !== undefined) {
          chunkResolve();
        }
      };
    },
    onError(error_) {
      if (error !== undefined) return;
      error = error_;
      if (readResolve !== undefined) readResolve();
    },
    onDone() {
      finished = true;
      if (readResolve !== undefined) readResolve();
    }
  });
  const writable = new WritableStream({
    write(chunk, controller) {
      parser.write(chunk);
    },
    close() {
      parser.end();
    }
  });
  const readable = new ReadableStream({
    pull(controller) {
      if (partBuffer.length > 0) {
        const parts = partBuffer;
        partBuffer = [];
        for (const part of parts) {
          controller.enqueue(part);
        }
      } else if (error) {
        controller.error(error);
      } else if (finished) {
        controller.close();
      } else {
        return new Promise(resolve => {
          readResolve = () => {
            readResolve = undefined;
            resolve();
          };
        }).then(() => this.pull(controller));
      }
    }
  });
  return {
    writable,
    readable
  };
};
exports.make = make;
//# sourceMappingURL=web.js.map