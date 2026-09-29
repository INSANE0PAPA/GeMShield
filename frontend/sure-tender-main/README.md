# Shielded Procurement

GE MSHIELD â€” FINAL MASTER BUILD INSTRUCTION

Read and understand ALL uploaded files before writing or modifying any code:

1. Design.zip
2. New folder (3).zip â€” my existing Python/FastAPI backend
3. SMART INDIA HACKATHON 2026(1)(4).pptx
4. Flowchart(4).png
5. GeMShield_Master_Build_Specification_v3_FINAL.md
6. GeMShield_DataGov_Access_Guide.md

DO NOT start coding until you have inspected all of them and understood:
- the existing backend
- the complete flowchart
- the PPT architecture
- all approved UI designs
- the master build specification
- the data.gov.in source workflow

========================================================
1. CORE OBJECTIVE
========================================================

Build GeMShield as a REAL, CONNECTED, DATA-DRIVEN procurement platform.

The uploaded screenshots are the VISUAL SOURCE OF TRUTH only.

They define:
- visual design
- layout
- spacing
- typography
- cards
- tables
- tabs
- buttons
- icons
- navigation
- light theme
- dark theme
- page hierarchy
- interaction style

They are NOT the source of business data.

NEVER implement the screenshots as static images representing the actual application.

The final application must dynamically generate:
- vendor names
- tender IDs
- tender titles
- departments
- dates
- compliance scores
- rule results
- AI findings
- AI confidence
- charts
- statistics
- notifications
- reports
- audit events
- document information
- PDF previews
- review information

from the real backend/database/runtime AI/document-processing system.

========================================================
2. ABSOLUTE NO-MOCK-DATA RULE
========================================================

DO NOT use fake production-looking business data.

DO NOT create React arrays such as:
vendors = [...]
tenders = [...]
notifications = [...]
analytics = [...]
compliance = [...]

just to make the UI look populated.

DO NOT hardcode values taken from screenshots.

The screenshot values are only examples of how the UI should look.

If the backend has no data:
show:
- loading state
- empty state
- error state
- not-found state
- forbidden state

Do NOT silently replace missing data with fake records.

========================================================
3. TECHNOLOGY â€” STRICT
========================================================

FRONTEND:

React 19
Vite
JavaScript only

Allowed:
.js
.css
.json

ABSOLUTELY DO NOT CREATE:
.ts
.tsx
.jsx
.cjsx

Do not introduce TypeScript.

Do not create Next.js.

Node.js is used for frontend tooling/build/dev only.

BACKEND:

Python
FastAPI
Uvicorn
SQLAlchemy
PostgreSQL
pgvector
PyMuPDF
sentence-transformers
all-MiniLM-L6-v2
Gemini 2.0 Flash
rules.json
FastAPI BackgroundTasks

DO NOT replace FastAPI with Express or another backend framework.

========================================================
4. EXISTING BACKEND MUST BE PRESERVED
========================================================

Inspect the uploaded backend first.

The existing backend already contains the core compliance-processing pipeline.

Current API foundation includes:

GET /
POST /upload
GET /jobs
GET /jobs/{job_id}/status
GET /jobs/{job_id}/results

Current processing includes:
PDF upload
â†’ job
â†’ PyMuPDF extraction
â†’ deterministic rule engine
â†’ RAG/vector retrieval
â†’ Gemini reasoning
â†’ score/verdict
â†’ persisted results

DO NOT throw away this working compliance engine.

Reuse and extend it.

Add the missing product/domain layers around it.

========================================================
5. DATABASE ARCHITECTURE
========================================================

Use:

NEON POSTGRESQL
+
PGVECTOR

Neon is the application/business database.

Store business data in Neon, including:

users
roles
user_roles
departments

vendors

tenders
tender_versions
tender_requirements
tender_atc
tender_documents
tender_rules

applications
bids
bid_documents

verification_runs
check_results
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

Do not move the application's business database to Supabase.

========================================================
6. AUTHENTICATION
========================================================

Use SUPABASE AUTH for authentication.

Use:
@supabase/supabase-js

Authentication flow:

React
â†’ Supabase Auth
â†’ JWT/session
â†’ FastAPI
â†’ JWT validation
â†’ auth_user_id
â†’ Neon role/profile lookup
â†’ RBAC

Do NOT expose:
SUPABASE_SERVICE_ROLE_KEY
in the frontend.

Do NOT expose:
GEMINI_API_KEY
DATABASE_URL
DATA_GOV_API_KEY
or any other private key
in the frontend.

