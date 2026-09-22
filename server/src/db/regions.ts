import { inArray } from "drizzle-orm";
import type { Db } from "./client.js";
import { regions } from "./schema.js";
import type { Ancestry, RegionLevel } from "../lib/regions.js";

/**
 * The national location hierarchy: India → all 28 states and 8 union
 * territories → districts → blocks → villages.
 *
 * Every screen that routes a report — registration's village picker, the
 * outbreak map, an official's analytics scope — reads this tree, so it ships
 * as reference data rather than demo data.
 *
 * It is a representative sample, not the full Local Government Directory:
 * each state or UT carries two districts (Chandigarh and Lakshadweep have only
 * one), each district a few blocks, and each block one village. Coordinates
 * are approximate centroids, good enough to place a marker on the map. Load
 * the real LGD extract over the top through `POST /admin/regions/import` — it
 * matches on `code`, so the rows below are refreshed rather than duplicated.
 */

/** A block and its village: `[block, lat, lng, village, lat, lng]`. */
type BlockSeed = readonly [
  block: string,
  blockLat: number,
  blockLng: number,
  village: string,
  villageLat: number,
  villageLng: number,
];

interface DistrictSeed {
  name: string;
  /** Overrides the name-derived code where that would run long. */
  code?: string;
  lat: number;
  lng: number;
  blocks: readonly BlockSeed[];
}

interface StateSeed {
  name: string;
  /** ISO 3166-2:IN subdivision code without the `IN-` prefix. */
  code: string;
  lat: number;
  lng: number;
  districts: readonly DistrictSeed[];
}

export const COUNTRY = { name: "India", code: "IN", lat: 22.35, lng: 78.67 };

