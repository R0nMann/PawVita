// Mock data for PashuRakshak platform

export const DISEASES = [
  'Foot-and-Mouth Disease',
  'Brucellosis',
  'Hemorrhagic Septicemia',
  'Black Quarter',
  'Anthrax',
  'Bovine Respiratory Disease',
  'Lumpy Skin Disease',
  'Theileriosis',
];

export const SPECIES = ['Cattle', 'Buffalo', 'Goat', 'Sheep', 'Pig', 'Poultry'];

export const STATES = [
  'Uttar Pradesh', 'Rajasthan', 'Madhya Pradesh', 'Maharashtra',
  'Gujarat', 'Punjab', 'Haryana', 'Bihar', 'West Bengal', 'Tamil Nadu',
];

export const outbreakTicker = [
  { id: 1, state: 'Rajasthan', district: 'Bikaner', disease: 'FMD', severity: 'high', time: '2h ago' },
  { id: 2, state: 'UP', district: 'Varanasi', disease: 'LSD', severity: 'medium', time: '4h ago' },
  { id: 3, state: 'Gujarat', district: 'Kutch', disease: 'HS', severity: 'low', time: '6h ago' },
  { id: 4, state: 'Punjab', district: 'Ludhiana', disease: 'BRD', severity: 'medium', time: '8h ago' },
  { id: 5, state: 'Maharashtra', district: 'Nashik', disease: 'FMD', severity: 'high', time: '10h ago' },
  { id: 6, state: 'Haryana', district: 'Hisar', disease: 'Anthrax', severity: 'high', time: '12h ago' },
];

export const stats = {
  totalFarmers: 248650,
  activeCases: 1847,
  outbreaksControlled: 3920,
  vaccinationCoverage: 78,
  liveAnimals: 4200000,
  vetOfficers: 12400,
};

export const animals = [
  { id: 'AN001', name: 'Kali', species: 'Cattle', breed: 'Gir', age: 5, weight: 420, health: 'healthy', lastVaccinated: '2024-09-15', nextVaccination: '2025-03-15', owner: 'Ramesh Kumar', village: 'Kheda', district: 'Anand', image: 'cattle' },
  { id: 'AN002', name: 'Dholi', species: 'Buffalo', breed: 'Murrah', age: 3, weight: 480, health: 'at-risk', lastVaccinated: '2024-06-10', nextVaccination: '2024-12-10', owner: 'Ramesh Kumar', village: 'Kheda', district: 'Anand', image: 'buffalo' },
  { id: 'AN003', name: 'Bhuri', species: 'Cattle', breed: 'HF Cross', age: 7, weight: 390, health: 'healthy', lastVaccinated: '2024-11-01', nextVaccination: '2025-05-01', owner: 'Ramesh Kumar', village: 'Kheda', district: 'Anand', image: 'cattle' },
  { id: 'AN004', name: 'Lali', species: 'Goat', breed: 'Sirohi', age: 2, weight: 28, health: 'sick', lastVaccinated: '2024-08-20', nextVaccination: '2025-02-20', owner: 'Ramesh Kumar', village: 'Kheda', district: 'Anand', image: 'goat' },
  { id: 'AN005', name: 'Nandi', species: 'Cattle', breed: 'Sahiwal', age: 4, weight: 440, health: 'healthy', lastVaccinated: '2024-10-15', nextVaccination: '2025-04-15', owner: 'Ramesh Kumar', village: 'Kheda', district: 'Anand', image: 'cattle' },
  { id: 'AN006', name: 'Chetak', species: 'Cattle', breed: 'Tharparkar', age: 6, weight: 410, health: 'healthy', lastVaccinated: '2024-09-01', nextVaccination: '2025-03-01', owner: 'Ramesh Kumar', village: 'Kheda', district: 'Anand', image: 'cattle' },
];

