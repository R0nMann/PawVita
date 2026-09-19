import { eq } from "drizzle-orm";
import type { Db } from "./client.js";
import { diseases, regions, symptoms, vaccines, type SPECIES } from "./schema.js";

type Species = (typeof SPECIES)[number];

/**
 * Reference catalogues the app cannot work without. Symptom codes are what the
 * PWA's icon grid submits, so they must be stable; labels and translations can
 * be edited later.
 *
 * Translations are a starting point and should be reviewed by native speakers.
 */

export const SYMPTOMS: {
  code: string;
  name: string;
  category: string;
  icon: string;
  translations: Record<string, string>;
}[] = [
  { code: "fever", name: "High fever", category: "systemic", icon: "🌡️", translations: { hi: "तेज़ बुखार", gu: "તીવ્ર તાવ" } },
  { code: "lethargy", name: "Lethargy / weakness", category: "systemic", icon: "😴", translations: { hi: "सुस्ती / कमज़ोरी", gu: "સુસ્તી / નબળાઈ" } },
  { code: "loss_of_appetite", name: "Loss of appetite", category: "systemic", icon: "🚫", translations: { hi: "भूख न लगना", gu: "ભૂખ ન લાગવી" } },
  { code: "weight_loss", name: "Weight loss", category: "systemic", icon: "⚖️", translations: { hi: "वज़न घटना", gu: "વજન ઘટવું" } },
  { code: "swollen_lymph_nodes", name: "Swollen lymph nodes", category: "systemic", icon: "🔴", translations: { hi: "सूजी हुई गाँठें", gu: "લસિકા ગાંઠોમાં સોજો" } },
  { code: "sudden_death", name: "Sudden death in the herd", category: "systemic", icon: "⚠️", translations: { hi: "झुंड में अचानक मृत्यु", gu: "ટોળામાં અચાનક મૃત્યુ" } },
  { code: "bleeding_openings", name: "Bleeding from nose, mouth or anus", category: "systemic", icon: "🩸", translations: { hi: "नाक, मुँह या गुदा से खून", gu: "નાક, મોં કે ગુદામાંથી લોહી" } },
  { code: "blisters", name: "Blisters on mouth, tongue or feet", category: "oral", icon: "🦷", translations: { hi: "मुँह, जीभ या खुर पर छाले", gu: "મોં, જીભ કે પગ પર ફોલ્લા" } },
  { code: "drooling", name: "Excessive drooling", category: "oral", icon: "💧", translations: { hi: "अत्यधिक लार", gu: "વધુ પડતી લાળ" } },
  { code: "mouth_sores", name: "Mouth sores / erosions", category: "oral", icon: "👄", translations: { hi: "मुँह में घाव", gu: "મોંમાં ચાંદા" } },
  { code: "lameness", name: "Limping / lameness", category: "locomotory", icon: "🦵", translations: { hi: "लंगड़ाना", gu: "લંગડાવું" } },
  { code: "muscle_swelling", name: "Hot swelling on thigh or shoulder", category: "locomotory", icon: "🔥", translations: { hi: "जांघ या कंधे पर गर्म सूजन", gu: "જાંઘ કે ખભા પર ગરમ સોજો" } },
  { code: "breathing_difficulty", name: "Difficulty breathing", category: "respiratory", icon: "😮", translations: { hi: "सांस लेने में कठिनाई", gu: "શ્વાસ લેવામાં તકલીફ" } },
  { code: "nasal_discharge", name: "Nasal discharge", category: "respiratory", icon: "🤧", translations: { hi: "नाक से स्राव", gu: "નાકમાંથી સ્ત્રાવ" } },
  { code: "coughing", name: "Coughing", category: "respiratory", icon: "💨", translations: { hi: "खांसी", gu: "ઉધરસ" } },
  { code: "throat_swelling", name: "Swelling of throat or neck", category: "respiratory", icon: "🧣", translations: { hi: "गले या गर्दन में सूजन", gu: "ગળા કે ગરદનમાં સોજો" } },
  { code: "skin_nodules", name: "Skin nodules / lumps", category: "skin", icon: "🔵", translations: { hi: "त्वचा पर गांठें", gu: "ચામડી પર ગાંઠો" } },
  { code: "warts", name: "Warts / skin growths", category: "skin", icon: "🟤", translations: { hi: "मस्से", gu: "મસા" } },
  { code: "diarrhea", name: "Diarrhoea", category: "digestive", icon: "💩", translations: { hi: "दस्त", gu: "ઝાડા" } },
  { code: "bloating", name: "Bloating", category: "digestive", icon: "🎈", translations: { hi: "पेट फूलना", gu: "આફરો" } },
  { code: "reduced_milk", name: "Reduced milk yield", category: "production", icon: "🍼", translations: { hi: "दूध उत्पादन में कमी", gu: "દૂધ ઉત્પાદનમાં ઘટાડો" } },
  { code: "udder_swelling", name: "Swollen or hard udder", category: "production", icon: "🐄", translations: { hi: "थन में सूजन", gu: "આંચળમાં સોજો" } },
  { code: "abnormal_milk", name: "Clots or blood in milk", category: "production", icon: "🥛", translations: { hi: "दूध में थक्के या खून", gu: "દૂધમાં ગઠ્ઠા કે લોહી" } },
  { code: "abortion", name: "Abortion", category: "reproductive", icon: "🤰", translations: { hi: "गर्भपात", gu: "ગર્ભપાત" } },
  { code: "eye_discharge", name: "Eye discharge", category: "sensory", icon: "👁️", translations: { hi: "आँख से स्राव", gu: "આંખમાંથી સ્ત્રાવ" } },
];

