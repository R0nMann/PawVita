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

export const TICKER_ALERTS = [
  "🔴 ALERT: FMD outbreak detected in Pune district — 47 cattle affected",
  "🟡 WATCH: Lumpy Skin Disease spreading in Jaipur — 23 new cases",
  "🔴 ALERT: Avian Influenza H5N1 confirmed in Ludhiana — containment initiated",
  "✅ RESOLVED: PPR outbreak in Barmer now fully contained",
  "🟡 WATCH: Swine Fever cases rising in Guwahati — 134 cases",
  "📋 UPDATE: Emergency vaccination drive launched in 12 districts",
  "🔬 LAB: Rapid diagnostic kits deployed to 48 field stations",
];

export const ANIMALS = [
  { id: "AN-001", name: "Kali", species: "Cow", breed: "Gir", age: "4 yrs", weight: "420kg", tag: "MH-TG-4821", status: "healthy", ward: "Ward A", admitted: "2026-08-10", vaccines: ["FMD", "HS", "BQ"], lastCheckup: "2026-09-10", owner: "Ratan Farm, Pune", photo: null },
  { id: "AN-002", name: "Motilal", species: "Buffalo", breed: "Murrah", age: "6 yrs", weight: "580kg", tag: "UP-TG-2201", status: "critical", ward: "ICU", admitted: "2026-09-12", vaccines: ["FMD", "HS"], lastCheckup: "2026-09-14", owner: "Sharma Dairy, Meerut", photo: null },
  { id: "AN-003", name: "Sundari", species: "Goat", breed: "Beetal", age: "2 yrs", weight: "35kg", tag: "PB-TG-9012", status: "recovering", ward: "Ward B", admitted: "2026-09-08", vaccines: ["PPR", "Enterotoxaemia"], lastCheckup: "2026-09-13", owner: "Kaur Livestock, Amritsar", photo: null },
  { id: "AN-004", name: "Raja", species: "Bull", breed: "Sahiwal", age: "5 yrs", weight: "650kg", tag: "RJ-TG-3301", status: "under-observation", ward: "Ward C", admitted: "2026-09-11", vaccines: ["FMD", "HS", "BQ"], lastCheckup: "2026-09-14", owner: "Meena Farm, Jaipur", photo: null },
  { id: "AN-005", name: "Chanda", species: "Sheep", breed: "Marwari", age: "3 yrs", weight: "45kg", tag: "RJ-TG-7712", status: "healthy", ward: "Ward B", admitted: "2026-09-05", vaccines: ["PPR"], lastCheckup: "2026-09-12", owner: "Bishnoi Livestock, Barmer", photo: null },
  { id: "AN-006", name: "Heera", species: "Cow", breed: "HF Cross", age: "3 yrs", weight: "380kg", tag: "MH-TG-6601", status: "critical", ward: "ICU", admitted: "2026-09-13", vaccines: ["FMD"], lastCheckup: "2026-09-14", owner: "Patil Dairy, Kolhapur", photo: null },
  { id: "AN-007", name: "Badal", species: "Horse", breed: "Marwari", age: "7 yrs", weight: "480kg", tag: "RJ-TG-1122", status: "healthy", ward: "Equine Ward", admitted: "2026-09-01", vaccines: ["EI", "Tetanus"], lastCheckup: "2026-09-10", owner: "Singh Stud Farm, Jodhpur", photo: null },
  { id: "AN-008", name: "Laxmi", species: "Buffalo", breed: "Surti", age: "5 yrs", weight: "520kg", tag: "GJ-TG-4432", status: "recovering", ward: "Ward A", admitted: "2026-09-09", vaccines: ["FMD", "HS"], lastCheckup: "2026-09-13", owner: "Patel Dairy, Anand", photo: null },
];

