# GE MSHIELD — CURRENT ANTIGRAVITY MIGRATION OVERRIDES

These current overrides take precedence over older sections in this document where they conflict.

1. The existing Lovable frontend is a migration source and should be preserved visually and behaviorally.
2. Existing TypeScript/TSX files MAY remain during migration, especially routing and React components. Do not perform a mass TS/TSX-to-JS conversion merely for file-extension reasons. The target frontend architecture remains React 19 + Vite.
3. The existing Python/FastAPI project is a real compliance-engine foundation. Preserve and extend it; do not rebuild the compliance engine from zero.
4. Final target runtime architecture: FastAPI + Uvicorn + Docker + Neon PostgreSQL + pgvector + PyMuPDF + all-MiniLM-L6-v2 + RAG + Gemini + SQLAlchemy.
5. Supabase is for authentication only; application/business data remains in Neon.
6. Lovable AI gateway must be removed from the target implementation. Gemini calls must be server-side behind FastAPI using the current supported Google GenAI Python SDK.
7. data.gov.in must be integrated through FastAPI, with real resource IDs and provenance. Never fabricate bidder evidence or PDFs.
8. The approved Design.zip is the visual source of truth; the Flowchart is the routing source of truth; the SIH PPT is the declared technology/product source of truth.
9. No fake business arrays. Missing data must render honest loading/empty/error/not-found/forbidden states.
10. Build in a closed loop and maintain BUILD_STATUS.md.

---

# GeMShield — Master Build Specification v2 (JavaScript Frontend + Existing FastAPI Backend)

**Project:** SIH26100 — AI-Powered Integrated Bid Compliance Verification Platform for GeM Procurement  
**Product:** GeMShield — Evidence-Grounded Bid Verification for GeM  
**Team:** Debug Dynasty  
**Primary consumer:** Procurement / Government Officials; Vendor side is a separate role  

> **This document is the implementation source of truth.** The supplied Design.zip files are visual references. The supplied FastAPI backend is the existing compliance-engine foundation. The website must be a real application whose UI is populated from runtime API/database/AI/document data.

## 0A. FINAL USER OVERRIDES — THESE TAKE PRIORITY

The following requirements are mandatory additions to this v2 specification.

### A. Frontend source files are JavaScript only

Use:
```text
.js
.css
.json
```

Never create:
```text
.ts
.tsx
.jsx
.cjsx
```

React components are plain JavaScript React components.

### B. Authentication is Supabase Auth

Use **Supabase Auth only for authentication**.

Use:
- `@supabase/supabase-js`
- email + password sign-in
- Supabase access token/JWT
- frontend session persistence through Supabase Auth
- FastAPI JWT validation on protected endpoints

Do NOT move application/business data to Supabase.

### C. Neon is the application database

Use **Neon PostgreSQL** as the single source of truth for application/business data:
- tenders
- vendors
- applications
- bids
- documents metadata
- verification runs
- rule results
- AI/RAG results
- evidence
- conflicts
- review cases
- decisions
- Bid Passports
- notifications
- audit logs
- analytics/report data

Enable/use **pgvector** in Neon for the 384-dimensional `all-MiniLM-L6-v2` embeddings.

### D. Existing FastAPI backend remains the compliance engine

Preserve the uploaded backend and extend it.

Do not replace FastAPI with Node/Express.

### E. Docker is mandatory for deployment

The final project must contain:
```text
frontend/Dockerfile
backend/Dockerfile
docker-compose.yml
```

Neon and Supabase remain managed external services and are configured through environment variables.

### F. Demo login accounts are mandatory

Lovable must create two working demo accounts in Supabase Auth:

```text
ADMIN / PROCUREMENT OFFICER
Email: admin@gemshield.demo
Password: GemShieldAdmin@2026!

VENDOR
Email: vendor@gemshield.demo
Password: GemShieldVendor@2026!
```

These are DEMO credentials for the submitted prototype only.

The account seed must happen server-side or through a setup/seed script using the Supabase service-role key.
NEVER put the service-role key into the React application.

The user profile/role mapping must also be stored in Neon:

```text
auth_user_id
role
department_id
display_name
active
```

Required roles at minimum:
```text
admin
procurement_officer
vendor
```

### G. data.gov.in is the public-source document/data channel

For the demonstration source library, the application must support importing publicly available resources from:
```text
data.gov.in
*.data.gov.in
```

Do NOT invent or fabricate government PDFs.

The application must verify that an imported source actually downloads successfully.

For the PDF compliance demo:
- only actual PDF resources retrieved from the data.gov.in domain may be imported into the demo document library;
- store source URL, title, publisher, resource ID if available, fetched timestamp and SHA-256 hash;
- show the source attribution in the document viewer;
- do not convert CSV/JSON data into a fake PDF;
- if no compatible PDF exists for a search, show a real empty state.

### H. Important source limitation

data.gov.in contains many structured datasets and some PDF resources, but it is not guaranteed to be a repository of complete GeM bidder bid packages.

Therefore:
- the UI must not claim every data.gov.in resource is a bid package;
- a data.gov.in PDF must be treated according to its actual content;
- if a PDF does not contain bidder evidence required by the rule set, the system should honestly return missing/cannot-determine findings;
- never create synthetic bidder evidence to make the score look better.

The current data.gov.in Tender keyword page includes public-procurement datasets, including Assam public procurement data. Resource pages can expose downloads/previews and, for some resources, Data APIs. fileciteturn28file0L653-L671

### I. Runtime intelligence is mandatory

The following MUST be runtime-generated:
- vendor names
- tender names/IDs
- compliance scores
- AI explanations
- AI confidence
- rule results
- evidence pages
- metrics
- charts
- notifications
- audit records
- reports
- PDF previews

Do not use screenshots as business UI.

### J. Lovable must not "finish" missing data by inventing it

When an API/domain model is missing:
1. extend the FastAPI/backend/database;
2. create the typed-equivalent JavaScript API service contract;
3. return an honest loading/empty/error state until data exists.

Do not insert fake arrays into React.

---

## 0. IMPORTANT: NO GENERATOR-SPECIFIC SHORTCUTS

Do not convert this project into a screenshot-based demo.

The application MUST NOT:
- use dashboard screenshots as the actual page UI;
- hardcode the sample vendor/tender names, scores, counts, charts or notification records visible in the design images;
- hardcode PDF screenshots instead of rendering real uploaded documents;
- hardcode AI analysis text;
- hardcode chart values;
- create fake “production-looking” arrays solely to make pages look full;
- invent government datasets or claim a live government API exists when it does not;
- expose Gemini credentials to the browser.

The screenshots define:
- visual appearance;
- information hierarchy;
- spacing and proportions;
- component shapes;
- navigation;
- tabs;
- intended interaction behavior;
- light/dark theme.

The backend/database define:
- what data is real;
- what results are returned;
- what is calculated;
- what the user is allowed to do.

The AI/document pipeline defines:
- runtime analysis;
- evidence;
- AI reasoning;
- confidence;
- generated explanations.

---

# 1. EXACT SOURCE MATERIALS TO USE

Give Lovable / the coding agent ALL of these together:

1. `Design.zip` — approved UI reference pack.
2. `New folder (3).zip` — existing FastAPI compliance backend.
3. `SMART INDIA HACKATHON 2026(1)(4).pptx` — current SIH26100 architecture and technical approach.
4. `Flowchart(4).png` — end-to-end product flow.
5. This specification.

The PPT explicitly defines the product as evidence-grounded verification using Tender Digital Twin, Evidence Graph, Conflict Scan, Confidence Gate and Bid Passport, with the officer retaining final authority. fileciteturn28file0L73-L100

The PPT also specifies the current core stack: React/Vite, FastAPI/Uvicorn, BackgroundTasks, PyMuPDF, Python regex/rules, GSTIN/PAN/EMD validators, all-MiniLM-L6-v2 384-d embeddings, pgvector, Gemini 2.0 Flash, PostgreSQL and SQLAlchemy. fileciteturn28file0L205-L317

---

# 2. SOURCE-OF-TRUTH PRIORITY

When two instructions appear to conflict, use this order:

1. **Current approved design in Design.zip** for visual layout.
2. **Current flowchart** for navigation/module structure.
3. **Current SIH PPT** for product logic and named capabilities.
4. **Existing backend code** for what is already implemented and exact current APIs.
5. This specification for how to connect and extend everything.
6. Never invent functionality merely because a mockup image contains an example value.

---