export const INDIA_REGION_TREE: readonly StateSeed[] = [
  // --- States -----------------------------------------------------------------
  {
    name: "Andhra Pradesh", code: "AP", lat: 15.91, lng: 79.74,
    districts: [
      { name: "Krishna", lat: 16.51, lng: 80.8, blocks: [
        ["Gudivada", 16.43, 80.99, "Kavutaram", 16.46, 81.02],
        ["Machilipatnam", 16.19, 81.13, "Chilakalapudi", 16.18, 81.11],
        ["Nandigama", 16.77, 80.29, "Kanchela", 16.72, 80.33],
      ] },
      { name: "Chittoor", lat: 13.22, lng: 79.1, blocks: [
        ["Chittoor", 13.22, 79.1, "Gollapalle", 13.26, 79.06],
        ["Madanapalle", 13.55, 78.5, "Nimmanapalle", 13.49, 78.44],
        ["Punganur", 13.37, 78.58, "Somala", 13.44, 78.61],
      ] },
    ],
  },
  {
    name: "Arunachal Pradesh", code: "AR", lat: 28.22, lng: 94.73,
    districts: [
      { name: "Papum Pare", lat: 27.28, lng: 93.7, blocks: [
        ["Doimukh", 27.14, 93.74, "Kheel", 27.16, 93.78],
        ["Sagalee", 27.45, 93.62, "Toru", 27.4, 93.66],
        ["Balijan", 27.13, 93.83, "Banderdewa", 27.09, 93.86],
      ] },
      { name: "West Kameng", lat: 27.26, lng: 92.4, blocks: [
        ["Bomdila", 27.26, 92.4, "Rahung", 27.29, 92.43],
        ["Dirang", 27.36, 92.24, "Thembang", 27.43, 92.29],
        ["Kalaktang", 27.13, 92.24, "Shergaon", 27.16, 92.29],
      ] },
    ],
  },
  {
    name: "Assam", code: "AS", lat: 26.2, lng: 92.94,
    districts: [
      { name: "Kamrup", lat: 26.18, lng: 91.75, blocks: [
        ["Rangia", 26.45, 91.63, "Bihdia", 26.41, 91.6],
        ["Hajo", 26.25, 91.52, "Sualkuchi", 26.17, 91.57],
        ["Chhaygaon", 26.03, 91.34, "Kukurmara", 26.06, 91.39],
      ] },
      { name: "Jorhat", lat: 26.75, lng: 94.22, blocks: [
        ["Titabor", 26.6, 94.2, "Kakojan", 26.63, 94.26],
        ["Teok", 26.83, 94.44, "Rajabahar", 26.8, 94.47],
        ["Kaliapani", 26.72, 94.3, "Cinnamara", 26.71, 94.25],
      ] },
    ],
  },
  {
    name: "Bihar", code: "BR", lat: 25.1, lng: 85.31,
    districts: [
      { name: "Patna", lat: 25.59, lng: 85.14, blocks: [
        ["Danapur", 25.63, 85.05, "Rupaspur", 25.61, 85.09],
        ["Fatuha", 25.51, 85.3, "Daulatpur", 25.54, 85.33],
        ["Masaurhi", 25.35, 85.03, "Dharhara", 25.32, 85.07],
      ] },
      { name: "Muzaffarpur", lat: 26.12, lng: 85.39, blocks: [
        ["Kanti", 26.16, 85.25, "Chandrahatti", 26.19, 85.22],
        ["Mushahari", 26.12, 85.36, "Narauli", 26.09, 85.33],
        ["Bochaha", 26.22, 85.44, "Jajuar", 26.25, 85.47],
      ] },
    ],
  },
  {
    name: "Chhattisgarh", code: "CT", lat: 21.28, lng: 81.87,
    districts: [
      { name: "Raipur", lat: 21.25, lng: 81.63, blocks: [
        ["Abhanpur", 21.09, 81.75, "Kendri", 21.12, 81.72],
        ["Arang", 21.19, 81.97, "Chandkhuri", 21.22, 81.93],
        ["Tilda", 21.51, 81.83, "Neora", 21.46, 81.79],
      ] },
      { name: "Durg", lat: 21.19, lng: 81.28, blocks: [
        ["Patan", 21.05, 81.51, "Selud", 21.09, 81.46],
        ["Dhamdha", 21.44, 81.19, "Ranchirai", 21.4, 81.23],
        ["Durg", 21.19, 81.28, "Anjora", 21.23, 81.32],
      ] },
    ],
  },
  {
    name: "Goa", code: "GA", lat: 15.3, lng: 74.12,
    districts: [
      { name: "North Goa", lat: 15.52, lng: 73.87, blocks: [
        ["Bardez", 15.57, 73.79, "Assagao", 15.6, 73.77],
        ["Bicholim", 15.6, 73.95, "Sarvona", 15.63, 73.92],
        ["Pernem", 15.72, 73.8, "Morjim", 15.63, 73.73],
      ] },
      { name: "South Goa", lat: 15.19, lng: 74.05, blocks: [
        ["Salcete", 15.28, 73.97, "Colva", 15.28, 73.92],
        ["Ponda", 15.4, 74.02, "Bandora", 15.4, 73.98],
        ["Quepem", 15.21, 74.08, "Balli", 15.14, 74.01],
      ] },
    ],
  },
  {
    name: "Gujarat", code: "GJ", lat: 22.26, lng: 71.19,
    districts: [
      { name: "Anand", lat: 22.56, lng: 72.95, blocks: [
        ["Anand", 22.55, 72.95, "Vadod", 22.53, 72.99],
        ["Borsad", 22.41, 72.9, "Bhadran", 22.44, 72.86],
        ["Petlad", 22.48, 72.8, "Changa", 22.6, 72.82],
      ] },
      { name: "Kutch", lat: 23.25, lng: 69.67, blocks: [
        ["Bhuj", 23.24, 69.67, "Madhapar", 23.26, 69.7],
        ["Anjar", 23.11, 70.03, "Khedoi", 23.14, 70.06],
        ["Mandvi", 22.83, 69.35, "Bidada", 22.88, 69.39],
      ] },
    ],
  },
  {
    name: "Haryana", code: "HR", lat: 29.06, lng: 76.09,
    districts: [
      { name: "Karnal", lat: 29.69, lng: 76.99, blocks: [
        ["Karnal", 29.69, 76.99, "Kachhwa", 29.64, 76.94],
        ["Gharaunda", 29.54, 76.97, "Kohand", 29.48, 76.99],
        ["Nilokheri", 29.84, 76.93, "Shergarh Tapu", 29.88, 76.89],
      ] },
      { name: "Hisar", lat: 29.15, lng: 75.72, blocks: [
        ["Hansi", 29.1, 75.96, "Dhani Shobha", 29.06, 75.92],
        ["Barwala", 29.37, 75.9, "Kheri Jalab", 29.33, 75.87],
        ["Adampur", 29.26, 75.46, "Sadalpur", 29.3, 75.42],
      ] },
    ],
  },
  {
    name: "Himachal Pradesh", code: "HP", lat: 31.1, lng: 77.17,
    districts: [
      { name: "Kangra", lat: 32.1, lng: 76.27, blocks: [
        ["Palampur", 32.11, 76.54, "Bandla", 32.09, 76.57],
        ["Dharamshala", 32.22, 76.32, "Sidhbari", 32.19, 76.35],
        ["Nurpur", 32.3, 75.89, "Jachh", 32.26, 75.93],
      ] },
      { name: "Shimla", lat: 31.1, lng: 77.17, blocks: [
        ["Theog", 31.12, 77.36, "Matiana", 31.18, 77.45],
        ["Rampur", 31.45, 77.63, "Dattnagar", 31.41, 77.59],
        ["Mashobra", 31.13, 77.23, "Naldehra", 31.16, 77.21],
      ] },
    ],
  },
  {
    name: "Jharkhand", code: "JH", lat: 23.61, lng: 85.28,
    districts: [
      { name: "Ranchi", lat: 23.34, lng: 85.31, blocks: [
        ["Kanke", 23.43, 85.32, "Pithoria", 23.48, 85.27],
        ["Namkum", 23.34, 85.39, "Tatisilwai", 23.38, 85.44],
        ["Ormanjhi", 23.48, 85.44, "Sikidiri", 23.53, 85.48],
      ] },
      { name: "Dhanbad", lat: 23.8, lng: 86.43, blocks: [
        ["Baliapur", 23.7, 86.43, "Pandarpala", 23.67, 86.46],
        ["Govindpur", 23.82, 86.53, "Barwadda", 23.79, 86.49],
        ["Nirsa", 23.79, 86.7, "Chirkunda", 23.74, 86.78],
      ] },
    ],
  },
  {
    name: "Karnataka", code: "KA", lat: 15.32, lng: 75.71,
    districts: [
      { name: "Belagavi", lat: 15.85, lng: 74.5, blocks: [
        ["Belagavi", 15.85, 74.5, "Kakati", 15.89, 74.57],
        ["Gokak", 16.17, 74.82, "Ghataprabha", 16.23, 74.72],
        ["Bailhongal", 15.81, 74.86, "Nesargi", 15.86, 74.91],
      ] },
      { name: "Mandya", lat: 12.52, lng: 76.9, blocks: [
        ["Maddur", 12.58, 77.04, "Koppa", 12.61, 77.09],
        ["Srirangapatna", 12.42, 76.69, "Palahalli", 12.44, 76.66],
        ["Nagamangala", 12.82, 76.75, "Bindiganavile", 12.86, 76.8],
      ] },
    ],
  },
  {
    name: "Kerala", code: "KL", lat: 10.85, lng: 76.27,
    districts: [
      { name: "Thrissur", lat: 10.53, lng: 76.21, blocks: [
        ["Ollukkara", 10.55, 76.27, "Pattikkad", 10.53, 76.34],
        ["Chalakudy", 10.31, 76.33, "Koratty", 10.36, 76.34],
        ["Mullassery", 10.57, 76.06, "Venkidangu", 10.6, 76.09],
      ] },
      { name: "Wayanad", lat: 11.69, lng: 76.13, blocks: [
        ["Kalpetta", 11.61, 76.08, "Meppadi", 11.55, 76.13],
        ["Mananthavady", 11.8, 76.0, "Thavinhal", 11.84, 76.04],
        ["Sulthan Bathery", 11.66, 76.26, "Noolpuzha", 11.61, 76.33],
      ] },
    ],
  },
  {
    name: "Madhya Pradesh", code: "MP", lat: 22.97, lng: 78.66,
    districts: [
      { name: "Indore", lat: 22.72, lng: 75.86, blocks: [
        ["Depalpur", 22.85, 75.54, "Gautampura", 22.95, 75.52],
        ["Sanwer", 22.97, 75.83, "Jamli", 22.92, 75.88],
        ["Mhow", 22.55, 75.76, "Manpur", 22.43, 75.81],
      ] },
      { name: "Jabalpur", lat: 23.18, lng: 79.99, blocks: [
        ["Panagar", 23.29, 79.99, "Khamaria", 23.25, 79.94],
        ["Sihora", 23.49, 80.11, "Majhauli", 23.52, 80.16],
        ["Patan", 23.28, 79.69, "Shahpura", 23.21, 79.64],
      ] },
    ],
  },
  {
    name: "Maharashtra", code: "MH", lat: 19.75, lng: 75.71,
    districts: [
      { name: "Pune", lat: 18.52, lng: 73.86, blocks: [
        ["Haveli", 18.55, 73.95, "Wagholi", 18.58, 73.98],
        ["Baramati", 18.15, 74.58, "Malegaon", 18.19, 74.53],
        ["Mulshi", 18.52, 73.5, "Paud", 18.53, 73.61],
      ] },
      { name: "Nagpur", lat: 21.15, lng: 79.09, blocks: [
        ["Kamptee", 21.22, 79.2, "Kanhan", 21.28, 79.19],
        ["Hingna", 21.1, 78.94, "Wadi", 21.14, 78.99],
        ["Katol", 21.27, 78.59, "Jalalkheda", 21.32, 78.68],
      ] },
    ],
  },
  {
    name: "Manipur", code: "MN", lat: 24.66, lng: 93.91,
    districts: [
      { name: "Imphal West", lat: 24.8, lng: 93.89, blocks: [
        ["Lamphelpat", 24.81, 93.92, "Langol", 24.84, 93.91],
        ["Wangoi", 24.77, 93.85, "Naranseina", 24.74, 93.83],
        ["Patsoi", 24.8, 93.9, "Khumbong", 24.85, 93.83],
      ] },
      { name: "Bishnupur", lat: 24.63, lng: 93.77, blocks: [
        ["Nambol", 24.69, 93.82, "Oinam", 24.64, 93.81],
        ["Moirang", 24.49, 93.77, "Thanga", 24.54, 93.8],
        ["Bishnupur", 24.63, 93.77, "Ningthoukhong", 24.57, 93.79],
      ] },
    ],
  },
  {
    name: "Meghalaya", code: "ML", lat: 25.47, lng: 91.37,
    districts: [
      { name: "East Khasi Hills", code: "EKH", lat: 25.57, lng: 91.88, blocks: [
        ["Mylliem", 25.51, 91.87, "Nongkrem", 25.48, 91.9],
        ["Mawphlang", 25.45, 91.75, "Laitsohpliah", 25.43, 91.78],
        ["Pynursla", 25.31, 91.9, "Mawlong", 25.28, 91.87],
      ] },
      { name: "West Garo Hills", code: "WGH", lat: 25.52, lng: 90.22, blocks: [
        ["Rongram", 25.6, 90.3, "Dobasipara", 25.63, 90.33],
        ["Selsella", 25.72, 90.14, "Bolsalgre", 25.75, 90.18],
        ["Dadenggre", 25.6, 90.44, "Rongchugre", 25.57, 90.47],
      ] },
    ],
  },
  {
    name: "Mizoram", code: "MZ", lat: 23.16, lng: 92.94,
    districts: [
      { name: "Aizawl", lat: 23.73, lng: 92.72, blocks: [
        ["Aibawk", 23.6, 92.73, "Sateek", 23.56, 92.76],
        ["Darlawn", 24.16, 92.91, "Sawleng", 24.02, 92.86],
        ["Thingsulthliah", 23.66, 92.93, "Tualbung", 23.69, 92.97],
      ] },
      { name: "Lunglei", lat: 22.88, lng: 92.73, blocks: [
        ["Lunglei", 22.88, 92.73, "Zotlang", 22.9, 92.76],
        ["Lungsen", 22.81, 92.63, "Tlabung", 22.75, 92.55],
        ["Bunghmun", 22.94, 92.6, "Mualthuam", 22.97, 92.63],
      ] },
    ],
  },
  {
    name: "Nagaland", code: "NL", lat: 26.16, lng: 94.56,
    districts: [
      { name: "Kohima", lat: 25.67, lng: 94.11, blocks: [
        ["Jakhama", 25.6, 94.11, "Kigwema", 25.62, 94.13],
        ["Tseminyu", 25.87, 94.26, "Nsunyu", 25.9, 94.29],
        ["Chiephobozou", 25.82, 94.15, "Botsa", 25.79, 94.18],
      ] },
      { name: "Dimapur", lat: 25.91, lng: 93.73, blocks: [
        ["Medziphema", 25.75, 93.88, "Piphema", 25.79, 93.92],
        ["Dhansiripar", 25.77, 93.77, "Sohomi", 25.73, 93.74],
        ["Kuhuboto", 25.83, 93.9, "Ghukiye", 25.86, 93.94],
      ] },
    ],
  },
  {
    name: "Odisha", code: "OR", lat: 20.95, lng: 85.1,
    districts: [
      { name: "Cuttack", lat: 20.46, lng: 85.88, blocks: [
        ["Salipur", 20.46, 86.15, "Kandarpur", 20.49, 86.09],
        ["Athagarh", 20.52, 85.63, "Khuntuni", 20.55, 85.58],
        ["Niali", 20.3, 86.03, "Madhab", 20.33, 86.07],
      ] },
      { name: "Sambalpur", lat: 21.47, lng: 83.97, blocks: [
        ["Dhankauda", 21.45, 83.97, "Burla", 21.51, 83.87],
        ["Maneswar", 21.42, 84.0, "Themra", 21.38, 84.04],
        ["Rengali", 21.61, 84.03, "Kirmira", 21.65, 84.07],
      ] },
    ],
  },
  {
    name: "Punjab", code: "PB", lat: 31.15, lng: 75.34,
    districts: [
      { name: "Ludhiana", lat: 30.9, lng: 75.85, blocks: [
        ["Sudhar", 30.78, 75.68, "Jodhan", 30.74, 75.72],
        ["Khanna", 30.7, 76.22, "Ikolaha", 30.66, 76.18],
        ["Samrala", 30.83, 76.19, "Rurka", 30.87, 76.15],
      ] },
      { name: "Amritsar", lat: 31.63, lng: 74.87, blocks: [
        ["Ajnala", 31.84, 74.76, "Ramdas", 31.96, 74.9],
        ["Majitha", 31.75, 74.96, "Kathunangal", 31.72, 75.02],
        ["Attari", 31.6, 74.61, "Bharopal", 31.63, 74.57],
      ] },
    ],
  },
  {
    name: "Rajasthan", code: "RJ", lat: 27.02, lng: 74.22,
    districts: [
      { name: "Bikaner", lat: 28.02, lng: 73.31, blocks: [
        ["Bikaner", 28.02, 73.31, "Gadwala", 28.1, 73.2],
        ["Nokha", 27.57, 73.47, "Jasrasar", 27.65, 73.42],
        ["Lunkaransar", 28.5, 73.73, "Mahajan", 28.78, 73.83],
      ] },
      { name: "Jaipur", lat: 26.91, lng: 75.79, blocks: [
        ["Amber", 26.99, 75.85, "Kunda", 27.03, 75.88],
        ["Sanganer", 26.82, 75.79, "Muhana", 26.79, 75.75],
        ["Chaksu", 26.6, 75.95, "Kothun", 26.64, 75.99],
      ] },
    ],
  },
  {
    name: "Sikkim", code: "SK", lat: 27.53, lng: 88.51,
    districts: [
      { name: "Gangtok", lat: 27.33, lng: 88.61, blocks: [
        ["Ranka", 27.34, 88.66, "Lingdum", 27.36, 88.68],
        ["Pakyong", 27.23, 88.59, "Karthok", 27.26, 88.62],
        ["Rakdong Tintek", 27.38, 88.56, "Tintek", 27.41, 88.58],
      ] },
      { name: "Gyalshing", lat: 27.28, lng: 88.26, blocks: [
        ["Yuksom", 27.37, 88.22, "Tsong", 27.34, 88.25],
        ["Dentam", 27.29, 88.16, "Darap", 27.3, 88.2],
        ["Gyalshing", 27.28, 88.26, "Pelling", 27.3, 88.24],
      ] },
    ],
  },
  {
    name: "Tamil Nadu", code: "TN", lat: 11.13, lng: 78.66,
    districts: [
      { name: "Coimbatore", lat: 11.02, lng: 76.96, blocks: [
        ["Sulur", 11.02, 77.13, "Kannampalayam", 10.99, 77.08],
        ["Madukkarai", 10.9, 76.95, "Walayar", 10.83, 76.84],
        ["Annur", 11.23, 77.11, "Pasur", 11.27, 77.07],
      ] },
      { name: "Thanjavur", lat: 10.79, lng: 79.14, blocks: [
        ["Orathanadu", 10.62, 79.23, "Vadaseri", 10.58, 79.27],
        ["Papanasam", 10.93, 79.27, "Ayyampettai", 10.9, 79.3],
        ["Thiruvaiyaru", 10.88, 79.1, "Kandiyur", 10.85, 79.13],
      ] },
    ],
  },
  {
    name: "Telangana", code: "TG", lat: 18.11, lng: 79.02,
    districts: [
      { name: "Rangareddy", lat: 17.2, lng: 78.3, blocks: [
        ["Shamshabad", 17.25, 78.4, "Kothwalguda", 17.29, 78.37],
        ["Chevella", 17.31, 78.13, "Kanchanpalli", 17.34, 78.09],
        ["Ibrahimpatnam", 17.24, 78.61, "Mangalpally", 17.28, 78.58],
      ] },
      { name: "Karimnagar", lat: 18.44, lng: 79.13, blocks: [
        ["Manakondur", 18.32, 79.19, "Chintakunta", 18.29, 79.23],
        ["Choppadandi", 18.53, 78.94, "Venkatraopalle", 18.56, 78.98],
        ["Huzurabad", 18.19, 79.4, "Sikinderpur", 18.23, 79.36],
      ] },
    ],
  },
  {
    name: "Tripura", code: "TR", lat: 23.94, lng: 91.99,
    districts: [
      { name: "West Tripura", lat: 23.83, lng: 91.28, blocks: [
        ["Mohanpur", 23.95, 91.36, "Ramnagar", 23.92, 91.33],
        ["Hezamara", 23.86, 91.53, "Sidhai", 23.89, 91.49],
        ["Dukli", 23.78, 91.3, "Bodhjungnagar", 23.88, 91.42],
      ] },
      { name: "Gomati", lat: 23.53, lng: 91.48, blocks: [
        ["Matabari", 23.53, 91.48, "Gakulnagar", 23.56, 91.51],
        ["Amarpur", 23.52, 91.65, "Birganj", 23.49, 91.68],
        ["Kakraban", 23.5, 91.42, "Killa", 23.47, 91.45],
      ] },
    ],
  },
  {
    name: "Uttar Pradesh", code: "UP", lat: 26.85, lng: 80.95,
    districts: [
      { name: "Lucknow", lat: 26.85, lng: 80.95, blocks: [
        ["Malihabad", 26.92, 80.71, "Rahimabad", 26.97, 80.66],
        ["Kakori", 26.86, 80.81, "Natkur", 26.83, 80.85],
        ["Mohanlalganj", 26.68, 80.98, "Nagram", 26.62, 81.09],
      ] },
      { name: "Varanasi", lat: 25.32, lng: 82.97, blocks: [
        ["Arajiline", 25.24, 82.95, "Kachnar", 25.21, 82.92],
        ["Kashi Vidyapeeth", 25.28, 82.97, "Lohta", 25.29, 82.91],
        ["Pindra", 25.47, 82.85, "Phulpur", 25.51, 82.89],
      ] },
    ],
  },
  {
    name: "Uttarakhand", code: "UT", lat: 30.07, lng: 79.02,
    districts: [
      { name: "Dehradun", lat: 30.32, lng: 78.03, blocks: [
        ["Vikasnagar", 30.46, 77.77, "Herbertpur", 30.44, 77.73],
        ["Doiwala", 30.18, 78.12, "Bhaniyawala", 30.2, 78.16],
        ["Raipur", 30.3, 78.1, "Sahastradhara", 30.38, 78.13],
      ] },
      { name: "Nainital", lat: 29.38, lng: 79.45, blocks: [
        ["Bhimtal", 29.35, 79.56, "Naukuchiatal", 29.32, 79.57],
        ["Ramnagar", 29.39, 79.13, "Dhikuli", 29.44, 79.14],
        ["Haldwani", 29.22, 79.51, "Gaulapar", 29.27, 79.55],
      ] },
    ],
  },
  {
    name: "West Bengal", code: "WB", lat: 22.99, lng: 87.85,
    districts: [
      { name: "Nadia", lat: 23.47, lng: 88.55, blocks: [
        ["Krishnanagar I", 23.4, 88.5, "Bhaluka", 23.43, 88.46],
        ["Ranaghat I", 23.18, 88.56, "Anulia", 23.15, 88.59],
        ["Chakdaha", 23.08, 88.52, "Ghetugachhi", 23.05, 88.55],
      ] },
      { name: "Purba Bardhaman", code: "PBDN", lat: 23.25, lng: 87.85, blocks: [
        ["Memari I", 23.19, 88.12, "Satgachia", 23.16, 88.09],
        ["Kalna I", 23.22, 88.37, "Dhatrigram", 23.25, 88.33],
        ["Galsi I", 23.32, 87.7, "Purasa", 23.29, 87.74],
      ] },
    ],
  },

  // --- Union territories --------------------------------------------------------
  {
    name: "Andaman and Nicobar Islands", code: "AN", lat: 11.74, lng: 92.66,
    districts: [
      { name: "South Andaman", code: "SAND", lat: 11.62, lng: 92.72, blocks: [
        ["Ferrargunj", 11.72, 92.68, "Wandoor", 11.6, 92.62],
        ["Port Blair", 11.62, 92.73, "Bambooflat", 11.69, 92.71],
        ["Little Andaman", 10.75, 92.53, "Hut Bay", 10.58, 92.54],
      ] },
      { name: "North and Middle Andaman", code: "NMAND", lat: 12.72, lng: 92.9, blocks: [
        ["Rangat", 12.49, 92.93, "Nimbudera", 12.53, 92.91],
        ["Mayabunder", 12.92, 92.9, "Karmatang", 12.95, 92.92],
        ["Diglipur", 13.26, 93.0, "Kalighat", 13.2, 92.96],
      ] },
    ],
  },
  {
    // One district, one revenue tehsil — the blocks below are its village clusters.
    name: "Chandigarh", code: "CH", lat: 30.73, lng: 76.78,
    districts: [
      { name: "Chandigarh", lat: 30.73, lng: 76.78, blocks: [
        ["Chandigarh", 30.73, 76.78, "Kaimbwala", 30.77, 76.81],
        ["Manimajra", 30.73, 76.84, "Daria", 30.71, 76.83],
        ["Behlana", 30.7, 76.85, "Raipur Kalan", 30.72, 76.87],
      ] },
    ],
  },
  {
    name: "Dadra and Nagar Haveli and Daman and Diu", code: "DH", lat: 20.4, lng: 72.85,
    districts: [
      { name: "Dadra and Nagar Haveli", code: "DNH", lat: 20.27, lng: 73.02, blocks: [
        ["Silvassa", 20.27, 73.02, "Dadra", 20.33, 72.96],
        ["Khanvel", 20.21, 73.13, "Rakholi", 20.24, 73.07],
        ["Dudhani", 20.35, 73.2, "Mandoni", 20.32, 73.17],
      ] },
      { name: "Daman", lat: 20.4, lng: 72.83, blocks: [
        ["Moti Daman", 20.39, 72.83, "Kadaiya", 20.38, 72.86],
        ["Nani Daman", 20.42, 72.84, "Bhimpore", 20.44, 72.87],
        ["Dabhel", 20.36, 72.87, "Kachigam", 20.37, 72.89],
      ] },
      { name: "Diu", lat: 20.71, lng: 70.98, blocks: [
        ["Diu", 20.71, 70.98, "Fudam", 20.72, 70.95],
        ["Vanakbara", 20.73, 70.87, "Bucharwada", 20.72, 70.9],
        ["Ghoghla", 20.73, 70.99, "Zolawadi", 20.74, 70.97],
      ] },
    ],
  },
  {
    name: "Delhi", code: "DL", lat: 28.61, lng: 77.21,
    districts: [
      { name: "North West Delhi", code: "NWDL", lat: 28.72, lng: 77.07, blocks: [
        ["Narela", 28.85, 77.09, "Bankner", 28.82, 77.12],
        ["Kanjhawala", 28.72, 77.02, "Ladpur", 28.7, 76.99],
        ["Alipur", 28.8, 77.14, "Hamidpur", 28.78, 77.16],
      ] },
      { name: "South West Delhi", code: "SWDL", lat: 28.59, lng: 77.03, blocks: [
        ["Najafgarh", 28.61, 76.98, "Khaira", 28.59, 76.96],
        ["Kapashera", 28.52, 77.08, "Rajokri", 28.51, 77.11],
        ["Dwarka", 28.59, 77.05, "Bharthal", 28.56, 77.06],
      ] },
    ],
  },
  {
    name: "Jammu and Kashmir", code: "JK", lat: 33.78, lng: 76.58,
    districts: [
      { name: "Srinagar", lat: 34.08, lng: 74.8, blocks: [
        ["Srinagar", 34.08, 74.8, "Zakura", 34.14, 74.84],
        ["Khonmoh", 34.03, 74.92, "Balhama", 34.05, 74.89],
        ["Harwan", 34.14, 74.87, "Dara", 34.17, 74.88],
      ] },
      { name: "Jammu", lat: 32.73, lng: 74.87, blocks: [
        ["Bishnah", 32.61, 74.86, "Sohal", 32.58, 74.83],
        ["R S Pura", 32.63, 74.71, "Chohala", 32.66, 74.68],
        ["Marh", 32.75, 74.77, "Sohanjana", 32.78, 74.74],
      ] },
    ],
  },
  {
    name: "Ladakh", code: "LA", lat: 34.21, lng: 77.61,
    districts: [
      { name: "Leh", lat: 34.16, lng: 77.58, blocks: [
        ["Leh", 34.16, 77.58, "Choglamsar", 34.1, 77.58],
        ["Nubra", 34.65, 77.55, "Diskit", 34.54, 77.56],
        ["Khaltse", 34.32, 76.9, "Alchi", 34.22, 77.17],
      ] },
      { name: "Kargil", lat: 34.56, lng: 76.13, blocks: [
        ["Kargil", 34.56, 76.13, "Poyen", 34.53, 76.16],
        ["Drass", 34.43, 75.76, "Bhimbat", 34.4, 75.79],
        ["Sankoo", 34.32, 75.92, "Karkitchoo", 34.29, 75.95],
      ] },
    ],
  },
  {
    // A single district; each inhabited island is its own village panchayat.
    name: "Lakshadweep", code: "LD", lat: 10.57, lng: 72.64,
    districts: [
      { name: "Lakshadweep", lat: 10.57, lng: 72.64, blocks: [
        ["Kavaratti", 10.57, 72.64, "Kavaratti", 10.56, 72.63],
        ["Agatti", 10.85, 72.19, "Agatti", 10.84, 72.18],
        ["Minicoy", 8.28, 73.05, "Minicoy", 8.27, 73.04],
      ] },
    ],
  },
  {
    name: "Puducherry", code: "PY", lat: 11.94, lng: 79.83,
    districts: [
      { name: "Puducherry", code: "PDY", lat: 11.94, lng: 79.83, blocks: [
        ["Ariyankuppam", 11.89, 79.8, "Thavalakuppam", 11.87, 79.81],
        ["Villianur", 11.92, 79.74, "Kuruvinatham", 11.95, 79.71],
        ["Bahour", 11.79, 79.76, "Seliamedu", 11.82, 79.78],
      ] },
      { name: "Karaikal", lat: 10.93, lng: 79.84, blocks: [
        ["Karaikal", 10.93, 79.84, "Kovilpathu", 10.95, 79.82],
        ["Thirunallar", 10.92, 79.79, "Ambagarathur", 10.89, 79.76],
        ["Neravy", 10.89, 79.83, "T R Pattinam", 10.92, 79.85],
      ] },
    ],
  },
];

