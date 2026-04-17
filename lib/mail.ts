import { Resend } from "resend";
import { log } from "./logger";

type FallbackLead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string | null;
  message: string;
  createdAt: Date;
  errorMessage?: string;
};

export async function sendFallbackMail(lead: FallbackLead): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFICATION_EMAIL;
  const from = process.env.NOTIFICATION_FROM ?? "leads@inconcepts.at";

  if (!apiKey || !to) {
    log.warn("mail.fallback.skipped", {
      reason: "RESEND_API_KEY or NOTIFICATION_EMAIL not configured",
      leadId: lead.id,
    });
    return false;
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to,
      subject: `[Fallback] Neuer Lead: ${lead.name} (${lead.company})`,
      text: buildPlainBody(lead),
    });

    if (result.error) {
      log.error("mail.fallback.failed", {
        leadId: lead.id,
        error: result.error.message,
      });
      return false;
    }

    log.info("mail.fallback.sent", { leadId: lead.id, messageId: result.data?.id });
    return true;
  } catch (err) {
    log.error("mail.fallback.exception", {
      leadId: lead.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

function buildPlainBody(lead: FallbackLead): string {
  return [
    "Die Claude-Routine konnte nicht erreicht werden.",
    "Bitte manuell in Zoho + Notion anlegen.",
    "",
    `Lead-ID: ${lead.id}`,
    `Zeitpunkt: ${lead.createdAt.toISOString()}`,
    `Name: ${lead.name}`,
    `Firma: ${lead.company}`,
    `Email: ${lead.email}`,
    `Telefon: ${lead.phone ?? "-"}`,
    "",
    "Nachricht:",
    lead.message,
    "",
    lead.errorMessage ? `Fehler: ${lead.errorMessage}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
