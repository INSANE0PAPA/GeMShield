# GeMShield Build Status

## Phase 1: Inspect + Migration Map + Environment
**Status:** COMPLETED

### Migration Map

#### Existing Frontend (Lovable / TanStack Start + React 19 + Vite)
| Component | File/Location | Status | Notes |
|-----------|--------------|--------|-------|
| Framework | TanStack Start + Vite + React 19 | PRESERVE | Keep TSX files as-is |
| Router | TanStack Router (file-based) | PRESERVE | `src/routeTree.gen.ts` auto-generated |
| Auth | Supabase Auth via `@supabase/supabase-js` | PRESERVE | Already correct target |
| Session | `src/hooks/useSession.tsx` | PRESERVE | Supabase session + profile query |
| Roles | `src/lib/roles.ts` | PRESERVE | admin, procurement_officer, reviewer, vendor |
| Theme | `src/lib/theme.tsx` | PRESERVE | Light/dark toggle |
| Language | `src/lib/language.tsx` | PRESERVE | 8 languages supported |
| Navigation | `src/components/layout/navigation.ts` | PRESERVE | Vendor + Officer nav items |
| AppShell | `src/components/layout/AppShell.tsx` | PRESERVE | Sidebar + header layout |
| Translations | `src/lib/*-translations.ts` | PRESERVE | Auth, dashboard, landing, workspace, officer |

#### Lovable-Specific Dependencies to REMOVE/REPLACE
| Dependency | Location | Action |
|-----------|----------|--------|
| `@lovable.dev/cloud-auth-js` | `package.json`, `src/integrations/lovable/index.ts` | REMOVE — Not needed for Supabase Auth |
| `@lovable.dev/vite-tanstack-config` | `vite.config.ts`, `package.json` | REPLACE — Use standard Vite + TanStack config |
| Lovable AI Gateway (`callGateway`) | `src/lib/compliance-engine.server.ts` L119-167 | REPLACE with FastAPI Gemini calls |
| `lovable-error-reporting.ts` | `src/lib/lovable-error-reporting.ts` | REPLACE with no-op or remove import |
| `error-capture.ts` | `src/lib/error-capture.ts` | REVIEW — may use Lovable internals |

#### AI Gateway Migration
| Current | Target |
|---------|--------|
| `callGateway()` → Lovable AI Gateway (SSE) | FastAPI `/api/compliance/run` → Gemini SDK |
| `askAssistant()` → Lovable AI Gateway | FastAPI `/api/helpdesk/ask` → Gemini SDK |
| Frontend compliance engine (`compliance-engine.server.ts`) | Move to FastAPI backend |
| Frontend data-gov functions (`data-gov.functions.ts`) | Move to FastAPI backend |

#### Existing Backend (FastAPI)
| File | Purpose | Status |
|------|---------|--------|
| `main.py` | FastAPI app, upload, jobs endpoints | PRESERVE + EXTEND |
| `db.py` | SQLAlchemy engine + session | PRESERVE |
| `models.py` | ComplianceJob, RuleResult, RAGResult, RulebookChunk | PRESERVE + EXTEND |
| `orchestrator.py` | Compliance pipeline orchestrator | PRESERVE |
| `document_processor.py` | PyMuPDF extraction | PRESERVE |
| `rule_engine.py` | 15-rule deterministic engine | PRESERVE |
| `rag_engine.py` | MiniLM + pgvector + Gemini RAG | PRESERVE + UPDATE Gemini SDK |
| `embed_rules.py` | Rule embedding seeder | PRESERVE |
| `rules.json` | 15 compliance rules | PRESERVE |

#### Existing Database (Supabase)
Tables already in Supabase migrations:
- `departments`, `profiles`, `user_roles`
- `vendors`, `notifications`, `audit_logs`
- `tenders`, `tender_documents`, `tender_versions`
- `bids`, `bid_documents`, `bid_versions`
- `compliance_runs`, `compliance_results`, `compliance_rule_versions`
- `review_cases`, `review_decisions`
- `bid_passports`
- `data_gov_imports`
- `help_tickets`

#### Existing Routes
**Vendor Routes (Implemented):**
- `/vendor/dashboard` ✓
- `/vendor/find-tenders` ✓
- `/vendor/tenders/$tenderId` ✓
- `/vendor/tenders/$tenderId/apply/$stage` ✓
- `/vendor/my-bids` ✓
- `/vendor/my-bids/$bidId` ✓
- `/vendor/compliance` ✓
- `/vendor/bid-passport` ✓
- `/vendor/notifications` ✓
- `/vendor/profile` ✓
- `/vendor/help` ✓

**Officer Routes (Implemented):**
- `/officer/dashboard` ✓
- `/officer/tenders/create/$stage` ✓
- `/officer/tenders/manage` ✓
- `/officer/bids` ✓
- `/officer/ai-compliance` ✓
- `/officer/ai-compliance/$runId` ✓
- `/officer/human-review` ✓
- `/officer/decisions` ✓
- `/officer/reports` ✓
- `/officer/vendors` ✓
- `/officer/rules` ✓
- `/officer/users` ✓
- `/officer/audit` ✓
- `/officer/sources` ✓
- `/officer/notifications` ✓
- `/officer/profile` ✓
- `/officer/help` ✓

### Phase Order
| Phase | Description | Status |
|-------|------------|--------|
| 1 | Inspect + Migration Map + Environment | COMPLETED |
| 2 | Frontend routing/visual preservation | IN PROGRESS |
| 3 | Auth/RBAC | PENDING |
| 4 | Neon schema + persistence | PENDING |
| 5 | Preserve/extend FastAPI compliance engine | IN PROGRESS |
| 6 | PDF + evidence | PENDING |
| 7 | MiniLM + pgvector + RAG | PENDING |
| 8 | Gemini compliance + Vendor Help Desk | PENDING |
| 9 | data.gov.in | PENDING |
| 10 | Vendor workflows | PENDING |
| 11 | Officer workflows | PENDING |
| 12 | Human Review + Final Decisions + Bid Passport | PENDING |
| 13 | Reports + Vendor Management + Rules + Users | PENDING |
| 14 | Audit + Notifications + Settings + Help | PENDING |
| 15 | Docker + production configuration | PENDING |
| 16 | Full end-to-end test | PENDING |

### Backend Health Checkpoint
FastAPI startup: PASS
Neon connection: PASS
Database schema: PASS
pgvector: PASS
GET /: PASS
GET /docs: PASS
GET /jobs: PASS

### Current Blockers
- None. Backend is fully healthy and environment variables are verified.

### Next Action
Proceed with Phase 10 (Vendor workflows) and Phase 11 (Officer workflows) focusing on the Bids module, as the Tenders module migration is complete.

### Tenders Migration Checkpoint (Completed)
- ✅ `SavedTender` model added to backend and integrated.
- ✅ Migrated `find-tenders.tsx` to use `/api/tenders/saved` and `/api/vendors/me`.
- ✅ Migrated `tenders/$tenderId/index.tsx` to use `apiFetch` instead of Supabase SDK.
- ✅ Migrated `tenders/$tenderId/apply/$stage.tsx` to fetch `tenders` from FastAPI.
- ✅ Migrated `officer/tenders/create/$stage.tsx` to use `/api/tenders/` for create/update/documents.
- ✅ Backend `Tender` schema updated with `emd_amount` and `eligibility`.
- ❌ **Bids migration has NOT been started yet** (deferred as per instructions).
