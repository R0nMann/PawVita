# PawVita API

The Node.js + Express backend from the technical architecture (§5): one REST API
behind both portals, storing shared health records in Supabase, with a hook for
the AI layer that will be added later.

```
PWA (farmer / field worker)  ─┐                        ┌─ Supabase Postgres  (schema "pawvita")
                              ├─►  Express  /api/v1  ──┼─ Supabase Auth      (phone OTP, email + password)
Dashboard (vet / lab / official)┘      │                └─ Supabase Storage   (photos, voice notes, lab reports)
                                       └─► AI hook (no-op until the AI services exist)
```

**Stack:** Node 22+ · Express 5 · TypeScript · Drizzle ORM · Zod · Supabase JS ·
PGlite (embedded Postgres for local development and tests) · Vitest.

---

## Quick start (no accounts needed)

```bash
cd server
npm install
cp .env.example .env          # optional, but sets the fixed OTP 123456 the frontend's demo sign-in uses
npm run db:seed -- --demo     # migrations, catalogues and a demo dataset
npm run dev                   # http://localhost:4000/api/v1
```

Without Supabase settings the API runs entirely on your machine:

| Piece | Local stand-in |
|---|---|
| Postgres | PGlite in `.data/pglite` (one process at a time — stop the server before seeding) |
| Supabase Auth | A local provider that issues the same kind of JWTs. OTPs are **printed in the server log**, or fixed via `LOCAL_AUTH_FIXED_OTP=123456` |
| Supabase Storage | Files in `.data/uploads` |

The local providers are refused when `NODE_ENV=production`.

**Demo accounts** (from `--demo`). Password logins use `PawVita@2026`:

Every demo account signs in with its email or staff ID plus the password above,
and is flagged `two_factor_exempt` so a walkthrough needs no inbox.

| Role | Sign in with |
|---|---|
| Farmer — Ramesh Kumar | `ramesh.kumar@demo.pawvita.in` |
| Farmer — Sunita Devi | `sunita.devi@demo.pawvita.in` |
| Field worker — Kiran Patel | `kiran.patel@demo.pawvita.in` |
| Vet — Dr. Meera Patel (Anand) | `dr.meera` |
| Vet — Dr. Anil Singh (Pune) | `dr.anil` |
| Hospital ward staff | `vh-anand-01` |
| Lab technician | `lab-anand-01` |
| Official — Gujarat AHD | `ahd-gujarat` |
| Administrator — admin console | `admin` |

## Connecting Supabase

1. **Database.** Copy the connection string from *Project Settings → Database*
   into `DATABASE_URL`. If you use the transaction pooler (port 6543), also set
   `DB_DISABLE_PREPARE=true`.
2. **Keys.** From *Project Settings → API Keys*, set `SUPABASE_URL`,
   `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`. The legacy `anon` /
   `service_role` names also work. New projects sign JWTs with asymmetric keys,
   which the API reads from the project's JWKS endpoint. Set `SUPABASE_JWT_SECRET`
   only if your project still uses the legacy HS256 secret.
3. **Email sign-in.** Keep **Email** enabled under *Authentication → Sign In /
   Providers*; it is the only sign-in method. If "Confirm email" is on, anyone
   who registers must confirm before signing in, and `POST /auth/register`
   returns `emailConfirmationRequired: true`.
4. **Sign-in codes.** `TWO_FACTOR_ENABLED` turns itself on as soon as the
   Supabase auth provider is configured, and the second step then needs a way to
   send mail. **Supabase’s built-in sender is not one**: it refuses any address
   outside the project organisation with `email_address_invalid`, so every
   account that is not `two_factor_exempt` is locked out. Pick one of:
   - `TWO_FACTOR_ENABLED=false` — password only, no mail needed.
   - **Supabase SMTP** (*Authentication → Emails → SMTP Settings*) pointed at
     `smtp-relay.brevo.com:587`. Supabase keeps sending; the restriction lifts.
     No hook, no public URL, no change to this repo.
   - **The Send Email hook** below, for our own wording and sender. Supabase has
     to reach `/api/v1/hooks/send-email`, so a local run needs a tunnel. Set
     `EMAIL_HOOK_SECRET` and the Brevo values together: with the hook wired and
     no transport, codes only reach the log, which production refuses to start on.
