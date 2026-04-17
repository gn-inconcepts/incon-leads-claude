import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  RECEIVED: "bg-gray-100 text-gray-700",
  FORWARDED: "bg-emerald-50 text-emerald-700",
  FALLBACK_MAIL: "bg-amber-50 text-amber-700",
  FAILED: "bg-red-50 text-red-700",
};

export default async function AdminPage() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-brand-ink">Leads · letzte 20</h1>
        <p className="text-sm text-brand-muted">
          Read-only Auszug aus der Railway-Datenbank.
        </p>
      </header>

      {leads.length === 0 ? (
        <p className="rounded-xl border border-gray-100 bg-white p-6 text-brand-muted">
          Noch keine Leads.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-brand-muted">
              <tr>
                <th className="px-4 py-3">Zeit</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Firma</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-brand-muted">
                    {lead.createdAt.toISOString().replace("T", " ").slice(0, 16)}
                  </td>
                  <td className="px-4 py-3 font-medium text-brand-ink">
                    {lead.name}
                  </td>
                  <td className="px-4 py-3">{lead.company}</td>
                  <td className="px-4 py-3">
                    <a
                      className="text-brand-primary underline-offset-4 hover:underline"
                      href={`mailto:${lead.email}`}
                    >
                      {lead.email}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${
                        STATUS_STYLE[lead.status] ?? STATUS_STYLE.RECEIVED
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {lead.routineSession ? (
                      <a
                        className="text-brand-primary underline-offset-4 hover:underline"
                        href={lead.routineSession}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        öffnen ↗
                      </a>
                    ) : (
                      <span className="text-brand-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