export const CASES = [
  {
    id: "CASE-2024-001",
    animalId: "AN-002",
    animalName: "Motilal",
    species: "Buffalo",
    disease: "Foot & Mouth Disease",
    status: "vet-assigned",
    severity: "critical",
    reportedAt: "2026-09-12T08:30:00",
    symptoms: ["Fever 104°F", "Blisters on tongue", "Lameness", "Reduced milk output"],
    assignedVet: "Dr. Priya Sharma",
    ward: "ICU",
    treatment: [
      { date: "2026-09-12", action: "Admitted to ICU, IV fluids started", doctor: "Dr. Priya Sharma" },
      { date: "2026-09-13", action: "Antiviral medication administered, wound care", doctor: "Dr. Priya Sharma" },
      { date: "2026-09-14", action: "Condition stable, monitoring continued", doctor: "Dr. Rajan Kumar" },
    ],
    labTests: ["Serum ELISA", "Virus isolation", "CBC"],
    aiDiagnosis: { disease: "Foot & Mouth Disease Type O", confidence: 94, aiNote: "Strong ELISA signal pattern consistent with FMD-O strain circulating in Maharashtra region." },
    notes: "High viral load detected. Strict biosecurity protocols enforced.",
  },
  {
    id: "CASE-2024-002",
    animalId: "AN-006",
    animalName: "Heera",
    species: "Cow",
    disease: "Lumpy Skin Disease",
    status: "reported",
    severity: "critical",
    reportedAt: "2026-09-13T14:15:00",
    symptoms: ["Skin nodules", "Fever 105°F", "Swollen lymph nodes", "Nasal discharge"],
    assignedVet: "Dr. Amit Patel",
    ward: "ICU",
    treatment: [
      { date: "2026-09-13", action: "Initial examination, skin biopsy taken", doctor: "Dr. Amit Patel" },
    ],
    labTests: ["PCR for LSDV", "Biopsy histopathology"],
    aiDiagnosis: { disease: "Lumpy Skin Disease", confidence: 91, aiNote: "Skin nodule distribution and fever pattern consistent with LSD. PCR confirmation pending." },
    notes: "Isolated from herd. Contact tracing initiated for source farm.",
  },
  {
    id: "CASE-2024-003",
    animalId: "AN-003",
    animalName: "Sundari",
    species: "Goat",
    disease: "PPR",
    status: "resolved",
    severity: "medium",
    reportedAt: "2026-09-08T10:00:00",
    symptoms: ["Mucopurulent nasal discharge", "Mouth erosions", "Diarrhea"],
    assignedVet: "Dr. Priya Sharma",
    ward: "Ward B",
    treatment: [
      { date: "2026-09-08", action: "Supportive therapy, antibiotics for secondary infection", doctor: "Dr. Priya Sharma" },
      { date: "2026-09-11", action: "Significant improvement, oral lesions healing", doctor: "Dr. Priya Sharma" },
      { date: "2026-09-14", action: "Recovered, ready for discharge", doctor: "Dr. Rajan Kumar" },
    ],
    labTests: ["AGID test", "PCR"],
    aiDiagnosis: { disease: "Peste des Petits Ruminants (PPR)", confidence: 88, aiNote: "Clinical presentation strongly consistent with PPR. Positive AGID confirmed." },
    notes: "Full recovery. Vaccination recommended for rest of herd.",
  },
];

export const VETS = [
  { id: "VET-001", name: "Dr. Priya Sharma", specialization: "Ruminant Medicine", cases: 12, available: true, phone: "+91 98765 43210", email: "priya.sharma@pashurakshak.in" },
  { id: "VET-002", name: "Dr. Amit Patel", specialization: "Infectious Diseases", cases: 8, available: true, phone: "+91 87654 32109", email: "amit.patel@pashurakshak.in" },
  { id: "VET-003", name: "Dr. Rajan Kumar", specialization: "Surgery & Orthopedics", cases: 5, available: false, phone: "+91 76543 21098", email: "rajan.kumar@pashurakshak.in" },
  { id: "VET-004", name: "Dr. Sunita Joshi", specialization: "Poultry Medicine", cases: 15, available: true, phone: "+91 65432 10987", email: "sunita.joshi@pashurakshak.in" },
];

export const SAMPLES = [
  { id: "LAB-2024-001", caseId: "CASE-2024-001", animalId: "AN-002", animalName: "Motilal", type: "Serum", disease: "FMD", collectedAt: "2026-09-12T09:00:00", status: "processing", priority: "urgent", requestedBy: "Dr. Priya Sharma", tests: ["ELISA", "Virus Isolation"] },
  { id: "LAB-2024-002", caseId: "CASE-2024-002", animalId: "AN-006", animalName: "Heera", type: "Biopsy", disease: "LSD", collectedAt: "2026-09-13T15:00:00", status: "pending", priority: "urgent", requestedBy: "Dr. Amit Patel", tests: ["PCR", "Histopathology"] },
  { id: "LAB-2024-003", caseId: "CASE-2024-003", animalId: "AN-003", animalName: "Sundari", type: "Nasal swab", disease: "PPR", collectedAt: "2026-09-08T10:30:00", status: "completed", priority: "normal", requestedBy: "Dr. Priya Sharma", tests: ["AGID", "PCR"], result: "POSITIVE — PPR virus detected" },
  { id: "LAB-2024-004", caseId: "CASE-2024-004", animalId: "AN-004", animalName: "Raja", type: "Blood", disease: "Theileriosis", collectedAt: "2026-09-11T11:00:00", status: "completed", priority: "normal", requestedBy: "Dr. Rajan Kumar", tests: ["Giemsa stain", "PCR"], result: "NEGATIVE — No piroplasms detected" },
  { id: "LAB-2024-005", caseId: "CASE-2024-005", animalId: "AN-001", animalName: "Kali", type: "Milk", disease: "Mastitis screening", collectedAt: "2026-09-14T08:00:00", status: "pending", priority: "routine", requestedBy: "Dr. Priya Sharma", tests: ["SCC", "Bacterial culture"] },
];