========================================================
7. DEMO LOGIN ACCOUNTS
========================================================

Create two working demo accounts.

GOVERNMENT / ADMIN:

Email:
admin@gemshield.demo

Password:
GemShieldAdmin@2026!

Role:
admin / procurement_officer

After login:
â†’ /officer/dashboard

VENDOR:

Email:
vendor@gemshield.demo

Password:
GemShieldVendor@2026!

Role:
vendor

After login:
â†’ /vendor/dashboard

These accounts are for the hackathon/demo environment.

Create them through Supabase Auth from a secure server-side setup/seed process.

Never create them from browser code using the service-role key.

========================================================
8. ROLE-BASED ACCESS CONTROL
========================================================

Vendor and Government Officer are separate application experiences.

VENDOR CAN:
- view tenders
- search tenders
- save tenders
- apply for tenders
- upload application documents
- submit bids
- track bids
- see compliance results
- see evidence
- see AI explanations
- view Bid Passport when available
- receive notifications
- use permitted communication
- manage profile/settings
- use help

VENDOR CANNOT:
- change compliance results
- change officer decisions
- edit audit logs
- edit Bid Passport
- access officer dashboards
- manage rules
- manage users

unless the backend explicitly grants a permitted workflow such as an official reopening/clarification process.

GOVERNMENT OFFICER CAN:
- create tenders
- manage tenders
- inspect bids
- run/inspect AI compliance
- review flagged cases
- make final decisions
- create Bid Passport
- manage vendors
- manage rules according to role
- manage users according to role
- view reports
- view analytics
- view audit logs
- manage settings
- use help

RBAC MUST BE ENFORCED BY THE BACKEND.

Do not rely only on hiding frontend buttons.

========================================================
9. FRONTEND ROUTING
========================================================

Every important click must have a real destination or action.

Do not create dead buttons.

Do not create dead tabs.

Do not create fake routes.

--------------------------------
VENDOR ROUTES
--------------------------------

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

--------------------------------
OFFICER ROUTES
--------------------------------

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

========================================================
10. VENDOR APPLY FLOW â€” EXACTLY FOUR STAGES
========================================================

DO NOT change this structure.

Stage 1:
Basic Information

Stage 2:
Documents Upload

Stage 3:
Technical & Financial Bid

Stage 4:
Review & Submit

These are ONE application workflow.

They are NOT four sidebar pages.

Routes:

/vendor/tenders/:tenderId/apply/basic
/vendor/tenders/:tenderId/apply/documents
/vendor/tenders/:tenderId/apply/bid
/vendor/tenders/:tenderId/apply/review

The same application record must persist across all four stages.

After submission:

/vendor/my-bids/:bidId

DO NOT allow the vendor to arbitrarily edit a submitted bid.

Only allow further changes when the backend explicitly records an authorized reopening/clarification workflow.

========================================================
11. CREATE TENDER FLOW â€” EXACTLY FOUR STAGES
========================================================

Stage 1:
Basic Information

Stage 2:
Requirements & ATC

Stage 3:
Documents & Rules

Stage 4:
Review & Publish

Routes:

/officer/tenders/create/basic
/officer/tenders/create/requirements
/officer/tenders/create/documents
/officer/tenders/create/review

Published tender changes must preserve version/history.

Do not silently overwrite published tender data.

========================================================
12. TENDER DETAILS
========================================================

Vendor:

/vendor/tenders/:tenderId

Show:

Overview
Documents
Technical Requirements
Financial Details
Important Dates
Requirements & ATC

All data must come from the backend.

Actions:

Apply
â†’ /vendor/tenders/:tenderId/apply/basic

Document
â†’ /vendor/documents/:documentId

Officer:

/officer/tenders/:tenderId/view

Show:
Overview
Requirements & ATC
Documents & Rules
Bids & Evaluation
Amendments
Activity

========================================================
13. MANAGE TENDERS CLICK BEHAVIOUR
========================================================

Eye icon:

â†’ /officer/tenders/:tenderId/view

Pencil icon:

â†’ /officer/tenders/:tenderId/edit/basic

Three dots:

OPEN CONTEXTUAL ACTION MENU / DRAWER

Do not make three dots open an unnecessary full page.

Actions may include:
- amendment
- close
- cancel
- duplicate
- export
- archive
- activity history

========================================================
14. BID VERIFICATION
========================================================

/officer/bids

Show real bids from Neon.

Eye:

â†’ /officer/bids/:bidId

Document:

