import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { executeCancelFlow } from "../deployment/services/cancelFlow.js";
import { executeLockFlow } from "../deployment/services/lockFlow.js";
import { executeUnlockFlow } from "../deployment/services/unlockFlow.js";

interface CreateRequestPayload {
  requesterAddressHex: string;
  sponsorAddressHex?: string | null;
  usdAmount: number;
  adaUsd: number;
  coverageMultiplier?: number;
  description?: string;
  dueDate?: string;
}

interface LockNumbers {
  coverageMultiplier: number;
  lockAda: number;
  lockLovelace: number;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");
mkdirSync(dataDir, { recursive: true });

const dbPath = join(dataDir, "requests.db");
const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    requester_address_hex TEXT NOT NULL,
    sponsor_address_hex TEXT,
    usd_amount REAL NOT NULL,
    lock_ada REAL NOT NULL,
    lock_lovelace INTEGER NOT NULL,
    ada_usd REAL NOT NULL,
    coverage_multiplier REAL NOT NULL,
    status TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    created_at TEXT NOT NULL,
    lock_tx_id TEXT NOT NULL,
    lock_tx_draft_json TEXT NOT NULL,
    pyth_policy_id TEXT,
    cancel_tx_id TEXT,
    unlock_tx_id TEXT
  )
`);

try {
  db.exec(`ALTER TABLE requests ADD COLUMN cancel_tx_id TEXT`);
} catch {
  // Column already exists.
}

try {
  db.exec(`ALTER TABLE requests ADD COLUMN unlock_tx_id TEXT`);
} catch {
  // Column already exists.
}

try {
  db.exec(`ALTER TABLE requests ADD COLUMN pyth_policy_id TEXT`);
} catch {
  // Column already exists.
}

const insertRequest = db.prepare(`
  INSERT INTO requests (
    id,
    requester_address_hex,
    sponsor_address_hex,
    usd_amount,
    lock_ada,
    lock_lovelace,
    ada_usd,
    coverage_multiplier,
    status,
    description,
    due_date,
    created_at,
    lock_tx_id,
    lock_tx_draft_json,
    pyth_policy_id
  ) VALUES (
    $id,
    $requesterAddressHex,
    $sponsorAddressHex,
    $usdAmount,
    $lockAda,
    $lockLovelace,
    $adaUsd,
    $coverageMultiplier,
    $status,
    $description,
    $dueDate,
    $createdAt,
    $lockTxId,
    $lockTxDraftJson,
    $pythPolicyId
  )
`);

const selectAllRequests = db.prepare(`
  SELECT
    id,
    requester_address_hex AS requesterAddressHex,
    sponsor_address_hex AS sponsorAddressHex,
    usd_amount AS usdAmount,
    lock_ada AS lockAda,
    lock_lovelace AS lockLovelace,
    ada_usd AS adaUsd,
    coverage_multiplier AS coverageMultiplier,
    status,
    description,
    due_date AS dueDate,
    created_at AS createdAt,
    lock_tx_id AS lockTxId,
    lock_tx_draft_json AS lockTxDraftJson,
    pyth_policy_id AS pythPolicyId,
    cancel_tx_id AS cancelTxId,
    unlock_tx_id AS unlockTxId
  FROM requests
  ORDER BY created_at DESC
`);

const selectRequestById = db.prepare(`
  SELECT
    id,
    requester_address_hex AS requesterAddressHex,
    sponsor_address_hex AS sponsorAddressHex,
    usd_amount AS usdAmount,
    lock_ada AS lockAda,
    lock_lovelace AS lockLovelace,
    ada_usd AS adaUsd,
    coverage_multiplier AS coverageMultiplier,
    status,
    description,
    due_date AS dueDate,
    created_at AS createdAt,
    lock_tx_id AS lockTxId,
    lock_tx_draft_json AS lockTxDraftJson,
    pyth_policy_id AS pythPolicyId,
    cancel_tx_id AS cancelTxId,
    unlock_tx_id AS unlockTxId
  FROM requests
  WHERE id = $id
  LIMIT 1