# 3. FILE-EXTENSION RULE — STRICT

The user does NOT want TypeScript or JSX-family files.

## Frontend
Use JavaScript only:

```text
.js
.css
.json
```

React components MUST be plain JavaScript React modules, e.g.:

```text
App.js
main.js
Dashboard.js
TenderDetails.js
```

DO NOT create:

```text
.ts
.tsx
.jsx
.cjsx
```

## Backend
Keep the existing FastAPI/Python implementation:

```text
.py
```

Node.js is the frontend tooling/runtime around React/Vite. FastAPI remains the API/backend framework. Do not replace FastAPI with an Express backend.

---

# 4. TECH STACK TO LOCK

## Frontend
- React 19
- Vite
- JavaScript
- Existing CSS/Tailwind approach in the project
- Lucide-style icon system if already used by the generated frontend

## Backend
- Python
- FastAPI
- Uvicorn
- SQLAlchemy 2.x
- PostgreSQL
- pgvector
- PyMuPDF
- sentence-transformers / `all-MiniLM-L6-v2`
- Gemini API / `gemini-2.0-flash`
- `rules.json`
- FastAPI BackgroundTasks initially
- `python-dotenv`

## Do not introduce a second backend
No Express server in front of FastAPI unless there is a concrete deployment requirement later. The frontend calls FastAPI directly.

---

# 5. EXISTING BACKEND — READ THIS BEFORE CHANGING ANYTHING

The uploaded backend currently contains:

```text
main.py
models.py
db.py
orchestrator.py
document_processor.py
rule_engine.py
rag_engine.py
embed_rules.py
rules.json
```

The backend currently exposes:

```http
GET  /
POST /upload
GET  /jobs
GET  /jobs/{job_id}/status
GET  /jobs/{job_id}/results
```

Current upload behavior:
- PDF only
- maximum 20 MB
- file stored with UUID-prefixed filename
- compliance job created
- FastAPI BackgroundTasks launches the compliance pipeline

The current compliance job model stores:

```text
id
filename
stored_path
status
score
verdict
page_count
char_count
processing_error
created_at
completed_at
```

The current deterministic rule results contain:

```text
rule_code
rule_name
passed
severity
found_value
expected_value
evidence_text
evidence_page
suggestion
```

The current RAG results contain:

```text
rule_content
verdict
confidence
reason
distance
```

The existing backend therefore remains the **working compliance-engine core**.

Do not delete it and rebuild it from scratch.

---

# 6. CURRENT BACKEND LIMITATIONS THAT MUST BE HANDLED

The existing backend is NOT yet the complete GeMShield platform.

It currently lacks full domain support for:

```text
Authentication
Role-based access
Vendor profiles
Government users
Departments
Tenders
Tender versions
Tender requirements
ATCs
Tender documents
Applications
Bids
Bid documents as business entities
Verification runs linked to bids
Human review cases
Clarifications
Decisions
Bid Passports
Notifications
Audit logs
Vendor onboarding
Rule administration
User management
Reports
Analytics aggregations
```

The frontend must not fake these features while pretending they are backed.

Extend the backend and database incrementally around the existing compliance engine.

---

# 7. CURRENT BACKEND FILES ARE NOT DASHBOARD DATA

The backend ZIP contains files such as:

```text
bid_compliant.pdf
Zihad.pdf
Python_PBL_1_Report_*.pdf
Python_PBL_2_Report.pdf
```

These are local/example project files, NOT permanent dashboard records.

Do not display them automatically as vendor bids or official documents.

A real document shown in the UI must come from a user upload or an actual database-linked document record.

---

# 8. PRODUCT PRINCIPLE: DESIGN ≠ DATA

The design may contain example:

```text
TechNova Solutions Pvt. Ltd.
GEM/2026/1246
96%
12,486 activities
₹324.8 Cr
```

These are visual examples only.

The application must instead render values from API responses:

```js
<Card value={dashboard.totalSubmissions} />
<DataTable rows={vendors} />
<ComplianceScore value={verification.score} />
<TrendChart data={analytics.submissionTrend} />
```

No screenshot number should become a database seed value just because it appears in the design.

---

# 9. REAL-TIME / RUNTIME DATA CONTRACT

## Dynamic content must include

### Database/API data
- names
- tender IDs
- departments
- dates
- statuses
- users
- vendors
- bid records
- notifications
- audit records

### Derived data
- compliance score
- compliance distribution
- risk distribution
- category counts
- review queue counts
- submission trend
- performance rates
- onboarding funnel

### AI data
- AI explanation
- confidence
- recommendation
- deficiency memo
- ambiguous-clause analysis
- AI insights

### Document data
- actual PDF
- page number
- extracted value
- evidence snippet
- document metadata
- hash

All of the above must update when the backend data changes.

---

# 10. NO-MOCK-DATA RULE

Do not create frontend arrays such as:

```js
const vendors = [...fake records...]
const notifications = [...fake records...]
const chartData = [...fake records...]
```

for production pages.

Allowed:
- loading skeletons;
- empty-state objects;
- local form state;
- static dropdown labels where the list itself is fixed by the UI;
- static design metadata;
- decorative artwork.

Not allowed:
- fake business records.

Demo authentication users are explicitly allowed as seeded Supabase Auth accounts (see Section 3A).
Business records such as vendors, tenders, bids, metrics, charts, notifications and audit records must not be invented.
For the demo, business documents/records must come from approved runtime sources, especially the data.gov.in import workflow defined below.

---

# 11. OPEN-GOVERNMENT-DATA BOUNDARY

If open government data is used, use it only for legitimate reference/metadata use cases such as:
- department/reference lists;
- public classification data;
- non-sensitive category/reference information.

Do not claim that Data.gov.in provides live bidder compliance results unless an actual verified source exists.

Tender/bid/compliance information must come from GeMShield's application database, uploaded documents, or authorized integrations.

---

# 12. CORE ROLE FLOW FROM THE FLOWCHART

```text
Landing Page
   ↓
Sign Up / Sign In
   ↓
Role Selection
   ├── Vendor
   │      ↓
   │   Vendor Dashboard
   │
   └── Government Official
          ↓
      Government Buyer Dashboard
```

The flowchart's vendor side contains Find Tenders, My Bids, Compliance Verification and Bid Passport, with notifications/profile/help and additional vendor features. fileciteturn28file0L101-L195

The government side contains Create & Manage Tenders, Received Bids, AI-based Bid Verification, Human Review Queue and Final Decision & Records, with additional analytics, rule management, user management, audit logs and support. fileciteturn28file0L179-L195

---

# 13. GLOBAL ROUTING CONTRACT

Every clickable element must have one of these outcomes:

```text
1. Route to another page
2. Change active tab/query state
3. Open a drawer/modal
4. Execute a backend mutation
5. Download/stream a real resource
6. Toggle a UI preference
```

A visually active button with no defined action is a build error.

---

# 14. VENDOR ROUTE TREE

```text
/vendor/dashboard
/vendor/find-tenders
/vendor/tenders/:tenderId
/vendor/tenders/:tenderId/apply/basic
/vendor/tenders/:tenderId/apply/documents
/vendor/tenders/:tenderId/apply/bid
/vendor/tenders/:tenderId/apply/review
/vendor/my-bids
/vendor/my-bids/:bidId
/vendor/compliance
/vendor/compliance/:bidId
/vendor/bid-passport
/vendor/bid-passport/:bidId
/vendor/documents/:documentId
/vendor/notifications
/vendor/profile
/vendor/profile/edit
/vendor/settings
/vendor/help
```

---

# 15. VENDOR — FIND TENDERS

Route:

```text
/vendor/find-tenders
```

Tabs:

```text
All Tenders
Recommended for You
Closing Soon
Saved Tenders
```

Tab query state:

```text
?tab=all
?tab=recommended
?tab=closing-soon
?tab=saved
```

### Actions

```text
View Details → /vendor/tenders/:tenderId
Apply → /vendor/tenders/:tenderId/apply/basic
Save → backend mutation; remain on page
```

No static tender rows.

---

# 16. VENDOR — TENDER DETAILS

Route:

```text
/vendor/tenders/:tenderId
```

Approved sections:

```text
Overview
Documents
Technical Requirements
Financial Details
Important Dates
Requirements & ATC
```

The four major overview sections must retain the balanced visual treatment from the approved design.

### View document

```text
/vendor/documents/:documentId
```

### Apply

```text
/vendor/tenders/:tenderId/apply/basic
```

All tender details come from APIs.

---