5. `npm run db:migrate`, then `npm start`. The private storage bucket is created
   on first boot. `DB_MIGRATE_ON_START` is off in production, so the migrate
   step is not optional there.

All tables live in a `pawvita` schema, not `public`. Supabase's Data API only
exposes `public` (plus `graphql_public`), so the publishable key shipped in the
frontend cannot reach the data directly. Row-level security is also enabled on
every table with no policies. Only the backend's direct Postgres connection can
read or write.

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Start with reload (tsx watch) |
| `npm run build` / `npm start` | Compile to `dist/` and run it |
| `npm test` | Vitest — every test file boots the real app on an in-memory Postgres |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | After editing `src/db/schema.ts`, write a new SQL migration into `drizzle/` |
| `npm run db:migrate` | Apply migrations and add any missing catalogue and region rows |
| `npm run db:seed [-- --demo]` | Refresh the symptom / disease / vaccine catalogues and the region hierarchy (and load demo data) |

## Layout

```
src/
  index.ts            Boot: config → deps → migrations → HTTP server → reminder jobs
  app.ts              Express app and route mounting
  config.ts           Environment, validated at startup
  providers.ts        Builds the database, auth, storage and AI dependencies
  auth/               Supabase Auth + local stand-in, JWT verification, middleware
  db/                 Drizzle schema, client, catalogues, region hierarchy, demo seed, CLI scripts
  email/              Brevo transport and the sign-in code template
  lib/                Access rules, region hierarchy, validation, errors, upload sniffing
  services/           Case workflow, notifications, AI runner, reminders
  routes/             One router per resource
  storage/            Supabase Storage and local disk
  ai/                 The AI hook interface (no-op by default)
drizzle/              SQL migrations (generated, committed)
test/                 API tests
```

---

## Roles

The two portals share **one role set**. The portal a person signs in through is
a frontend concern, so user-portal `vet` and hospital-portal `doctor` are the
same role.

| Role | Frontend role(s) | Sees | Can do |
|---|---|---|---|
| `farmer` | user · farmer | Own herds and their cases | Register herds/animals, report cases, record deaths and vaccinations, upload photos and voice notes, add follow-up notes |
| `field_worker` | *(doc: "Field Worker")* | Herds and cases in their area | Same as a farmer, on behalf of farmers in their area. Can register a farmer who has no phone login |
| `vet` | user · vet, hospital · doctor | Cases in their area, plus any assigned to or reported by them | Everything clinical: assess risk, diagnose, treat, request labs, change status, assign/refer, schedule visits, issue advisories |
| `ward_staff` | hospital · ward | Cases reported by or referred to their hospital, animals admitted there | Admit and discharge animals, report cases, add notes and photos |
| `lab_tech` | user · lab, hospital · lab | Their laboratory's sample queue and those cases | Update sample status, enter results, attach reports |
| `official` | user · official, hospital · official | Everything in their region, read-only clinically | Analytics, assign vets to cases, issue advisories |
| `admin` | user · admin, hospital · admin | Everything | Approve accounts, manage users, organisations and regions, system health |

A user's **region** is their home village (farmers) or area of responsibility
(staff), at any level `country → state → district → block → village`. Access
checks match it against ancestry columns stored on every herd and case, so
"cases in Anand district" is one indexed comparison.

People outside a record get **404, not 403**, so the ids of other people's cases
are never confirmed.

## Sign-in and registration

Express passes sign-in requests through to Supabase Auth and verifies the
resulting JWT on every request. A frontend may also talk to Supabase Auth
directly: the API accepts any valid access token for the project.

