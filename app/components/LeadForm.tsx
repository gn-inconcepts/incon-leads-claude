"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { leadSchema, fieldLabels } from "@/lib/validation";

type FieldErrors = Partial<Record<string, string>>;
type FormValues = {
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
  website: string;
};

const INITIAL: FormValues = {
  name: "",
  company: "",
  email: "",
  phone: "",
  message: "",
  consent: false,
  website: "",
};

export default function LeadForm() {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key as string]) {
      setErrors((e) => ({ ...e, [key]: undefined }));
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError(null);

    const parsed = leadSchema.safeParse(values);
    if (!parsed.success) {
      const flat: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !flat[key]) {
          flat[key] = issue.message;
        }
      }
      setErrors(flat);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.status === 429) {
        setGlobalError(
          "Zu viele Anfragen von dieser IP. Bitte versuche es später erneut."
        );
        return;
      }

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        sessionUrl?: string;
        errors?: FieldErrors;
        error?: string;
      };

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setGlobalError(
            data.error ??
              "Wir konnten deine Anfrage gerade nicht verarbeiten. Bitte versuche es erneut."
          );
        }
        return;
      }

      const params = new URLSearchParams();
      if (data.sessionUrl) params.set("session", data.sessionUrl);
      const qs = params.toString();
      router.push(`/danke${qs ? `?${qs}` : ""}`);
    } catch {
      setGlobalError("Netzwerkfehler. Bitte versuche es erneut.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {/* Honeypot: visually hidden, ignored by real users */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-10000px",
          top: "auto",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(e) => update("website", e.target.value)}
          />
        </label>
      </div>

      <div>
        <label htmlFor="name" className="field-label">
          {fieldLabels.name} <span className="text-brand-primary">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          className="field-input"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          disabled={submitting}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && (
          <p id="name-error" className="field-error">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="company" className="field-label">
          {fieldLabels.company} <span className="text-brand-primary">*</span>
        </label>
        <input
          id="company"
          name="company"
          type="text"
          autoComplete="organization"
          required
          className="field-input"
          value={values.company}
          onChange={(e) => update("company", e.target.value)}
          disabled={submitting}
          aria-invalid={!!errors.company}
          aria-describedby={errors.company ? "company-error" : undefined}
        />
        {errors.company && (
          <p id="company-error" className="field-error">
            {errors.company}
          </p>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="email" className="field-label">
            {fieldLabels.email} <span className="text-brand-primary">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="field-input"
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
            disabled={submitting}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" className="field-error">
              {errors.email}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="phone" className="field-label">
            {fieldLabels.phone}
            <span className="ml-1 text-xs font-normal text-brand-muted">
              (optional)
            </span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className="field-input"
            value={values.phone}
            onChange={(e) => update("phone", e.target.value)}
            disabled={submitting}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
          {errors.phone && (
            <p id="phone-error" className="field-error">
              {errors.phone}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="message" className="field-label">
          {fieldLabels.message} <span className="text-brand-primary">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          minLength={20}
          className="field-input resize-y"
          value={values.message}
          onChange={(e) => update("message", e.target.value)}
          disabled={submitting}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "message-error" : "message-hint"}
        />
        {errors.message ? (
          <p id="message-error" className="field-error">
            {errors.message}
          </p>
        ) : (
          <p id="message-hint" className="mt-1.5 text-xs text-brand-muted">
            Mindestens 20 Zeichen.
          </p>
        )}
      </div>

      <div>
        <label className="flex items-start gap-3 text-sm text-brand-ink">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-accent"
            checked={values.consent}
            onChange={(e) => update("consent", e.target.checked)}
            disabled={submitting}
            aria-invalid={!!errors.consent}
          />
          <span>
            Ich bin damit einverstanden, dass meine Angaben zur Bearbeitung
            meiner Anfrage verarbeitet werden.{" "}
            <span className="text-brand-primary">*</span>
          </span>
        </label>
        {errors.consent && <p className="field-error">{errors.consent}</p>}
      </div>

      {globalError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {globalError}
        </div>
      )}

      <div className="pt-2">
        <button type="submit" className="btn-primary w-full md:w-auto" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner />
              Wird gesendet…
            </>
          ) : (
            "Anfrage senden"
          )}
        </button>
      </div>
    </form>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