# 17. VENDOR — APPLY TENDER: FOUR LOCKED STAGES

This is one workflow, not four sidebar modules.

## Stage 1 — Basic Information

Route:

```text
/vendor/tenders/:tenderId/apply/basic
```

Collect the bidder/application fields required by the tender:
- bidder/company details;
- registration number;
- GSTIN;
- PAN;
- authorised representative;
- designation;
- email;
- contact details.

The exact fields can be generated dynamically from tender configuration, but the approved design structure must remain.

## Stage 2 — Documents Upload

```text
/vendor/tenders/:tenderId/apply/documents
```

The document list must come from the tender's required documents.

Show:
- mandatory/optional;
- upload status;
- file name;
- validation result;
- progress.

## Stage 3 — Technical & Financial Bid

```text
/vendor/tenders/:tenderId/apply/bid
```

Technical requirements come from the tender requirement definitions.

Financial fields come from the tender's configuration and bidder input.

## Stage 4 — Review & Submit

```text
/vendor/tenders/:tenderId/apply/review
```

Show read-only summary of:
- bidder information;
- documents;
- technical bid;
- financial bid;
- declaration/checklist.

Submit:

```http
POST /applications/:applicationId/submit
```

After successful submission:

```text
/vendor/my-bids/:bidId
```

### Post-submission rule

The vendor cannot modify submitted documents or the submitted bid unless the backend has an explicit department-approved reopen/clarification state.

---

# 18. VENDOR — MY BIDS

```text
/vendor/my-bids
/vendor/my-bids/:bidId
```

Inside the selected bid, use the approved tabs:

```text
Timeline
Submitted Documents
Communication
Evaluation Updates
```

Do not create duplicate sidebar pages for each tab.

---

# 19. VENDOR — COMPLIANCE CHECK

```text
/vendor/compliance
/vendor/compliance/:bidId
```

Sections:

```text
Requirement-wise Analysis
Document-wise View
Missing / Mismatched Items
AI Insights
Review History
```

The **compliance score must remain visible** as the headline state.

### Critical distinction

Vendor compliance is generally READ-ONLY.

The vendor can see:
- score;
- requirement result;
- evidence page/document;
- missing item;
- mismatch;
- AI explanation;
- review status;
- guidance.

The vendor cannot silently replace files, alter the score, alter AI analysis, or alter an officer's decision.

This follows the product's confidence-gated human review model and officer authority. fileciteturn28file0L638-L643

---

# 20. VENDOR — BID PASSPORT

```text
/vendor/bid-passport
/vendor/bid-passport/:bidId
```

This MUST remain separate from Compliance Check.

Bid Passport represents the finalized/replayable record:
- final decision;
- rule version;
- requirement results;
- evidence references;
- document hashes;
- officer decision;
- decision timestamp;
- audit references.

Do not give the vendor Bid Passport features that belong to live compliance analysis.

The PPT explicitly describes Bid Passport as the hash-sealed, replayable record of the verdict. fileciteturn28file0L88-L100

---

# 21. VENDOR — NOTIFICATIONS

```text
/vendor/notifications
```

Live categories:

```text
System
Tenders
Vendors
Compliance
Approvals
```

The notification list and detail panel are runtime data.

---

# 22. VENDOR — PROFILE & SETTINGS

```text
/vendor/profile
/vendor/profile/edit
/vendor/settings
```

Settings MUST be a real working section.

```text
Account Settings
Security
Notifications
Preferences
Appearance
Connected Accounts
```

No decorative-only settings.

---

# 23. VENDOR — HELP

```text
/vendor/help
```

Use the approved Help & Guidelines visual structure.

The vendor-facing AI helper may explain platform usage and approved documentation but must not invent procurement policy.

---

# 24. GOVERNMENT OFFICER ROUTE TREE

```text
/officer/dashboard
/officer/tenders/create/basic
/officer/tenders/create/requirements
/officer/tenders/create/documents
/officer/tenders/create/review
/officer/tenders/manage
/officer/tenders/:tenderId/view
/officer/tenders/:tenderId/edit/basic
/officer/tenders/:tenderId/edit/requirements
/officer/tenders/:tenderId/edit/documents
/officer/tenders/:tenderId/edit/review
/officer/bids
/officer/bids/:bidId
/officer/documents/:documentId
/officer/ai-compliance
/officer/ai-compliance/:runId
/officer/human-review
/officer/human-review/:caseId/view
/officer/human-review/:caseId/verify
/officer/decisions
/officer/decisions/:bidId
/officer/reports
/officer/vendors
/officer/onboarding
/officer/rules
/officer/users
/officer/audit
/officer/audit/:eventId
/officer/notifications
/officer/profile
/officer/settings
/officer/help
```

---

# 25. OFFICER DASHBOARD HOME

```text
/officer/dashboard
```

Live content:
- active tenders;
- bids received;
- bids under evaluation;
- human review queue;
- pending decisions;
- recent activity;
- current analytics.

Any chart on the design is a component placeholder until its API returns data.

---

# 26. CREATE TENDER — FOUR STAGES

```text
/officer/tenders/create/basic
/officer/tenders/create/requirements
/officer/tenders/create/documents
/officer/tenders/create/review
```

## Stage 1 — Basic Information

Tender title, department, category, procurement type, dates, value, description and applicable metadata.

## Stage 2 — Requirements & ATC

Build the Tender Digital Twin:

```text
Clause
→ Requirement
→ Applicability
→ Mandatory/Optional
→ Severity
→ Evaluation method
```

## Stage 3 — Documents & Rules

Configure:
- bidder document requirements;
- rule set;
- rule version;
- validation requirements.

## Stage 4 — Review & Publish

Validate the complete tender before publishing.

Actions:

```text
Save Draft
Preview
Publish
```

No published tender should be silently mutated; use an amendment/version workflow where appropriate.

---

# 27. MANAGE TENDERS

```text
/officer/tenders/manage
```

Tabs:

```text
All
Drafts
Published
Under Evaluation
Closed
Cancelled
```

### Eye

```text
/officer/tenders/:tenderId/view
```

### Pencil

```text
/officer/tenders/:tenderId/edit/basic
```

### Three dots

Context menu/drawer for:
- amend;
- close;
- cancel;
- duplicate where permitted;
- export;
- archive;
- activity history.

The approved design specifically shows the eye and pencil as separate actions; preserve that behavior.

---

# 28. TENDER VIEW

```text
/officer/tenders/:tenderId/view
```

Tabs:

```text
Overview
Requirements & ATC
Documents & Rules
Bids & Evaluation
Amendments
Activity Log
```

All values are live.

---

# 29. TENDER EDIT

```text
/officer/tenders/:tenderId/edit/basic
/officer/tenders/:tenderId/edit/requirements
/officer/tenders/:tenderId/edit/documents
/officer/tenders/:tenderId/edit/review
```

For a published tender, show the applicable edit/amendment restrictions rather than silently overwriting the historical record.

---

# 30. BID VERIFICATION

```text
/officer/bids
/officer/bids/:bidId
```

The page covers **Received Bids** from the flowchart.

Show:
- vendor;
- tender;
- bid date;
- amount where available;
- compliance state;
- verification state;
- actions.

Eye:

```text
/officer/bids/:bidId
```

Document icon:

```text
/officer/documents/:documentId
```

---

# 31. AI COMPLIANCE CHECK

```text
/officer/ai-compliance
/officer/ai-compliance/:runId
```

Tabs:

```text
All Submissions
Compliant
Needs Review
Non-Compliant
```

Live data fields:
- tender ID;
- vendor;
- product/service;
- submission date;
- score;
- status;
- AI findings;
- actions.

### Eye action

Open the submission/tender compliance details page.

### Document icon

Open the real uploaded document in the shared document viewer.

Do not render a pre-generated screenshot in place of either screen.

---

# 32. HUMAN REVIEW QUEUE

```text
/officer/human-review
```

Tabs:

```text
All
High
Medium
Low
Reviewed
```

A case may enter when:
- confidence is below configured threshold;
- conflict/contradiction is detected;
- verification is indeterminate;
- officer review is required by rule.

The PPT defines Human Review as the final authority layer for conflicting or low-confidence cases. fileciteturn28file0L638-L643

### Eye

```text
/officer/human-review/:caseId/view
```

Read-only investigation.

### Pencil

```text
/officer/human-review/:caseId/verify
```

Manual verification workspace.

### Three dots

Open contextual menu/drawer; do not navigate to a generic page.

Actions may include:

