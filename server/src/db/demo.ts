import { eq, inArray, or, sql } from "drizzle-orm";
import type { Deps } from "../deps.js";
import { recordCaseEvent } from "../services/case-workflow.js";
import {
  animals,
  cases,
  caseSymptoms,
  fieldVisits,
  herds,
  labRequests,
  organizations,
  regions,
  treatments,
  users,
  vaccinations,
  advisories,
} from "./schema.js";

/**
 * Demo dataset for development and the SIH walkthrough — the people and
 * animals from the frontend's mock data, spread over a small slice of the
 * region hierarchy. Creates real sign-in identities in the auth provider.
 */

export const DEMO_PASSWORD = "PawVita@2026";

/** Villages from the national hierarchy that the demo's farmers live in. */
const VADOD = "GJ-ANAND-ANAND-VADOD";
const CHANGA = "GJ-ANAND-PETLAD-CHANGA";

function daysFromToday(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** A demo person that must exist for the dataset to mean anything. */
const MARKER_EMAIL = "ramesh.kumar@demo.pawvita.in";

export async function seedDemo(deps: Deps) {
  const { db, auth } = deps;
  // Skip only when this dataset is already loaded. An unrelated account — an
  // administrator created by hand, say — must not stop the demo seeding.
  const [already] = await db.select({ id: users.id }).from(users).where(eq(users.email, MARKER_EMAIL));
  if (already) return { skipped: true as const };

  // Regions -------------------------------------------------------------------
  // The national hierarchy comes from the catalogue seed; the demo only points
  // at the slice of it these people live and work in.
  const byCode = new Map<string, string>();
  for (const r of await db.select({ id: regions.id, code: regions.code }).from(regions)) {
    if (r.code) byCode.set(r.code, r.id);
  }
  const region = (code: string) => {
    const id = byCode.get(code);
    if (!id) throw new Error(`Demo seed: region ${code} is missing — seed the catalogue first.`);
    return id;
  };
  const india = region("IN");

  // Organisations -------------------------------------------------------------
  // Codes are unique and organisations outlive the people in them, so reuse any
  // that are already there rather than colliding on a second run.
  const orgSeed: (typeof organizations.$inferInsert)[] = [
    { type: "hospital", name: "District Veterinary Hospital, Anand", code: "vh-anand-01", regionId: region("GJ-ANAND"), phone: "+912692250000" },
    { type: "lab", name: "Disease Diagnostic Laboratory, Anand", code: "lab-anand-01", regionId: region("GJ-ANAND") },
    { type: "hospital", name: "Veterinary Polyclinic, Pune", code: "vh-pune-01", regionId: region("MH-PUNE") },
    { type: "department", name: "Animal Husbandry Department, Gujarat", code: "ahd-gujarat", regionId: region("GJ") },
  ];
  const presentOrgs = await db
    .select()
    .from(organizations)
    .where(inArray(organizations.code, orgSeed.map((o) => o.code!)));
  const newOrgs = orgSeed.filter((o) => !presentOrgs.some((e) => e.code === o.code));
  const orgs = [...presentOrgs, ...(newOrgs.length ? await db.insert(organizations).values(newOrgs).returning() : [])];
  const org = (code: string) => orgs.find((o) => o.code === code)!.id;

  // People (with sign-in identities) -----------------------------------------
  const people: {
    key: string;
    fullName: string;
    role: (typeof users.$inferInsert)["role"];
    email?: string;
    username?: string;
    phone?: string;
    regionId: string;
    organizationId?: string;
    preferredLanguage?: string;
  }[] = [
    { key: "admin", fullName: "PawVita Administrator", role: "admin", email: "admin@pawvita.in", username: "admin", regionId: india },
    { key: "ramesh", fullName: "Ramesh Kumar", role: "farmer", email: "ramesh.kumar@demo.pawvita.in", phone: "+919876543210", regionId: region(VADOD), preferredLanguage: "gu" },
    { key: "sunita", fullName: "Sunita Devi", role: "farmer", email: "sunita.devi@demo.pawvita.in", phone: "+919876543214", regionId: region(CHANGA), preferredLanguage: "hi" },
    { key: "kiran", fullName: "Kiran Patel", role: "field_worker", email: "kiran.patel@demo.pawvita.in", phone: "+919876543216", regionId: region("GJ-ANAND-ANAND") },
    { key: "meera", fullName: "Dr. Meera Patel", role: "vet", email: "meera.patel@pawvita.in", username: "dr.meera", phone: "+919876543211", regionId: region("GJ-ANAND"), organizationId: org("vh-anand-01") },
    { key: "anil", fullName: "Dr. Anil Singh", role: "vet", email: "anil.singh@pawvita.in", username: "dr.anil", phone: "+919876543215", regionId: region("MH-PUNE"), organizationId: org("vh-pune-01") },
    { key: "ward", fullName: "Ramnath Yadav", role: "ward_staff", email: "ward.anand@pawvita.in", username: "vh-anand-01", regionId: region("GJ-ANAND"), organizationId: org("vh-anand-01") },
    { key: "lab", fullName: "Priya Sharma", role: "lab_tech", email: "lab.anand@pawvita.in", username: "lab-anand-01", regionId: region("GJ-ANAND"), organizationId: org("lab-anand-01") },
    { key: "arun", fullName: "Arun Verma", role: "official", email: "arun.verma@pawvita.in", username: "ahd-gujarat", phone: "+919876543212", regionId: region("GJ"), organizationId: org("ahd-gujarat") },
  ];
  const ids: Record<string, string> = {};
  for (const p of people) {
    // Someone may already hold this email or staff ID — an administrator made
    // by hand, for instance. Point the dataset at them rather than duplicating.
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(or(p.email ? eq(users.email, p.email) : undefined, p.username ? eq(users.username, p.username) : undefined));
    if (taken) {
      ids[p.key] = taken.id;
      continue;
    }
    const { authUserId } = await auth.adminCreateUser({
      email: p.email,
      phone: p.phone,
      password: p.email ? DEMO_PASSWORD : undefined,
    });
    const [u] = await db
      .insert(users)
      .values({
        authUserId,
        role: p.role,
        status: "active",
        fullName: p.fullName,
        email: p.email,
        username: p.username,
        phone: p.phone,
        regionId: p.regionId,
        organizationId: p.organizationId,
        preferredLanguage: p.preferredLanguage ?? "en",
        // A walkthrough has no inbox to read a sign-in code from.
        twoFactorExempt: true,
        approvedAt: new Date(),
      })
      .returning({ id: users.id });
    ids[p.key] = u!.id;
  }

  // Herds and animals -----------------------------------------------------------
  const herdOf = async (name: string, ownerKey: string, villageCode: string, createdBy = ownerKey) => {
    const [v] = await db.select().from(regions).where(eq(regions.id, region(villageCode)));
    const [h] = await db
      .insert(herds)
      .values({
        name,
        ownerId: ids[ownerKey]!,
        regionId: v!.id,
        stateId: v!.stateId,
        districtId: v!.districtId,
        blockId: v!.blockId,
        villageId: v!.villageId,
        lat: v!.lat,
        lng: v!.lng,
        createdById: ids[createdBy]!,
      })
      .returning();
    return h!;
  };
  const rameshHerd = await herdOf("Ramesh Kumar Dairy", "ramesh", VADOD);
  const sunitaHerd = await herdOf("Sunita Devi's cattle", "sunita", CHANGA, "kiran");

  const animalRows = await db
    .insert(animals)
    .values([
      { herdId: rameshHerd.id, name: "Kali", tagNumber: "GJ-TG-100001", species: "cattle", breed: "Gir", sex: "female", birthDate: daysFromToday(-5 * 365), createdById: ids.ramesh! },
      { herdId: rameshHerd.id, name: "Dholi", tagNumber: "GJ-TG-100002", species: "buffalo", breed: "Murrah", sex: "female", birthDate: daysFromToday(-3 * 365), status: "under_treatment", createdById: ids.ramesh! },
      { herdId: rameshHerd.id, name: "Bhuri", tagNumber: "GJ-TG-100003", species: "cattle", breed: "HF Cross", sex: "female", birthDate: daysFromToday(-7 * 365), createdById: ids.ramesh! },
      { herdId: rameshHerd.id, name: "Lali", tagNumber: "GJ-TG-100004", species: "goat", breed: "Sirohi", sex: "female", birthDate: daysFromToday(-2 * 365), status: "sick", createdById: ids.ramesh! },
      { herdId: rameshHerd.id, name: "Nandi", tagNumber: "GJ-TG-100005", species: "cattle", breed: "Sahiwal", sex: "male", birthDate: daysFromToday(-4 * 365), createdById: ids.ramesh! },
      { herdId: rameshHerd.id, name: "Chetak", tagNumber: "GJ-TG-100006", species: "cattle", breed: "Tharparkar", sex: "male", birthDate: daysFromToday(-6 * 365), createdById: ids.ramesh! },
      { herdId: sunitaHerd.id, name: "Gauri", tagNumber: "GJ-TG-200001", species: "cattle", breed: "Kankrej", sex: "female", birthDate: daysFromToday(-4 * 365), status: "sick", createdById: ids.kiran! },
      { herdId: sunitaHerd.id, name: "Moti", tagNumber: "GJ-TG-200002", species: "buffalo", breed: "Surti", sex: "female", birthDate: daysFromToday(-5 * 365), createdById: ids.kiran! },
    ])
    .returning();
  const animal = (name: string) => animalRows.find((a) => a.name === name)!;

  // Vaccinations: a mix of up-to-date, due soon and overdue ------------------------
  await db.insert(vaccinations).values([
    { animalId: animal("Kali").id, vaccineCode: "fmd", administeredOn: daysFromToday(-150), nextDueOn: daysFromToday(30), administeredById: ids.meera, recordedById: ids.meera! },
    { animalId: animal("Dholi").id, vaccineCode: "fmd", administeredOn: daysFromToday(-175), nextDueOn: daysFromToday(5), administeredById: ids.meera, recordedById: ids.meera! },
    { animalId: animal("Bhuri").id, vaccineCode: "hs_bq", administeredOn: daysFromToday(-300), nextDueOn: daysFromToday(65), administeredById: ids.meera, recordedById: ids.meera! },
    { animalId: animal("Lali").id, vaccineCode: "ppr", administeredOn: daysFromToday(-400), nextDueOn: daysFromToday(695), recordedById: ids.ramesh! },
    { animalId: animal("Chetak").id, vaccineCode: "fmd", administeredOn: daysFromToday(-200), nextDueOn: daysFromToday(-20), recordedById: ids.ramesh! },
    { animalId: animal("Gauri").id, vaccineCode: "fmd", administeredOn: daysFromToday(-220), nextDueOn: daysFromToday(-40), recordedById: ids.kiran! },
  ]);

  // Cases in different stages of the workflow ----------------------------------
  const newCase = async (values: Partial<typeof cases.$inferInsert> & { herd: typeof rameshHerd; reporter: string; symptoms: string[]; daysAgo: number }) => {
    const { herd, reporter, symptoms, daysAgo, ...rest } = values;
    const at = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const [c] = await db
      .insert(cases)
      .values({
        caseNumber: sql`'PV-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYY') || '-' || lpad(nextval('pawvita.case_number_seq')::text, 6, '0')`,
        herdId: herd.id,
        reportedById: ids[reporter]!,
        regionId: herd.regionId,
        stateId: herd.stateId,
        districtId: herd.districtId,
        blockId: herd.blockId,
        villageId: herd.villageId,
        lat: herd.lat,
        lng: herd.lng,
        reportedAt: at,
        createdAt: at,
        ...rest,
      })
      .returning();
    await db.insert(caseSymptoms).values(symptoms.map((symptomCode) => ({ caseId: c!.id, symptomCode })));
    await recordCaseEvent(db, { caseId: c!.id, type: "created", actorId: ids[reporter]!, visibleToReporter: true, data: { symptomCodes: symptoms } });
    return c!;
  };

  // 1. Lali — fresh report, nobody has looked yet.
  await newCase({
    herd: rameshHerd, reporter: "ramesh", daysAgo: 0, animalId: animal("Lali").id,
    symptoms: ["blisters", "lameness", "drooling", "loss_of_appetite"],
    description: "Blisters on mouth and limping since yesterday. Saliva dripping. Not eating.",
  });

  // 2. Dholi — LSD under treatment, sample at the lab.
  const dholi = await newCase({
    herd: rameshHerd, reporter: "ramesh", daysAgo: 4, animalId: animal("Dholi").id,
    symptoms: ["skin_nodules", "fever", "loss_of_appetite"], status: "lab_pending", riskLevel: "moderate",
    suspectedDiseaseCode: "lsd", assignedVetId: ids.meera, assignedOrgId: org("vh-anand-01"),
    firstResponseAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
  });
  await db.insert(treatments).values({
    caseId: dholi.id, animalId: animal("Dholi").id, medicine: "Meloxicam", dosage: "0.5 mg/kg", route: "IM", frequency: "once daily",
    durationDays: 5, startDate: daysFromToday(-3), withdrawalPeriodDays: 5,
    instructions: "Keep Dholi separate from the herd. Spray insect repellent on the shed twice a day.", prescribedById: ids.meera!,
  });
  await db.insert(labRequests).values({
    requestNumber: sql`'LAB-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYY') || '-' || lpad(nextval('pawvita.lab_request_number_seq')::text, 6, '0')`,
    caseId: dholi.id, animalId: animal("Dholi").id, requestedById: ids.meera!, labOrgId: org("lab-anand-01"),
    sampleType: "Skin biopsy", tests: ["PCR for LSDV"], priority: "high", status: "received",
    collectedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), receivedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  });
  await recordCaseEvent(db, { caseId: dholi.id, type: "assigned", actorId: ids.meera!, body: "Dr. Meera Patel is handling this case.", visibleToReporter: true });
  await recordCaseEvent(db, { caseId: dholi.id, type: "status_changed", actorId: ids.meera!, fromStatus: "active", toStatus: "lab_pending", body: "Skin biopsy sent for PCR.", visibleToReporter: true });
  await db.insert(fieldVisits).values({
    caseId: dholi.id, herdId: rameshHerd.id, vetId: ids.meera!, type: "follow_up",
    scheduledAt: new Date(Date.now() + 26 * 60 * 60 * 1000), purpose: "LSD follow-up", createdById: ids.meera!,
  });

  // 3. Kali — resolved digestive upset.
  await newCase({
    herd: rameshHerd, reporter: "ramesh", daysAgo: 20, animalId: animal("Kali").id,
    symptoms: ["bloating", "reduced_milk"], status: "resolved", outcome: "recovered", riskLevel: "low",
    assignedVetId: ids.meera, resolvedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    firstResponseAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
  });

  // 4. Gauri — reported by the field worker; suspected HS, urgent.
  await newCase({
    herd: sunitaHerd, reporter: "kiran", daysAgo: 1, animalId: animal("Gauri").id,
    symptoms: ["fever", "throat_swelling", "breathing_difficulty"], status: "under_review", riskLevel: "high",
    suspectedDiseaseCode: "hs", assignedVetId: ids.meera, animalsAffected: 2,
    firstResponseAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
  });

  // Advisories ------------------------------------------------------------------
  await db.insert(advisories).values([
    {
      title: "FMD alert — Anand district",
      body: "Foot-and-mouth disease cases reported in Anand block. Keep animals confined and avoid shared water troughs.",
      translations: {
        hi: { title: "FMD चेतावनी — आणंद जिला", body: "आणंद ब्लॉक में FMD के मामले मिले हैं। पशुओं को बंद रखें और साझा पानी की टंकियों से बचें।" },
        gu: { title: "FMD ચેતવણી — આણંદ જિલ્લો", body: "આણંદ બ્લોકમાં FMD ના કેસ મળ્યા છે. પ્રાણીઓને બંધ રાખો અને સહિયારા પાણીના હવાડાથી બચો." },
      },
      severity: "high", category: "outbreak", regionId: region("GJ-ANAND"), diseaseCode: "fmd", publishedById: ids.arun!,
    },
    {
      title: "Free LSD vaccination camp",
      body: "Free lumpy skin disease vaccination at the District Veterinary Hospital, Anand, this Saturday. Bring the animal's ear-tag number.",
      translations: {
        hi: { title: "मुफ्त LSD टीकाकरण शिविर", body: "इस शनिवार जिला पशु चिकित्सालय, आणंद में लम्पी रोग का मुफ्त टीकाकरण। पशु का टैग नंबर साथ लाएँ।" },
        gu: { title: "મફત LSD રસીકરણ કેમ્પ", body: "આ શનિવારે જિલ્લા પશુ દવાખાના, આણંદ ખાતે લમ્પી રોગની મફત રસી. પ્રાણીનો ટેગ નંબર સાથે લાવો." },
      },
      severity: "moderate", category: "vaccination", regionId: region("GJ-ANAND"), diseaseCode: "lsd", publishedById: ids.meera!,
    },
  ]);

  return {
    skipped: false as const,
    password: DEMO_PASSWORD,
    accounts: people.map((p) => ({ role: p.role, name: p.fullName, login: p.username ?? p.email ?? p.phone, phone: p.phone })),
  };
}