Everyone signs in the same way: an email address and a password, then a
six-digit code emailed through Brevo. There is no SMS path.

**Registering**
- `POST /auth/register {email, password, fullName, role?, username?, phone?, organizationCode?, regionId?}`
  is the one self-service sign-up, for every role a person may pick themselves.
  Farmers are active immediately; every other role is **pending** until an
  administrator approves it. `phone` is contact detail, not a credential.
- A farmer a field worker registered earlier has a profile but no login.
  Registering with that same email **claims the existing record** rather than
  creating a second one, so their herd and case history come with them.

**Signing in**
- `POST /auth/login {identifier, password}` accepts either the email or the
  `username`, which is the "Staff ID" field on the sign-in screen.
- With `TWO_FACTOR_ENABLED` (on by default under the Supabase auth provider) a
  correct password does **not** return a session. The reply is
  `{twoFactorRequired: true, email}` — the address masked — and a six-digit code
  goes to the inbox. Finish with `POST /auth/login/verify {identifier, otp}`,
  which returns the usual `{session, user, registrationRequired}`.
- Accounts flagged `two_factor_exempt` skip the second step; the demo seed sets
  it so a walkthrough needs no inbox.

An account with no email address cannot sign in, so `POST /herds` requires one
when a field worker registers a farmer inline.

**Session:** send `Authorization: Bearer <accessToken>`. Renew with
`POST /auth/refresh {refreshToken}`, which rotates the refresh token, and end
with `POST /auth/logout`.

A token without a registered account gets `403 profile_required`, a pending
account gets `403 account_pending`, and a suspended one gets
`403 account_suspended`. `GET /me` works in all three states.

### Sending sign-in codes through Brevo

Supabase Auth owns every code — it generates, stores, expires and verifies it.
All this API does is deliver it, so the wording and the sender are ours rather
than Supabase's built-in SMTP.

1. **Brevo** → SMTP & API → API keys: create a key, and verify the sender
   address. Set `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` and `BREVO_SENDER_NAME`.
2. **Supabase** → Authentication → Hooks → Send Email Hook: enable it, point it
   at `https://<api-host>/api/v1/hooks/send-email` and copy the generated secret
   into `EMAIL_HOOK_SECRET`. The host must be reachable from Supabase.
3. Leave `TWO_FACTOR_ENABLED` unset — it defaults on with the Supabase provider.

The message is built in `src/email/templates.ts` and posted to Brevo's
`/v3/smtp/email` by `src/email/index.ts`. It carries a code and no link: a code
typed back into a page the reader already has open is harder to phish than a
button that signs them in.

Without `BREVO_API_KEY` the transport writes each message to the log instead,
the way the local auth provider prints OTPs — fine for development, and refused
outright when `NODE_ENV=production` and two-factor is on.

## Case workflow

Statuses follow architecture §9: **`active → under_review → lab_pending → treated → resolved`**.

| From | Allowed to |
|---|---|
| active | under_review, lab_pending, treated, resolved |
| under_review | lab_pending, treated, resolved |
| lab_pending | under_review, treated, resolved |
| treated | under_review, lab_pending, resolved |
| resolved | under_review *(reopen)* |

Resolving requires an `outcome` (`recovered`, `died`, `culled`, `false_alarm`,
`other`). Some moves happen automatically so the status matches reality:

- A vet's first action on an `active` case, or assigning a vet, moves it to **under_review**.
- Adding a treatment to an `active` or `under_review` case moves it to **treated**.
- Requesting a lab test moves it to **lab_pending**.
- When the last outstanding sample has a result (or is rejected), it returns to **under_review**.

Risk is `low` (monitor), `moderate` (vet review) or `high` (urgent), per §7.
Until the AI layer exists, the vet sets it. Cases nobody has assessed have
`riskLevel: null`, and the priority queue ranks them just after `high`.