`);

const updateRequestCancelled = db.prepare(`
  UPDATE requests
  SET status = $status,
      cancel_tx_id = $cancelTxId
  WHERE id = $id
`);

const updateRequestClaimed = db.prepare(`
  UPDATE requests
  SET status = $status,
      unlock_tx_id = $unlockTxId
  WHERE id = $id
`);

const selectRowsMissingPythPolicyId = db.prepare(`
  SELECT id, lock_tx_draft_json AS lockTxDraftJson
  FROM requests
  WHERE pyth_policy_id IS NULL
`);

const updateRequestPythPolicyId = db.prepare(`
  UPDATE requests
  SET pyth_policy_id = $pythPolicyId
  WHERE id = $id
`);

for (const row of selectRowsMissingPythPolicyId.all() as Array<Record<string, unknown>>) {
  try {
    const draft = JSON.parse(String(row.lockTxDraftJson)) as {
      metadata?: { pythPolicyId?: string };
    };
    const pythPolicyId = draft.metadata?.pythPolicyId;
    if (typeof pythPolicyId === "string" && pythPolicyId.length > 0) {
      updateRequestPythPolicyId.run({
        id: String(row.id),
        pythPolicyId,
      });
    }
  } catch {
    // Ignore malformed historical rows.
  }
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(JSON.stringify(payload));
}

function getRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function toRequestOutput(row: Record<string, unknown>) {
  return {
    id: row.id,
    requesterAddressHex: row.requesterAddressHex,
    sponsorAddressHex: row.sponsorAddressHex,
    usdAmount: row.usdAmount,
    lockAda: row.lockAda,
    lockLovelace: row.lockLovelace,
    adaUsd: row.adaUsd,
    coverageMultiplier: row.coverageMultiplier,
    status: row.status,
    description: row.description,
    dueDate: row.dueDate,
    createdAt: row.createdAt,
    lockTxId: row.lockTxId,
    pythPolicyId: row.pythPolicyId,
    cancelTxId: row.cancelTxId,
    unlockTxId: row.unlockTxId,
    lockTxDraft: JSON.parse(String(row.lockTxDraftJson)),
  };
}

function validateLockPayload(payload: unknown): asserts payload is CreateRequestPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid JSON payload.");
  }
  const lockPayload = payload as CreateRequestPayload;
  if (
    typeof lockPayload.requesterAddressHex !== "string" ||
    lockPayload.requesterAddressHex.length < 10
  ) {
    throw new Error("requesterAddressHex is required.");
  }
  if (typeof lockPayload.usdAmount !== "number" || lockPayload.usdAmount <= 0) {
    throw new Error("usdAmount must be a positive number.");
  }
  if (typeof lockPayload.adaUsd !== "number" || lockPayload.adaUsd <= 0) {
    throw new Error("adaUsd must be a positive number.");
  }
  if (
    lockPayload.coverageMultiplier !== undefined &&
    (typeof lockPayload.coverageMultiplier !== "number" || lockPayload.coverageMultiplier <= 0)
  ) {
    throw new Error("coverageMultiplier must be a positive number.");
  }
}

function validateCreatePayload(payload: unknown): asserts payload is CreateRequestPayload {
  validateLockPayload(payload);
  const createPayload = payload as CreateRequestPayload;
  if (typeof createPayload.description !== "string" || createPayload.description.trim().length === 0) {
    throw new Error("description is required.");
  }
  if (typeof createPayload.dueDate !== "string" || createPayload.dueDate.length < 8) {
    throw new Error("dueDate is required.");
  }
}

function buildLockNumbers(payload: CreateRequestPayload): LockNumbers {
  const coverageMultiplier = payload.coverageMultiplier ?? 2;
  const lockAda = (payload.usdAmount / payload.adaUsd) * coverageMultiplier;
  const lockLovelace = Math.max(1, Math.round(lockAda * 1_000_000));

  return {
    coverageMultiplier,
    lockAda,
    lockLovelace,
  };
}

function usdToCents(usdAmount: number): bigint {
  return BigInt(Math.round(usdAmount * 100));
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function extractErrorCauseMessages(error: unknown): string[] {
  const messages: string[] = [];
  const visited = new Set<unknown>();
  let current: unknown = error;

  while (current !== undefined && current !== null && !visited.has(current)) {
    visited.add(current);

    if (current instanceof Error) {
      if (current.message) {
        messages.push(current.message);
      }
      current = current.cause;
      continue;
    }

    if (typeof current === "object") {
      messages.push(safeStringify(current));
      const maybeCause = (current as { cause?: unknown }).cause;
      if (maybeCause === undefined) {
        break;
      }
      current = maybeCause;
      continue;
    }

    messages.push(String(current));
    break;
  }

  return messages;
}

const server = createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "OPTIONS") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/health") {
      sendJson(res, 200, { ok: true, dbPath });
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/requests") {
      const rows = selectAllRequests.all();
      sendJson(res, 200, { requests: rows.map(toRequestOutput) });
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/lock-transaction") {
      const rawBody = await getRawBody(req);
      const payload = JSON.parse(rawBody || "{}");
      validateLockPayload(payload);
      const { coverageMultiplier, lockAda, lockLovelace } = buildLockNumbers(payload);
      const requestId = randomUUID();

      const lockFlowResult = await executeLockFlow({
        usdAmountCents: usdToCents(payload.usdAmount),
        userAddress: payload.requesterAddressHex,
        lovelaceToLock: BigInt(lockLovelace),
      });

      sendJson(res, 201, {
        requestId,
        coverageMultiplier,
        lockAda,
        lockLovelace,
        lockTxDraft: {
          txId: lockFlowResult.txHash,
          network: "preprod",
          kind: "lock",
          fromAddressHex: payload.requesterAddressHex,
          toScriptAddress: lockFlowResult.scriptAddress,
          amount: {
            lovelace: lockLovelace,
          },
          metadata: {
            requestId,
            usdAmount: payload.usdAmount,
            adaUsd: payload.adaUsd,
            coverageMultiplier,
            pythPolicyId: lockFlowResult.pythPolicyId,
          },
        },
      });
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/requests") {
      const rawBody = await getRawBody(req);
      const payload = JSON.parse(rawBody || "{}");
      validateCreatePayload(payload);
      const { coverageMultiplier, lockAda, lockLovelace } = buildLockNumbers(payload);
      const requestId = randomUUID();

      const lockFlowResult = await executeLockFlow({
        usdAmountCents: usdToCents(payload.usdAmount),
        userAddress: payload.requesterAddressHex,
        lovelaceToLock: BigInt(lockLovelace),
      });

      const lockTxDraft = {
        txId: lockFlowResult.txHash,
        network: "preprod",
        kind: "lock" as const,
        fromAddressHex: payload.requesterAddressHex,
        toScriptAddress: lockFlowResult.scriptAddress,
        amount: {
          lovelace: lockLovelace,
        },
        // tx metadata excludes description and dueDate by design.
        metadata: {
          requestId,
          usdAmount: payload.usdAmount,
          adaUsd: payload.adaUsd,
          coverageMultiplier,
          pythPolicyId: lockFlowResult.pythPolicyId,
        },
      };

      const createdAt = new Date().toISOString();
      insertRequest.run({
        id: requestId,
        requesterAddressHex: payload.requesterAddressHex,
        sponsorAddressHex: payload.sponsorAddressHex ?? lockFlowResult.sponsorAddress,
        usdAmount: payload.usdAmount,
        lockAda,
        lockLovelace,
        adaUsd: payload.adaUsd,
        coverageMultiplier,
        status: "ready_to_claim",
        description: payload.description ?? null,
        dueDate: payload.dueDate ?? null,
        createdAt,
        lockTxId: lockTxDraft.txId,
        lockTxDraftJson: JSON.stringify(lockTxDraft),
        pythPolicyId: lockFlowResult.pythPolicyId,
      });

      sendJson(res, 201, {
        request: {
          id: requestId,
          requesterAddressHex: payload.requesterAddressHex,
          sponsorAddressHex: payload.sponsorAddressHex ?? lockFlowResult.sponsorAddress,
          usdAmount: payload.usdAmount,
          lockAda,
          lockLovelace,
          adaUsd: payload.adaUsd,
          coverageMultiplier,
          status: "ready_to_claim",
          description: payload.description ?? null,
          dueDate: payload.dueDate ?? null,
          createdAt,
          lockTxId: lockTxDraft.txId,
          pythPolicyId: lockFlowResult.pythPolicyId,
        },
        lockTxDraft,
      });
      return;
    }

    if (
      req.method === "POST" &&
      requestUrl.pathname.startsWith("/api/requests/") &&
      requestUrl.pathname.endsWith("/cancel")
    ) {
      const requestId = requestUrl.pathname
        .replace("/api/requests/", "")
        .replace("/cancel", "")
        .replace(/\//g, "");

      if (!requestId) {
        throw new Error("Invalid request id.");
      }

      const row = selectRequestById.get({ id: requestId }) as
        | Record<string, unknown>
        | undefined;
      if (!row) {
        sendJson(res, 404, { error: "Request not found." });
        return;
      }

      const request = toRequestOutput(row) as {
        id: string;
        requesterAddressHex: string;
        sponsorAddressHex?: string | null;
        usdAmount: number;
        pythPolicyId?: string | null;
        status: string;
      };

      if (request.status === "claimed") {
        throw new Error("Claimed requests cannot be cancelled.");
      }
      if (request.status === "cancelled") {
        throw new Error("Request is already cancelled.");
      }

      const cancelResult = await executeCancelFlow({
        usdAmountCents: usdToCents(request.usdAmount),
        userAddress: request.requesterAddressHex,
        pythPolicyId: request.pythPolicyId ?? null,
      });

      updateRequestCancelled.run({
        id: request.id,
        status: "cancelled",
        cancelTxId: cancelResult.txHash,
      });

      sendJson(res, 200, {
        requestId: request.id,
        status: "cancelled",
        cancelTxId: cancelResult.txHash,
      });
      return;
    }

    if (
      req.method === "POST" &&
      requestUrl.pathname.startsWith("/api/requests/") &&
      requestUrl.pathname.endsWith("/claim")
    ) {
      const requestId = requestUrl.pathname
        .replace("/api/requests/", "")
        .replace("/claim", "")
        .replace(/\//g, "");

      if (!requestId) {
        throw new Error("Invalid request id.");
      }

      const row = selectRequestById.get({ id: requestId }) as
        | Record<string, unknown>
        | undefined;
      if (!row) {
        sendJson(res, 404, { error: "Request not found." });
        return;
      }

      const request = toRequestOutput(row) as {
        id: string;
        requesterAddressHex: string;
        sponsorAddressHex?: string | null;
        usdAmount: number;
        lockTxId?: string;
        pythPolicyId?: string | null;
        lockTxDraft?: { toScriptAddress?: string };
        status: string;
      };

      if (request.status === "claimed") {
        throw new Error("Request is already claimed.");
      }
      if (request.status === "cancelled") {
        throw new Error("Cancelled requests cannot be claimed.");
      }
      if (request.status !== "ready_to_claim") {
        throw new Error("Only ready_to_claim requests can be claimed.");
      }

      const unlockResult = await executeUnlockFlow({
        usdAmountCents: usdToCents(request.usdAmount),
        userAddress: request.requesterAddressHex,
        sponsorAddress: request.sponsorAddressHex ?? null,
        pythPolicyId: request.pythPolicyId ?? null,
        expectedScriptAddress: request.lockTxDraft?.toScriptAddress ?? null,
        expectedLockTxId: request.lockTxId ?? null,
      });

      updateRequestClaimed.run({
        id: request.id,
        status: "claimed",
        unlockTxId: unlockResult.txHash,
      });

      sendJson(res, 200, {
        requestId: request.id,
        status: "claimed",
        unlockTxId: unlockResult.txHash,
      });
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    const messages = extractErrorCauseMessages(error);
    sendJson(res, 400, {
      error:
        messages[0] ??
        (error instanceof Error ? error.message : "Unexpected server error."),
      causes: messages.slice(1),
    });
  }
});

const PORT = Number(process.env.PORT ?? 8787);
server.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
  console.log(`SQLite DB: ${dbPath}`);
});
