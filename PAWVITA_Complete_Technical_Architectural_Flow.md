# PAWVITA --- Complete Technical Architectural Flow

## 1. PAWVITA Website

**Frontend:** React.js + Progressive Web App (PWA)

### Landing Page

-   About PAWVITA
-   How It Works
-   Livestock Disease Information
-   Login / Sign Up

↓

## 2. Login / Sign Up

User selects or is assigned a role:

-   **Farmer / Field Worker**
-   **Veterinarian / Hospital / Authority**

↓

## 3. Role-Based Portal Routing

### 🐄 Farmer / Field Worker

**PashuRakshak Portal**

Features: - My Animal / Herd - Report Case - Upload Animal Photograph -
Enter Symptoms / Observations - Record Mortality - Vaccination &
Treatment - Animal / Herd History - Advisories & Alerts

↓

### 🏥 Veterinarian / Hospital / Authority

**Veterinary Intelligence Dashboard**

Features: - Review Reported Cases - Monitor High-Risk Cases - View
Disease-Risk Maps - Analyze Disease Trends - Laboratory Referrals -
Vaccination-Gap Monitoring - Treatment & Follow-Up - Coordinate Response

------------------------------------------------------------------------

# 4. Case Reporting Flow

From **PashuRakshak**, the user submits:

-   Animal photograph
-   Symptoms / observations
-   Voice or text description
-   Animal / herd information
-   Mortality information
-   Vaccination history
-   Treatment history
-   Location

↓

## 5. Node.js + Express.js Backend

The backend:

-   Receives reports through REST APIs
-   Validates incoming data
-   Handles authentication / authorization
-   Stores case information
-   Sends relevant data to AI services
-   Connects the farmer and veterinary portals

↓

# 6. AI Intelligence Layer

The submitted case is processed through three major AI modules.

### 📸 A. Computer Vision --- AI Vision Detection

**Animal Image**

↓

**YOLOv8-Nano**

-   Detects / localizes visible lesions or affected regions

↓

**MobileNetV3 / EfficientNet-B0**

-   Classifies the detected visual signs

**Initial target classes:** - Lumpy Skin Disease (LSD) - Foot and Mouth
Disease (FMD) - Mastitis - Bovine Papillomatosis - Blackleg - Healthy /
Control

↓

### 🩺 B. Clinical Symptom & NLP Triage

**Symptoms / Checklist / Voice Transcript**

↓

**XGBoost / DistilBERT + NLP**

↓

Produces: - Preliminary disease indication - Risk level - Relevant
symptoms - Recommended veterinary attention

↓

### 📍 C. Outbreak Intelligence

Combines:

-   Current cases
-   Historical cases
-   Location
-   Time
-   Disease patterns
-   Weather / environmental data
-   Vaccination coverage

↓

**Trend Analysis / ML**

↓

Identifies: - Emerging disease patterns - Possible clusters - High-risk
zones - Village → Block → District trends

------------------------------------------------------------------------

# 7. AI Assessment & Risk Scoring

The system combines:

**AI Vision + Clinical Symptoms + Animal History + Herd Information +
Location**

↓

### Risk Assessment

-   **Low** → Monitor
-   **Moderate** → Veterinary Review
-   **High** → Urgent Veterinary Attention

> PAWVITA provides AI-assisted decision support. Final diagnosis and
> treatment decisions remain with qualified veterinary professionals.

↓

# 8. Supabase --- Shared Data Layer

**Database + Storage**

Stores:

-   Users
-   Animals
-   Herds
-   Cases / Reports
-   Symptoms
-   AI Results
-   Vaccination Records
-   Treatment Records
-   Laboratory Reports
-   Locations
-   Alerts / Advisories
-   Case Status
-   Uploaded Images / Files

↓

# 9. Veterinary Intelligence Dashboard

Authorized veterinary users receive the processed case.

### Case Review