```text
View Submission
Edit Review
Request Clarification
Assign Reviewer
Escalate Case
Download Report
View Audit Trail
Mark Priority
Archive
```

Every action that changes state must hit the backend and create an audit record.

---

# 33. MANUAL VERIFICATION AUTHORITY RULE

Officer can:
- inspect evidence;
- confirm a flag;
- override a flag;
- provide justification;
- seek clarification;
- escalate;
- make the final decision.

AI cannot silently replace officer decisions.

The PPT explicitly states that low-confidence cases go to human review and that the officer decides. fileciteturn28file0L638-L643

---

# 34. FINAL DECISION & RECORDS — REQUIRED MODULE

This was identified as a missing dedicated module in the flowchart-to-UI review and must be implemented.

```text
/officer/decisions
/officer/decisions/:bidId
```

Workflow:

```text
Verification
    ↓
Human Review if required
    ↓
Final Decision
    ├── Compliant / Approve
    ├── Seek Clarification
    └── Non-Compliant / Reject
            ↓
     Decision Record
            ↓
       Bid Passport
            ↓
         Audit Log
```

This is NOT the same thing as Bid Passport.

---

# 35. REPORTS & ANALYTICS

```text
/officer/reports
```

Tabs:

```text
Overview
AI Compliance Insights
Vendor Performance
Product / Service Analysis
Flag Analysis
Trends & Forecast
Custom Reports
```

The four core analysis tabs and Trends/Forecast/Custom Reports already have approved references in Design.zip.

---

# 36. ANALYTICS — DATA RULES

Every chart/table/metric must be generated from backend data.

## AI Compliance Insights
Use verification/rule/AI result tables.

## Vendor Performance
Use actual bid, tender and decision history.

## Product / Service Analysis
Use actual tender categories, quantities and values.

## Flag Analysis
Use actual flag reason/severity/resolution records.

## Trends & Forecast
Separate historical and forecast values clearly.

Forecast requires an actual backend calculation/model; never invent a trend line because the screenshot contains one.

## Custom Reports
Runtime report builder:

```text
Report Type
→ Metrics
→ Group By
→ Filters
→ Preview
→ Generate
```

Exports must be generated from current query results.

---

# 37. VENDOR MANAGEMENT

```text
/officer/vendors
```

Tabs:

```text
Overview
Vendor Directory
Performance Analysis
Compliance Status
Risk Assessment
Onboarding & Verification
```

### Vendor Directory
Actual vendors only.

### Performance Analysis
Actual recorded vendor performance data only.

### Compliance Status
Derived from verification results.

### Risk Assessment
Derived from persisted risk signals.

### Onboarding & Verification
Uses actual registration/document workflow.

---

# 38. RULE MANAGEMENT — REQUIRED MODULE

```text
/officer/rules
```

Sections:

```text
GeM GTC Rules
ATC Rules
Technical Rules
Eligibility Rules
Financial Rules
Custom Rules
```

Each rule:

```text
Rule ID
Rule Name
Clause Reference
Category
Applicability
Severity
Expression
Reason Code
Version
Status
```

Rules used by a completed decision cannot be silently overwritten.

Create a new version instead.

The PPT explicitly describes an extensible rule set and versioned evaluation logic. fileciteturn28file0L195-L195

---

# 39. USER MANAGEMENT — REQUIRED MODULE

```text
/officer/users
```

Capabilities:

```text
List users
Search
Add user
Assign role
Change permissions
Activate/deactivate
View activity
```

RBAC is enforced on the backend, not just by hiding buttons in React.

---

# 40. AUDIT LOGS

```text
/officer/audit
/officer/audit/:eventId
```

Audit events must record, where applicable:

```text
timestamp
actor
role
action
module
entity
severity
status
request/session information
```

### Eye

Full event page:

```text
/officer/audit/:eventId
```

### Three dots

Contextual audit action drawer:

```text
View Full Event
Download Log
Export PDF
Copy Event ID
View Related Events
Show User Activity
Show Vendor Activity
View Session History
Flag Suspicious
Escalate
Lock Investigation
Generate Incident Report
Raw JSON
API Request Details
System Changes / Trace
```

Security-sensitive actions themselves create audit entries.

---

# 41. NOTIFICATIONS — OFFICER

```text
/officer/notifications
```

Use event-backed notifications and a right-side detail panel.

No hardcoded notification feed.

---

# 42. PROFILE & SETTINGS — OFFICER

```text
/officer/profile
/officer/settings
```

Keep real settings options:

```text
Account Settings
Security
Notifications
Preferences
Appearance
Connected Accounts
```

---

# 43. HELP & GUIDELINES — OFFICER

```text
/officer/help
```

Government-officer oriented topics:

```text
Tender Creation
Bid Evaluation
Compliance Review
Human Review
Reports & Analytics
Vendor Management
Rule Management
User Access
Audit Logs
System Troubleshooting
```

### AI Assistant

The AI helper is advisory, grounded in approved project/platform guidance. It must not fabricate procurement rules or claim official authority.

---

# 44. SHARED DOCUMENT VIEWER

```text
/officer/documents/:documentId
/vendor/documents/:documentId
```

Must display the actual uploaded PDF.

Features:
- page navigation;
- zoom;
- download;
- document metadata;
- evidence references;
- page references;
- hash where available.

If a document is scanned and OCR is used, retain page and extraction confidence.

---

# 45. EXISTING COMPLIANCE PIPELINE — PRESERVE AND EXTEND

Current implementation:

```text
PDF Upload
   ↓
ComplianceJob
   ↓
PyMuPDF extraction
   ↓
Rule Engine
   ↓
RAG + Gemini
   ↓
Score + Verdict
   ↓
RuleResult + RAGResult persistence
```

This is preserved.

The product architecture in the PPT is:

```text
Tender + ATC
      ↓
Tender Twin
      ↓
Evidence Graph
      ↓
Conflict Scan
      ↓
Rule Engine
      +
RAG / Gemini when necessary
      ↓
Confidence Gate
      ↓
Human Review where required
      ↓
Machine/Officer result
      ↓
Bid Passport
      ↓
Audit Trail
```

The PPT defines the flow around source docs, rule engine, embeddings/vector search, Gemini verdict, score/veto and replayable audit storage. fileciteturn28file0L320-L526

---

# 46. IMPORTANT AI CHANGE FOR THE FULL PRODUCT

The current backend invokes RAG after the rule engine on every successful run.

For the full product, use this decision policy:

```text
Rule Engine first
   ↓
Can the requirement be determined deterministically?
   ├── Yes → use deterministic result
   └── No → RAG + Gemini

Also use RAG/context reasoning when:
- wording is ambiguous;
- cross-document context is required;
- conflict is detected;
- confidence is low;
- a tender-specific rule explicitly requests semantic reasoning.
```

This keeps AI selective and aligns with the hybrid-by-design approach in the PPT. fileciteturn28file0L624-L643

---

# 47. AI OUTPUT SAFETY

Gemini must return structured output.

Minimum:

```json
{
  "verdict": "compliant | non_compliant | cannot_determine",
  "confidence": 0.0,
  "reason": "...",
  "evidence_required": true
}
```

Do not let AI:
- mutate final decisions directly;
- change a deterministic legal/rule result silently;
- invent document evidence;
- invent page numbers;
- claim that an unlocated requirement is satisfied.

The product principle is: **No Evidence → No Decision.** fileciteturn28file0L92-L100

---

# 48. TENDER DIGITAL TWIN

For each tender, represent requirements structurally:

```text
Tender
 ├── Clause
 │    ├── requirement
 │    ├── applicability
 │    ├── severity
 │    ├── validation method
 │    └── rule version
 └── ATC
```

This is how the UI's technical requirements, compliance checks and rules remain tender-aware rather than global hardcoded checklists.

The PPT explicitly defines Tender Digital Twin as clause/ATC to checkable requirement. fileciteturn28file0L73-L75

---

# 49. EVIDENCE GRAPH

Persist relationships like:

```text
Requirement
  ↓
Rule
  ↓
Document
  ↓
Page
  ↓
Extracted Value
  ↓
Evidence Snippet
  ↓
Verification Result
```

This powers:
- AI Compliance Check;
- vendor Compliance Check;
- document viewer evidence links;
- reviewer console;
- Bid Passport;
- audit trail.

The PPT defines this requirement → document → page → value structure. fileciteturn28file0L77-L79

---

# 50. CONFLICT ENGINE

Detect relationships such as:

