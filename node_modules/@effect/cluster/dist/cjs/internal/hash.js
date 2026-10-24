"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.hashString = exports.hashOptimize = void 0;
/** @internal */
const hashOptimize = n => n & 0xbfffffff | n >>> 1 & 0x40000000;
/** @internal */
exports.hashOptimize = hashOptimize;
const hashString = str => {
  let h = 5381,
    i = str.length;
  while (i) {
    h = h * 33 ^ str.charCodeAt(--i);
  }
  return hashOptimize(h);
};
exports.hashString = hashString;
//# sourceMappingURL=hash.js.map