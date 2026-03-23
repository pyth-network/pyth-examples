// Suppress libsodium-wrappers-sumo initialization errors in test environments.
// The 0.7.16 ESM package is missing libsodium-sumo.mjs (packaging bug). Our tests
// don't invoke any cryptographic operations, so this init failure is benign.
process.on("unhandledRejection", (reason) => {
  if (
    reason instanceof Error &&
    reason.message.includes("Both wasm and asm failed to load")
  ) {
    return; // known libsodium packaging bug, safe to ignore in tests
  }
  throw reason;
});