**Feedback to the farmer (§10).** Every step writes to the case timeline.
Status changes, advice, treatment instructions (including milk/meat withdrawal
periods), lab results and scheduled visits are visible to the farmer and raise
in-app notifications. Internal vet notes are not.

**Other notifications:**
- A new case or unexplained deaths alert the vets covering that area.
- A positive result for a notifiable disease alerts the officials covering the area.
- A background job sends vaccination-due, overdue and next-day-visit reminders.
  Each reminder has a dedupe key, so it goes out once no matter how many times
  the job runs.

## Offline-first sync (§12)

The PWA saves reports to an IndexedDB outbox offline and replays them when the
connection returns (`src/offline/outbox.ts` in the frontend). The API is built
for that:

- **Client-generated ids.** `POST /cases`, `/herds`, `/animals`, `/vaccinations`,
  `/mortality` and `/attachments` accept an `id` (UUID). Replaying the same
  request returns the stored record with `200` instead of creating a duplicate.
  Generate ids with `crypto.randomUUID()` when the record is captured, so an
  offline case can refer to an offline animal.
- **Capture time.** Send `reportedAt` (when the farmer made the report) and
  `capturedOffline: true`. The server keeps its own receive time, and system
  health reports the sync delay.
- **Delta pulls.** `GET /cases?updatedSince=…` and `GET /animals?updatedSince=…`
  return only what changed since the last sync.
- **Order.** Replay the queue in capture order: herd → animal → case → attachments.

## The AI hook (§6–§7)

`src/ai/index.ts` defines the contract. After a case is reported, and again when
a photo or voice note is added, the backend builds a `CaseForAssessment`
(species, symptoms, description, counts, location, short-lived media URLs) and
calls `AiService.assessCase()` outside the request, so reporting never waits on
AI. Results are stored in `ai_assessments`, added to the timeline and shown in
case detail. Vets accept or reject them with
`POST /cases/:id/ai-assessments/:assessmentId/review`.

The default `NoopAiService` does nothing. To connect the Python services,
implement `AiService` (for example an HTTP client for `AI_SERVICE_URL`) and pass
it as `ai` in `createDeps`.

## Rate limits

Limits are keyed by who is asking, not only by IP, because a village
cooperative, a hospital or a demo room shares one public address.

| Limit | Keyed by | Allowance |
|---|---|---|
| Every API call | Signed-in account (else IP) | `RATE_LIMIT_PER_MINUTE` per minute (default 600) |
| OTP send | Phone · IP | 5 · 60 per 10 min |
| OTP verify | Phone | 10 per 10 min |
| Password login | Identifier · IP | 10 · 200 per 10 min |
| Staff registration | IP | 20 per 10 min |
| Token refresh | IP | 300 per 10 min |

A blocked request gets `429 rate_limited`. `RATE_LIMITS_ENABLED=false` turns
them all off (they are off in tests). Behind a proxy, set `TRUST_PROXY` so the
client IP is read correctly.

---

## API reference

Base path `/api/v1`. JSON in and out. Errors always look like
`{ "error": { "code", "message", "details?" } }`. Lists take `limit` (≤100) and
`offset` and return `{ items, limit, offset, hasMore }`.

### Public

| | |
|---|---|
| `GET /catalog?lang=hi` | Symptoms, diseases and vaccines with localised labels, plus every enum |
| `GET /regions?parentId=&level=&q=` · `GET /regions/:id` | Location hierarchy (with a display path) |
| `GET /organizations?type=lab&regionId=` | Hospitals, labs, departments |
| `GET /public/stats` | Landing-page network totals |
| `GET /public/alerts` | Open cases per district and disease, last 14 days (the ticker) |
| `GET /public/trends?months=7` | Cases per month for the top three diseases plus "other" (the landing chart) |
| `GET /public/advisories?regionId=&lang=` | Nationwide and regional advisories |
| `POST /hooks/send-email` | Supabase's Send Email auth hook: takes the code Supabase generated and sends it through Brevo. Signed with `EMAIL_HOOK_SECRET` (Standard Webhooks); called by Supabase, never by a client |
| `GET /health` · `GET /health/ready` | Liveness · database readiness. Served at the root (`http://localhost:4000/health`), not under `/api/v1` |

