"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        level: "error",
        event: "app.error_boundary",
        ts: new Date().toISOString(),
        digest: error.digest,
        message: error.message,
      })
    );
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold text-brand-ink">
        Hoppla — da ist etwas schiefgelaufen.
      </h1>
      <p className="mt-3 text-brand-muted">
        Wir haben den Fehler protokolliert. Bitte versuche es erneut.
      </p>
      <div className="mt-8 flex gap-3">
        <button onClick={reset} className="btn-primary">
          Nochmal versuchen
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-xl border-2 border-brand-primary px-6 py-3 font-semibold text-brand-primary hover:bg-brand-primary/5"
        >
          Zur Startseite
        </Link>
      </div>
    </main>
  );
}