const BOVINE: Species[] = ["cattle", "buffalo"];
const SMALL_RUMINANT: Species[] = ["goat", "sheep"];
const LIVESTOCK: Species[] = ["cattle", "buffalo", "goat", "sheep", "pig"];

/**
 * `notifiable` follows the schedule of the Prevention and Control of
 * Infectious and Contagious Diseases in Animals Act, 2009 (and later
 * additions such as LSD). Confirm against current state notifications.
 */
export const DISEASES: {
  code: string;
  name: string;
  notifiable: boolean;
  species: Species[];
  translations: Record<string, string>;
}[] = [
  { code: "fmd", name: "Foot-and-Mouth Disease", notifiable: true, species: LIVESTOCK, translations: { hi: "खुरपका-मुँहपका रोग", gu: "ખરવા-મોવાસા" } },
  { code: "lsd", name: "Lumpy Skin Disease", notifiable: true, species: BOVINE, translations: { hi: "लम्पी त्वचा रोग", gu: "લમ્પી ચામડી રોગ" } },
  { code: "hs", name: "Haemorrhagic Septicaemia", notifiable: true, species: BOVINE, translations: { hi: "गलघोंटू" } },
  { code: "bq", name: "Black Quarter (Blackleg)", notifiable: true, species: BOVINE, translations: { hi: "लंगड़ी रोग (ब्लैक क्वार्टर)" } },
  { code: "anthrax", name: "Anthrax", notifiable: true, species: [...LIVESTOCK, "horse"], translations: { hi: "गिल्टी रोग (एंथ्रेक्स)" } },
  { code: "brucellosis", name: "Brucellosis", notifiable: true, species: LIVESTOCK, translations: { hi: "ब्रुसेलोसिस (संक्रामक गर्भपात)" } },
  { code: "ppr", name: "Peste des Petits Ruminants (PPR)", notifiable: true, species: SMALL_RUMINANT, translations: { hi: "पीपीआर (बकरी प्लेग)" } },
  { code: "sheep_goat_pox", name: "Sheep and Goat Pox", notifiable: true, species: SMALL_RUMINANT, translations: { hi: "भेड़ और बकरी चेचक" } },
  { code: "avian_influenza", name: "Avian Influenza", notifiable: true, species: ["poultry"], translations: { hi: "बर्ड फ्लू" } },
  { code: "ranikhet", name: "Ranikhet (Newcastle Disease)", notifiable: true, species: ["poultry"], translations: { hi: "रानीखेत" } },
  { code: "asf", name: "African Swine Fever", notifiable: true, species: ["pig"], translations: { hi: "अफ्रीकी स्वाइन बुखार" } },
  { code: "csf", name: "Classical Swine Fever", notifiable: true, species: ["pig"], translations: { hi: "क्लासिकल स्वाइन बुखार" } },
  { code: "rabies", name: "Rabies", notifiable: true, species: [...LIVESTOCK, "horse", "camel"], translations: { hi: "रेबीज़" } },
  { code: "theileriosis", name: "Theileriosis", notifiable: false, species: BOVINE, translations: { hi: "थिलेरियोसिस" } },
  { code: "mastitis", name: "Mastitis", notifiable: false, species: [...BOVINE, ...SMALL_RUMINANT], translations: { hi: "थनैला रोग" } },
  { code: "papillomatosis", name: "Bovine Papillomatosis", notifiable: false, species: BOVINE, translations: { hi: "मस्से (पैपिलोमैटोसिस)" } },
  { code: "brd", name: "Bovine Respiratory Disease", notifiable: false, species: BOVINE, translations: { hi: "श्वसन रोग" } },
  { code: "enterotoxaemia", name: "Enterotoxaemia", notifiable: false, species: SMALL_RUMINANT, translations: { hi: "एंटरोटॉक्सीमिया" } },
];