â†’ /officer/documents/:documentId

All verification actions must call the backend.

========================================================
15. AI COMPLIANCE CHECK
========================================================

/officer/ai-compliance

Show real verification runs.

Tabs:

All
Compliant
Needs Review
Non-Compliant

Eye:

â†’ /officer/ai-compliance/:runId

Document:

â†’ /officer/documents/:documentId

Do not hardcode:
- compliance scores
- AI results
- vendors
- tender IDs
- flag counts

All come from backend/runtime verification.

========================================================
16. HUMAN REVIEW QUEUE
========================================================

/officer/human-review

Tabs:

All
High
Medium
Low
Reviewed

Cases appear when configured conditions occur, such as:
- low AI confidence
- conflict
- ambiguous evidence
- required manual verification

Eye:

â†’ /officer/human-review/:caseId/view

Pencil:

â†’ /officer/human-review/:caseId/verify

Three dots:

â†’ ACTION DRAWER

Action drawer can include:

View Submission
Edit Review
Request Clarification
Assign Reviewer
Escalate Case
Download Report
View Audit Trail
Mark Priority
Archive

All material actions must create audit records.

========================================================
17. HUMAN REVIEW AUTHORITY
========================================================

AI is advisory.

The procurement officer remains the final authority.

Officer can:
- inspect evidence
- confirm result
- override result
- add justification
- request clarification
- escalate
- make final decision where authorized

Do NOT automatically reject a vendor just because an AI model reports a low confidence result.

The flowchart requires low-confidence/conflicting cases to move to Human Review.

========================================================
18. FINAL DECISION & RECORDS
========================================================

This is a separate government module.

Routes:

/officer/decisions
/officer/decisions/:bidId

Workflow:

Verification
â†’ Human Review if required
â†’ Officer Final Decision

Possible decision:
- Approve / Compliant
- Seek Clarification
- Reject / Non-Compliant

Then:

Decision Record
â†’ Bid Passport
â†’ Audit Log

Do not merge this screen with Compliance Check.

========================================================
19. BID PASSPORT
========================================================

Bid Passport is different from Compliance Check.

Bid Passport is the finalized/replayable decision record.

It should preserve:
- decision snapshot
- evidence references
- rule version
- document hashes
- verification state
- officer decision
- timestamp
- audit references

Routes:

/vendor/bid-passport
/vendor/bid-passport/:bidId

/officer/decisions/:bidId

The finalized passport must not be casually editable.

========================================================
20. EVIDENCE CHAIN
========================================================

Every compliance result must be traceable:

Requirement
â†’ Rule
â†’ Document
â†’ Page
â†’ Evidence
â†’ Extracted Value
â†’ Result
â†’ Reason

The user must be able to navigate from a finding to the real document/page supporting it.

========================================================
21. DOCUMENT VIEWER
========================================================

Create one real reusable document viewer.

Vendor:

/vendor/documents/:documentId

Officer:

/officer/documents/:documentId

The viewer must use the ACTUAL uploaded/imported document.

Features:
- page navigation
- zoom
- download
- metadata
- evidence references
- page number
- source/provenance
- SHA-256 hash where available

NEVER use a screenshot of a PDF as the PDF.

========================================================
22. DATA.GOV.IN DOCUMENT SOURCE
========================================================

The demo must use REAL resources from:

data.gov.in
or
*.data.gov.in

for the government-source document library.

Implement a backend source service.

Suggested endpoints:

GET /sources/data-gov/search?q=
GET /sources/data-gov/resources/:resourceId
POST /sources/data-gov/import
GET /sources/data-gov/imports

The UI must support:

Search
â†’ Inspect Resource
â†’ Import
â†’ View Source
â†’ View/Download Actual Resource

For each imported resource, store:

title
publisher
resource ID
original URL
source domain
mime type
fetched timestamp
SHA-256
local/object-storage path if applicable

IMPORTANT:

Do not fabricate government PDFs.

Do not create fake bidder documents.

Do not convert CSV/JSON into a fake PDF.

If a real resource is not a PDF:
keep it as structured data.

If a real PDF does not contain the evidence required by the selected compliance rules:
return the honest result:
Missing Evidence / Cannot Determine / Not Applicable, as appropriate.

Do not manipulate the source to produce a desired compliance score.

IMPORTANT LIMITATION:

data.gov.in is a broad government open-data platform.
It does not guarantee that every â€œtenderâ€ search returns complete GeM bidder bid packages.