export const DISEASE_TREND_DATA = [
  { month: "Apr", fmd: 12, lsd: 4, ppr: 8, avian: 22, swine: 6 },
  { month: "May", fmd: 18, lsd: 7, ppr: 5, avian: 18, swine: 9 },
  { month: "Jun", fmd: 25, lsd: 12, ppr: 11, avian: 35, swine: 14 },
  { month: "Jul", fmd: 34, lsd: 19, ppr: 9, avian: 29, swine: 11 },
  { month: "Aug", fmd: 28, lsd: 24, ppr: 14, avian: 42, swine: 18 },
  { month: "Sep", fmd: 47, lsd: 31, ppr: 7, avian: 65, swine: 24 },
];

export const SPECIES_DISTRIBUTION = [
  { name: "Cattle", value: 38, color: "#1B4332" },
  { name: "Buffalo", value: 22, color: "#2D6A4F" },
  { name: "Poultry", value: 25, color: "#F4A300" },
  { name: "Goat/Sheep", value: 11, color: "#4A90D9" },
  { name: "Swine", value: 4, color: "#E63946" },
];

export const VACCINATION_COVERAGE = [
  { district: "Pune", coverage: 78, target: 90 },
  { district: "Jaipur", coverage: 62, target: 85 },
  { district: "Ludhiana", coverage: 91, target: 90 },
  { district: "Karnal", coverage: 84, target: 85 },
  { district: "Barmer", coverage: 55, target: 80 },
  { district: "Guwahati", coverage: 47, target: 80 },
  { district: "Patna", coverage: 69, target: 85 },
  { district: "Nagpur", coverage: 83, target: 90 },
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

export const USERS = [
  { id: "USR-001", name: "Dr. Priya Sharma", role: "veterinarian", state: "Maharashtra", district: "Pune", status: "active", joined: "2024-01-15", cases: 87 },
  { id: "USR-002", name: "Ramnath Yadav", role: "hospital", state: "Uttar Pradesh", district: "Meerut", status: "active", joined: "2024-02-20", cases: 34 },
  { id: "USR-003", name: "Dr. Sunita Joshi", role: "veterinarian", state: "Punjab", district: "Ludhiana", status: "active", joined: "2024-01-08", cases: 62 },
  { id: "USR-004", name: "Kavita Singh", role: "official", state: "Rajasthan", district: "Jaipur", status: "active", joined: "2024-03-01", cases: 0 },
  { id: "USR-005", name: "Mohan Lal", role: "lab", state: "Maharashtra", district: "Pune", status: "active", joined: "2024-01-20", cases: 0 },
  { id: "USR-006", name: "Dr. Amit Patel", role: "veterinarian", state: "Gujarat", district: "Anand", status: "inactive", joined: "2024-04-15", cases: 28 },
  { id: "USR-007", name: "Geeta Kumari", role: "hospital", state: "Bihar", district: "Patna", status: "active", joined: "2024-05-10", cases: 12 },
  { id: "USR-008", name: "Ram Prasad", role: "hospital", state: "Rajasthan", district: "Barmer", status: "active", joined: "2024-06-01", cases: 19 },
];

export const REGIONS = [
  { id: "REG-001", state: "Maharashtra", districts: 36, blocks: 358, villages: 44000, vets: 234, alerts: 3, threshold: 5, lastSync: "2026-09-15T06:00:00" },
  { id: "REG-002", state: "Rajasthan", districts: 33, blocks: 314, villages: 44672, vets: 198, alerts: 2, threshold: 4, lastSync: "2026-09-15T06:00:00" },
  { id: "REG-003", state: "Punjab", districts: 23, blocks: 157, villages: 12858, vets: 156, alerts: 1, threshold: 3, lastSync: "2026-09-15T05:45:00" },
  { id: "REG-004", state: "Uttar Pradesh", districts: 75, blocks: 826, villages: 106774, vets: 412, alerts: 0, threshold: 6, lastSync: "2026-09-15T06:00:00" },
  { id: "REG-005", state: "Assam", districts: 34, blocks: 219, villages: 26247, vets: 178, alerts: 1, threshold: 4, lastSync: "2026-09-14T23:00:00" },
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

export const VACCINATION_SCHEDULE = [
  { id: "VS-001", vaccine: "FMD Biennial", species: "Cattle/Buffalo", dueDate: "2026-09-20", animals: 12, status: "upcoming", ward: "Ward A" },
  { id: "VS-002", vaccine: "PPR", species: "Goat/Sheep", dueDate: "2026-09-18", animals: 5, status: "overdue", ward: "Ward B" },
  { id: "VS-003", vaccine: "Brucellosis (S19)", species: "Cattle (Female < 8 mo)", dueDate: "2026-10-05", animals: 3, status: "scheduled", ward: "Ward C" },
  { id: "VS-004", vaccine: "HS + BQ Combined", species: "Cattle/Buffalo", dueDate: "2026-10-15", animals: 8, status: "scheduled", ward: "Ward A" },
  { id: "VS-005", vaccine: "Theileriosis", species: "Crossbred Cattle", dueDate: "2026-09-22", animals: 4, status: "upcoming", ward: "Ward C" },
];

export const FIELD_VISITS = [
  { id: "FV-001", farm: "Ratan Farm", location: "Pune, MH", date: "2026-09-16", time: "09:00", purpose: "FMD follow-up", animals: 14, status: "scheduled", vet: "Dr. Priya Sharma" },
  { id: "FV-002", farm: "Sharma Dairy", location: "Meerut, UP", date: "2026-09-17", time: "10:30", purpose: "Vaccination camp", animals: 45, status: "scheduled", vet: "Dr. Rajan Kumar" },
  { id: "FV-003", farm: "Bishnoi Livestock", location: "Barmer, RJ", date: "2026-09-15", time: "14:00", purpose: "PPR survey", animals: 120, status: "in-progress", vet: "Dr. Priya Sharma" },
  { id: "FV-004", farm: "Kaur Livestock", location: "Amritsar, PB", date: "2026-09-14", time: "09:00", purpose: "Post-treatment check", animals: 8, status: "completed", vet: "Dr. Sunita Joshi" },
];

export const NOTIFICATIONS = [
  { id: 1, type: "alert", title: "Critical: FMD Case Escalated", body: "Case CASE-2024-001 (Motilal) requires immediate lab confirmation", time: "2 min ago", read: false },
  { id: 2, type: "info", title: "Lab Result Ready", body: "PPR PCR result for sample LAB-2024-003 is now available", time: "1 hr ago", read: false },
  { id: 3, type: "warning", title: "Vaccination Overdue", body: "PPR vaccination for 5 animals in Ward B is 3 days overdue", time: "3 hr ago", read: false },
  { id: 4, type: "success", title: "Case Resolved", body: "Case CASE-2024-003 (Sundari) has been successfully resolved", time: "5 hr ago", read: true },
  { id: 5, type: "info", title: "New Vet Assigned", body: "Dr. Rajan Kumar has been assigned to cover ICU patients", time: "Yesterday", read: true },
  { id: 6, type: "alert", title: "Outbreak Risk Alert", body: "AI model detected elevated FMD risk in Pune district — 87% confidence", time: "Yesterday", read: true },
];

export const CHATBOT_RESPONSES: Record<string, string> = {
  "fmd": "Foot & Mouth Disease (FMD) is a highly contagious viral disease affecting cloven-hoofed animals. Key symptoms: fever, blisters on mouth/feet, reduced milk output. Report immediately to PashuRakshak.",
  "vaccination": "Vaccination schedules vary by species. Cattle need FMD vaccination every 6 months, HS+BQ annually. Check /hospital/vaccination-schedule for your specific animals.",
  "symptoms": "Common warning signs: fever, lethargy, reduced feed intake, abnormal discharge, skin lesions. Use the Report Symptom tool to submit a guided report.",
  "report": "To report a disease: Go to Report Symptom → select affected animal → describe symptoms using our icon-based guide → submit. A vet will be assigned within 4 hours.",
  "default": "I'm the PashuRakshak AI Assistant. I can help with disease symptoms, vaccination schedules, case status, and reporting procedures. Ask me anything about livestock health!",
};

export const KPI_STATS = {
  activeOutbreaks: 6,
  totalAnimalsMonitored: 2847234,
  vaccinationCoverage: 73.4,
  casesResolvedThisMonth: 1284,
  fieldVetsDeployed: 4821,
  districtsUnderWatch: 28,
  mortalityRateChange: -12.3,
  reportResponseTime: "3.8 hrs",
};
