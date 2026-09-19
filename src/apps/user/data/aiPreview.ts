/**
 * Stand-in AI output for the owner portal's AI panels — outbreak clusters,
 * the cluster risk map and risk forecasts — until the AI Intelligence Layer
 * (architecture §6) exists. Everything else in this portal reads the API.
 * Symptom-based diagnoses live in src/shared/ai/preview.ts.
 */

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

export const riskForecastData = [
  { day: 'Today', risk: 62, temperature: 28, humidity: 65 },
  { day: 'Mon', risk: 68, temperature: 30, humidity: 70 },
  { day: 'Tue', risk: 74, temperature: 33, humidity: 75 },
  { day: 'Wed', risk: 81, temperature: 35, humidity: 78 },
  { day: 'Thu', risk: 76, temperature: 32, humidity: 72 },
  { day: 'Fri', risk: 65, temperature: 29, humidity: 66 },
  { day: 'Sat', risk: 58, temperature: 27, humidity: 62 },
];
