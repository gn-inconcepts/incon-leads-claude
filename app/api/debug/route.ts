import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return "invalid-url";
  }
}

export async function GET() {
  const url = process.env.CLAUDE_ROUTINE_URL;
  const token = process.env.CLAUDE_ROUTINE_TOKEN;

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      createdAt: true,
      name: true,
      company: true,
      email: true,
      status: true,
      routineSession: true,
      errorMessage: true,
    },
  });

  const counts = await prisma.lead.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  return NextResponse.json(
    {
      config: {
        routineUrlConfigured: !!url,
        routineTokenConfigured: !!token,
        routineHost: safeHost(url),
        tokenPrefix: token ? token.slice(0, 6) + "…" : null,
        fallbackMailConfigured:
          !!process.env.RESEND_API_KEY && !!process.env.NOTIFICATION_EMAIL,
        notificationEmail: process.env.NOTIFICATION_EMAIL ?? null,
      },
      counts: Object.fromEntries(
        counts.map((c) => [c.status, c._count._all])
      ),
      recentLeads: leads,
      hint: "POST /api/debug/ping um die Routine mit einem Test-Payload zu triggern (ohne DB-Eintrag).",
    },
    {
      headers: { "cache-control": "no-store" },
    }
  );
}
