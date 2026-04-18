import { log } from "./logger";

export type RoutineFireInput = {
  leadId: string;
  text: string;
};

export type RoutineResponse = {
  ok: boolean;
  sessionUrl?: string;
  status?: number;
  error?: string;
  responseBody?: string;
  attempts: number;
};

const MAX_ATTEMPTS = 3;
const RESPONSE_LOG_LIMIT = 2000;
const ANTHROPIC_VERSION = "2023-06-01";
const ANTHROPIC_BETA = "experimental-cc-routine-2026-04-01";

function truncate(s: string | undefined, max: number): string | undefined {
  if (!s) return s;
  if (s.length <= max) return s;
  return s.slice(0, max) + `… [truncated ${s.length - max} chars]`;
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "invalid-url";
  }
}

export async function fireRoutine(
  input: RoutineFireInput
): Promise<RoutineResponse> {
  const url = process.env.CLAUDE_ROUTINE_URL;
  const token = process.env.CLAUDE_ROUTINE_TOKEN;

  if (!url || !token) {
    log.error("routine.config.missing", {
      leadId: input.leadId,
      hasUrl: !!url,
      hasToken: !!token,
      hint: "Set CLAUDE_ROUTINE_URL and CLAUDE_ROUTINE_TOKEN in Railway env",
    });
    return {
      ok: false,
      error: "CLAUDE_ROUTINE_URL oder CLAUDE_ROUTINE_TOKEN fehlt",
      attempts: 0,
    };
  }

  const bodyStr = JSON.stringify({ text: input.text });
  const host = safeHost(url);

  let lastError: string | undefined;
  let lastStatus: number | undefined;
  let lastBody: string | undefined;
  let attempt = 0;

  for (attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    log.info("routine.forward.start", {
      leadId: input.leadId,
      attempt,
      host,
      tokenPrefix: token.slice(0, 6) + "…",
      bodyBytes: bodyStr.length,
      textChars: input.text.length,
    });

    const startedAt = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "anthropic-version": ANTHROPIC_VERSION,
          "anthropic-beta": ANTHROPIC_BETA,
          "User-Agent": "inconcepts-lead-testform/1.0",
        },
        body: bodyStr,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const durationMs = Date.now() - startedAt;
      lastStatus = res.status;
      lastBody = await res.text().catch(() => "");

      const contentType = res.headers.get("content-type") ?? "";

      log.info("routine.forward.response", {
        leadId: input.leadId,
        attempt,
        status: res.status,
        durationMs,
        contentType,
        bodyBytes: lastBody.length,
        bodyPreview: truncate(lastBody, RESPONSE_LOG_LIMIT),
      });

      if (res.ok) {
        const sessionUrl = extractSessionUrl(lastBody);
        if (!sessionUrl) {
          log.warn("routine.sessionurl.missing", {
            leadId: input.leadId,
            attempt,
            status: res.status,
            bodyPreview: truncate(lastBody, RESPONSE_LOG_LIMIT),
          });
        } else {
          log.info("routine.forward.success", {
            leadId: input.leadId,
            attempt,
            status: res.status,
            sessionUrl,
            durationMs,
          });
        }
        return {
          ok: true,
          sessionUrl,
          status: res.status,
          responseBody: lastBody,
          attempts: attempt,
        };
      }

      lastError = `HTTP ${res.status}`;
      log.warn("routine.forward.bad_status", {
        leadId: input.leadId,
        attempt,
        status: res.status,
        durationMs,
        bodyPreview: truncate(lastBody, RESPONSE_LOG_LIMIT),
      });

      if (res.status < 500 && res.status !== 429) {
        return {
          ok: false,
          status: res.status,
          error: lastError,
          responseBody: lastBody,
          attempts: attempt,
        };
      }
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      lastError = err instanceof Error ? err.message : String(err);
      const isAbort =
        err instanceof Error &&
        (err.name === "AbortError" || err.message.includes("aborted"));
      log.error("routine.forward.exception", {
        leadId: input.leadId,
        attempt,
        durationMs,
        error: lastError,
        errorName: err instanceof Error ? err.name : undefined,
        cause:
          err instanceof Error && err.cause instanceof Error
            ? err.cause.message
            : undefined,
        timeout: isAbort,
      });
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(300 * attempt);
    }
  }

  return {
    ok: false,
    status: lastStatus,
    error: lastError ?? "unknown",
    responseBody: lastBody,
    attempts: attempt - 1,
  };
}

function extractSessionUrl(body: string): string | undefined {
  if (!body) return undefined;
  try {
    const data = JSON.parse(body) as Record<string, unknown>;
    const candidates = [
      data.sessionUrl,
      data.session_url,
      data.url,
      (data.session as Record<string, unknown> | undefined)?.url,
      (data.session as Record<string, unknown> | undefined)?.sessionUrl,
      (data.data as Record<string, unknown> | undefined)?.sessionUrl,
      (data.data as Record<string, unknown> | undefined)?.session_url,
      (data.data as Record<string, unknown> | undefined)?.url,
      (data.run as Record<string, unknown> | undefined)?.url,
      (data.routine as Record<string, unknown> | undefined)?.session_url,
    ];
    for (const c of candidates) {
      if (typeof c === "string" && /^https?:\/\//.test(c)) return c;
    }
  } catch {
    const match = body.match(/https?:\/\/[^\s"'<>]+/);
    if (match) return match[0];
  }
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type LeadBriefing = {
  leadId: string;
  name: string;
  company: string;
  email: string;
  phone?: string | null;
  message: string;
  createdAt: Date;
  source: string;
};

export function buildLeadBriefing(lead: LeadBriefing): string {
  return [
    "Neuer Lead aus dem Website-Kontaktformular. Bitte anreichern und in Zoho CRM + Notion ablegen.",
    "",
    `Lead-ID: ${lead.leadId}`,
    `Eingegangen: ${lead.createdAt.toISOString()}`,
    `Quelle: ${lead.source}`,
    "",
    `Name: ${lead.name}`,
    `Firma: ${lead.company}`,
    `Email: ${lead.email}`,
    `Telefon: ${lead.phone ?? "-"}`,
    "",
    "Nachricht:",
    lead.message,
  ].join("\n");
}