Therefore the system must distinguish:
- government dataset
- government report/document
- procurement resource
- actual bidder evidence

Never pretend they are the same thing.

========================================================
23. DATA.GOV.IN API ACCESS
========================================================

For resources exposing Data APIs:

Use the actual resource ID provided by data.gov.in.

Typical pattern:

https://api.data.gov.in/resource/<RESOURCE_ID>?api-key=<API_KEY>&format=json&limit=100

Do not invent RESOURCE_ID values.

The API key must remain backend-only.

Provide a source-library interface so the government officer can search and import approved resources.

========================================================
24. AI ARCHITECTURE
========================================================

Use this architecture:

Tender + ATC
+
Bid Documents
â†“
Tender Digital Twin
â†“
Document Extraction
â†“
Deterministic Rule Engine
â†“
Evidence / Conflict Analysis
â†“
Determine whether semantic reasoning is required
â†“
RAG + Gemini when needed
â†“
Confidence / Result
â†“
Human Review if required
â†“
Final Officer Decision
â†“
Bid Passport
â†“
Audit Log

RULE ENGINE FIRST.

Do not call Gemini for every deterministic check.

Gemini/RAG may be used when:
- wording is ambiguous
- semantic reasoning is required
- cross-document context is required
- conflict exists
- confidence is low
- tender configuration requires contextual interpretation

========================================================
25. MINILM + PGVECTOR
========================================================

Use:

all-MiniLM-L6-v2

384-dimensional embeddings.

Store vectors in:

Neon PostgreSQL + pgvector

Vector flow:

Rule/document text
â†’ MiniLM
â†’ 384-d embedding
â†’ pgvector
â†’ similarity retrieval
â†’ relevant rulebook chunks
â†’ Gemini when required

Run MiniLM server-side only.

Cache/download the model appropriately inside the backend deployment.

Do not download the model on every request.

========================================================
26. CURRENT COMPLIANCE LOGIC
========================================================

Preserve the existing backend scoring logic unless intentionally refactored with equivalent behavior.

Current logic includes:

critical = 40
warning = 15
info = 5

RAG adjustment:
maximum Â±10

Critical rule failure:
veto

Current classification:

score >= 85
â†’ Compliant

score < 85
â†’ Needs Review

Critical failure
â†’ Non-Compliant

Official score logic must remain backend-side.

Do not calculate the official compliance result in React.

========================================================
27. CONFLICT ENGINE
========================================================

Detect possible contradictions such as:

PAN vs GST
Vendor name mismatch
OEM name mismatch
Address mismatch
Certificate number mismatch
Conflicting dates
Conflicting financial claims

A contradiction is a review signal.

Do not label something â€œfraudâ€ merely because two values conflict.

========================================================
28. REAL-TIME JOB PROCESSING
========================================================

Current backend flow:

POST /upload
â†’ job_id
â†’ GET /jobs/:job_id/status
â†’ GET /jobs/:job_id/results

Display actual processing state.

Possible UI states:

Queued
Processing
Extracting
Rule Verification
AI Analysis
Scoring
Saving
Completed
Failed

Do not fake progress using frontend timers.

Where possible, expose actual backend stage information.

========================================================
29. REPORTS & ANALYTICS
========================================================

/officer/reports

Tabs:

Overview
AI Compliance Insights
Vendor Performance
Product / Service Analysis
Flag Analysis
Trends & Forecast
Custom Reports

All charts must be real charts driven by backend data.

All KPI values must come from backend/database queries.

When filters change:
update the real data.

Do not hardcode screenshot values.

Do not use chart images.

Custom Reports must support:

Report Type
Metrics
Group By
Filters
Preview
Generate Report

Exports:

PDF
Excel
CSV

Generate exports from actual queried data.

========================================================
30. VENDOR MANAGEMENT
========================================================

/officer/vendors

Tabs:

Overview
Vendor Directory
Performance Analysis
Compliance Status
Risk Assessment
Onboarding & Verification

All content must be live.

No fabricated vendors.

========================================================
31. RULE MANAGEMENT
========================================================

/officer/rules

Support:

GTC Rules
ATC Rules
Technical Rules
Eligibility Rules
Financial Rules
Custom Rules

Each rule contains:

Rule ID
Name
Clause Reference
Applicability
Severity
Expression / Logic
Reason Code
Version
Status

Historical rule versions must remain reproducible.

Do not overwrite rules that were already used by finalized decisions.

========================================================
32. USER MANAGEMENT
========================================================

/officer/users

Support:

