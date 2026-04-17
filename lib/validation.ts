import { z } from "zod";

export const leadSchema = z.object({
  name: z
    .string({ required_error: "Name ist erforderlich" })
    .trim()
    .min(2, "Bitte gib deinen vollständigen Namen ein")
    .max(120, "Name zu lang"),
  company: z
    .string({ required_error: "Firma ist erforderlich" })
    .trim()
    .min(2, "Bitte gib deine Firma ein")
    .max(160, "Firmenname zu lang"),
  email: z
    .string({ required_error: "Email ist erforderlich" })
    .trim()
    .email("Bitte eine gültige Email-Adresse eingeben")
    .max(200, "Email zu lang"),
  phone: z
    .string()
    .trim()
    .max(40, "Telefonnummer zu lang")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  message: z
    .string({ required_error: "Nachricht ist erforderlich" })
    .trim()
    .min(20, "Bitte beschreibe dein Anliegen in mind. 20 Zeichen")
    .max(5000, "Nachricht zu lang"),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Bitte Datenschutz bestätigen" }),
  }),
  website: z.string().max(0, "invalid").optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const fieldLabels: Record<string, string> = {
  name: "Name",
  company: "Firma",
  email: "Email",
  phone: "Telefon",
  message: "Nachricht",
  consent: "Datenschutz",
};
