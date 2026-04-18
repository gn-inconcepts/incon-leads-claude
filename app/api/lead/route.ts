import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { leadSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/ratelimit";
import { forwardToRoutine } from "@/lib/routine";
import { sendFallbackMail } from "@/lib/mail";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ungültiges JSON" },
      { status: 400 }
    );
  }

  const honeypot =
    typeof body === "object" &&
    body !== null &&
    typeof (body as Record<string, unknown>).website === "string" &&
    ((body as Record<string, unknown>).website as string).length > 0;

  if (honeypot) {
    log.warn("lead.honeypot.hit", { ip: getClientIp(req) });
    return NextResponse.json({ ok: true });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !errors[key]) {
        errors[key] = issue.message;
      }
    }
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    log.warn("lead.ratelimit.blocked", { ip, resetAt: rl.resetAt });
    return NextResponse.json(
      { ok: false, error: "Zu viele Anfragen. Bitte später erneut versuchen." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((rl.resetAt - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  const userAgent = req.headers.get("user-agent") ?? undefined;

  const lead = await prisma.lead.create({
    data: {
      name: parsed.data.name,
      company: parsed.data.company,
      email: parsed.data.email,
      phone: parsed.data.phone,
      message: parsed.data.message,
      source: "website-contact-form",
      ip,
      userAgent,
      status: "RECEIVED",
    },
  });

  log.info("lead.created", { leadId: lead.id, ip });

  const routine = await forwardToRoutine({
    leadId: lead.id,
    name: lead.name,
    company: lead.company,
    email: lead.email,
    phone: lead.phone ?? undefined,
    message: lead.message,
    source: lead.source,
    timestamp: lead.createdAt.toISOString(),
  });

  const debugInfo = buildDebugInfo(routine);

  if (routine.ok) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: "FORWARDED",
        routineSession: routine.sessionUrl ?? null,
        errorMessage: routine.sessionUrl ? null : debugInfo,
      },
    });

    return NextResponse.json({
      ok: true,
      leadId: lead.id,
      sessionUrl: routine.sessionUrl,
    });
  }

  const mailed = await sendFallbackMail({
    id: lead.id,
    name: lead.name,
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    message: lead.message,
    createdAt: lead.createdAt,
    errorMessage: routine.error,
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: mailed ? "FALLBACK_MAIL" : "FAILED",
      errorMessage: debugInfo,
    },
  });

  log.warn("lead.routine.failed", {
    leadId: lead.id,
    status: routine.status,
    attempts: routine.attempts,
    error: routine.error,
    fallbackMail: mailed,
  });

  return NextResponse.json({ ok: true, leadId: lead.id });
}

function buildDebugInfo(r: {
  status?: number;
  error?: string;
  responseBody?: string;
  attempts: number;
}): string {
  const parts = [
    `attempts=${r.attempts}`,
    r.status ? `status=${r.status}` : "status=none",
    r.error ? `error=${r.error}` : "",
  ].filter(Boolean);
  let info = parts.join(" | ");
  if (r.responseBody) {
    const body =
      r.responseBody.length > 1500
        ? r.responseBody.slice(0, 1500) + "…"
        : r.responseBody;
    info += `\n--- response ---\n${body}`;
  }
  return info;
}