/**
 * Booster intervals follow common national programme schedules (e.g. NADCP
 * six-monthly FMD). Null means a single dose or a schedule the vet sets case
 * by case — pass `nextDueOn` explicitly when recording those.
 */
export const VACCINES: {
  code: string;
  name: string;
  diseaseCodes: string[];
  species: Species[];
  boosterIntervalDays: number | null;
}[] = [
  { code: "fmd", name: "FMD vaccine (O, A, Asia-1)", diseaseCodes: ["fmd"], species: LIVESTOCK, boosterIntervalDays: 180 },
  { code: "hs", name: "HS vaccine", diseaseCodes: ["hs"], species: BOVINE, boosterIntervalDays: 365 },
  { code: "bq", name: "BQ vaccine", diseaseCodes: ["bq"], species: BOVINE, boosterIntervalDays: 365 },
  { code: "hs_bq", name: "HS + BQ combined vaccine", diseaseCodes: ["hs", "bq"], species: BOVINE, boosterIntervalDays: 365 },
  { code: "brucella_s19", name: "Brucella S19 (female calves)", diseaseCodes: ["brucellosis"], species: BOVINE, boosterIntervalDays: null },
  { code: "lsd", name: "LSD vaccine", diseaseCodes: ["lsd"], species: BOVINE, boosterIntervalDays: 365 },
  { code: "ppr", name: "PPR vaccine", diseaseCodes: ["ppr"], species: SMALL_RUMINANT, boosterIntervalDays: 1095 },
  { code: "sheep_goat_pox", name: "Sheep / goat pox vaccine", diseaseCodes: ["sheep_goat_pox"], species: SMALL_RUMINANT, boosterIntervalDays: 365 },
  { code: "enterotoxaemia", name: "Enterotoxaemia (ET) vaccine", diseaseCodes: ["enterotoxaemia"], species: SMALL_RUMINANT, boosterIntervalDays: 365 },
  { code: "anthrax", name: "Anthrax spore vaccine", diseaseCodes: ["anthrax"], species: LIVESTOCK, boosterIntervalDays: 365 },
  { code: "theileriosis", name: "Theileriosis vaccine", diseaseCodes: ["theileriosis"], species: BOVINE, boosterIntervalDays: null },
  { code: "ranikhet", name: "Ranikhet (ND) vaccine", diseaseCodes: ["ranikhet"], species: ["poultry"], boosterIntervalDays: null },
  { code: "csf", name: "Classical swine fever vaccine", diseaseCodes: ["csf"], species: ["pig"], boosterIntervalDays: 365 },
  { code: "rabies", name: "Anti-rabies vaccine", diseaseCodes: ["rabies"], species: [...LIVESTOCK, "horse", "camel"], boosterIntervalDays: 365 },
];

/**
 * Insert any missing catalogue entries and the national root region. Existing
 * rows are left alone so edits made in production survive restarts; pass
 * `refresh` to overwrite them with the values above.
 */
export async function seedCatalog(db: Db, options: { refresh?: boolean } = {}) {
  for (const s of SYMPTOMS) {
    const q = db.insert(symptoms).values(s);
    await (options.refresh ? q.onConflictDoUpdate({ target: symptoms.code, set: s }) : q.onConflictDoNothing());
  }
  for (const d of DISEASES) {
    const q = db.insert(diseases).values(d);
    await (options.refresh ? q.onConflictDoUpdate({ target: diseases.code, set: d }) : q.onConflictDoNothing());
  }
  for (const v of VACCINES) {
    const q = db.insert(vaccines).values(v);
    await (options.refresh ? q.onConflictDoUpdate({ target: vaccines.code, set: v }) : q.onConflictDoNothing());
  }
  const [india] = await db.select({ id: regions.id }).from(regions).where(eq(regions.code, "IN"));
  if (!india) await db.insert(regions).values({ name: "India", level: "country", code: "IN", lat: 22.35, lng: 78.67 });
}