export const reports = [
  { id: 'RPT001', animalId: 'AN004', disease: 'Suspected FMD', severity: 'high', status: 'vet-assigned', reportedAt: '2025-01-08', symptoms: ['Drooling', 'Limping', 'Blisters on feet'], vetAssigned: 'Dr. Meera Patel', location: { lat: 23.01, lng: 72.58 }, notes: 'Animal showing classic FMD symptoms. Isolated from herd.' },
  { id: 'RPT002', animalId: 'AN002', disease: 'Lumpy Skin Disease', severity: 'medium', status: 'under-observation', reportedAt: '2025-01-05', symptoms: ['Skin nodules', 'Fever', 'Loss of appetite'], vetAssigned: 'Dr. Anil Singh', location: { lat: 22.98, lng: 72.55 }, notes: 'Early stage LSD. Monitoring vitals.' },
  { id: 'RPT003', animalId: 'AN001', disease: 'Digestive issue', severity: 'low', status: 'resolved', reportedAt: '2024-12-28', symptoms: ['Bloating', 'Reduced milk'], vetAssigned: 'Dr. Meera Patel', location: { lat: 23.02, lng: 72.59 }, notes: 'Resolved with treatment. Follow up in 2 weeks.' },
];

export const outbreakClusters = [
  { id: 'CLU001', disease: 'Foot-and-Mouth Disease', state: 'Rajasthan', district: 'Bikaner', block: 'Bikaner-I', casesCount: 47, confidence: 92, radius: 35, lat: 28.01, lng: 73.31, trend: 'rising', firstDetected: '2025-01-02', lastUpdated: '2025-01-09', affectedSpecies: ['Cattle', 'Buffalo'] },
  { id: 'CLU002', disease: 'Lumpy Skin Disease', state: 'Gujarat', district: 'Kutch', block: 'Bhuj', casesCount: 29, confidence: 87, radius: 28, lat: 23.25, lng: 69.67, trend: 'stable', firstDetected: '2025-01-01', lastUpdated: '2025-01-08', affectedSpecies: ['Cattle'] },
  { id: 'CLU003', disease: 'Hemorrhagic Septicemia', state: 'UP', district: 'Varanasi', block: 'Pindra', casesCount: 18, confidence: 78, radius: 22, lat: 25.32, lng: 82.97, trend: 'declining', firstDetected: '2024-12-28', lastUpdated: '2025-01-07', affectedSpecies: ['Buffalo', 'Cattle'] },
  { id: 'CLU004', disease: 'Brucellosis', state: 'Punjab', district: 'Ludhiana', block: 'Sahnewal', casesCount: 12, confidence: 71, radius: 18, lat: 30.91, lng: 75.85, trend: 'stable', firstDetected: '2025-01-04', lastUpdated: '2025-01-09', affectedSpecies: ['Cattle'] },
  { id: 'CLU005', disease: 'Black Quarter', state: 'Maharashtra', district: 'Nashik', block: 'Niphad', casesCount: 8, confidence: 65, radius: 14, lat: 20.01, lng: 73.79, trend: 'rising', firstDetected: '2025-01-06', lastUpdated: '2025-01-09', affectedSpecies: ['Cattle', 'Buffalo'] },
];

export const mapMarkers = [
  { id: 1, lat: 28.01, lng: 73.31, severity: 'high', disease: 'FMD', cases: 47, district: 'Bikaner' },
  { id: 2, lat: 23.25, lng: 69.67, severity: 'medium', disease: 'LSD', cases: 29, district: 'Kutch' },
  { id: 3, lat: 25.32, lng: 82.97, severity: 'medium', disease: 'HS', cases: 18, district: 'Varanasi' },
  { id: 4, lat: 30.91, lng: 75.85, severity: 'low', disease: 'Brucellosis', cases: 12, district: 'Ludhiana' },
  { id: 5, lat: 20.01, lng: 73.79, severity: 'high', disease: 'BQ', cases: 8, district: 'Nashik' },
  { id: 6, lat: 27.18, lng: 77.99, severity: 'low', disease: 'Theileriosis', cases: 5, district: 'Mathura' },
  { id: 7, lat: 15.86, lng: 74.50, severity: 'medium', disease: 'FMD', cases: 21, district: 'Belgaum' },
];

export const diseaseFrequencyData = [
  { month: 'Jul', FMD: 42, LSD: 18, HS: 24, BQ: 10, Other: 14 },
  { month: 'Aug', FMD: 56, LSD: 22, HS: 19, BQ: 12, Other: 18 },
  { month: 'Sep', FMD: 63, LSD: 31, HS: 21, BQ: 9, Other: 22 },
  { month: 'Oct', FMD: 48, LSD: 28, HS: 16, BQ: 15, Other: 19 },
  { month: 'Nov', FMD: 38, LSD: 24, HS: 14, BQ: 8, Other: 16 },
  { month: 'Dec', FMD: 52, LSD: 20, HS: 18, BQ: 11, Other: 21 },
  { month: 'Jan', FMD: 71, LSD: 15, HS: 22, BQ: 13, Other: 18 },
];

