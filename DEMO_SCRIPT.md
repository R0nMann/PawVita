# PawVita — Prototype Demo Script

**Target runtime:** ~5 minutes · ~660 spoken words
**Problem statement:** Efficient systems for early detection, prevention and management of livestock diseases and animal health issues

> Spoken narration is in plain text. `[Bracketed italics]` are stage directions — what to click, not what to say.
> Before recording: bring up the API and the app against the Supabase project (see [Setup](#setup)), sign out, and have the inbox for the sign-in code open in a second window. Start at `/`.

---

## 1 · Landing page — the problem (0:00 – 0:50)

*[Open `/`]*

Hello everyone. This is the landing page of **PawVita**, an AI-assisted livestock disease surveillance platform.

At the very top, a live alert strip carries disease reports coming in from across the country. The hero section shows a real-time disease trend chart, and below it, our network at a glance — registered farmers, active cases, outbreaks controlled and vaccination coverage.

PawVita solves a fragmentation problem. Farmers, veterinary hospitals, laboratories and government departments each hold one piece of an outbreak, and nobody holds the whole picture. So we built one network with three front doors.

*[Scroll to the portal gateway]*

Here they are. The **Livestock Owner portal**, for farmers and the field network that serves them. The **Veterinary Hospital portal**, for institutions, laboratories and district officials. And the **Administration** console, which runs the platform itself — accounts, the region hierarchy and service health. Everything reported on one side is visible to the people responding on the other.

*[Scroll through the remaining sections]*

Below this is the four-stage journey the platform is built around — Report, Triage, Respond, Contain — followed by active outbreak clusters our system has flagged, and our target outcomes.

---

## 2 · Sign in — the authentication is real (0:50 – 1:25)

*[Click **Sign in** → choose **Livestock Owner** → Continue]*

Every account signs in the same way: an email address and a password, and then a second step.

*[Enter the real account's email and password → Sign in]*

The password alone does not get you in. The platform has generated a one-time code and emailed it.

*[Cut to the inbox → read the code → type it → Verify]*

That code came through Supabase and was delivered by Brevo — this is a real authentication chain, not a mock. Administrators and the seeded demo accounts are exempt from the second step so a walkthrough does not depend on an inbox, which is what I will use from here.

---

## 3 · Livestock Owner portal (1:25 – 2:30)

*[Sign out → **Demo access** → **Farmer**]*

This is the farmer's home screen. It greets the user by name, flags the animals that need attention, and — importantly — shows **offline mode**. In low-connectivity villages, reports are saved on the device and sync automatically when signal returns.

*[Click **Report** → pick **Bhuri** → tap two symptoms → submit]*

Reporting is icon-based and takes three steps: select the animal, select the symptoms, and receive an **AI-assisted diagnosis with a confidence score**. A farmer who cannot read English can complete this.

*[Click **My Animals**, then **Alerts**]*

Every animal has a health card with its vaccination history. Advisories reach the farmer in their own language — here in English, Hindi and Gujarati.

*[Click **Vaccines**, then open a case from the home screen]*

Vaccination Schedule tracks herd compliance, and Case Status shows the live timeline of a report — reported, under review, sent to the lab, treated, resolved — along with the vet's advice.

---

## 4 · The veterinarian (2:30 – 2:55)

*[Demo access → **Veterinarian** under Livestock Owner]*

The case we just reported has already reached the veterinary officer. Here is the **priority case queue**, the AI assessment with its confidence score, and **Field Visits** with a day plan and route.

*[Open the new case → set the risk level → send a sample to the laboratory]*

The vet assesses the case and escalates a sample. The farmer is notified straight away.

---

## 5 · Hospital and laboratory (2:55 – 3:35)

*[Sign out → Veterinary Hospital portal → Demo access → **Ward**]*

Now the institutional side. This is the **Ward Dashboard** — a digital herd view of every animal admitted, colour-coded by status, with a district risk banner at the top. Wards report symptoms the same way a farmer does.

*[Demo access → **Lab Tech**]*

The laboratory receives that sample in a priority-sorted queue, sorted urgent first.

*[Open the sample → click **View the full case**]*

And the technician can open the case behind it — the reported signs, any treatment given before sampling, the animal's vaccination history. That context is what makes a result interpretable. A technician only ever sees samples addressed to their own laboratory; another lab's work returns nothing.

*[Enter a result]*

The result flows straight back into the same case record the farmer and the vet are looking at.

---

## 6 · Government dashboards (3:35 – 4:30)

*[Demo access → **Official** under Veterinary Hospital]*

At the top of the chain, the state official. The **Overview** gives live surveillance numbers for their state — including the case we reported a minute ago.

*[Click **Risk Map**]*

The **Risk Map** shows AI-generated risk scores by state and district. The geography underneath is real: all twenty-eight states and eight union territories ship with the platform, down through districts and blocks to villages, so a report routes to the right vet from day one.

*[Click **Outbreak Clusters**]*

**Outbreak Clusters** is where the system earns its keep. It detects emerging clusters from symptom density, time windows and movement data — flagging an outbreak before anyone has formally reported one. This is the connection that is extremely difficult to spot manually.

*[Click **Analytics**, then **Reports**]*

Analytics provides seasonal forecasting, and Reports generates district and block-level summaries for policy review. Behind all of this, the Administration console approves every staff account and maintains that region hierarchy.

---

## 7 · Close (4:30 – 4:50)

*[Open the AI assistant bubble]*

Throughout both portals, an AI assistant helps users interact with their case data.

That is PawVita — one platform that turns a symptom noticed in a village into a coordinated district response. Earlier detection, faster treatment, and lower livestock mortality.

Thank you.

---

## Presenter notes

### Setup

The demo runs against the **live Supabase project** — Postgres, Auth and Storage
are hosted, and sign-in codes are delivered by Brevo. The demo dataset is
already loaded; nothing needs seeding before a recording.

```powershell
# Terminal 1 — the API. server/.env points at Supabase, and
# DB_MIGRATE_ON_START=true means migrations apply on boot.
cd server
npm run build
npm start          # expect: db=postgres auth=supabase storage=supabase

# Terminal 2 — the app, from the repo root
npm run dev        # http://localhost:5173
```

> Windows PowerShell has no `&&`. Run each line separately, or use
> `npm run build; if ($?) { npm start }`.

**If the demo accounts are missing** — the sign-in page says so — load them with:

```powershell
cd server
npm run db:seed -- --demo
```

That is safe to run at any time. It adds only what is absent: it skips entirely
once the dataset is present, reuses the four organisations rather than colliding
on their unique codes, and adopts any account whose email or staff ID is already
taken instead of duplicating it. Your own `admin` and farmer accounts are left
alone.

**Resetting between takes.** Everything the demo does is saved for real, so a
second recording starts wherever the first one finished — a case reported on
take one is still there on take two. Re-running the seed does *not* reset it;
it skips, by design. To get back to a clean state the demo rows have to be
deleted first, so either record in one pass or plan for the extra case to be
visible.

### Sign-in on the day

| Beat | Account | Second step |
|---|---|---|
| §2, the real auth demo | a real address you can read mail at | **yes** — code by email |
| §3 onwards | Demo access panel | no — seeded accounts are `two_factor_exempt` |

Two-factor is on (`TWO_FACTOR_ENABLED` defaults on with the Supabase provider).
Keep the inbox open in a second window for §2 only. If mail delivery fails on the
day, drop §2 to a single sentence and sign in with an exempt account — the rest
of the script is unaffected.

**Navigating fast.** The sign-in page has a **Demo access** panel at the bottom
with one-click entry for every role *except* administrator, which is deliberately
not offered there. Use it for every jump after the first sign-in.

**Ten role areas, six shown.** The owner portal carries farmer, field worker,
vet, official and lab; the hospital portal carries ward, doctor, official and
lab; administration is its own portal. The script climbs one chain — farmer →
vet → ward → lab → district — and mentions the rest.

**Worth mentioning if you have spare time**
- Each portal loads on demand — a farmer on a village connection never downloads the hospital application.
- Reports work offline, so patchy signal is enough.
- Advisories are issued in the language the user registered in.
- Administrators are confined to their own console; they cannot walk into a farmer's or a vet's screens.

**If a question comes up**
- *Is the login real?* Yes, and §2 shows it. Sign-in goes through Supabase Auth, the one-time code is generated by Supabase and delivered by Brevo, and reports, assessments, lab results and advisories are stored in hosted Postgres — so what one role does shows up for the others.
- *Is the AI real?* Not yet. The diagnosis, risk map, outbreak clusters, forecast and assistant show sample output while the AI layer is built. The API already has the hook they will plug into.
- *Why three portals?* Villages and institutions have different devices, literacy assumptions and authentication needs but need the same case record; administration is separated so running the platform is not mixed in with using it.

**Timing.** Spoken content is about 4 minutes 30 seconds at a normal pace; the
rest is clicks and page loads. If you run long, cut §4 (the veterinarian) — the
case timeline in §3 and the sample in §5 already imply it.
