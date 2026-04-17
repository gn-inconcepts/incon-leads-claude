import LeadForm from "./components/LeadForm";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 md:py-24">
      <header className="mb-10">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-brand-accent" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary">
            inconcepts
          </span>
        </div>
        <h1 className="mt-6 text-4xl font-bold leading-tight text-brand-ink md:text-5xl">
          Lass uns reden.
        </h1>
        <p className="mt-4 text-lg text-brand-muted">
          Kurz Kontaktdaten hinterlassen, wir melden uns innerhalb von 24h.
        </p>
      </header>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-brand md:p-8">
        <LeadForm />
      </section>

      <footer className="mt-10 text-center text-xs text-brand-muted">
        © {new Date().getFullYear()} inconcepts · Deine Daten werden
        ausschließlich zur Kontaktaufnahme verwendet.
      </footer>
    </main>
  );
}