export const riskForecastData = [
  { day: 'Today', risk: 62, temperature: 28, humidity: 65 },
  { day: 'Mon', risk: 68, temperature: 30, humidity: 70 },
  { day: 'Tue', risk: 74, temperature: 33, humidity: 75 },
  { day: 'Wed', risk: 81, temperature: 35, humidity: 78 },
  { day: 'Thu', risk: 76, temperature: 32, humidity: 72 },
  { day: 'Fri', risk: 65, temperature: 29, humidity: 66 },
  { day: 'Sat', risk: 58, temperature: 27, humidity: 62 },
];

export const regionComparisonData = [
  { region: 'UP', cases: 284, vaccinated: 68 },
  { region: 'Rajasthan', cases: 241, vaccinated: 72 },
  { region: 'MP', cases: 198, vaccinated: 75 },
  { region: 'Gujarat', cases: 167, vaccinated: 82 },
  { region: 'Maharashtra', cases: 154, vaccinated: 79 },
  { region: 'Punjab', cases: 98, vaccinated: 88 },
  { region: 'Haryana', cases: 87, vaccinated: 85 },
];

export const vaccinationCoverageData = [
  { name: 'Vaccinated', value: 78, color: '#1B4332' },
  { name: 'Pending', value: 14, color: '#FFD166' },
  { name: 'Overdue', value: 8, color: '#E63946' },
];

export const vetCases = [
  { id: 'VC001', farmerId: 'F001', farmerName: 'Ramesh Kumar', village: 'Kheda', district: 'Anand', animalId: 'AN004', species: 'Goat', suspectedDisease: 'FMD', severity: 'high', status: 'open', reportedAt: '2025-01-08 09:23', assignedAt: '2025-01-08 10:15', lat: 23.01, lng: 72.58 },
  { id: 'VC002', farmerId: 'F002', farmerName: 'Sunita Devi', village: 'Changa', district: 'Anand', animalId: 'AN012', species: 'Buffalo', suspectedDisease: 'LSD', severity: 'medium', status: 'in-progress', reportedAt: '2025-01-07 14:42', assignedAt: '2025-01-07 15:30', lat: 22.98, lng: 72.55 },
  { id: 'VC003', farmerId: 'F003', farmerName: 'Mohan Lal', village: 'Vadod', district: 'Anand', animalId: 'AN021', species: 'Cattle', suspectedDisease: 'HS', severity: 'high', status: 'open', reportedAt: '2025-01-09 07:15', assignedAt: '2025-01-09 08:00', lat: 22.95, lng: 72.60 },
  { id: 'VC004', farmerId: 'F004', farmerName: 'Priya Singh', village: 'Borsad', district: 'Anand', animalId: 'AN033', species: 'Cattle', suspectedDisease: 'BRD', severity: 'low', status: 'resolved', reportedAt: '2025-01-04 11:00', assignedAt: '2025-01-04 13:00', lat: 22.40, lng: 72.90 },
];

export const labSamples = [
  { id: 'LAB001', caseId: 'VC001', animalId: 'AN004', species: 'Goat', suspectedDisease: 'FMD', sampleType: 'Epithelial tissue', priority: 'urgent', status: 'processing', receivedAt: '2025-01-08 14:30', farmerName: 'Ramesh Kumar', district: 'Anand', vetName: 'Dr. Meera Patel' },
  { id: 'LAB002', caseId: 'VC002', animalId: 'AN012', species: 'Buffalo', suspectedDisease: 'LSD', sampleType: 'Skin biopsy', priority: 'high', status: 'pending', receivedAt: '2025-01-08 16:00', farmerName: 'Sunita Devi', district: 'Anand', vetName: 'Dr. Anil Singh' },
  { id: 'LAB003', caseId: 'VC003', animalId: 'AN021', species: 'Cattle', suspectedDisease: 'HS', sampleType: 'Blood + Swab', priority: 'urgent', status: 'pending', receivedAt: '2025-01-09 09:45', farmerName: 'Mohan Lal', district: 'Anand', vetName: 'Dr. Meera Patel' },
  { id: 'LAB004', caseId: 'VC005', animalId: 'AN045', species: 'Cattle', suspectedDisease: 'Brucellosis', sampleType: 'Serum', priority: 'normal', status: 'completed', receivedAt: '2025-01-06 10:15', farmerName: 'Deepak Sharma', district: 'Kutch', vetName: 'Dr. Suresh Nair', result: 'Positive for Brucella abortus' },
];