```text
Bidder name mismatch
PAN ↔ GST mismatch
OEM name mismatch
Address mismatch
Certificate number mismatch
Date contradiction
Financial claim contradiction
```

A conflict is a **review signal**, not proof of fraud.

Persist:

```text
conflict_id
entity
field
source_a
value_a
source_b
value_b
severity
status
review_note
```

---

# 51. COMPLIANCE SCORE

Current backend logic is:

```text
critical = 40
warning  = 15
info     = 5
RAG delta = ±10 capped
critical failed → non_compliant veto
score >= 85 → compliant
otherwise → needs_review
```

Keep scoring in backend code/config.

The frontend only displays the returned score and verdict.

Never reproduce score logic in React.

---

# 52. CURRENT RULESET

The existing `rules.json` currently contains 15 rules:

```text
R001 ... R015
```

with two current rule types:

```text
keyword_presence
value_range
```

The RAG seed mechanism separately operates on embedded rulebook chunks.

The full platform must converge to a consistent, versioned rule source of truth.

---

# 53. OCR / SCANNED PDF POLICY

Current document extraction uses PyMuPDF text extraction.

For the full product:

```text
PDF
 ↓
Try text extraction
 ↓
Text available?
 ├── Yes → continue
 └── No → OCR fallback
            ↓
       normalized text
```

Do not show “verified” simply because a file was successfully opened.

---

# 54. ASYNC JOBS / REAL-TIME UI

Current contract:

```http
POST /upload
→ job_id

GET /jobs/{job_id}/status
→ poll

GET /jobs/{job_id}/results
→ completed result
```

Frontend state sequence:

```text
Queued
Processing
Extracting
Rule Verification
Semantic / AI Analysis (when required)
Scoring
Saving
Completed
Failed
```

Add explicit backend stage/state fields so the UI reflects reality.

Do not fake a progress percentage.

---

# 55. API EXPANSION PLAN

Keep the existing endpoints working.

Add domain APIs incrementally.

## Authentication

```http
POST /auth/login
POST /auth/logout
GET  /auth/me
```

## Tenders

```http
GET    /tenders
POST   /tenders
GET    /tenders/{id}
PATCH  /tenders/{id}
POST   /tenders/{id}/publish
POST   /tenders/{id}/amend
```

## Requirements / ATC

```http
GET  /tenders/{id}/requirements
POST /tenders/{id}/requirements
GET  /tenders/{id}/atc
POST /tenders/{id}/atc
```

## Applications / Bids

```http
POST /tenders/{id}/applications
GET  /applications/{id}
PATCH /applications/{id}
POST /applications/{id}/submit
GET  /bids
GET  /bids/{id}
```

## Documents

```http
POST /applications/{id}/documents
GET  /documents/{id}
GET  /documents/{id}/stream
```

## Verification

```http
POST /verification-runs
GET  /verification-runs
GET  /verification-runs/{id}
```

The current `/upload` implementation may internally create the first verification run while the richer domain API is introduced.

## Human Review

```http
GET  /review-queue
GET  /review-cases/{id}
POST /review-cases/{id}/assign
POST /review-cases/{id}/clarification
POST /review-cases/{id}/decision
POST /review-cases/{id}/escalate
```

## Decisions / Passport

```http
GET  /decisions
GET  /decisions/{bidId}
POST /decisions/{bidId}
GET  /bids/{bidId}/passport
POST /bids/{bidId}/passport
```

## Vendors

```http
GET  /vendors
GET  /vendors/{id}
POST /vendors
PATCH /vendors/{id}
```

## Notifications

```http
GET   /notifications
PATCH /notifications/{id}/read
POST  /notifications/read-all
```

## Audit

```http
GET  /audit-logs
GET  /audit-logs/{id}
```

## Rules

```http
GET  /rules
POST /rules
GET  /rules/{id}
POST /rules/{id}/versions
```

## Users

```http
GET   /users
POST  /users
PATCH /users/{id}
```

## Analytics / reports

```http
GET  /analytics/overview
GET  /analytics/compliance
GET  /analytics/vendors
GET  /analytics/products
GET  /analytics/flags
GET  /analytics/trends
POST /reports/preview
POST /reports/generate
```

These endpoint names are the intended contract; implement them in a consistent FastAPI router structure rather than scattering route logic in `main.py`.

---

# 56. DATABASE DOMAIN MODEL

Recommended tables:

```text
users
roles
user_roles
departments
vendor_profiles

tenders
tender_versions
tender_requirements
tender_atc
tender_documents
tender_rules

applications
bids
bid_documents

compliance_jobs
verification_runs
rule_results
rag_results
ai_results
evidence_items
conflicts
risk_signals

review_cases
review_actions
clarifications

decisions
bid_passports

notifications
audit_logs

rule_definitions
rule_versions

reports
report_runs
```

Preserve existing tables while migrating; do not create duplicate concepts unnecessarily.

---

# 57. EXISTING TABLE MAPPING

```text
ComplianceJob → VerificationRun / legacy job record
RuleResult    → CheckResult
RAGResult     → AI/RAG result
RulebookChunk → RulebookEmbedding
```

The existing compliance engine should write into these concepts through services rather than being rewritten as a separate application.

---

# 58. FRONTEND FOLDER STRUCTURE — JAVASCRIPT ONLY

```text
src/
├── main.js
├── App.js
├── router/
│   └── index.js
├── layouts/
│   ├── PublicLayout.js
│   ├── VendorLayout.js
│   └── OfficerLayout.js
├── pages/
│   ├── public/
│   ├── vendor/
│   └── officer/
├── components/
│   ├── common/
│   ├── vendor/
│   └── officer/
├── services/
│   ├── api.js
│   ├── auth.js
│   └── storage.js
├── hooks/
├── context/
├── utils/
├── styles/
│   ├── theme.css
│   ├── light.css
│   └── dark.css
└── assets/
```

No `.tsx`, `.ts`, `.jsx` or `.cjsx`.

---

# 59. FRONTEND API SERVICE RULE

Create one central API layer:

```text
src/services/api.js
```

Recommended modules within it or imported by it:

```text
authApi
tenderApi
applicationApi
bidApi
documentApi
complianceApi
reviewApi
decisionApi
passportApi
vendorApi
ruleApi
userApi
notificationApi
auditApi
reportApi
analyticsApi
```

Pages do not construct arbitrary `fetch()` calls everywhere.

---

# 60. DESIGN REFERENCE MAP

Lovable must inspect the supplied `Design.zip` and use the corresponding folder as the visual source of truth.

## Public

```text
Design/1. Landing/
Design/2. Login/
```

## Vendor

```text
Design/3. Vendor Dashboard/
Design/3. Vendor Dashboard/All the sections/1.Find Tenders/
Design/3. Vendor Dashboard/All the sections/1.Find Tenders/Apply/
Design/3. Vendor Dashboard/All the sections/1.Find Tenders/Tender Details/
Design/3. Vendor Dashboard/All the sections/2.My Bids/
Design/3. Vendor Dashboard/All the sections/2.My Bids/features/
Design/3. Vendor Dashboard/All the sections/3.Compliance Check/
Design/3. Vendor Dashboard/All the sections/3.Compliance Check/additional tabs/
Design/3. Vendor Dashboard/All the sections/3.Compliance Check/Features/
Design/3. Vendor Dashboard/All the sections/4.Bid Passport/
Design/3. Vendor Dashboard/All the sections/4.Bid Passport/tabs/
Design/3. Vendor Dashboard/All the sections/5.Notification/
Design/3. Vendor Dashboard/All the sections/6. Profile and Settings/
Design/3. Vendor Dashboard/All the sections/6. Profile and Settings/Edit Profile/
Design/3. Vendor Dashboard/All the sections/7.Help section/
```

## Government Official