-   View animal / herd history
-   View submitted photographs
-   View symptoms
-   View AI assessment
-   View risk level
-   Review confidence / supporting information

### Veterinary Actions

-   Approve / review AI assessment
-   Assign or refer case
-   Request laboratory testing
-   Add treatment
-   Update vaccination
-   Add follow-up notes
-   Change case status

### Case Status

`Active → Under Review → Lab Pending → Treated → Resolved`

↓

# 10. Feedback to Farmer / Field Worker

Updated information is sent back to **PashuRakshak**:

-   Case status
-   Veterinary advice
-   Treatment instructions
-   Vaccination reminders
-   Laboratory updates
-   Follow-up alerts
-   Risk advisories

↓

# 11. Population-Level Outbreak Intelligence

Individual cases are aggregated:

**Animal 1 + Animal 2 + Animal 3 + ...**

↓

**Farm / Herd**

↓

**Village**

↓

**Block**

↓

**District**

↓

### Disease-Risk Map + Trend Dashboard

Veterinary authorities can identify:

-   Emerging clusters
-   High-risk areas
-   Disease trends
-   Vaccination gaps
-   Response priorities

------------------------------------------------------------------------

# 12. Offline-First PWA Flow

### Internet Available

PashuRakshak

↓

Node.js / Express API

↓

Supabase

↓

Normal processing & synchronization

### Internet Unavailable

PashuRakshak PWA

↓

Cached application

↓

IndexedDB / Local Storage

↓

Case saved locally

↓

**Internet Restored**

↓

Background Synchronization

↓

Node.js / Express API

↓

Supabase

> Lightweight AI models can also be deployed at the edge where device
> capability permits; heavier processing can be handled through
> connected AI services.

------------------------------------------------------------------------

# 13. Complete System Architecture

``` text
                    PAWVITA WEBSITE
                React.js + PWA Frontend
                         │
                 LOGIN / SIGN UP
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
      PASHURAKSHAK PORTAL     VETERINARY DASHBOARD
      Farmer / Field Worker   Vets / Authorities
              │                     ▲
              │                     │
              ▼                     │
       REPORT ANIMAL CASE            │
              │                     │
              └──────────┬──────────┘
                         ▼
                NODE.JS + EXPRESS
                   REST API
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
      AI VISION     CLINICAL AI    OUTBREAK AI
      YOLOv8 +      XGBoost /      Trend + Geo
      MobileNet     DistilBERT     Analysis
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                  AI ASSESSMENT
                Risk + Insights
                         │
                         ▼
                    SUPABASE
              Database + Storage
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
       CASE MANAGEMENT       OUTBREAK ANALYTICS
              │                     │
              ▼                     ▼
     VETERINARY ACTION       RISK MAPS / TRENDS
              │
              ▼
      ADVISORIES / ALERTS
              │
              ▼
       FARMER / FIELD WORKER
```

------------------------------------------------------------------------

# 14. Technology Stack

  Layer             Technology
  ----------------- ---------------------------------------------
  Frontend          React.js
  Web Application   Progressive Web App (PWA)
  Backend           Node.js + Express.js
  Database          Supabase
  Storage           Supabase Storage
  Computer Vision   YOLOv8-Nano + MobileNetV3 / EfficientNet-B0
  Clinical AI       XGBoost / DistilBERT
  NLP               spaCy
  AI Services       Python
  Offline Storage   IndexedDB
  Synchronization   Service Workers + Background Sync
  Mapping           Geospatial Mapping
  APIs              REST APIs

------------------------------------------------------------------------

# 15. Core System Story

**REPORT → DETECT → TRIAGE → MAP → PREDICT → RESPOND → FOLLOW-UP**

The core idea is:

> **Two web portals → One Node.js backend → Shared health records → AI
> processing → Veterinary action → Population-level outbreak
> intelligence → Feedback to farmers.**

PAWVITA connects the first report from an individual animal to
veterinary response and broader disease surveillance across farms,
villages, blocks and districts.
