export interface PythToken {
  access_token: string;
  expires_at: string;
  token_type?: string;
}

let cached: PythToken | undefined;

const SAFETY_MARGIN_MS = 30_000;

function isFresh(token: PythToken): boolean {
  return Date.parse(token.expires_at) - Date.now() > SAFETY_MARGIN_MS;
}

export async function getPythToken(): Promise<string> {
  if (cached && isFresh(cached)) {
    return cached.access_token;
  }

  const response = await fetch("/api/pyth-token", { method: "POST" });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Failed to mint Pyth token: ${response.status} ${response.statusText}${
        detail ? ` — ${detail}` : ""
      }`,
    );
  }

  cached = (await response.json()) as PythToken;
  return cached.access_token;
}

export function invalidatePythToken(): void {
  cached = undefined;
}
