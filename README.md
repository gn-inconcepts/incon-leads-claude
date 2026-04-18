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

## Logs & Debugging

Strukturiert als JSON (Railway parst das direkt). Relevante Events:

| Event                        | Level | Bedeutung                                                         |
| ---------------------------- | ----- | ----------------------------------------------------------------- |
| `lead.created`               | info  | Lead in DB gespeichert                                            |
| `lead.honeypot.hit`          | warn  | Bot-Submission geblockt                                           |
| `lead.ratelimit.blocked`     | warn  | IP hat Limit erreicht                                             |
| `routine.config.missing`     | error | `CLAUDE_ROUTINE_URL`/`TOKEN` fehlt in ENV                         |
| `routine.forward.start`      | info  | Request abgeschickt (host, token-präfix, bodyBytes, attempt)      |
| `routine.forward.response`   | info  | Antwort erhalten (status, durationMs, contentType, bodyPreview)   |
| `routine.forward.bad_status` | warn  | Nicht-2xx-Response (bodyPreview im Log)                           |
| `routine.forward.exception`  | error | Fetch geworfen (Timeout, DNS, TLS — `timeout`-Flag + `cause`)     |
| `routine.sessionurl.missing` | warn  | 2xx-Response, aber keine Session-URL extrahierbar                 |
| `routine.forward.success`    | info  | Routine hat akzeptiert + Session-URL extrahiert                   |
| `lead.routine.failed`        | warn  | alle Retries fehlgeschlagen → Fallback-Mail                       |
| `mail.fallback.sent`         | info  | Fallback-Mail an Vertrieb verschickt                              |

### Debug-Endpoints (Basic Auth: `ADMIN_USER`/`ADMIN_PASS`)

**`GET /api/debug`** — Config-Status + letzte 5 Leads mit vollem Fehler-Dump:

```bash
curl -u "$ADMIN_USER:$ADMIN_PASS" https://<deine-url>/api/debug | jq
```

Zeigt u.a.:
- ob `CLAUDE_ROUTINE_URL`/`TOKEN` gesetzt sind (inkl. Host + Token-Präfix, niemals der ganze Token)
- Status-Counts (`RECEIVED` / `FORWARDED` / `FALLBACK_MAIL` / `FAILED`)
- letzte 5 Leads mit `errorMessage` (enthält bei Fehlern den gespeicherten Response-Body)

**`POST /api/debug/ping`** — feuert einen Test-Payload direkt gegen die Routine (**kein DB-Eintrag, kein Mail-Fallback**). Der ideale erste Check:

```bash
curl -u "$ADMIN_USER:$ADMIN_PASS" -X POST https://<deine-url>/api/debug/ping | jq
```

Antwort:
```json
{
  "ok": false,
  "attempts": 3,
  "status": 401,
  "sessionUrl": null,
  "error": "HTTP 401",
  "responseBody": "{\"error\":\"invalid token\"}"
}
```
→ jetzt weißt du exakt ob's an URL, Token, Response-Format oder Timeout liegt.

### Debug-Checkliste wenn "Routine wird nicht getriggert"

1. **Railway-Logs öffnen** → filter auf `routine.forward.start` — kommt der Request überhaupt raus?
   - nein → check `routine.config.missing` → ENV fehlt, oder `lead.created` fehlt → Request kam nicht bis zur API
   - ja → weiter

2. **`POST /api/debug/ping`** ausführen — reproduziert das Problem isoliert ohne DB/Mail-Noise.

3. In den Logs nach dem Lead-ID suchen:
   - `routine.forward.response` mit `status: 4xx/5xx` → Routine-Auth oder Routine-Service-Problem
   - `routine.forward.exception` mit `timeout: true` → Routine antwortet nicht innerhalb 15 s
   - `routine.forward.exception` mit `cause: "fetch failed"` → DNS/TLS/Netzwerk
   - `routine.sessionurl.missing` → Routine hat 2xx geantwortet, aber wir erkennen die Session-URL nicht → `bodyPreview` anschauen und ggf. `extractSessionUrl` in `lib/routine.ts` um das richtige Response-Feld erweitern

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