export const adminUsers = [
  { id: 'U001', name: 'Ramesh Kumar', role: 'farmer', state: 'Gujarat', district: 'Anand', mobile: '9876543210', status: 'active', joinedAt: '2024-06-15', animals: 6 },
  { id: 'U002', name: 'Dr. Meera Patel', role: 'vet', state: 'Gujarat', district: 'Anand', mobile: '9876543211', status: 'active', joinedAt: '2024-04-01', casesHandled: 142 },
  { id: 'U003', name: 'Arun Verma', role: 'official', state: 'Gujarat', district: 'Anand', mobile: '9876543212', status: 'active', joinedAt: '2024-03-10' },
  { id: 'U004', name: 'Priya Sharma', role: 'lab', state: 'Gujarat', district: 'Anand', mobile: '9876543213', status: 'active', joinedAt: '2024-05-20', samplesProcessed: 89 },
  { id: 'U005', name: 'Mohan Lal', role: 'farmer', state: 'Gujarat', district: 'Anand', mobile: '9876543214', status: 'inactive', joinedAt: '2024-08-01', animals: 4 },
  { id: 'U006', name: 'Dr. Anil Singh', role: 'vet', state: 'Gujarat', district: 'Anand', mobile: '9876543215', status: 'active', joinedAt: '2024-04-15', casesHandled: 97 },
];

export const notifications = [
  { id: 1, type: 'alert', title: 'High Risk FMD Cluster Detected', message: 'AI model detected a potential FMD outbreak cluster in Bikaner district with 92% confidence.', time: '2h ago', read: false, severity: 'high' },
  { id: 2, type: 'case', title: 'New case assigned', message: 'Case VC003 assigned to you by district coordinator.', time: '4h ago', read: false, severity: 'medium' },
  { id: 3, type: 'vaccination', title: 'Vaccination reminder', message: 'Dholi (AN002) is due for FMD vaccination on January 15, 2025.', time: '1d ago', read: true, severity: 'low' },
  { id: 4, type: 'lab', title: 'Lab result ready', message: 'Sample LAB004 has been processed. Result: Positive for Brucella.', time: '1d ago', read: false, severity: 'high' },
  { id: 5, type: 'system', title: 'Weekly report generated', message: 'Your weekly district health report for Jan 1-7 is ready to download.', time: '2d ago', read: true, severity: 'low' },
];

export const vaccinationSchedule = [
  { id: 'VS001', animalId: 'AN002', animalName: 'Dholi', species: 'Buffalo', vaccine: 'FMD Type O', dueDate: '2025-01-15', status: 'upcoming', vetName: 'Dr. Meera Patel' },
  { id: 'VS002', animalId: 'AN004', animalName: 'Lali', species: 'Goat', vaccine: 'PPR Vaccine', dueDate: '2025-02-20', status: 'upcoming', vetName: 'Dr. Meera Patel' },
  { id: 'VS003', animalId: 'AN001', animalName: 'Kali', species: 'Cattle', vaccine: 'HS-BQ Combined', dueDate: '2025-03-15', status: 'upcoming', vetName: 'Dr. Anil Singh' },
  { id: 'VS004', animalId: 'AN003', animalName: 'Bhuri', species: 'Cattle', vaccine: 'Brucella Vaccine', dueDate: '2025-05-01', status: 'scheduled', vetName: 'Dr. Meera Patel' },
  { id: 'VS005', animalId: 'AN006', animalName: 'Chetak', species: 'Cattle', vaccine: 'FMD Type A', dueDate: '2024-12-15', status: 'overdue', vetName: 'Dr. Anil Singh' },
];

