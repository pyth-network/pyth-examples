"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.handleErrnoException = void 0;
var _Error = require("@effect/platform/Error");
/** @internal */
const handleErrnoException = (module, method) => (err, [path]) => {
  let reason = "Unknown";
  switch (err.code) {
    case "ENOENT":
      reason = "NotFound";
      break;
    case "EACCES":
      reason = "PermissionDenied";
      break;
    case "EEXIST":
      reason = "AlreadyExists";
      break;
    case "EISDIR":
      reason = "BadResource";
      break;
    case "ENOTDIR":
      reason = "BadResource";
      break;
    case "EBUSY":
      reason = "Busy";
      break;
    case "ELOOP":
      reason = "BadResource";
      break;
  }
  return new _Error.SystemError({
    reason,
    module,
    method,
    pathOrDescriptor: path,
    syscall: err.syscall,
    description: err.message,
    cause: err
  });
};
exports.handleErrnoException = handleErrnoException;
//# sourceMappingURL=error.js.map