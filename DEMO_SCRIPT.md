# PawVita — Prototype Demo Script

**Target runtime:** ~5 minutes · ~620 spoken words
**Problem statement:** Efficient systems for early detection, prevention and management of livestock diseases and animal health issues

> Spoken narration is in plain text. `[Bracketed italics]` are stage directions — what to click, not what to say.
> Before recording: start the API on fresh demo data and the frontend (see [Setup](#setup)), then sign out, so the demo starts clean at `/`.

---

## 1 · Landing page — the problem (0:00 – 0:50)

*[Open `/`]*

Hello everyone. This is the landing page of **PawVita**, an AI-assisted livestock disease surveillance platform.

At the very top, a live alert strip carries disease reports coming in from across the country. The hero section shows a real-time disease trend chart, and below it, our network at a glance — registered farmers, active cases, outbreaks controlled and vaccination coverage.

PawVita solves a fragmentation problem. Farmers, veterinary hospitals, laboratories and government departments each hold one piece of an outbreak, and nobody holds the whole picture. So we built one network with two front doors.

*[Scroll to the portal gateway]*

Here they are. The **Livestock Owner portal**, for farmers and the field network that serves them. And the **Veterinary Hospital portal**, for institutions, laboratories and district officials. Everything reported on one side is visible to the people responding on the other.

*[Scroll through the remaining sections]*

Below this is the four-stage journey the platform is built around — Report, Triage, Respond, Contain — followed by active outbreak clusters our system has flagged, and our target outcomes.

---

## 2 · Sign in — two portals (0:50 – 1:20)

*[Click **Sign in**]*

On the login page, the first thing we choose is the portal — and each one authenticates the way its users actually work.

A farmer signs in with a **mobile number and a one-time password**. An institution signs in with an **institution ID and password**.

*[Choose Livestock Owner → Continue → enter `9876543210` → Send OTP → `123456` → Verify]*

Let's enter as a farmer.

---

## 3 · Livestock Owner portal (1:20 – 2:30)

*[Lands on `/user/farmer/home`]*

This is the farmer's home screen. It greets the user by name, flags the animals that need attention, and — importantly — shows **offline mode**. In low-connectivity villages, reports are saved on the device and sync automatically when signal returns.

*[Click **Report Symptom** → pick **Bhuri** → tap two symptoms → submit]*

Reporting is icon-based and takes three steps: select the animal, select the symptoms, and receive an **AI-assisted diagnosis with a confidence score**. A farmer who cannot read English can complete this.

*[Click **My Animals**, then **Alerts**]*

Every animal has a health card with its vaccination history. Advisories reach the farmer in their own language — here in English, Hindi and Gujarati.

*[Click **Vaccination Schedule**, then open a case from the home screen]*

Vaccination Schedule tracks herd compliance, and Case Status shows the live timeline of a report — reported, under review, sent to the lab, treated, resolved — along with the vet's advice.

*[Open the account menu → note Settings, Help, Log out]*

---

## 4 · The veterinarian (2:30 – 2:55)

*[Sign out → demo access → **Veterinarian** under Livestock Owner]*

The case we just reported has already reached the veterinary officer. Here is the **priority case queue**, the AI assessment with its confidence score, and **Field Visits** with a day plan and route.

*[Optional: open the new case → set the risk level → save]* The farmer gets a notification about the assessment straight away.

---

## 5 · Veterinary Hospital portal (2:55 – 3:25)

*[Sign out → sign in to the Veterinary Hospital portal as **Hospital Ward**]*

Now the institutional side.

This is the **Ward Dashboard** — a digital herd view of every animal admitted, colour-coded by status, with a district risk banner at the top. Wards report symptoms the same way a farmer does, and escalate samples to the laboratory.

*[Demo access → **Lab Tech** under Veterinary Hospital]*

The laboratory receives those samples in a priority-sorted queue, and results flow back into the same case record.

---

## 6 · Government dashboards (3:25 – 4:20)

*[Demo access → **Official** under Veterinary Hospital → `/hospital/official/overview`]*

At the top of the chain, the state official. The **Overview** gives live surveillance numbers for their state, Gujarat — including the case we reported a minute ago.

*[Click **Risk Map**]*

The **Risk Map** shows AI-generated risk scores by state and district.

*[Click **Outbreak Clusters**]*

**Outbreak Clusters** is where the system earns its keep. It detects emerging clusters from symptom density, time windows and movement data — flagging an outbreak before anyone has formally reported one. This is the connection that is extremely difficult to spot manually.

*[Click **Analytics**, then **Reports**]*

Analytics provides seasonal forecasting, and Reports generates district and block-level summaries for policy review.

*[Demo access → **Admin**]*

Administrators manage users, regional alert thresholds, and system health — including the offline sync queue.

---

## 7 · Close (4:20 – 4:45)

*[Open the AI assistant bubble]*

Throughout both portals, an AI assistant helps users interact with their case data.

That is PawVita — one platform that turns a symptom noticed in a village into a coordinated district response. Earlier detection, faster treatment, and lower livestock mortality.

Thank you.

---

## Presenter notes

### Setup

```bash
# Terminal 1 — the API, on fresh demo data
cd server
cp .env.example .env          # once; fixes the demo OTP at 123456
rm -rf .data                  # optional: wipe the previous run's reports
npm run db:seed -- --demo
npm run dev

# Terminal 2 — the app
npm run dev                   # http://localhost:5173
```

Everything in the demo is saved for real, so reseed before each recording (stop
the API first) to start from the same state.

**Navigating fast.** The sign-in page has a **Demo access** panel at the bottom with one-click entry as a seeded demo user for every role. Use it for every jump after the first login — only demo the full OTP flow once, at step 2.

**Ten role dashboards, five shown.** Both portals carry Official, Lab and Admin areas. The script walks them through the *hospital* portal so the story climbs one chain: ward → lab → district → admin. If asked, note that the owner portal mirrors these with its own district-level views.

**Worth mentioning if you have spare time**
- Each portal loads on demand — a farmer on a village connection never downloads the hospital application.
- Reports work offline and over IVR, so a feature phone is enough.
- Advisories are issued in the language the user registered in.

**If a question comes up**
- *Is the login real?* Yes. Sign-in goes through the PawVita API (Supabase Auth in production), and reports, assessments, lab results and advisories are stored in Postgres, so what one role does shows up for the others. The demo panel just signs in as seeded demo accounts.
- *Is the AI real?* Not yet. The diagnosis, risk map, outbreak clusters, forecast and assistant show sample output while the AI layer is built. The API already has the hook they will plug into.
- *Why two portals?* Villages and institutions have different devices, literacy assumptions and authentication needs, but need the same case record.

**Timing.** Spoken content is about 4 minutes 15 seconds at a normal pace; the rest is clicks and page loads. If you run long, cut step 4 (the veterinarian) — the case timeline in step 3 already implies it.