```text
Design/4. Procurement Officer's Dashboard/
Design/4. Procurement Officer's Dashboard/Sections/1. Create Tender/
Design/4. Procurement Officer's Dashboard/Sections/1. Create Tender/Tender process/
Design/4. Procurement Officer's Dashboard/Sections/2.Mange Tenders/
Design/4. Procurement Officer's Dashboard/Sections/2.Mange Tenders/Additional Features/
Design/4. Procurement Officer's Dashboard/Sections/2.Mange Tenders/Additional Features/clicking on the eye option and pen option/
Design/4. Procurement Officer's Dashboard/Sections/3.Bid Verification/
Design/4. Procurement Officer's Dashboard/Sections/4. AI Compliance Check/
Design/4. Procurement Officer's Dashboard/Sections/4. AI Compliance Check/eye and document options/
Design/4. Procurement Officer's Dashboard/Sections/5. Human Review Queue/
Design/4. Procurement Officer's Dashboard/Sections/5. Human Review Queue/eye, pencil, three dots/
Design/4. Procurement Officer's Dashboard/Sections/6.Reports And Analysis/
Design/4. Procurement Officer's Dashboard/Sections/7. Vendor management/
Design/4. Procurement Officer's Dashboard/Sections/7. Vendor management/Features in nav/
Design/4. Procurement Officer's Dashboard/Sections/8. Audit Logs/
Design/4. Procurement Officer's Dashboard/Sections/8. Audit Logs/eye and three dots/
Design/4. Procurement Officer's Dashboard/Sections/9. Notifications/
Design/4. Procurement Officer's Dashboard/Sections/10. Profile And Settings/
Design/4. Procurement Officer's Dashboard/Sections/11. Help and Guidelines/
```

Where a folder contains both light and dark variants, implement them as the same React components using theme tokens.

---

# 61. DESIGN INTERACTION CONTRACT — CLICK MAP

## Vendor

```text
Dashboard card → corresponding vendor route
Find Tenders → /vendor/find-tenders
Tender row/card → /vendor/tenders/:tenderId
Apply → /vendor/tenders/:tenderId/apply/basic
My Bid row → /vendor/my-bids/:bidId
Compliance row → /vendor/compliance/:bidId
Bid Passport → /vendor/bid-passport/:bidId
Notification → /vendor/notifications?selected=:notificationId
Profile → /vendor/profile
Edit Profile → /vendor/profile/edit
Settings → /vendor/settings
Help → /vendor/help
```

## Government Officer

```text
Create Tender → /officer/tenders/create/basic
Manage Tenders → /officer/tenders/manage
Manage Tender Eye → /officer/tenders/:id/view
Manage Tender Pencil → /officer/tenders/:id/edit/basic
Bid Verification → /officer/bids
AI Compliance → /officer/ai-compliance
AI Compliance Eye → /officer/ai-compliance/:runId
AI Compliance Document → /officer/documents/:documentId
Human Review → /officer/human-review
Human Review Eye → /officer/human-review/:caseId/view
Human Review Pencil → /officer/human-review/:caseId/verify
Human Review Three Dots → contextual drawer
Final Decision → /officer/decisions/:bidId
Reports → /officer/reports
Vendor Management → /officer/vendors
Rule Management → /officer/rules
User Management → /officer/users
Audit Logs → /officer/audit
Audit Eye → /officer/audit/:eventId
Audit Three Dots → contextual drawer
Notifications → /officer/notifications
Profile → /officer/profile
Settings → /officer/settings
Help → /officer/help
```

---

# 62. SMALL RIGHT-SIDE TABS / INLINE DETAILS RULE

Some approved designs intentionally show tabs or detail panes in a small right-side area.

These must remain **embedded within the existing page**, not become new full-screen pages.

Examples:

```text
Vendor Compliance → requirement click opens right-side detail panel
Audit list → selected event may open detail panel where specified
Notification list → selected notification opens right detail panel
```

Only the interactions explicitly designed as full-page routes should navigate away.

---

# 63. PDF / DOCUMENT INTERACTION RULE

When a design shows a PDF/document preview:

```text
Use the actual document stream.
```

Never:

```text
use the screenshot of a PDF page.
```

The document viewer is a functional feature, not decoration.

---

# 64. CHART INTERACTION RULE

Every chart must be a real chart component with:

```text
backend data
filter state
loading state
empty state
error state
```

Examples:

```text
Submission Trend
Compliance Distribution
Vendor Risk Distribution
Flag Distribution
Onboarding Funnel
Performance Trend
Seasonality Heatmap
```

When a filter changes, the API query or computed dataset changes.

---

# 65. METRIC / KPI RULE

KPI cards are views over backend data.

Examples:

```text
Total Submissions
Compliant
Needs Review
Non-Compliant
Pending Review
Active Vendors
```

Do not hardcode the number into the component.

---

# 66. REPORT GENERATION

When user clicks `Generate Report`:

```text
Frontend
   ↓
POST /reports/generate
   ↓
Backend queries current DB
   ↓
Generate report file
   ↓
Return job/file reference
   ↓
Frontend downloads real generated file
```

No static PDF template pretending to be generated data.

---

# 67. AUDIT INTEGRITY

Every material business action should create an audit event, including:

```text
login
logout
upload
view_document
run_verification
AI_result
review_assignment
clarification
override
final_decision
passport_generation
rule_change
user_change
report_export
```

Audit rows are append-only.

This matches the PPT's emphasis on replayable, auditable decisions. fileciteturn28file0L92-L100

---

# 68. AUTH / RBAC

The UI must support at least:

```text
Vendor
Procurement Officer
Reviewer
Department Admin
```

Backend permissions must determine access.

Example:

```text
Vendor cannot access /officer/*
Vendor cannot change officer decisions
Reviewer cannot modify rules unless permission granted
Department Admin may manage users/rules according to role
```

---

# 69. SECURITY

Backend-only secrets:

```text
DATABASE_URL
GEMINI_API_KEY
storage credentials
JWT/session signing secret
```

Do not expose them to React.

Current backend uses `allow_origins=["*"]`; production configuration must restrict CORS to the actual frontend origin(s).

---

# 70. LOADING / EMPTY / ERROR / FORBIDDEN STATES

Every page and data component must support:

```text
Loading
Success
Empty
Error
Forbidden
Not Found
```

Example:

```text
No tenders found for the selected filters.
```

Do not fill an empty table with fake records.

---

# 71. DATA FRESHNESS

After a mutation:

```text
Create Tender
Publish Tender
Upload Document
Submit Bid
Run Verification
Review Case
Final Decision
Create Notification
Edit Profile
```

the relevant query/cache must refresh so the user immediately sees the actual updated state.

---

# 72. FORM STATE

Forms can use local React state while editing.

But save operations must call backend APIs.

Unsaved changes should be detectable where the design requires a multi-stage form.

---

# 73. DESIGNS NOT YET EXPLICITLY CREATED

If a route has no exact screenshot, do not stop the implementation.

Generate the missing screen from the nearest approved design using the same:

```text
header
sidebar
spacing
card radius
border treatment
typography
button hierarchy
status colors
light/dark tokens
```

The content must be driven by the appropriate API.

Examples:

```text
Final Decision & Records
Rule Management
User Management
```

These were identified as needed from the flowchart and therefore must be implemented consistently even if their exact screenshot was not previously created.

---

# 74. FUTURE ENHANCEMENTS MUST NOT PRETEND TO BE LIVE

The flowchart marks these as future enhancements:

```text
Real-time Collaboration
Advanced Analytics
Mobile App Support
Multi-language Support
Integration with GeM APIs
API Access for Third Parties
AI-based Tender Recommendations
```

Do not put fake buttons that claim these work today.

They may appear as disabled/roadmap UI only where the design explicitly includes them.

---

# 75. CURRENT PROJECT VS ROADMAP

## Current / required now

```text
Landing
Login
Role selection
Vendor dashboard
Officer dashboard
Tender discovery
Tender details
4-stage vendor application
4-stage tender creation
Bid verification
AI compliance
Human review
Final decision
Bid Passport
Reports / analytics
Vendor management
Onboarding
Audit logs
Notifications
Profile / settings
Help
Rule management
User management
```

## Roadmap only

```text
Live GeM APIs
External third-party APIs
Mobile application
Advanced collaboration
Full multilingual experience
```

---

# 76. TESTING MATRIX

Before delivery, test every route.

## Navigation

```text
Every sidebar item opens correct route
Every tab changes correct content
Every eye icon opens correct target
Every pencil opens correct editor
Every three-dot menu opens correct drawer
Every back button returns correctly
```

## Data

```text
Disconnect DB → no fake records appear
Create record → appears after refresh
Update record → UI reflects change
Delete/archive → row disappears appropriately
Filter → results change
Pagination → API-backed
```

## AI

```text
Upload document A → analysis A
Upload document B → analysis B
Different tender requirements → different evaluation context
Low confidence → Human Review
No evidence → no positive evidence-backed claim
```

## Documents

```text
Uploaded PDF opens
Correct number of pages
Correct page references
Download downloads actual file
```

## Security

```text
Vendor cannot reach officer route
Officer-only actions rejected by backend for unauthorized users
API keys not in browser bundle
```