export const fieldVisits = [
  { id: 'FV001', date: '2025-01-10', time: '09:00', farmerName: 'Ramesh Kumar', village: 'Kheda', district: 'Anand', caseId: 'VC001', purpose: 'FMD Investigation', status: 'scheduled' },
  { id: 'FV002', date: '2025-01-10', time: '11:30', farmerName: 'Sunita Devi', village: 'Changa', district: 'Anand', caseId: 'VC002', purpose: 'LSD Follow-up', status: 'scheduled' },
  { id: 'FV003', date: '2025-01-10', time: '14:00', farmerName: 'Mohan Lal', village: 'Vadod', district: 'Anand', caseId: 'VC003', purpose: 'HS Initial Assessment', status: 'scheduled' },
  { id: 'FV004', date: '2025-01-09', time: '10:00', farmerName: 'Priya Singh', village: 'Borsad', district: 'Anand', caseId: 'VC004', purpose: 'BRD Resolved Checkup', status: 'completed' },
];

export const symptoms = [
  { id: 'S01', icon: '🦷', label: 'Blisters/Ulcers', hindi: 'छाले/घाव', category: 'oral' },
  { id: 'S02', icon: '🦵', label: 'Limping', hindi: 'लंगड़ाना', category: 'locomotory' },
  { id: 'S03', icon: '💧', label: 'Excessive Drooling', hindi: 'अत्यधिक लार', category: 'oral' },
  { id: 'S04', icon: '🌡️', label: 'High Fever', hindi: 'तेज़ बुखार', category: 'systemic' },
  { id: 'S05', icon: '😮', label: 'Difficulty Breathing', hindi: 'सांस लेने में कठिनाई', category: 'respiratory' },
  { id: 'S06', icon: '🔵', label: 'Skin Nodules', hindi: 'त्वचा पर गांठें', category: 'skin' },
  { id: 'S07', icon: '🍼', label: 'Reduced Milk Yield', hindi: 'दूध उत्पादन में कमी', category: 'production' },
  { id: 'S08', icon: '😴', label: 'Lethargy/Weakness', hindi: 'सुस्ती/कमज़ोरी', category: 'systemic' },
  { id: 'S09', icon: '🤢', label: 'Loss of Appetite', hindi: 'भूख न लगना', category: 'systemic' },
  { id: 'S10', icon: '💩', label: 'Diarrhea', hindi: 'दस्त', category: 'digestive' },
  { id: 'S11', icon: '👁️', label: 'Eye Discharge', hindi: 'आँख से स्राव', category: 'sensory' },
  { id: 'S12', icon: '🔴', label: 'Swollen Lymph Nodes', hindi: 'सूजी हुई गाँठें', category: 'systemic' },
];

export const symptomDiagnosis: Record<string, { disease: string; confidence: number; advice: string }[]> = {
  'S01,S02,S03': [
    { disease: 'Foot-and-Mouth Disease (FMD)', confidence: 94, advice: 'Isolate the animal immediately. Do not move livestock. Contact your nearest vet.' },
    { disease: 'Vesicular Stomatitis', confidence: 42, advice: 'Keep the animal hydrated. Monitor other animals.' },
  ],
  'S04,S06,S09': [
    { disease: 'Lumpy Skin Disease (LSD)', confidence: 88, advice: 'Isolate affected animals. Spray insect repellents. Contact vet for vaccination of healthy animals.' },
  ],
  'S04,S05,S08': [
    { disease: 'Hemorrhagic Septicemia (HS)', confidence: 85, advice: 'This is an emergency. Contact your vet immediately. HS progresses rapidly.' },
  ],
};

export const testimonials = [
  { name: 'Ramesh Kumar', role: 'Dairy Farmer', location: 'Anand, Gujarat', quote: 'PashuRakshak ne meri 6 gauon ko bachaya. Ab main apne phone se hi vet ko bulaa sakta hoon.', avatar: 'R', stars: 5 },
  { name: 'Dr. Meera Patel', role: 'Veterinary Officer', location: 'Kutch, Gujarat', quote: 'The disease mapping feature has transformed how I prioritize field visits. I can now cover 3x more cases per week.', avatar: 'M', stars: 5 },
  { name: 'Shri Arun Verma', role: 'District Animal Husbandry Officer', location: 'Varanasi, UP', quote: 'For the first time, I have a real-time view of every case in my district. Policy decisions are now evidence-based.', avatar: 'A', stars: 5 },
];
