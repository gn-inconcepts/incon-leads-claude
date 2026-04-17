# inconcepts Lead-Formular

Minimales, produktions-taugliches Lead-Formular für die Live-Demo. Besucher trägt seine Daten ein, der Next.js-Server leitet die Submission an eine Claude Code Routine weiter, die den Lead in Zoho CRM + Notion ablegt.

**Wichtig:** der Routine-Token liegt ausschließlich serverseitig — das Frontend ruft nur die eigene `/api/lead`-Route auf.

## Stack

- Next.js 15 (App Router) · TypeScript · TailwindCSS
- Prisma + PostgreSQL (Railway)
- Zod für Validierung
- Resend (optional) für Fallback-Mails
- In-Memory Rate-Limit (3 Requests / IP / Stunde)

## Projekt-Layout

```
app/
  page.tsx              Startseite mit Formular (Server Component)
  danke/page.tsx        Bestätigungsseite (liest session-URL aus Query)
  admin/page.tsx        Read-only Leads-Liste (Basic Auth via middleware)
  api/lead/route.ts     POST-Endpoint
  components/LeadForm.tsx   Client-Component mit State + Submit
lib/
  db.ts                 Prisma-Singleton
  validation.ts         Zod-Schema (Client + Server)
  ratelimit.ts          In-Memory Rate Limit
  routine.ts            Forward an Claude Routine inkl. Retry
  mail.ts               Resend-Fallback
  logger.ts             strukturiertes JSON-Logging für Railway
prisma/
  schema.prisma         Leads-Tabelle
  seed.ts               Demo-Lead (Maria Huber, Huber Consulting)
middleware.ts           Basic Auth für /admin
```

## Setup — lokal

1. Dependencies installieren
   ```bash
   npm install
   ```

2. ENV Vars anlegen
   ```bash
   cp .env.example .env
   # Werte eintragen (siehe unten)
   ```

3. Datenbank initialisieren
   ```bash
   npm run db:push      # Schema an DB pushen (Dev)
   npm run db:seed      # Demo-Lead für Präsentation
   ```

4. Dev-Server starten
   ```bash
   npm run dev
   ```

   → http://localhost:3000

## Environment Variables

| Variable                | Zweck                                                  | Pflicht |
| ----------------------- | ------------------------------------------------------ | ------- |
| `DATABASE_URL`          | PostgreSQL Connection String                           | ja      |
| `CLAUDE_ROUTINE_URL`    | Volle URL der Claude-Routine                           | ja\*    |
| `CLAUDE_ROUTINE_TOKEN`  | Bearer Token der Routine                               | ja\*    |
| `RESEND_API_KEY`        | für Fallback-Mails wenn Routine ausfällt               | nein    |
| `NOTIFICATION_EMAIL`    | Empfänger für Fallback-Mail (z. B. vertrieb@…)         | nein    |
| `NOTIFICATION_FROM`     | Absender der Fallback-Mail (default: leads@inconcepts.at) | nein |
| `ADMIN_USER` / `ADMIN_PASS` | Basic-Auth für `/admin`                            | nein    |

\* Ohne `CLAUDE_ROUTINE_URL` / `CLAUDE_ROUTINE_TOKEN` wird der Lead nur lokal in der DB gespeichert (Status `FAILED`). Das Formular bleibt funktional — nützlich für Tests ohne echte Routine.

## Deployment auf Railway

1. **Neues Service im Workspace** anlegen → "Deploy from GitHub repo" wählen, dieses Repo verknüpfen.

2. **PostgreSQL hinzufügen** (Right-Click auf Projekt → "New" → "Database" → "PostgreSQL"). Railway erzeugt automatisch `DATABASE_URL`.

3. **Environment Variables** im Service setzen:
   - `DATABASE_URL` → via `${{Postgres.DATABASE_URL}}` referenzieren
   - `CLAUDE_ROUTINE_URL`
   - `CLAUDE_ROUTINE_TOKEN`
   - (optional) `RESEND_API_KEY`, `NOTIFICATION_EMAIL`
   - (optional) `ADMIN_USER`, `ADMIN_PASS`

4. **Build-Command** ist default ok (`npm run build` — triggert `prisma generate` + `next build`).

5. **Erste Migration** nach Deploy:
   ```bash
   railway run npm run db:push
   railway run npm run db:seed   # optional für Demo
   ```
   Alternativ in der Railway UI unter "Deploy" → Shell öffnen.

6. **Custom Domain** zuweisen (z. B. `demo.inconcepts.at`) oder die Railway-URL nutzen.

## Test — curl

Die API-Route direkt aufrufen (lokal):

```bash
curl -X POST http://localhost:3000/api/lead \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maria Huber",
    "company": "Huber Consulting",
    "email": "maria.huber@huber-consulting.at",
    "phone": "+43 660 1234567",
    "message": "Hallo inconcepts, wir suchen Unterstützung bei der Lead-Automatisierung. Freue mich auf ein Gespräch.",
    "consent": true,
    "website": ""
  }'
```

Erwartete Antwort (Routine erreichbar):
```json
{"ok":true,"leadId":"cl…","sessionUrl":"https://…"}
```

Honeypot-Test (Bot-Simulation — kein DB-Write, kein Forward):
```bash
curl -X POST http://localhost:3000/api/lead \
  -H "Content-Type: application/json" \
  -d '{"website":"http://spam.example","name":"","company":"","email":"","message":"","consent":true}'
# → {"ok":true}
```

## Logs

Strukturiert als JSON (Railway parst das direkt). Relevante Events:

| Event                     | Level | Bedeutung                                      |
| ------------------------- | ----- | ---------------------------------------------- |
| `lead.created`            | info  | Lead in DB gespeichert                         |
| `lead.honeypot.hit`       | warn  | Bot-Submission geblockt                        |
| `lead.ratelimit.blocked`  | warn  | IP hat Limit erreicht                          |
| `routine.forward.success` | info  | Routine hat den Lead akzeptiert                |
| `routine.forward.bad_status` / `routine.forward.exception` | warn | Retry läuft |
| `lead.routine.failed`     | warn  | alle Retries fehlgeschlagen → Fallback-Mail    |
| `mail.fallback.sent`      | info  | Fallback-Mail an Vertrieb verschickt           |

## Sicherheitshinweise

- Routine-Token nur serverseitig, nie in Client-Components.
- Honeypot + Rate-Limit mildern einfache Spam/Bot-Angriffe.
- `/admin` ist Basic-Auth geschützt via `middleware.ts`.
- Robots-Tag auf noindex (siehe `app/layout.tsx`) — die Seite ist für die Demo, nicht fürs SEO.
- DSGVO-Checkbox wird serverseitig erzwungen (Zod `.literal(true)`).

## Known Limitations (bewusst)

- Rate-Limit ist in-memory → bei mehreren Replicas auf Railway nicht geteilt. Für Demo ok; produktiv Upstash Ratelimit einsetzen.
- Keine Sessions, kein Login für User — der Lead ist anonym.
- Keine automatische DB-Migration beim Deploy; `db:push` einmalig manuell ausführen.
