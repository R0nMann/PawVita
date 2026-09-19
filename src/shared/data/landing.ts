/**
 * Marketing-surface data for the shared shell (landing, about, how-it-works).
 *
 * Kept separate from either portal's data so the public site does not reach
 * into `src/apps/*`. Network totals, the alert ticker and the trend chart come
 * from the API's public endpoints; what remains here is page copy, plus the
 * AI-flagged clusters, which stand in for the AI layer until it exists.
 */

/** Stand-in AI output (see src/shared/ai/preview.ts). */
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
