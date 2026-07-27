export interface PythToken {
  access_token: string;
  expires_at: string;
  token_type?: string;
}

let cached: PythToken | undefined;
let inflight: Promise<PythToken> | undefined;
let mintCount = 0;

const SAFETY_MARGIN_MS = 30_000;

function isFresh(token: PythToken): boolean {
  return Date.parse(token.expires_at) - Date.now() > SAFETY_MARGIN_MS;
}

async function mintToken(): Promise<PythToken> {
  const response = await fetch("/api/pyth-token", { method: "POST" });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Failed to mint Pyth token: ${response.status} ${response.statusText}${
        detail ? ` (${detail})` : ""
      }`,
    );
  }

  cached = (await response.json()) as PythToken;
  mintCount += 1;
  return cached;
}

export interface TokenStatus {
  expiresAt: string | undefined;
  isFresh: boolean;
  mintCount: number;
}

// Read-only snapshot of the cache, used by the in-page auth-flow explainer.
export function getTokenStatus(): TokenStatus {
  return {
    expiresAt: cached?.expires_at,
    isFresh: cached !== undefined && isFresh(cached),
    mintCount,
  };
}

export async function getPythToken(): Promise<string> {
  if (cached && isFresh(cached)) {
    return cached.access_token;
  }

  // Share one in-flight mint across concurrent callers (e.g. several charts
  // mounting at once) so a page load performs a single upstream mint.
  if (!inflight) {
    inflight = mintToken().finally(() => {
      inflight = undefined;
    });
  }
  const token = await inflight;
  return token.access_token;
}

export function invalidatePythToken(): void {
  cached = undefined;
}
