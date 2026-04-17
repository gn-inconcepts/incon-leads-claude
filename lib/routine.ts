import { log } from "./logger";

export type RoutinePayload = {
  leadId: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  message: string;
  source: string;
  timestamp: string;
};

export type RoutineResponse = {
  ok: boolean;
  sessionUrl?: string;
  status?: number;
  error?: string;
};

const MAX_ATTEMPTS = 3;

export async function forwardToRoutine(
  payload: RoutinePayload
): Promise<RoutineResponse> {
  const url = process.env.CLAUDE_ROUTINE_URL;
  const token = process.env.CLAUDE_ROUTINE_TOKEN;

  if (!url || !token) {
    log.warn("routine.config.missing", { leadId: payload.leadId });
    return { ok: false, error: "Routine nicht konfiguriert" };
  }

  let lastError: string | undefined;
  let lastStatus: number | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "inconcepts-lead-testform/1.0",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      lastStatus = res.status;

      if (res.ok) {
        const sessionUrl = await extractSessionUrl(res);
        log.info("routine.forward.success", {
          leadId: payload.leadId,
          attempt,
          status: res.status,
          sessionUrl,
        });
        return { ok: true, sessionUrl, status: res.status };
      }

      lastError = `HTTP ${res.status}`;
      log.warn("routine.forward.bad_status", {
        leadId: payload.leadId,
        attempt,
        status: res.status,
      });

      if (res.status < 500 && res.status !== 429) {
        return { ok: false, status: res.status, error: lastError };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      log.warn("routine.forward.exception", {
        leadId: payload.leadId,
        attempt,
        error: lastError,
      });
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(300 * attempt);
    }
  }

  return { ok: false, status: lastStatus, error: lastError ?? "unknown" };
}

async function extractSessionUrl(res: Response): Promise<string | undefined> {
  try {
    const data = (await res.clone().json()) as Record<string, unknown>;
    const candidates = [
      data.sessionUrl,
      data.session_url,
      data.url,
      (data.session as Record<string, unknown> | undefined)?.url,
    ];
    for (const c of candidates) {
      if (typeof c === "string" && c.startsWith("http")) return c;
    }
  } catch {
    // non-json response or malformed
  }
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
