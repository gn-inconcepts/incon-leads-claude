import { NextResponse } from "next/server";
import { fireRoutine } from "@/lib/routine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const leadId = "DEBUG-PING-" + Date.now();
  const text = [
    "Debug-Ping aus /api/debug/ping.",
    "Keine echten Aktionen auslösen — das ist nur ein Connection-Test.",
    "",
    `Lead-ID: ${leadId}`,
    `Zeit: ${new Date().toISOString()}`,
  ].join("\n");

  const result = await fireRoutine({ leadId, text });

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
