# PawVita

Unified livestock disease surveillance platform — the merge of the two
previously separate applications in this repository, joined behind one
login/registration gateway and one REST API.

**Smart India Hackathon** — *Efficient systems for early detection, prevention
and management of livestock diseases and animal health issues.*

---

## What was merged

| Source app | Now lives at | Portal |
|---|---|---|
| `PawVita_Users` | `src/apps/user/**` | **Livestock Owner** — `/user/*` |
| `PawVita_Hospital` | `src/apps/hospital/**` | **Veterinary Hospital** — `/hospital/*` |

Both applications keep every page, layout and component. They were not
interleaved: each keeps its own visual conventions, and the two are joined by a
shared public shell, a shared session and the shared API in
[`server/`](server/README.md). Their mock data fixtures are gone. Every screen
reads and writes real records, except the AI panels (see
[What is still a stand-in](#what-is-still-a-stand-in)).

The original folders are untouched and still run on their own.

## Getting started

The app needs the API running next to it. In one terminal:

```bash
cd server
npm install
cp .env.example .env        # sets the fixed demo OTP 123456
npm run db:seed -- --demo   # demo regions, hospitals, users, herds and cases
npm run dev                 # http://localhost:4000/api/v1
```

In another, from the repository root:

```bash
npm install
npm run dev                 # http://localhost:5173
```

The API runs entirely on your machine by default (embedded Postgres, a local
auth provider, files on disk), so neither step needs a Supabase account. See
[`server/README.md`](server/README.md) to connect Supabase.

In development Vite forwards `/api` to `http://localhost:4000`, so the two need
no CORS setup. Copy [`.env.example`](.env.example) to `.env.local` to point
elsewhere or to change the demo settings.

Other scripts: `npm run build` (typecheck + production build with the service
worker), `npm run preview` (serves the build, also proxying `/api`),
`npm run typecheck`.

## The gateway

`/login` and `/register` both open on a two-option choice — **Livestock Owner**
or **Veterinary Hospital** — and route into the matching application:

- **Livestock Owner** signs in with a mobile number and an SMS OTP, the flow
  suited to farmers, and lands on `/user/...`. A verified number without an
  account continues to a short registration form.
- **Veterinary Hospital** signs in with a staff ID or email and a password, and
  lands on `/hospital/...`. New staff register with their role and
  institution code.

Farmers can use the app as soon as they register. Every other role stays
**pending**, with an explanation on screen, until an administrator approves it
under *Admin → Users*.

The account's role, not a choice on the form, decides which dashboard opens,
and each area checks it: a farmer who opens a vet page is sent back to their own
home.

**Demo access.** A panel at the bottom of the sign-in page signs in as any of
the seeded demo accounts with one click. It uses the real sign-in endpoints
with the demo password (`PawVita@2026`) or OTP (`123456`, which the API
accepts when `LOCAL_AUTH_FIXED_OTP=123456` is set, as in its
`.env.example`). The panel shows in
development and is hidden in production builds unless `VITE_DEMO_ACCESS=true`.
The accounts are listed in [`server/README.md`](server/README.md#quick-start-no-accounts-needed).

The session (access and refresh tokens plus the account) is kept in
`localStorage` under `pawvita.session` and refreshed automatically. Visiting a
portal route without a session redirects to `/login` with a `next` parameter,
so sign-in returns to the page originally requested. Visiting the *other*
portal's routes shows an explanation with a way to switch rather than a silent
bounce.

## Offline and install

The app is an installable PWA, built for field use with poor signal:

- **App shell.** A service worker precaches the app, so it opens without a
  connection once visited. The symptom catalogue and region list are cached as
  well.
- **Last-seen data.** API responses are kept in `localStorage` (`pawvita.cache`)
  and shown while offline. They are cleared when a different account signs in.
- **Outbox.** A case report, its photos, a new animal or a vaccination recorded
  offline goes to an IndexedDB outbox and is sent when the connection returns.
  Each item carries a client-generated id, so a retried send never creates a
  duplicate. Pending items and failures are listed on the farmer home and in
  Settings, where *Offline auto-sync* can also hold them until "Sync now".

## What is still a stand-in

The AI layer is planned for later, so the panels that depend on it keep their
designed look with fixed sample output. The fixtures live in
`src/shared/ai/preview.ts` and `src/apps/*/data/aiPreview.ts`:

- The AI diagnosis and confidence shown after a report, on case pages and in
  the hospital case queue.
- The risk maps, outbreak clusters (including the nearby-outbreak card on the
  farmer home), the 7-day forecast and model accuracy.
- The chatbot and voice input.

Everything around them, including the cases, symptoms, risk levels a vet
assigns, maps and charts, uses live data. When the AI services exist, the API's
AI hook (see [`server/README.md`](server/README.md#the-ai-hook-67)) stores
their output on the case, and these panels can read it from there.

## Route map

### Shared shell
| Route | Page |
|---|---|
| `/` | Landing — live network stats, the outbreak ticker and the two-portal gateway |
| `/about`, `/how-it-works` | Public pages |
| `/login`, `/register` | Portal choice + sign-in / registration |
| `/signup` | Redirects to `/register` (both source apps linked here) |
| `/logout` | Signs out and returns to `/login` |

### Livestock Owner — `/user`
| Area | Routes |
|---|---|
| Farmer / field worker | `home`, `report-symptom`, `my-animals`, `alerts`, `case-status/:id`, `vaccination-schedule` |
| Veterinarian | `vet/dashboard`, `vet/case/:id`, `vet/field-visits` |
| Official | `official/overview`, `risk-map`, `outbreak-clusters`, `analytics`, `reports` |
| Lab | `lab/queue`, `lab/sample/:id` |
| Admin | `admin/users`, `admin/regions`, `admin/system-health` |
| Utility | `notifications`, `settings`, `help-support` |

### Veterinary Hospital — `/hospital`
| Area | Routes |
|---|---|
| Ward | `ward/home`, `ward/report-symptom`, `ward/my-animals`, `ward/alerts`, `ward/case-status/:id`, `ward/vaccination-schedule` |
| Doctor | `doctor/dashboard`, `doctor/case/:id`, `doctor/field-visits` |
| Official | `official/overview`, `risk-map`, `outbreak-clusters`, `analytics`, `reports` |
| Lab | `lab/queue`, `lab/sample/:id` |
| Admin | `admin/users`, `admin/regions`, `admin/system-health` |
| Utility | `notifications`, `settings`, `help-support` |

`/user` and `/hospital` on their own redirect to the signed-in role's home.

The hospital app's own `/hospital/*` pages were renamed to `/hospital/ward/*` so
the portal prefix and the role segment do not collide; its pages already
described themselves as the ward portal.

## How the two apps are kept apart

**Routes.** Every absolute path inside each app was rewritten to sit under its
portal prefix. The two apps both had `/official`, `/lab` and `/admin` areas, so
without this they would have overwritten each other.

**CSS.** Both apps shipped a class called `.sidebar-link` with incompatible
values — one styles white links on a dark sidebar, the other dark links on a
light one — and the owner app set global `table`/`td` padding that would have
overridden the hospital app's Tailwind utilities. `src/index.css` keeps both
brand-token namespaces (they describe the same palette) and scopes the colliding
rules under `[data-portal="user"]` / `[data-portal="hospital"]`. `PortalShell`
sets that attribute on `<html>` when a portal mounts.

**Data.** Both apps read the same API through the same hooks, so a case a
farmer reports in the owner portal is the case a hospital doctor opens. Screens
that do the same job in both portals, such as the case actions, the lab
workflow, the admin console, notifications and settings, share one
implementation under `src/shared/`, and each app keeps its own page layout
around it.

## Layout

```
src/
  api/             API client, session storage, React Query hooks and cache
  auth/            Session context, portal definitions, route guard, demo sign-in
  offline/         IndexedDB outbox and its sync loop
  lib/             Formatting and link helpers
  shared/          Public shell (landing, about, auth pages, layout, icons) and
                   screens both portals use (cases, lab, analytics, admin, account)
    ai/            Stand-in output for the AI panels
  apps/
    user/          PawVita_Users, namespaced under /user
    hospital/      PawVita_Hospital, namespaced under /hospital
  routes.tsx       The combined router
  index.css        Merged theme with portal-scoped overrides
server/            The REST API (see server/README.md)
```

## Notes

- Each portal is loaded on demand, so a farmer on a village connection never
  downloads the hospital application. The initial bundle is ~442 kB (~135 kB
  gzipped).
- The shared shell uses inline SVG icons, visible focus rings, a skip link, and
  honours `prefers-reduced-motion`. Pages inside the two portals keep the emoji
  iconography they were built with.
- Photos and voice notes are served through short-lived signed links from the
  API, so they never need a token in the URL.

## Stack

React 19 · React Router 8 · TanStack Query 5 · Tailwind CSS 4 · Recharts 3 ·
Vite 8 with vite-plugin-pwa · TypeScript 5.7 · Node.js + Express API
([`server/`](server/README.md))
