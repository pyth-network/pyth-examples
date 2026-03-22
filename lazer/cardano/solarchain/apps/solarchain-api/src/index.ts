import { pathToFileURL } from "node:url";
import { buildApp } from "./app.js";
import { createSolarSnapshotRepository } from "./repositories/index.js";
export async function start(): Promise<void> { const repository = await createSolarSnapshotRepository(); const app = await buildApp(repository); await app.listen({ port: 4010, host: "0.0.0.0" }); }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { start().catch((error)=>{ console.error(error); process.exit(1); }); }
