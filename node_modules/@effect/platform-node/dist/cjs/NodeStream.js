"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _NodeStream = require("@effect/platform-node-shared/NodeStream");
Object.keys(_NodeStream).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _NodeStream[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _NodeStream[key];
    }
  });
});
//# sourceMappingURL=NodeStream.js.map