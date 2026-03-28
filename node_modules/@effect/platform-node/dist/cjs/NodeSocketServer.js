"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _NodeSocketServer = require("@effect/platform-node-shared/NodeSocketServer");
Object.keys(_NodeSocketServer).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _NodeSocketServer[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _NodeSocketServer[key];
    }
  });
});
//# sourceMappingURL=NodeSocketServer.js.map