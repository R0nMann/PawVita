# PashuRakshak

Unified livestock disease surveillance platform — the merge of the two
previously separate applications in this repository, joined behind one
login/registration gateway.

**Smart India Hackathon** — *Efficient systems for early detection, prevention
and management of livestock diseases and animal health issues.*

---

## What was merged

| Source app | Now lives at | Portal |
|---|---|---|
| `PawVita_Users` | `src/apps/user/**` | **Livestock Owner** — `/user/*` |
| `PawVita_Hospital` | `src/apps/hospital/**` | **Veterinary Hospital** — `/hospital/*` |

Both applications are preserved in full: every page, layout, component and mock
data fixture. They were not interleaved — each keeps its own data model,
component set and visual conventions, and the two are joined only by a shared
public shell and a shared session.

The original folders are untouched and still run on their own.

## Getting started

```bash
npm install
```

```bash
npm run dev
```

Other scripts: `npm run build` (typecheck + production build), `npm run preview`,
`npm run typecheck`.

## The gateway

`/login` and `/register` both open on a two-option choice — **Livestock Owner**
or **Veterinary Hospital** — and route into the matching application:

- Choosing **Livestock Owner** signs in with a mobile number and OTP, the flow
  suited to farmers, and lands on `/user/...`.
- Choosing **Veterinary Hospital** signs in with an institution ID and password,
  the flow suited to an organisation, and lands on `/hospital/...`.

Each portal has its own roles; the role selected during sign-in decides which
dashboard opens. A **Demo access** panel at the bottom of the sign-in page drops
straight into any of the ten dashboards without credentials.

The session is held in `localStorage` under `pashurakshak.session`. Visiting a
portal route without a session redirects to `/login` with a `next` parameter, so
sign-in returns to the page originally requested. Visiting the *other* portal's
routes shows an explanation with a way to switch rather than a silent bounce.

## Route map

### Shared shell
| Route | Page |
|---|---|
| `/` | Landing — includes the two-portal gateway |
| `/about`, `/how-it-works` | Public pages |
| `/login`, `/register` | Portal choice + sign-in / registration |
| `/signup` | Redirects to `/register` (both source apps linked here) |
| `/logout` | Clears the session and returns to `/login` |

### Livestock Owner — `/user`
| Area | Routes |
|---|---|
| Farmer | `home`, `report-symptom`, `my-animals`, `alerts`, `case-status/:id`, `vaccination-schedule` |
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

**Data.** Each app keeps its own `data/mockData.ts`. The two use different
naming conventions and shapes, and nothing reads across the boundary. The public
shell has its own fixtures in `src/shared/data/landing.ts`.

## Layout

```
src/
  auth/            Session, portal definitions, route guard
  shared/          Public shell — landing, about, auth pages, layout, icons
  apps/
    user/          PawVita_Users, namespaced under /user
    hospital/      PawVita_Hospital, namespaced under /hospital
  routes.tsx       The combined router
  index.css        Merged theme with portal-scoped overrides
```

## Notes

- Each portal is loaded on demand, so a farmer on a village connection never
  downloads the hospital application. The initial bundle is ~398 kB (~120 kB
  gzipped) against ~1,085 kB if both were bundled eagerly.
- The shared shell uses inline SVG icons, visible focus rings, a skip link, and
  honours `prefers-reduced-motion`. Pages inside the two portals keep the emoji
  iconography they were built with.
- Authentication is a front-end demo: any OTP or password is accepted, and no
  data leaves the browser.

## Stack

React 19 · React Router 8 · Tailwind CSS 4 · Recharts 3 · Vite 8 · TypeScript 5.7