---

# 77. END-TO-END DEMO PATH

This is the minimum path that must actually work with real data:

```text
Vendor login
  ↓
Find Tender
  ↓
View Tender Details
  ↓
Apply Tender
  ↓
Stage 1
  ↓
Stage 2 upload real documents
  ↓
Stage 3 technical + financial
  ↓
Stage 4 review + submit
  ↓
My Bid
  ↓
Verification starts
  ↓
Rule Engine
  ↓
RAG/Gemini only when needed
  ↓
Score + evidence
  ↓
Officer AI Compliance page
  ↓
Human Review when required
  ↓
Officer decision
  ↓
Bid Passport
  ↓
Audit Log
  ↓
Vendor sees updated status/notification
```

This is consistent with the PPT processing architecture and the officer-final-authority model. fileciteturn28file0L448-L492 fileciteturn28file0L638-L643

---

# 78. LOVABLE / CODE-GENERATION MASTER INSTRUCTION

Paste the following together with Design.zip, the existing backend ZIP, the PPT and the flowchart:

> Build GeMShield as a real production-style React/Vite JavaScript frontend connected directly to the existing Python/FastAPI backend and an extended PostgreSQL/SQLAlchemy data model.
>
> Use the supplied Design.zip as the visual source of truth. Preserve the approved layout, visual hierarchy, header, sidebar, cards, tabs, tables, spacing, icons, light theme and dark theme. Do not redesign approved pages.
>
> The screenshot files are NOT the application. Do not use screenshots as dashboard pages, PDF substitutes, chart substitutes or data sources.
>
> Use only JavaScript for the frontend: `.js`, `.css`, `.json`. Do not create `.ts`, `.tsx`, `.jsx` or `.cjsx` files. Keep the existing Python FastAPI backend in `.py` files. Node.js is the React/Vite tooling/runtime; do not replace FastAPI with Express.
>
> Use the existing FastAPI compliance engine as the starting point. Preserve `/upload`, `/jobs`, `/jobs/{job_id}/status`, `/jobs/{job_id}/results` and the existing rule/RAG logic while wrapping it into the larger tender/bid/verification domain.
>
> DO NOT hardcode vendors, tenders, scores, charts, AI analysis, notifications, audit logs, PDFs or analytics from the screenshots. Every business value must come from the backend, database, uploaded documents, derived analytics, or runtime AI results.
>
> Every chart must be a real runtime chart fed by backend data. Every PDF/document preview must render the actual uploaded file. Every AI explanation must be produced by the backend AI pipeline. Every compliance score must come from backend calculation.
>
> Implement the complete route map and click map from this specification. Preserve the locked four-stage Vendor Apply flow: Basic Information → Documents Upload → Technical & Financial Bid → Review & Submit. Preserve the locked four-stage Create Tender flow: Basic Information → Requirements & ATC → Documents & Rules → Review & Publish.
>
> Eye icons, pencil icons and three-dot menus must behave exactly as specified. Right-side detail tabs/panels that are shown as inline UI must remain inline and must not become full-page routes unless this specification explicitly defines a route.
>
> Keep Vendor Compliance read-only with respect to submitted documents unless an explicit department-approved reopen/clarification state exists. Keep Bid Passport separate from live Compliance Check. Human Review is the officer authority layer for low-confidence/conflicting cases. Final Decision & Records is a separate module from Bid Passport.
>
> Add the missing modules required by the flowchart: Final Decision & Records, Rule Management and User Management.
>
> Build the backend APIs and PostgreSQL tables needed for tenders, requirements, ATCs, documents, applications, bids, verification runs, evidence, conflicts, human review cases, decisions, passports, notifications, audit logs, rules and users. Do not create fake UI data when an API is not yet implemented; use loading/empty/error states while preserving the typed JavaScript service contract.
>
> All AI calls happen on the backend. Gemini API keys must never appear in the browser. Use deterministic rules first and call RAG/Gemini only when semantic reasoning, ambiguity, conflict or configured low-confidence conditions require it.
>
> Keep the rule engine and scoring in the backend. Frontend components only render backend results.
>
> Preserve the evidence chain: requirement → rule → document → page → extracted value → evidence → result. Store enough metadata to reproduce the decision later.
>
> Preserve append-only audit logging and create audit records for material business actions.
>
> Do not claim live government portal integrations unless credentials/authorization actually exist. Keep future integrations clearly marked as future/disabled functionality.
>
> After implementation, run a route-by-route click audit and a data-source audit: every clickable element needs a valid target/action, and every business-value UI element needs a runtime data source.

---

# 79. DEFINITION OF DONE

The build is not complete until all of these are true:

```text
✓ JavaScript React frontend only
✓ No .ts / .tsx / .jsx / .cjsx
✓ Existing FastAPI backend preserved and integrated
✓ Landing and login routes work
✓ Vendor and officer role separation works
✓ Vendor 4-stage Apply flow works
✓ Officer 4-stage Create Tender flow works
✓ Tender Details works
✓ My Bids works
✓ Compliance Check works
✓ Bid Passport works
✓ Bid Verification works
✓ AI Compliance Check works
✓ Human Review Queue works
✓ Final Decision & Records works
✓ Reports & Analytics works
✓ Vendor Management works
✓ Onboarding works
✓ Rule Management works
✓ User Management works
✓ Audit Logs and detail/drawer actions work
✓ Notifications work
✓ Profile & Settings works
✓ Help works
✓ Real PDFs render
✓ Real AI responses render
✓ Real scores render
✓ Real charts render
✓ No screenshot-derived business data
✓ No frontend mock business arrays
✓ No AI secrets in frontend
✓ Backend RBAC enforced
✓ Audit records persisted
✓ Light/dark themes preserved
✓ Filters and pagination use actual API data
✓ Loading/empty/error states implemented
✓ End-to-end real-document verification path works
```

---

# 80. FINAL PRODUCT RULE

**The screenshots tell the application how it should look.**  
**The backend tells it how it works.**  
**The database tells it what is real.**  
**The uploaded documents provide the evidence.**  
**The AI provides grounded reasoning when needed.**  
**The officer remains the final decision authority.**

The PPT's intended product direction is evidence-grounded, auditable and replayable rather than a generic AI chatbot or a static dashboard. fileciteturn28file0L90-L100


---

# 76. SUPABASE AUTH + NEON APPLICATION DATA ARCHITECTURE

The final system intentionally uses two managed services for different responsibilities.

```text
Browser / React
      |
      | Supabase Auth
      v
Supabase Auth
      |
      | JWT access token
      v
FastAPI
      |
      +------------------------+
      |                        |
      v                        v
Neon PostgreSQL           AI / Documents
+ pgvector               Rule Engine
                         MiniLM
                         RAG
                         Gemini
```

### Authentication flow

```text
Login Form
   ↓
Supabase.auth.signInWithPassword()
   ↓
Supabase session + access token
   ↓
FastAPI Authorization: Bearer <token>
   ↓
FastAPI validates Supabase JWT
   ↓
FastAPI reads auth_user_id
   ↓
Neon profile/role lookup
   ↓
RBAC decision
```

Supabase provides email/password authentication and JWT-based sessions; `signInWithPassword()` is the standard JavaScript client method. citeturn561535search1turn561535search4

### Demo user creation

Seed demo users from a backend/setup script using Supabase Admin APIs.

Supabase's admin user creation methods are server-only; never expose the service-role key in the browser. citeturn561535search7

### Environment variables

Frontend:
```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=
```

Backend:
```text
DATABASE_URL=
SUPABASE_URL=
SUPABASE_JWT_AUDIENCE=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
DATA_GOV_API_KEY=
CORS_ORIGINS=
```

Do not put:
```text
DATABASE_URL
GEMINI_API_KEY
SUPABASE_SERVICE_ROLE_KEY
DATA_GOV_API_KEY
```
in frontend variables.

---

# 77. NEON + PGVECTOR + MINILM

The backend must use Neon PostgreSQL for application storage.

The vector search path remains:

```text
document/rule text
      ↓
all-MiniLM-L6-v2
      ↓
384-dimensional embedding
      ↓
Neon PostgreSQL + pgvector
      ↓
L2 similarity
      ↓
top-k rulebook chunks
      ↓
Gemini when semantic reasoning is necessary
```

The uploaded backend already uses:

```python
SentenceTransformer("all-MiniLM-L6-v2")
Vector(384)
L2 distance
top_k = 5
```

Preserve this behavior.

