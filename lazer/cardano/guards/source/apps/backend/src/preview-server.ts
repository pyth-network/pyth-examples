import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { createDemoState } from "./demo-state.js";
import { runtimeEnv } from "./env.js";

const port = runtimeEnv.port;
const uiRoot = path.resolve(process.cwd(), "apps/ui");
const docsRoot = path.resolve(process.cwd(), "docs");
const allowedDocs = new Set([
  "functional-v4.md",
  "roadmap.md",
  "landing-frontend-spec.md",
  "cardano-swap-venue-decision.md",
  "protocol-fee-model.md",
  "cardano-custody-model.md",
  "dexhunter-live-adapter.md",
]);

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function resolveUiPath(requestPath: string): string {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const relativePath = safePath.replace(/^\/+/, "");
  const resolvedPath = path.resolve(uiRoot, relativePath);
  const relativeToRoot = path.relative(uiRoot, resolvedPath);

  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return path.resolve(uiRoot, "index.html");
  }

  return resolvedPath;
}

function resolveDocsPath(requestPath: string): string | undefined {
  const fileName = requestPath.replace(/^\/docs\/+/, "");
  if (!allowedDocs.has(fileName)) {
    return undefined;
  }

  return path.resolve(docsRoot, fileName);
}

const server = createServer(async (request, response) => {
  const hostHeader =
    typeof request.headers.host === "string" && request.headers.host.length > 0
      ? request.headers.host
      : "localhost";
  const url = new URL(request.url ?? "/", `http://${hostHeader}`);

  if (url.pathname === "/api/demo-state") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(createDemoState().payload, null, 2));
    return;
  }

  const filePath = url.pathname.startsWith("/docs/")
    ? resolveDocsPath(url.pathname)
    : resolveUiPath(url.pathname);
  if (!filePath || !existsSync(filePath)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const fileStats = await stat(filePath);
  if (!fileStats.isFile()) {
    response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  response.writeHead(200, {
    "content-type": contentTypes[path.extname(filePath)] ?? "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`Preview server running at http://localhost:${port}`);
});