/** `Krishnanagar I` → `KRISHNANAGARI`, so codes stay stable as names are edited. */
function slug(name: string) {
  return name.toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

export interface FlatRegion {
  code: string;
  parentCode: string | null;
  name: string;
  level: RegionLevel;
  lat: number;
  lng: number;
}

/** The tree above as import-ready rows, parents before children. */
export function flattenRegionTree(): FlatRegion[] {
  const rows: FlatRegion[] = [
    { code: COUNTRY.code, parentCode: null, name: COUNTRY.name, level: "country", lat: COUNTRY.lat, lng: COUNTRY.lng },
  ];
  for (const state of INDIA_REGION_TREE) {
    rows.push({ code: state.code, parentCode: COUNTRY.code, name: state.name, level: "state", lat: state.lat, lng: state.lng });
    for (const district of state.districts) {
      const districtCode = `${state.code}-${district.code ?? slug(district.name)}`;
      rows.push({ code: districtCode, parentCode: state.code, name: district.name, level: "district", lat: district.lat, lng: district.lng });
      for (const [block, blockLat, blockLng, village, villageLat, villageLng] of district.blocks) {
        const blockCode = `${districtCode}-${slug(block)}`;
        rows.push({ code: blockCode, parentCode: districtCode, name: block, level: "block", lat: blockLat, lng: blockLng });
        rows.push({ code: `${blockCode}-${slug(village)}`, parentCode: blockCode, name: village, level: "village", lat: villageLat, lng: villageLng });
      }
    }
  }
  return rows;
}

const INSERT_CHUNK = 250;

/**
 * Insert any part of the hierarchy that is not in the database yet, matching
 * on `code`. Rows already present are left untouched — including their names
 * and coordinates — so edits made through the admin screens survive a reseed.
 */
export async function seedRegions(db: Db): Promise<{ created: number; existing: number }> {
  const flat = flattenRegionTree();
  const ids = new Map<string, string>();
  // Ancestry is denormalised onto every row, so a new child needs its parent's copy.
  const ancestryByCode = new Map<string, Ancestry>();
  for (let i = 0; i < flat.length; i += INSERT_CHUNK) {
    const codes = flat.slice(i, i + INSERT_CHUNK).map((r) => r.code);
    const rows = await db
      .select({
        id: regions.id,
        code: regions.code,
        stateId: regions.stateId,
        districtId: regions.districtId,
        blockId: regions.blockId,
        villageId: regions.villageId,
      })
      .from(regions)
      .where(inArray(regions.code, codes));
    for (const { id, code, ...ancestry } of rows) {
      if (!code) continue;
      ids.set(code, id);
      ancestryByCode.set(code, ancestry);
    }
  }
  const existing = ids.size;

  const pending: (typeof regions.$inferInsert)[] = [];
  for (const row of flat) {
    if (ids.has(row.code)) continue;
    const id = crypto.randomUUID();
    const parent = row.parentCode ? ancestryByCode.get(row.parentCode) : undefined;
    const ancestry: Ancestry = {
      stateId: parent?.stateId ?? null,
      districtId: parent?.districtId ?? null,
      blockId: parent?.blockId ?? null,
      villageId: null,
    };
    if (row.level !== "country") ancestry[`${row.level}Id`] = id;
    ids.set(row.code, id);
    ancestryByCode.set(row.code, ancestry);
    pending.push({
      id,
      name: row.name,
      level: row.level,
      code: row.code,
      lat: row.lat,
      lng: row.lng,
      parentId: row.parentCode ? (ids.get(row.parentCode) ?? null) : null,
      ...ancestry,
    });
  }

  for (let i = 0; i < pending.length; i += INSERT_CHUNK) {
    await db.insert(regions).values(pending.slice(i, i + INSERT_CHUNK)).onConflictDoNothing({ target: regions.code });
  }
  return { created: pending.length, existing };
}