### Model deployment

The backend container must have access to the MiniLM model.

Preferred approach:
- configure a model cache directory;
- download/cache the model during image build or first controlled startup;
- persist/reuse the cache between container rebuilds where practical;
- do not download the model on every individual verification request.

The model must run server-side.

---

# 78. DOCKER DEPLOYMENT

Required structure:

```text
/
├── frontend/
│   ├── Dockerfile
│   └── ...
├── backend/
│   ├── Dockerfile
│   └── ...
├── docker-compose.yml
└── .env.example
```

### Frontend Dockerfile

Use a multi-stage build:

```text
Node image
   ↓
npm ci
   ↓
npm run build
   ↓
Nginx image
   ↓
serve Vite build
```

### Backend Dockerfile

Use a Python slim image:

```text
Python image
   ↓
install requirements
   ↓
copy backend
   ↓
start uvicorn
```

Run:

```text
uvicorn main:app --host 0.0.0.0 --port 8000
```

### docker-compose.yml

At minimum:

```text
frontend
backend
```

Neon, Supabase and Gemini are external services and are NOT local compose databases/services.

Do not add a local PostgreSQL container unless explicitly needed for an offline-development profile; the target application database is Neon.

---

# 79. DATA.GOV.IN SOURCE ACCESS WORKFLOW

Implement a backend source service:

```text
DataGovService
```

Functions:

```text
searchResources(query)
getResource(resourceId)
getResourceDownload(resourceId)
importResource(resourceId)
```

Recommended internal endpoints:

```http
GET  /sources/data-gov/search?q=
GET  /sources/data-gov/resources/{resourceId}
POST /sources/data-gov/import
GET  /sources/data-gov/imports
```

### Search workflow

```text
Admin/Officer enters:
"tender"
"procurement"
"public procurement"
"government tender"
      ↓
FastAPI calls approved data.gov.in source/API
      ↓
Return title + publisher + resource type + resource ID + access URL
      ↓
UI shows actual results
```

### Import workflow

```text
Select resource
      ↓
Fetch source metadata
      ↓
Resolve download/file URL
      ↓
Verify response
      ↓
Verify file type
      ↓
If PDF:
    save file
    calculate SHA-256
    store source metadata
    create document record
Else:
    keep as structured source data
    do NOT pretend it is a PDF
```

### Data.gov.in API access

The OGD Platform's API pages provide a “Generate API Key” flow and a resource endpoint based on `api.data.gov.in`. citeturn334858search0

Example request pattern:

```text
https://api.data.gov.in/resource/<RESOURCE_ID>
  ?api-key=<API_KEY>
  &format=json
  &limit=100
```

Use the exact resource ID returned by data.gov.in.

Do not hardcode a made-up resource ID.

### Direct PDF resources

Some OGD resources are actual files hosted under the data.gov.in domain.

For example, data.gov.in currently exposes the official PDF:
```text
https://www.data.gov.in/sites/default/files/Compendium_Data_Driven_Decision_Making_NIC.pdf
```

The resource is an official data.gov.in-hosted PDF, but its subject matter is a government information/decision-making compendium rather than a bidder's GeM bid package. citeturn801793search15

The application must preserve this distinction.

### Tender/procurement data

The data.gov.in “Tender” keyword page currently lists public-procurement resources, including Assam public procurement data and other tender-related datasets. citeturn801793search1turn797001search2

Many of these resources are structured datasets rather than PDFs. Do not force them into the PDF compliance pipeline.

---

# 80. USER-FACING DATA.GOV.IN DOCUMENT LIBRARY

Add a government-side screen/action:

```text
Government Source Library
```

Capabilities:

```text
Search data.gov.in
Filter:
  PDF
  Dataset
  Ministry
  Category

Preview metadata
Import resource
View source
Remove imported source
```

For imported PDFs show:

```text
Source:
Open Government Data Platform India

Publisher:
<actual publisher>

Resource:
<actual title>

Original URL:
<actual data.gov.in URL>

Imported:
<timestamp>

SHA-256:
<hash>
```

This makes the source provenance visible instead of hiding it.

---

# 81. DEMO LOGIN SCREEN

Login must support:

```text
Government Official
Vendor
```

The demo page may show:

```text
Demo Government Login
admin@gemshield.demo
GemShieldAdmin@2026!

Demo Vendor Login
vendor@gemshield.demo
GemShieldVendor@2026!
```

These credentials are for the hackathon demo only.

After login:
```text
Admin / Procurement Officer
→ /officer/dashboard

Vendor
→ /vendor/dashboard
```

If a user tries to access an unauthorized route:
```text
403 / Not Authorized
```

Do not merely hide the route client-side.

---

# 82. FINAL "NO STATIC DEMO" TEST

The evaluator should be able to:

1. Sign in as admin using the demo account.
2. Sign in as vendor using the demo account.
3. Import a real data.gov.in resource.
4. Inspect its actual source metadata.
5. If it is a PDF, view the real PDF.
6. Run the real compliance backend against the real PDF.
7. See runtime extraction/rule results.
8. See runtime RAG/Gemini output where triggered.
9. See runtime score/verdict.
10. Navigate to real evidence pages.
11. See the result appear in the officer/vendor workflow according to permissions.
12. See the action written into the audit log.
13. Generate a Bid Passport only from the real decision state.
14. Change the database/input and see charts/metrics update.
15. Confirm that no screenshot has been substituted for real content.

---

# 83. PRE-SUBMISSION BUILD CHECKLIST

```text
[ ] React 19 + Vite
[ ] JavaScript only
[ ] No .ts
[ ] No .tsx
[ ] No .jsx
[ ] No .cjsx

[ ] FastAPI preserved
[ ] Existing compliance engine preserved
[ ] Neon PostgreSQL used for business data
[ ] pgvector enabled
[ ] all-MiniLM-L6-v2 used server-side
[ ] Gemini used server-side
[ ] Supabase Auth used for login
[ ] Demo admin credential works
[ ] Demo vendor credential works
[ ] JWT reaches FastAPI
[ ] RBAC works

[ ] Dockerfile frontend
[ ] Dockerfile backend
[ ] docker-compose.yml

[ ] data.gov.in source search works
[ ] data.gov.in resource metadata works
[ ] real PDF import works
[ ] PDF provenance stored
[ ] PDF SHA-256 stored

[ ] Four vendor application stages work
[ ] Four create-tender stages work
[ ] Every eye/pen/three-dot action works
[ ] Final Decision module works
[ ] Rule Management works
[ ] User Management works
[ ] Audit logs work

[ ] Charts are live
[ ] Metrics are live
[ ] AI analysis is live
[ ] PDF viewer uses real files
[ ] No fake business arrays
[ ] Loading/empty/error states work

[ ] Light theme matches approved design
[ ] Dark theme matches approved design
[ ] Responsive behavior works
[ ] No dead buttons
[ ] No broken routes
[ ] No exposed secrets
```

---

# 84. LOVABLE FINAL COMMAND

After uploading all source files, use this final instruction:

> Build the complete GeMShield application according to this specification and the attached sources.
>
> First inspect every attached file and compare the backend, PPT, flowchart and Design.zip.
>
> Do not start by recreating screenshots.
>
> Build the actual application architecture first, then reproduce the approved UI around the live data.
>
> Use JavaScript only in the React/Vite frontend (`.js`, `.css`, `.json`). Do not create `.ts`, `.tsx`, `.jsx` or `.cjsx`.
>
> Preserve and integrate the existing Python/FastAPI compliance backend.
>
> Use Supabase Auth for authentication and Neon PostgreSQL + pgvector for application data.
>
> Use all-MiniLM-L6-v2 server-side for 384-dimensional embeddings and vector retrieval.
>
> Use Gemini server-side for grounded semantic reasoning.
>
> Deploy through Docker with separate frontend/backend containers.
>
> Create the two demo Supabase accounts specified in this document and route each role to the correct dashboard.
>
> Implement the data.gov.in source-library workflow. Never fabricate government documents. Only actual downloadable PDF resources from data.gov.in may be used as demo compliance PDFs; structured resources remain structured resources.
>
> Do not put example screenshot values into the application database.
>
> Every chart, table, KPI, AI explanation, score, notification, audit entry and PDF must be backed by runtime data.
>
> Every button/tab/icon must have the exact route/action specified in the master specification.
>
> Use the attached screenshots as the visual source of truth, not as data.
>
> Before finishing, run the complete checklist in Sections 82–83 and fix every failure you find.
