import { NextResponse } from "next/server";
import { forwardToRoutine } from "@/lib/routine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const result = await forwardToRoutine({
    leadId: "DEBUG-PING-" + Date.now(),
    name: "Debug Ping",
    company: "inconcepts (debug)",
    email: "debug@inconcepts.at",
    phone: undefined,
    message:
      "Dies ist ein Test-Ping aus /api/debug/ping — bitte keine echten Schritte auslösen.",
    source: "debug-ping",
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(
    {
      ok: result.ok,
      attempts: result.attempts,
      status: result.status ?? null,
      sessionUrl: result.sessionUrl ?? null,
      error: result.error ?? null,
      responseBody: result.responseBody
        ? result.responseBody.length > 4000
          ? result.responseBody.slice(0, 4000) + "…"
          : result.responseBody
        : null,
    },
    {
      status: result.ok ? 200 : 502,
      headers: { "cache-control": "no-store" },
    }
  );
}
