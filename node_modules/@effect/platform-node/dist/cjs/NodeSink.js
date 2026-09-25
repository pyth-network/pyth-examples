"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _NodeSink = require("@effect/platform-node-shared/NodeSink");
Object.keys(_NodeSink).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _NodeSink[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _NodeSink[key];
    }
  });
});
//# sourceMappingURL=NodeSink.js.map