### Auth and account

| | |
|---|---|
| `POST /auth/login` · `POST /auth/login/verify` | Email or staff ID + password, then the emailed code |
| `POST /auth/register` | Self-service sign-up for every role (see above) |
| `POST /auth/refresh` · `POST /auth/logout` | Session |
| `GET /me` · `PATCH /me` | Own account; farmers may change village and language |

### Herds, animals, health records

| | |
|---|---|
| `GET/POST /herds` · `GET/PATCH /herds/:id` | Staff creating a herd pass `ownerId` or an inline `owner {fullName, phone}` |
| `GET/POST /animals` · `GET/PATCH /animals/:id` | Detail includes vaccination status, open cases and current ward |
| `GET /animals/lookup?tag=` | Find by ear tag (vets, ward staff, field workers) |
| `GET /animals/:id/history` | Cases, treatments, vaccinations, lab results, deaths and admissions, newest first |
| `POST /mortality` · `GET /mortality` | Deaths of one animal or a flock-level count |
| `POST /vaccinations` · `POST /vaccinations/batch` | One dose, or a vaccination camp (≤500 animals). The next due date comes from the vaccine's booster interval |
| `GET /vaccinations` · `GET /vaccinations/due?withinDays=30` | Records, and the due/overdue schedule |

### Cases

| | |
|---|---|
| `POST /cases` | Report: `herdId`, `animalId?`, `symptomCodes[]`, `description?` (text or voice transcript), `animalsAffected`, `animalsDead`, `onsetDate?`, prior treatment/vaccination notes, `location {lat, lng, accuracyM}`, `reportedAt`, `capturedOffline` |
| `GET /cases` | Filters: `status`, `open`, `riskLevel` (incl. `unassessed`), `assignedToMe`, `unassigned`, `reportedByMe`, `regionId`, `herdId`, `animalId`, `diseaseCode`, `from`, `to`, `updatedSince`, `q`. `sort=priority\|recent\|updated` |
| `GET /cases/:id` · `GET /cases/:id/timeline` | Everything for case review, plus `permissions` so the UI knows which buttons to show |
| `PATCH /cases/:id/status` | `{status, outcome?, note?}` |
| `PATCH /cases/:id/assessment` | `{riskLevel?, suspectedDiseaseCode?, confirmedDiseaseCode?, note?}` |
| `POST /cases/:id/assign` | `{vetId?, organizationId?, note?}`. Assign a vet and/or refer to a hospital |
| `POST /cases/:id/notes` | `{body, visibleToReporter?}`. Staff notes are internal unless marked visible (they then become advice) |
| `POST /cases/:id/treatments` | Medicine, dose, route, frequency, duration, withdrawal period, farmer instructions |
| `POST /cases/:id/lab-requests` | `{labOrgId, sampleType, tests[], priority, collectedAt?}` |
| `POST /cases/:id/ai-assessments/:assessmentId/review` | `{decision: accepted\|rejected\|modified, notes?}` |
| `GET /directory/vets` | Active vets whose area overlaps the caller's, with their open-case load (for assigning) |

An assessment records only the fields that changed, and its timeline entry
names diseases in words ("Suspected disease: Foot-and-Mouth Disease").

### Lab, visits, hospital wards, files

