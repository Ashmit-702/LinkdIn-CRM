# Northline CRM — LinkedIn-integrated pipeline (MVP)

A B2B CRM for managing contacts, leads, and pipeline, with LinkedIn content
performance analytics layered on top. LinkedIn data is retrieved through a
**pluggable provider abstraction** — Apify today, the official LinkedIn API
later — so the rest of the app never depends on a specific data source.

This is **not** a LinkedIn clone. It does not offer profile browsing,
private messaging, or connection-graph tools. It tracks a small number of
LinkedIn targets a user has explicitly connected (their own profile or a
company page) and shows how that content is performing.

---

## 1. What it does

- Manage contacts and leads through a sales pipeline (New → Contacted →
  Qualified → Proposal → Won/Lost).
- Attach a LinkedIn profile URL to any contact.
- Connect a LinkedIn profile/company URL as an "integration" and sync its
  public post data.
- View normalized post analytics: impressions, reactions, comments,
  reposts, and a calculated engagement rate.
- Dashboard with CRM + LinkedIn KPIs and charts.
- Every sync is logged (status, records processed, errors, timestamp).

## 2. Architecture

```
UI (Next.js/React)
   ↓
API routes (src/app/api/**)          — auth-checked, Zod-validated
   ↓
Services (src/services/**)           — business logic, DB access via Prisma
   ↓
LinkedInDataProvider (interface)     — src/providers/linkedin/interface.ts
   ↓                    ↓
MockLinkedInProvider   ApifyLinkedInProvider
(no external calls)    (calls Apify actors)
```

The application **never** imports `ApifyLinkedInProvider` or
`MockLinkedInProvider` directly outside of `src/providers/linkedin/index.ts`.
Everything else calls `getLinkedInProvider()`, which reads the
`LINKEDIN_PROVIDER` environment variable and returns the right
implementation. Swapping Apify for the official LinkedIn API later means:

1. Add `src/providers/linkedin/official-provider.ts` implementing
   `LinkedInDataProvider`.
2. Add a `case "official":` branch in `getLinkedInProvider()`.
3. Nothing else changes — not the database schema, not the API routes, not
   the UI.

## 3. How LinkedIn data flows through Apify

1. A user connects a LinkedIn profile/company URL as an `Integration` row.
2. Clicking **"Sync LinkedIn data"** calls `POST /api/linkedin/sync`.
3. `sync-service.ts` calls `getLinkedInProvider().getPosts(...)`.
4. With `LINKEDIN_PROVIDER=apify`, `ApifyLinkedInProvider` calls
   `POST /v2/acts/{actorId}/run-sync-get-dataset-items` on the Apify API,
   using the server-only `APIFY_API_TOKEN`.
5. Each raw dataset item is normalized in `apify-provider.ts`
   (`normalizePostItem`) into our internal `LinkedInPost` shape. Fields the
   actor doesn't return are left `null` — never invented.
6. `sync-service.ts` upserts each post into `LinkedinPost` (keyed on
   `[provider, externalId]` to prevent duplicates on repeated syncs), and
   calculates `engagementRate` ourselves.
7. A `SyncLog` row records status, records processed, and any error.

**Important — verify the actor schema.** Publicly listed Apify actors for
LinkedIn posts vary in their output field names. `normalizePostItem` reads
several common variants (`likes`/`reactions`/`numLikes`, `shares`/`reposts`,
etc.) defensively, but before going live you should run your chosen actor
once, inspect its real output in the Apify console, and adjust the field
lists in `src/providers/linkedin/apify-provider.ts` if needed.

## 4. Creating/configuring an Apify integration