View Users
Search
Add User
Assign Role
Permissions
Activate
Deactivate
View Activity

Permissions must be backend-enforced.

========================================================
33. VENDOR NOTIFICATIONS
========================================================

/vendor/notifications

Government:

/officer/notifications

Notifications must come from database/events.

Do not hardcode screenshot notifications.

========================================================
34. PROFILE & SETTINGS
========================================================

Vendor:

/vendor/profile
/vendor/profile/edit
/vendor/settings

Officer:

/officer/profile
/officer/settings

Settings must actually work.

Include:

Account Settings
Security
Notifications
Preferences
Appearance
Connected Accounts

Light/dark mode must actually switch.

========================================================
35. HELP & GUIDELINES
========================================================

Vendor help:
vendor-specific guidance

Officer help:
government-officer-specific guidance

Include:
- manuals
- process guides
- FAQs
- troubleshooting
- policy documents
- role guidance

AI assistant may provide assistance using approved documentation.

The AI assistant must NOT invent procurement policy.

If uncertain:
say that official guidance is required.

========================================================
36. AUDIT LOG
========================================================

/officer/audit

Audit real events:

login
logout
upload
document view
verification run
AI result
review assignment
clarification
override
final decision
passport generation
rule change
user change
report export

Audit rows should be append-only.

Eye:

â†’ /officer/audit/:eventId

Three dots:

â†’ audit action drawer

========================================================
37. NOTIFICATIONS / ACTION / ROUTE RULE
========================================================

Every:
button
tab
menu
eye icon
pencil icon
three-dot icon
filter
pagination
export button
save button
upload button
submit button

must either:
1. navigate to a defined route
2. execute a real backend mutation
3. open a defined modal/drawer

Nothing should be decorative if it appears clickable.

========================================================
38. DESIGN IMPLEMENTATION
========================================================

Use Design.zip as the visual source of truth.

For approved screens:
MATCH the approved design.

Do NOT:
- replace with generic admin UI
- redesign the layout
- simplify the sidebar
- change approved navigation
- invent a new visual identity
- replace cards with generic components if the design uses custom cards

Preserve:
- GeMShield branding
- header
- sidebar
- spacing
- typography
- colors
- rounded cards
- tables
- tabs
- semantic colors
- India/government visual treatment

Light and dark are theme variants of the same interface.

========================================================
39. DECORATIVE IMAGES
========================================================

Decorative government-building/India artwork may remain static.

That is acceptable because it is purely visual.

BUT:
do not use static images for:
- data
- charts
- tables
- PDF pages
- AI outputs
- analytics
- metrics
- vendor/tender information

========================================================
40. NO STATIC MOCKUP TEST
========================================================

After implementation:

1. Sign in as admin.
2. Sign in as vendor.
3. Create/fetch actual data.
4. Upload/import actual documents.
5. Run actual compliance.
6. Change the source input.
7. Confirm AI output changes where expected.
8. Confirm score is generated by backend.
9. Confirm charts change with backend data.
10. Confirm PDFs are actual files.
11. Confirm document pages are real.
12. Confirm notifications come from real records/events.
13. Confirm audit records reflect actual actions.
14. Confirm Bid Passport comes from actual finalized decision state.

If data is absent:
show empty state.

NEVER show a fake fallback dataset.

========================================================
41. DOCKER
========================================================

The final project MUST contain:

frontend/Dockerfile
backend/Dockerfile
docker-compose.yml
.env.example

Frontend:
multi-stage Node build
â†’ Vite build
â†’ lightweight web server

Backend:
Python image
â†’ install dependencies
â†’ FastAPI
â†’ Uvicorn

Run FastAPI with:

uvicorn main:app --host 0.0.0.0 --port 8000

Neon and Supabase are managed external services.

Do not replace Neon with a local database for the final architecture.

========================================================
42. ENVIRONMENT VARIABLES
========================================================

Frontend:

VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=

Backend:

DATABASE_URL=
SUPABASE_URL=
SUPABASE_JWT_AUDIENCE=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
DATA_GOV_API_KEY=
CORS_ORIGINS=

Never expose backend secrets in frontend code.

========================================================
43. PERFORMANCE
========================================================

Do not run expensive AI processing synchronously inside the browser.

Use backend jobs.

Use caching where appropriate for:
- MiniLM model
- rulebook embeddings
- reusable source metadata

Do not recalculate expensive analytics unnecessarily.

========================================================
44. FILE AND SOURCE PROVENANCE
========================================================

