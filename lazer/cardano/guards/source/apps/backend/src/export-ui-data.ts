import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createDemoState } from "./demo-state.js";
import "./env.js";

const outputDir = path.resolve(process.cwd(), "apps/ui/data");
const outputFile = path.join(outputDir, "demo-state.json");

await mkdir(outputDir, { recursive: true });
await writeFile(
  outputFile,
  `${JSON.stringify(createDemoState().payload, null, 2)}\n`,
  "utf8",
);

console.log(`Wrote ${outputFile}`);