1. Sign up at [apify.com](https://apify.com) and get an API token from
   **Settings → Integrations**.
2. Pick (or build) an actor that scrapes public LinkedIn posts for a given
   profile/company URL. Note its Actor ID (e.g. `someuser~linkedin-posts`).
3. Set in `.env`:
   ```
   LINKEDIN_PROVIDER=apify
   APIFY_API_TOKEN=your-token-here
   APIFY_POSTS_ACTOR_ID=your-actor-id
   ```
4. Restart the app. Connect a LinkedIn target from the **LinkedIn**
   section and click **Sync LinkedIn data**.

Only add LinkedIn targets you're authorized to track (your own profile or
your company's page) — this app intentionally does not support arbitrary
profile lookups.

## 5. Required environment variables

See `.env.example`. Summary:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Session signing secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes (dev) | Base URL of the app |
| `LINKEDIN_PROVIDER` | Yes | `mock` or `apify` |
| `APIFY_API_TOKEN` | Only if `apify` | Server-side only, never sent to the browser |
| `APIFY_POSTS_ACTOR_ID` | Only if `apify` | Actor used for post retrieval |
| `APIFY_COMPANY_ACTOR_ID` | Optional | Actor used for company data, if any |
| `APIFY_RUN_TIMEOUT_SECS` | Optional | Default 120 |
| `APIFY_MAX_ITEMS_PER_SYNC` | Optional | Default 50 — caps posts fetched per sync |

## 6. Running in mock mode (no Apify account needed)

```
LINKEDIN_PROVIDER=mock
```

This is the default. `MockLinkedInProvider` returns realistic, varied fake
post data so you can build and demo the entire CRM — dashboard, analytics,
sync flow, sync logs — without any external account or token.

## 7. Switching to Apify

Change `LINKEDIN_PROVIDER=apify` and fill in the `APIFY_*` variables from
section 4/5, then restart the app. No code changes required.

## 8. Database setup

```bash
# 1. Start Postgres (locally or via Docker), then:
cp .env.example .env
# edit .env: set DATABASE_URL, NEXTAUTH_SECRET

# 2. Install dependencies
npm install

# 3. Create tables
npx prisma migrate dev --name init

# 4. (optional) Seed a demo user + sample data
npm run db:seed
```

Demo login after seeding: `demo@example.com` / `password123`.

## 9. How to run tests

```bash
npm test
```

Covers: provider interface conformance, mock provider behavior, Apify
response normalization (multiple schema variants, error codes, duplicate
prevention via external ID), and analytics aggregation logic. Run
`npm run test:watch` during development.

## 10. How to run locally

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL and NEXTAUTH_SECRET
npx prisma migrate dev --name init
npm run db:seed           # optional
npm run dev                # http://localhost:3000
```

## 11. How to deploy

- Any Node host that supports Next.js (Vercel, Render, Fly.io, a plain VM).
- Provision a managed PostgreSQL instance and set `DATABASE_URL`.
- Set `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (your production URL), and either
  leave `LINKEDIN_PROVIDER=mock` or configure the `APIFY_*` variables as
  **server-side environment variables in your hosting platform's secrets
  manager** — never commit them, never expose them via `NEXT_PUBLIC_*`.
- Run `npx prisma migrate deploy` as part of your deploy step.
- Set up scheduled syncs (optional) with your platform's cron/scheduled
  jobs feature calling an authenticated internal sync endpoint — the sync
  service already enforces a minimum interval between syncs per
  integration, so scheduling e.g. hourly is safe.

## API reference

All routes below require an authenticated session (NextAuth cookie) and
scope data to the signed-in user.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create an account |
| GET/POST | `/api/auth/[...nextauth]` | NextAuth session handling |
| GET | `/api/contacts` | List/search contacts (`?search=&status=`) |
| POST | `/api/contacts` | Create a contact |
| PATCH | `/api/contacts/:id` | Update a contact |
| DELETE | `/api/contacts/:id` | Delete a contact |
| GET | `/api/leads` | List leads (`?status=`) |
| POST | `/api/leads` | Create a lead |
| PATCH | `/api/leads/:id` | Update a lead (e.g. move pipeline stage) |
| GET/POST | `/api/integrations` | List/connect a LinkedIn target |
| POST | `/api/linkedin/sync` | Trigger a sync for one integration (`{ integrationId }`) |
| GET | `/api/linkedin/posts` | List normalized synced posts |
| GET | `/api/linkedin/analytics` | Aggregate + trend analytics |
| GET | `/api/dashboard` | Combined CRM + LinkedIn KPIs |

## Provider abstraction, explained

`src/providers/linkedin/interface.ts` defines `LinkedInDataProvider` with
`getProfile`, `getPosts`, `getAnalytics`, and optional `getCompanyData`.
Two implementations exist today:

- `mock-provider.ts` — deterministic-ish fake data, zero external calls.
- `apify-provider.ts` — calls Apify actors, isolates all actor-specific
  field mapping inside `normalizePostItem`.

`index.ts` is a factory that reads `LINKEDIN_PROVIDER` and returns the
right one, cached as a singleton. This is the **only** file that is allowed
to reference both implementations.

## Which metrics are provider-supplied vs. calculated

**Provider-supplied** (present only if the connected Apify actor exposes
them; otherwise `null`): post content, post URL, published date,
impressions/views, reactions, comments, reposts, saves, clicks.

**Calculated by Northline** (never returned by a provider):
`engagementRate` per post ((reactions+comments+reposts)/impressions),
total posts, sums of each metric across posts, average engagement rate,
top-performing posts (ranked by engagement rate), engagement trend
(weekly buckets), and lead conversion rate (won ÷ total leads). The UI
labels calculated figures explicitly (e.g. "Calculated by Northline").

## Known limitations / what requires provider support

- Impressions/views, saves, and clicks depend entirely on whether your
  chosen Apify actor exposes them — many public actors only return likes,
  comments, and shares. Unavailable fields display as "—", never a
  fabricated number.
- `getProfile` and `getCompanyData` on `ApifyLinkedInProvider` are
  intentionally minimal placeholders — most publicly available LinkedIn
  scraping actors focus on post data. Extend them if you configure a
  dedicated profile/company actor.
- There is no automatic scheduled sync out of the box (by design, to avoid
  aggressive polling) — see the deployment section for wiring one up via
  your host's scheduler.
- Multi-user organization sharing is not implemented; each user only sees
  their own CRM data.
- This MVP does not implement private messaging, named profile viewers, or
  any connection-graph features — these are explicitly out of scope.

## Security notes

- `APIFY_API_TOKEN` is read only in server-side code (`apify-provider.ts`,
  loaded via `process.env` inside API routes/services) and is never sent
  to the client bundle.
- All mutating endpoints validate input with Zod and re-check that the
  target row (`contactId`, `leadId`, `integrationId`) belongs to the
  authenticated user before reading or writing it.
- Errors are normalized through `src/lib/api-response.ts`, which logs full
  detail server-side but returns only a safe, generic message to the
  client — no stack traces or secrets ever reach the browser.
- Post text is stripped of control characters before storage; rendering
  in React already escapes HTML by default.
