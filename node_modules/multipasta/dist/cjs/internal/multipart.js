"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.decodeField = decodeField;
exports.defaultIsFile = defaultIsFile;
exports.make = make;
var CT = /*#__PURE__*/_interopRequireWildcard(/*#__PURE__*/require("./contentType.js"));
var HP = /*#__PURE__*/_interopRequireWildcard(/*#__PURE__*/require("./headers.js"));
var Search = /*#__PURE__*/_interopRequireWildcard(/*#__PURE__*/require("./search.js"));
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
var State;
(function (State) {
  State[State["headers"] = 0] = "headers";
  State[State["body"] = 1] = "body";
})(State || (State = {}));
const errInvalidDisposition = {
  _tag: "InvalidDisposition"
};
const errEndNotReached = {
  _tag: "EndNotReached"
};
const errMaxParts = {
  _tag: "ReachedLimit",
  limit: "MaxParts"
};
const errMaxTotalSize = {
  _tag: "ReachedLimit",
  limit: "MaxTotalSize"
};
const errMaxPartSize = {
  _tag: "ReachedLimit",
  limit: "MaxPartSize"
};
const errMaxFieldSize = {
  _tag: "ReachedLimit",
  limit: "MaxFieldSize"
};
const constCR = /*#__PURE__*/new TextEncoder().encode("\r\n");
function defaultIsFile(info) {
  return info.filename !== undefined || info.contentType === "application/octet-stream";
}
function parseBoundary(headers) {
  const contentType = CT.parse(headers["content-type"]);
  return contentType.parameters.boundary;
}
function noopOnChunk(_chunk) {}
function make({
  headers,
  onFile: onPart,
  onField,
  onError,
  onDone,
  isFile = defaultIsFile,
  maxParts = Infinity,
  maxTotalSize = Infinity,
  maxPartSize = Infinity,
  maxFieldSize = 1024 * 1024
}) {
  const boundary = parseBoundary(headers);
  if (boundary === undefined) {
    onError({
      _tag: "InvalidBoundary"
    });
    return {
      write: noopOnChunk,
      end() {}
    };
  }
  const state = {
    state: State.headers,
    index: 0,
    parts: 0,
    onChunk: noopOnChunk,
    info: undefined,
    headerSkip: 0,
    partSize: 0,
    totalSize: 0,
    isFile: false,
    fieldChunks: [],
    fieldSize: 0
  };
  function skipBody() {
    state.state = State.body;
    state.isFile = true;
    state.onChunk = noopOnChunk;
  }
  const headerParser = HP.make();
  const split = Search.make(`\r\n--${boundary}`, function (index, chunk) {
    if (index === 0) {
      // data before the first boundary
      skipBody();
      return;
    } else if (index !== state.index) {
      if (state.index > 0) {
        if (state.isFile) {
          state.onChunk(null);
          state.partSize = 0;
        } else {
          if (state.fieldChunks.length === 1) {
            onField(state.info, state.fieldChunks[0]);
          } else {
            const buf = new Uint8Array(state.fieldSize);
            let offset = 0;
            for (let i = 0; i < state.fieldChunks.length; i++) {
              const chunk = state.fieldChunks[i];
              buf.set(chunk, offset);
              offset += chunk.length;
            }
            onField(state.info, buf);
          }
          state.fieldSize = 0;
          state.fieldChunks = [];
        }
      }
      state.state = State.headers;
      state.index = index;
      state.headerSkip = 2; // skip the first \r\n
      // trailing --
      if (chunk[0] === 45 && chunk[1] === 45) {
        return onDone();
      }
      state.parts++;
      if (state.parts > maxParts) {
        onError(errMaxParts);
      }
    }
    if ((state.partSize += chunk.length) > maxPartSize) {
      onError(errMaxPartSize);
    }
    if (state.state === State.headers) {
      const result = headerParser(chunk, state.headerSkip);
      state.headerSkip = 0;
      if (result._tag === "Continue") {
        return;
      } else if (result._tag === "Failure") {
        skipBody();
        return onError({
          _tag: "BadHeaders",
          error: result
        });
      }
      const contentType = CT.parse(result.headers["content-type"]);
      const contentDisposition = CT.parse(result.headers["content-disposition"], true);
      if ("form-data" === contentDisposition.value && !("name" in contentDisposition.parameters)) {
        skipBody();
        return onError(errInvalidDisposition);
      }
      let encodedFilename;
      if ("filename*" in contentDisposition.parameters) {
        const parts = contentDisposition.parameters["filename*"].split("''");
        if (parts.length === 2) {
          encodedFilename = decodeURIComponent(parts[1]);
        }
      }
      state.info = {
        name: contentDisposition.parameters.name ?? "",
        filename: encodedFilename ?? contentDisposition.parameters.filename,
        contentType: contentType.value === "" ? contentDisposition.parameters.filename !== undefined ? "application/octet-stream" : "text/plain" : contentType.value,
        contentTypeParameters: contentType.parameters,
        contentDisposition: contentDisposition.value,
        contentDispositionParameters: contentDisposition.parameters,
        headers: result.headers
      };
      state.state = State.body;
      state.isFile = isFile(state.info);
      if (state.isFile) {
        state.onChunk = onPart(state.info);
      }
      if (result.endPosition < chunk.length) {
        if (state.isFile) {
          state.onChunk(chunk.subarray(result.endPosition));
        } else {
          const buf = chunk.subarray(result.endPosition);
          if ((state.fieldSize += buf.length) > maxFieldSize) {
            onError(errMaxFieldSize);
          }
          state.fieldChunks.push(buf);
        }
      }
    } else if (state.isFile) {
      state.onChunk(chunk);
    } else {
      if ((state.fieldSize += chunk.length) > maxFieldSize) {
        onError(errMaxFieldSize);
      }
      state.fieldChunks.push(chunk);
    }
  }, constCR);
  return {
    write(chunk) {
      if ((state.totalSize += chunk.length) > maxTotalSize) {
        return onError(errMaxTotalSize);
      }
      return split.write(chunk);
    },
    end() {
      split.end();
      if (state.state === State.body) {
        onError(errEndNotReached);
      }
      state.state = State.headers;
      state.index = 0;
      state.parts = 0;
      state.onChunk = noopOnChunk;
      state.info = undefined;
      state.totalSize = 0;
      state.partSize = 0;
      state.fieldChunks = [];
      state.fieldSize = 0;
    }
  };
}
const utf8Decoder = /*#__PURE__*/new TextDecoder("utf-8");
function getDecoder(charset) {
  if (charset === "utf-8" || charset === "utf8" || charset === "") {
    return utf8Decoder;
  }
  try {
    return new TextDecoder(charset);
  } catch (error) {
    return utf8Decoder;
  }
}
function decodeField(info, value) {
  return getDecoder(info.contentTypeParameters.charset ?? "utf-8").decode(value);
}
//# sourceMappingURL=multipart.js.map