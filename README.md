# 🌊 BlueChain Registry

**A Blockchain-Based Blue Carbon Registry and MRV (Monitoring, Reporting, Verification) Platform**

Built for **Smart India Hackathon — Problem Statement SIH25038**

BlueChain Registry brings transparent, tamper-evident, AI-assisted verification to blue carbon restoration — tracking mangrove, seagrass, and salt marsh restoration projects from field submission through independent verification to carbon credit issuance, with every step recorded in an auditable chain.

---

## 🚩 The Problem

Blue carbon ecosystems (mangroves, seagrass meadows, salt marshes) are among the most effective natural carbon sinks on the planet — but the **Monitoring, Reporting, and Verification (MRV)** process behind blue carbon credits is often opaque, manual, and vulnerable to fraud. Field data is hard to verify at scale, carbon credit issuance lacks transparency, and there's no easy way for the public — or auditors — to independently confirm that a claimed restoration project is real and its credits are legitimate.

## 💡 Our Solution

BlueChain Registry digitizes the entire blue carbon MRV lifecycle into a single platform with **three accountable roles**, **AI-assisted evidence scoring**, **fraud/anomaly detection**, and a **public, tamper-evident registry** anyone can verify.

---

## ✨ Core Features

### 🧑‍🌾 Field Submitter — Ground Truth Data Collection
- Register new restoration project sites (ecosystem type, location, area, description)
- Submit field evidence: geotagged photos, GPS coordinates, submission notes
- AI-assisted species auto-suggestion from uploaded photos, with confirm/override
- Real-time submission status tracking (pending → verified/rejected/flagged)
- Visual evidence timeline showing a project's restoration progress over time
- In-app notifications when a verifier approves, rejects, or flags a submission

### 🛡️ Verifier — Independent Quality Control
- Dedicated review queue prioritizing flagged and pending evidence
- Full AI confidence breakdown per submission (vegetation health, species match, canopy density)
- On-photo annotation tool to mark and explain exactly what's being flagged
- Approve/reject workflow with mandatory notes, permanently attached to the record
- Built-in anomaly/fraud detection panel — duplicate GPS clustering, out-of-boundary submissions, suspicious timing patterns
- Manual site alert logging (erosion, water quality, biodiversity risk)

### 🔐 Admin — Registry Governance
- Full platform analytics dashboard (verification rates, ecosystem breakdown, credit issuance trends)
- **Two-person carbon credit issuance rule**: credits can only be issued for verified evidence, and the issuing admin can never be the same person who verified it — enforced at the database level via Row Level Security, not just the UI
- Admin account approval workflow, with a safe bootstrap path for the very first admin
- User and role management across the platform
- Immutable, hash-chained audit log of every verification and issuance
- Carbon credit ledger export for external audit
- Platform-wide risk monitoring, ranking projects by degradation likelihood

### 🌐 Public Registry — Transparency by Design
- No-login public portal to search and view any registered project
- Full verification trail displayed as a visual stepper: Submitted → AI-Scored → Verified → Credits Issued
- QR code generation per project, for physical placement at real-world restoration sites — scan to instantly view that site's live verification record
- Auto-generated, shareable "impact story" summaries for each project, written in plain language for funders, NGOs, and the public

---

## 🧠 What Makes This Different

| Typical registry demo | BlueChain Registry |
|---|---|
| Manual, opaque MRV | AI-assisted evidence scoring with explainable confidence breakdowns |
| Single-admin credit issuance | Enforced two-person rule (verifier ≠ issuer) at the database level |
| Static PDF reports | Live, publicly verifiable digital trail per project, accessible via QR code |
| No fraud safeguards | GPS clustering, boundary, and timing-based anomaly detection |
| One-size-fits-all dashboard | Purpose-built, role-specific workspaces for field, verification, and governance work |

---

## 🏗️ Tech Stack

- **Frontend:** React 19 + TypeScript, TanStack Start & TanStack Router, Tailwind CSS
- **UI Components:** Radix UI primitives, shadcn-style component library, Recharts for analytics
- **Backend & Database:** Supabase (Postgres, Auth, Storage, Row Level Security)
- **AI Layer:** Image-based evidence analysis for vegetation health, species matching, and confidence scoring
- **Hosting:** Deployed as a full-stack app with Supabase as the managed backend

---

## 📂 Project Structure

```
src/
├── components/
│   ├── dashboards/          # Role-specific dashboards (submitter, verifier, issuance queue)
│   ├── evidence-*.tsx       # Evidence submission, annotation, timeline
│   ├── anomaly-panel.tsx    # Fraud/anomaly detection UI
│   ├── carbon-credit-dialog # Credit issuance workflow
│   ├── impact-story.tsx     # Auto-generated project impact summaries
│   └── public-qr-dialog.tsx # Public registry QR generation
├── lib/
│   ├── carbon.ts            # Carbon credit calculation logic
│   ├── anomaly.ts           # Fraud/anomaly detection logic
│   ├── evidence.functions.ts
│   ├── projects.ts
│   └── registry.functions.ts
├── routes/
│   ├── _authenticated/      # Role-gated dashboard, projects, verification, alerts, users
│   └── registry/            # Public-facing registry pages
└── integrations/supabase/   # Supabase client, auth middleware
supabase/
└── migrations/               # Database schema & RLS policy migrations
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project (free tier is sufficient for development)

### Setup

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

Add the following to your `.env`:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run the database migrations in `supabase/migrations/` against your Supabase project (via the Supabase SQL editor or CLI) to set up all tables and Row Level Security policies.

```bash
# Start the development server
npm run dev

# Build for production
npm run build

# Preview the production build
npm run preview
```

---

## 👥 Roles & Demo Access

BlueChain Registry supports three distinct account roles, selected at sign-up:

| Role | Purpose |
|---|---|
| **Field Submitter** | Registers projects and submits restoration evidence |
| **Verifier** | Reviews evidence, approves/rejects, flags anomalies |
| **Admin** | Approves admins, issues carbon credits, governs the platform |

> The first admin account created is auto-approved to bootstrap the system; every subsequent admin sign-up requires manual approval from an existing admin.

---

## 🎯 Alignment with SIH25038

This project directly addresses the problem statement's call for a **blockchain-based blue carbon registry with MRV capability** by combining:
- Tamper-evident, hash-chained record keeping
- AI-assisted, explainable evidence verification
- Independent, role-separated human verification
- Public transparency and auditability
- Fraud-resistant safeguards built into the data model, not just the UI

---

## 🙌 Team / Author

Built by **Lara Samynathan**

This project was built for academic and hackathon submission purposes (Smart India Hackathon 2026).