| | |
|---|---|
| `GET /lab-requests` · `GET /lab-requests/:id` | Priority-sorted queue; detail includes chain of custody |
| `PATCH /lab-requests/:id/status` | `collected` (vet) · `received`, `processing`, `rejected` (lab) |
| `POST /lab-requests/:id/result` | `{result: positive\|negative\|inconclusive, resultDiseaseCode?, summary, details?}` |
| `GET/POST /visits` · `PATCH /visits/:id` | Field visits: investigation, follow-up, vaccination camp |
| `GET/POST /admissions` · `PATCH /admissions/:id` · `POST /admissions/:id/discharge` | Ward stays. A case reported for an admitted animal is linked to its open admission |
| `POST /attachments` | multipart: `file`, `kind` (`photo`/`voice`/`document`/`lab_report`), one of `caseId`/`labRequestId`/`animalId`, optional `id` |
| `GET /attachments/:id` · `GET /attachments/:id/content` | Metadata with a signed `url` · access check, then a redirect to the file |

Uploads are identified by their bytes, not the declared type. Accepted formats
are JPEG, PNG, WebP and HEIC photos; WebM, Ogg, MP3, M4A, AAC, WAV, 3GP and AMR
audio; and PDF. The size limit is `MAX_UPLOAD_MB`.

Case detail, lab detail and upload responses give every file a `url` that stays
valid for 10 minutes and needs no token, so it can go straight into `<img src>`
or `<audio src>`. On Supabase it is a Storage signed URL. Locally it is an
HMAC-signed `/api/v1/files/…` link, relative to the API origin, so resolve it
with `new URL(url, apiBase)`.

### Advisories, notifications, analytics, admin

| | |
|---|---|
| `GET /advisories?lang=gu` · `POST` · `PATCH/DELETE /advisories/:id` | Multilingual advisories targeted at a region (vets, officials, admins publish) |
| `GET /notifications?unread=true` · `POST /notifications/:id/read` · `POST /notifications/read-all` | In-app inbox with `unreadCount` |
| `GET /analytics/overview` | Reported, resolved and open cases by status and risk; notifiable cases; deaths; response time; vaccination coverage |
| `GET /analytics/regions?level=district` | Per-region counts for the disease-risk map |
| `GET /analytics/trends?interval=week&groupBy=disease&metric=cases\|deaths` | Chart-ready time series |
| `GET /analytics/vaccination-coverage?level=block&vaccineCode=fmd` | Vaccination gaps, worst first |
| `GET /analytics/species` | Species distribution |
| `GET/POST /admin/users` · `PATCH /admin/users/:id` · `POST /admin/users/:id/approve` | Accounts and approvals |
| `POST /admin/organizations` · `PATCH /admin/organizations/:id` | Hospitals, labs, departments |
| `POST /admin/regions` · `PATCH /admin/regions/:id` · `POST /admin/regions/import` | Location hierarchy. Bulk import (≤5,000 rows per call, matched on `code`) for loading LGD data |
| `GET /admin/system-health` · `POST /admin/jobs/reminders` | Service status and sync statistics · run reminders now |

Analytics are scoped to the caller's region by default. `regionId` narrows the
scope but never widens it.

---

## The frontend

Both portals in the repository root call this API. The client lives in
`src/api/` (`endpoints.ts` for the calls, `queries.ts` for the React Query
hooks). In development Vite proxies `/api` to `http://localhost:4000`, so no CORS
setup is needed. A frontend served from another origin sets `VITE_API_URL`,
and that origin must be listed in `CORS_ORIGINS` here.

The UI's portal roles map onto the API roles as `doctor` → `vet`,
`ward` → `ward_staff` and `lab` → `lab_tech` (`src/auth/portals.ts`).

## Not built yet

- **AI Intelligence Layer.** Vision, clinical triage and outbreak ML (by design; the hook is in place).
- **SMS / push delivery** of notifications and advisories. Only the in-app channel exists; the delivery hook is in `services/notifications.ts`.
- **A full village directory.** `src/db/regions.ts` seeds all 28 states and 8 union territories with a couple of districts each, a few blocks per district and one village per block — enough to demo routing anywhere in India, but not the real thing. Load LGD data through `/admin/regions/import`, which matches on `code` and refreshes those rows in place.
- **Catalogue editing in the API.** Change `src/db/catalog.ts` and run `npm run db:seed`.
