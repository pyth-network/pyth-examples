import { SystemError } from "@effect/platform/Error";
/** @internal */
export const handleErrnoException = (module, method) => (err, [path]) => {
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
  return new SystemError({
    reason,
    module,
    method,
    pathOrDescriptor: path,
    syscall: err.syscall,
    description: err.message,
    cause: err
  });
};
//# sourceMappingURL=error.js.map