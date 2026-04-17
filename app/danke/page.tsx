import Link from "next/link";

type Props = {
  searchParams: Promise<{ session?: string }>;
};

function isSafeSessionUrl(raw: string | undefined): raw is string {
  if (!raw) return false;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export default async function DankePage({ searchParams }: Props) {
  const params = await searchParams;
  const sessionUrl = isSafeSessionUrl(params.session) ? params.session : null;

  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-brand-accent" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary">
          inconcepts
        </span>
      </div>

      <h1 className="mt-6 text-4xl font-bold leading-tight text-brand-ink">
        Danke, deine Anfrage ist angekommen.
      </h1>
      <p className="mt-4 text-lg text-brand-muted">
        Claude bereitet gerade ein Briefing für unseren Vertrieb vor.
      </p>

      {sessionUrl && (
        <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-brand">
          <p className="text-sm font-medium text-brand-ink">
            Live-Demo: laufende Claude-Session
          </p>
          <a
            href={sessionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 break-all text-sm font-medium text-brand-primary underline-offset-4 hover:underline"
          >
            {sessionUrl}
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M7 17L17 7M17 7H8M17 7V16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      )}

      <div className="mt-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-primary underline-offset-4 hover:underline"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Zurück zur Startseite
        </Link>
      </div>
    </main>
  );
}