For every imported document store:
- source URL
- source domain
- publisher
- resource ID
- fetched timestamp
- SHA-256
- MIME type
- document ID

For generated AI/compliance records store enough metadata to reproduce or explain the result, including:
- rules version
- model/version where available
- verification run
- evidence references

========================================================
45. RESPONSIVE BEHAVIOUR
========================================================

Primary target:
desktop government procurement workstation.

Tablet:
stack secondary analytics panels appropriately.

Mobile:
convert sidebar to drawer and cards to vertical layout.

Do not remove critical compliance/evidence information.

========================================================
46. EMPTY / ERROR / SECURITY STATES
========================================================

Every API-backed screen supports:

Loading
Loaded
Empty
Error
Forbidden
Not Found

Do not hide backend errors with fake content.

========================================================
47. IMPLEMENTATION ORDER
========================================================

PHASE 1
App shell
Theme
Routing
Supabase Auth
RBAC
Shared components

PHASE 2
Existing FastAPI integration
Upload
Job status
Results
PDF viewing
Rule results
AI results
Compliance score

PHASE 3
Tender architecture
Create Tender
Manage Tenders
Tender Details
Requirements
ATC
Documents
Rules

PHASE 4
Vendor application
Four Apply stages
My Bids

PHASE 5
Officer verification
Bid Verification
AI Compliance
Human Review
Final Decisions
Bid Passport

PHASE 6
Vendor Management
Onboarding
Rule Management
User Management
Notifications
Profile
Help

PHASE 7
Reports
Analytics
Trends
Forecast
Custom Reports
Audit Logs

PHASE 8
Docker
Security
Performance
DataGov source integration
Final QA

========================================================
48. DO NOT BREAK THE FLOWCHART
========================================================

The core GeMShield architecture is:

Officer
â†’ Login
â†’ Role Authentication
â†’ Upload
â†’ Tender Twin
â†’ Evidence Graph
â†’ Conflict Scan
â†’ Rule Engine + Gemini RAG
â†’ Human Review Queue when required
â†’ Machine/Officer Result
â†’ Bid Passport
â†’ Audit Trail

Respect this conceptual architecture.

========================================================
49. MOST IMPORTANT RULE
========================================================

DO NOT BUILD A STATIC DEMO.

Build a real application whose UI MATCHES the supplied designs.

The designs tell you HOW GeMShield looks.

The database tells you WHAT DATA EXISTS.

The backend tells you WHAT THE SYSTEM DOES.

The AI generates runtime reasoning.

The real documents generate runtime evidence.

The charts are generated from runtime data.

The officer retains final decision authority.

========================================================
50. FINAL QA BEFORE DECLARING COMPLETE
========================================================

Before saying the build is complete, test:

AUTH
[ ] Admin login works
[ ] Vendor login works
[ ] Role routing works
[ ] Unauthorized routes are blocked

FRONTEND
[ ] JavaScript only
[ ] No .ts
[ ] No .tsx
[ ] No .jsx
[ ] No .cjsx

BACKEND
[ ] Existing FastAPI engine preserved
[ ] Upload works
[ ] Job status works
[ ] Results work

DATABASE
[ ] Neon connected
[ ] Business records persisted
[ ] pgvector works

AI
[ ] MiniLM works
[ ] Gemini works
[ ] AI calls are server-side

DOCUMENTS
[ ] Actual PDFs render
[ ] Data.gov.in imports work
[ ] Source provenance stored
[ ] Hash stored

WORKFLOWS
[ ] Vendor Apply 4 stages
[ ] Create Tender 4 stages
[ ] Human Review
[ ] Final Decision
[ ] Bid Passport
[ ] Audit

UI
[ ] Light theme
[ ] Dark theme
[ ] Exact approved structure
[ ] All tabs work
[ ] All buttons work
[ ] Eye actions work
[ ] Pencil actions work
[ ] Three-dot menus work

DATA
[ ] No fake business arrays
[ ] No screenshot charts
[ ] No fake PDFs
[ ] Metrics are dynamic
[ ] AI results are dynamic
[ ] Charts are dynamic
[ ] Notifications are dynamic
[ ] Audit records are dynamic

DEPLOYMENT
[ ] frontend/Dockerfile
[ ] backend/Dockerfile
[ ] docker-compose.yml
[ ] .env.example
[ ] Production secrets not exposed

Do not declare completion until these checks pass.

## GeMShield

GeMShield is an AI-powered bid compliance verification platform for GeM procurement.
## Development

Prefer working locally? You need Node.js and npm â€” [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```


