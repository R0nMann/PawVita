/**
 * Stand-in AI output for the hospital portal's AI panels — the national
 * outbreak registry behind the risk map and cluster screens, AI state risk
 * scores, the 7-day forecast and the assistant's canned answers — until the
 * AI Intelligence Layer (architecture §6) exists. Everything else in this
 * portal reads the API. Symptom-based diagnoses live in src/shared/ai/preview.ts.
 */

export const OUTBREAKS = [
  { id: 1, disease: "Foot & Mouth Disease", district: "Pune, MH", severity: "high", date: "2026-09-14", species: "Cattle", cases: 47, status: "active" },
  { id: 2, disease: "Lumpy Skin Disease", district: "Jaipur, RJ", severity: "medium", date: "2026-09-13", species: "Cattle", cases: 23, status: "active" },
  { id: 3, disease: "Avian Influenza", district: "Ludhiana, PB", severity: "high", date: "2026-09-12", species: "Poultry", cases: 312, status: "active" },
  { id: 4, disease: "Brucellosis", district: "Karnal, HR", severity: "low", date: "2026-09-11", species: "Buffalo", cases: 8, status: "monitoring" },
  { id: 5, disease: "PPR", district: "Barmer, RJ", severity: "medium", date: "2026-09-10", species: "Goat/Sheep", cases: 67, status: "contained" },
  { id: 6, disease: "Swine Fever", district: "Guwahati, AS", severity: "high", date: "2026-09-09", species: "Swine", cases: 134, status: "active" },
  { id: 7, disease: "Hemorrhagic Septicemia", district: "Patna, BR", severity: "medium", date: "2026-09-08", species: "Cattle", cases: 19, status: "monitoring" },
  { id: 8, disease: "Theileriosis", district: "Nagpur, MH", severity: "low", date: "2026-09-07", species: "Cattle", cases: 5, status: "resolved" },
];

export const INDIA_STATES_RISK = [
  { state: "Maharashtra", risk: "high", score: 82, lat: 19.7515, lng: 75.7139, cases: 47 },
  { state: "Rajasthan", risk: "medium", score: 58, lat: 27.0238, lng: 74.2179, cases: 31 },
  { state: "Punjab", risk: "high", score: 76, lat: 31.1471, lng: 75.3412, cases: 65 },
  { state: "Uttar Pradesh", risk: "low", score: 34, lat: 26.8467, lng: 80.9462, cases: 19 },
  { state: "Assam", risk: "medium", score: 61, lat: 26.2006, lng: 92.9376, cases: 24 },
  { state: "Bihar", risk: "medium", score: 52, lat: 25.0961, lng: 85.3131, cases: 19 },
  { state: "Gujarat", risk: "low", score: 28, lat: 22.2587, lng: 71.1924, cases: 8 },
  { state: "Haryana", risk: "low", score: 41, lat: 29.0588, lng: 76.0856, cases: 8 },
  { state: "Karnataka", risk: "low", score: 22, lat: 15.3173, lng: 75.7139, cases: 4 },
  { state: "Tamil Nadu", risk: "low", score: 18, lat: 11.1271, lng: 78.6569, cases: 3 },
];

export const RISK_FORECAST = [
  { day: "Mon", risk: 62, weather: "rain" },
  { day: "Tue", risk: 71, weather: "humid" },
  { day: "Wed", risk: 85, weather: "storm" },
  { day: "Thu", risk: 79, weather: "humid" },
  { day: "Fri", risk: 68, weather: "cloud" },
  { day: "Sat", risk: 55, weather: "clear" },
  { day: "Sun", risk: 48, weather: "clear" },
];

export const CHATBOT_RESPONSES: Record<string, string> = {
  "fmd": "Foot & Mouth Disease (FMD) is a highly contagious viral disease affecting cloven-hoofed animals. Key symptoms: fever, blisters on mouth/feet, reduced milk output. Report immediately to PawVita.",
  "vaccination": "Vaccination schedules vary by species. Cattle need FMD vaccination every 6 months, HS+BQ annually. Check /hospital/vaccination-schedule for your specific animals.",
  "symptoms": "Common warning signs: fever, lethargy, reduced feed intake, abnormal discharge, skin lesions. Use the Report Symptom tool to submit a guided report.",
  "report": "To report a disease: Go to Report Symptom → select affected animal → describe symptoms using our icon-based guide → submit. A vet will be assigned within 4 hours.",
  "default": "I'm the PawVita AI Assistant. I can help with disease symptoms, vaccination schedules, case status, and reporting procedures. Ask me anything about livestock health!",
};
