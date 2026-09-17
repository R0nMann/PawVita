/**
 * Marketing-surface data for the shared shell (landing, about, how-it-works).
 *
 * Kept separate from either portal's mock data so the public site does not reach
 * into `src/apps/*` — the two portals own their own fixtures.
 */

export const NETWORK_STATS = {
  registeredFarmers: 248650,
  activeCases: 1847,
  outbreaksControlled: 3920,
  vaccinationCoverage: 78,
  animalsTracked: 4200000,
  vetOfficers: 12400,
};

export const OUTBREAK_TICKER = [
  { id: 1, state: "Rajasthan", district: "Bikaner", disease: "FMD", severity: "high", time: "2h ago" },
  { id: 2, state: "Uttar Pradesh", district: "Varanasi", disease: "LSD", severity: "medium", time: "4h ago" },
  { id: 3, state: "Gujarat", district: "Kutch", disease: "HS", severity: "low", time: "6h ago" },
  { id: 4, state: "Punjab", district: "Ludhiana", disease: "BRD", severity: "medium", time: "8h ago" },
  { id: 5, state: "Maharashtra", district: "Nashik", disease: "FMD", severity: "high", time: "10h ago" },
  { id: 6, state: "Haryana", district: "Hisar", disease: "Anthrax", severity: "high", time: "12h ago" },
];

export const DISEASE_TREND = [
  { month: "Jul", FMD: 42, LSD: 18, HS: 24 },
  { month: "Aug", FMD: 56, LSD: 22, HS: 19 },
  { month: "Sep", FMD: 63, LSD: 31, HS: 21 },
  { month: "Oct", FMD: 48, LSD: 28, HS: 16 },
  { month: "Nov", FMD: 38, LSD: 24, HS: 14 },
  { month: "Dec", FMD: 52, LSD: 20, HS: 18 },
  { month: "Jan", FMD: 71, LSD: 15, HS: 22 },
];

export const ACTIVE_CLUSTERS = [
  {
    id: "CLU001",
    disease: "Foot-and-Mouth Disease",
    state: "Rajasthan",
    district: "Bikaner",
    casesCount: 47,
    confidence: 92,
    radius: 35,
    trend: "rising" as const,
    lastUpdated: "2h ago",
  },
  {
    id: "CLU002",
    disease: "Lumpy Skin Disease",
    state: "Gujarat",
    district: "Kutch",
    casesCount: 29,
    confidence: 87,
    radius: 28,
    trend: "stable" as const,
    lastUpdated: "5h ago",
  },
  {
    id: "CLU003",
    disease: "Hemorrhagic Septicemia",
    state: "Uttar Pradesh",
    district: "Varanasi",
    casesCount: 18,
    confidence: 78,
    radius: 22,
    trend: "declining" as const,
    lastUpdated: "9h ago",
  },
];

export const JOURNEY = [
  {
    step: "01",
    title: "Report",
    desc: "A farmer picks symptoms from an icon-based form in their own language. It works offline and syncs when signal returns.",
  },
  {
    step: "02",
    title: "Triage",
    desc: "Rule-based and AI-assisted triage suggests a likely disease with a confidence score and routes the case to the nearest vet.",
  },
  {
    step: "03",
    title: "Respond",
    desc: "The veterinary hospital admits or visits the animal, logs treatment, and escalates samples to the district laboratory.",
  },
  {
    step: "04",
    title: "Contain",
    desc: "Geospatial clustering flags an emerging outbreak. District officials issue advisories and mobilise vaccination drives.",
  },
];

export const TESTIMONIALS = [
  {
    name: "Ramesh Kumar",
    role: "Dairy Farmer",
    location: "Anand, Gujarat",
    quote:
      "PawVita saved six of my cows. I can call a veterinarian from my own phone now, without travelling to the block office.",
    avatar: "R",
  },
  {
    name: "Dr. Meera Patel",
    role: "Veterinary Officer",
    location: "Kutch, Gujarat",
    quote:
      "The disease map changed how I prioritise field visits. I cover three times as many cases in a week as I used to.",
    avatar: "M",
  },
  {
    name: "Shri Arun Verma",
    role: "District Animal Husbandry Officer",
    location: "Varanasi, Uttar Pradesh",
    quote:
      "For the first time I have a live view of every case in my district. Policy decisions are finally evidence-based.",
    avatar: "A",
  },
];

export const OUTCOMES = [
  { metric: "72%", label: "faster reporting", detail: "Median time from first symptom to a logged report" },
  { metric: "4.1 days", label: "earlier detection", detail: "Average lead time gained on cluster identification" },
  { metric: "+19 pts", label: "vaccination coverage", detail: "Across districts running a full surveillance cycle" },
  { metric: "31%", label: "lower mortality", detail: "In herds where a case was escalated within 24 hours" },
];
