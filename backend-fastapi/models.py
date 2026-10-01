"""
models.py — SQLAlchemy ORM models for GEM compliance platform.

Tables:
  compliance_jobs  — one row per uploaded bid document
  rule_results     — one row per rule checked per job
  rag_results      — LLM-grounded RAG verdict per retrieved rule chunk per job
  rulebook_chunks  — embedded rule text for pgvector similarity search
"""

from sqlalchemy import (
    Column, Integer, String, Float, DateTime,
    ForeignKey, Text, Boolean, JSON,
)
from sqlalchemy.orm import declarative_base
from pgvector.sqlalchemy import Vector
from datetime import datetime, timezone

Base = declarative_base()


class ComplianceJob(Base):
    """One job = one uploaded bid document and its full compliance run."""
    __tablename__ = "compliance_jobs"

    id               = Column(Integer, primary_key=True, index=True)
    vendor_user_id   = Column(String, nullable=True, index=True)
    bid_id           = Column(String, ForeignKey("bids.id"), nullable=True)
    tender_id        = Column(String, ForeignKey("tenders.id"), nullable=True)
    bid_document_id  = Column(Integer, ForeignKey("bid_documents.id"), nullable=True)
    file_name        = Column(String, nullable=False)          # original filename
    stored_path      = Column(String, nullable=True)           # UUID-prefixed path on disk
    status           = Column(String, default="queued")        # queued|processing|completed|failed
    score            = Column(Float, nullable=True)            # 0-100
    verdict          = Column(String, nullable=True)           # compliant|needs_review|non_compliant
    page_count       = Column(Integer, nullable=True)          # pages extracted
    char_count       = Column(Integer, nullable=True)          # characters extracted
    processing_error = Column(Text, nullable=True)             # error message if status=failed
    officer_status   = Column(String, nullable=True, default="pending") # pending|needs_review|approved|rejected
    officer_note     = Column(Text, nullable=True)
    officer_id       = Column(String, nullable=True)
    officer_decided_at= Column(DateTime, nullable=True)
    created_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at     = Column(DateTime, nullable=True)
    ai_summary       = Column(Text, nullable=True)
    ai_confidence    = Column(Float, nullable=True)
    ai_recommendations = Column(JSON, nullable=True)

class RuleResult(Base):
    """One row per deterministic rule checked per job."""
    __tablename__ = "rule_results"

    id             = Column(Integer, primary_key=True, index=True)
    job_id         = Column(Integer, ForeignKey("compliance_jobs.id"), nullable=False)
    rule_code      = Column(String, nullable=False)    # stable code e.g. R001
    rule_name      = Column(String, nullable=False)
    passed         = Column(Boolean, nullable=False)
    severity       = Column(String, nullable=True)     # critical|warning|info
    found_value    = Column(String, nullable=True)     # what was extracted/matched
    expected_value = Column(String, nullable=True)     # what was expected
    evidence_text  = Column(Text, nullable=True)       # snippet from document
    evidence_page  = Column(Integer, nullable=True)    # page number (1-based)
    suggestion     = Column(Text, nullable=True)       # fix recommendation


class RAGResult(Base):
    """One row per LLM-grounded RAG verdict per retrieved rule chunk per job."""
    __tablename__ = "rag_results"

    id           = Column(Integer, primary_key=True, index=True)
    job_id       = Column(Integer, ForeignKey("compliance_jobs.id"), nullable=False)
    rule_content = Column(Text, nullable=False)        # the rule text retrieved
    verdict      = Column(String, nullable=True)       # compliant|non_compliant|cannot_determine
    confidence   = Column(Float, nullable=True)        # 0.0-1.0
    reason       = Column(Text, nullable=True)         # LLM one-sentence explanation
    distance     = Column(Float, nullable=True)        # pgvector L2 distance


class RulebookChunk(Base):
    """Embedded rule text for pgvector similarity search."""
    __tablename__ = "rulebook_chunks"

    id        = Column(Integer, primary_key=True, index=True)
    content   = Column(Text, nullable=False)
    embedding = Column(Vector(384))
    
    # Metadata fields
    document_name = Column(String, nullable=True)
    page_number = Column(Integer, nullable=True)
    tender_id = Column(String, nullable=True)
    clause_section = Column(String, nullable=True)


class UserRole(Base):
    """Application role mapping for RBAC — mirrors Supabase user_roles table."""
    __tablename__ = "user_roles"

    id         = Column(String, primary_key=True)
    user_id    = Column(String, nullable=False, index=True)
    role       = Column(String, nullable=False)   # admin|procurement_officer|reviewer|vendor
    granted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AuditLog(Base):
    """Append-only audit log for material actions."""
    __tablename__ = "audit_logs"

    id           = Column(String, primary_key=True)
    actor_id     = Column(String, nullable=True)
    actor_email  = Column(String, nullable=True)
    actor_role   = Column(String, nullable=True)
    action       = Column(String, nullable=False)
    entity_type  = Column(String, nullable=True)
    entity_id    = Column(String, nullable=True)
    summary      = Column(Text, nullable=True)
    metadata_    = Column("metadata", Text, nullable=True)
    ip_address   = Column(String, nullable=True)
    created_at   = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Profile(Base):
    __tablename__ = "profiles"
    id = Column(String, primary_key=True)  # Matches Supabase Auth UID
    account_type = Column(String, nullable=True) # vendor | officer
    full_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    organisation = Column(String, nullable=True)
    approval_status = Column(String, default="pending")
    designation = Column(String, nullable=True)
    ministry_department = Column(String, nullable=True)
    employee_official_id = Column(String, nullable=True)
    office_location = Column(String, nullable=True)
    timezone = Column(String, nullable=True, default="Asia/Kolkata")
    language = Column(String, nullable=True, default="en")
    theme = Column(String, nullable=True, default="system")
    density = Column(String, nullable=True, default="default")
    notification_prefs = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(String, primary_key=True)
    profile_id = Column(String, ForeignKey("profiles.id")) # Kept for backwards compatibility but not used in frontend mostly
    owner_id = Column(String, nullable=True) # Matches supabase auth UID
    legal_name = Column(String, nullable=False)
    trade_name = Column(String, nullable=True)
    gstin = Column(String, nullable=True)
    pan = Column(String, nullable=True)
    udyam_number = Column(String, nullable=True)
    category = Column(String, nullable=True)
    address = Column(String, nullable=True)
    state = Column(String, nullable=True)
    city = Column(String, nullable=True)
    pincode = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    onboarding_status = Column(String, default="pending")
    verification_notes = Column(Text, nullable=True)
    status = Column(String, default="active") # Kept for backwards compat
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Tender(Base):
    __tablename__ = "tenders"
    id = Column(String, primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    department = Column(String, nullable=True)
    title = Column(String, nullable=False)
    reference_no = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    location = Column(String, nullable=True)
    estimated_value = Column(Float, nullable=True)
    emd_amount = Column(Float, nullable=True)
    eligibility = Column(Text, nullable=True)
    details = Column(JSON, nullable=True)
    status = Column(String, default="draft") # draft|published|closed
    closing_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class TenderDocument(Base):
    __tablename__ = "tender_documents"
    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(String, ForeignKey("tenders.id"))
    name = Column(String, nullable=False)
    file_path = Column(String, nullable=True)
    mime_type = Column(String, nullable=True)
    size_bytes = Column(Integer, nullable=True)
    sha256 = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class SavedTender(Base):
    __tablename__ = "saved_tenders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True) # owner_id/user_id from supabase auth
    tender_id = Column(String, ForeignKey("tenders.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Bid(Base):
    __tablename__ = "bids"
    id = Column(String, primary_key=True)
    tender_id = Column(String, ForeignKey("tenders.id"))
    vendor_id = Column(String, ForeignKey("vendors.id"), nullable=True)
    vendor_user_id = Column(String, nullable=True, index=True)  # Supabase auth UID
    status = Column(String, default="draft")  # draft|submitted|under_review|clarification_required|completed
    application = Column(JSON, nullable=True)  # Four-stage application form data
    quoted_amount = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)  # Technical proposal text
    stage = Column(String, default="basic")  # Current apply stage: basic|documents|bid|review
    submitted_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class BidDocument(Base):
    __tablename__ = "bid_documents"
    id = Column(Integer, primary_key=True, index=True)
    bid_id = Column(String, ForeignKey("bids.id"))
    doc_type = Column(String, nullable=True)  # registration|gst|pan|authorization|past_performance|oem|other
    name = Column(String, nullable=False)
    filename = Column(String, nullable=True) # Legacy DB column
    file_path = Column(String, nullable=True)
    stored_path = Column(String, nullable=True) # Legacy DB column
    mime_type = Column(String, nullable=True)
    size_bytes = Column(Integer, nullable=True)
    sha256 = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class ComplianceRuleVersion(Base):
    __tablename__ = "compliance_rule_versions"
    id = Column(String, primary_key=True)
    version = Column(String, nullable=False)
    status = Column(String, default="draft")
    rules = Column(JSON, nullable=True)
    change_summary = Column(Text, nullable=True)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class HumanReviewCase(Base):
    __tablename__ = "human_review_cases"
    id = Column(String, primary_key=True)
    run_id = Column(Integer, ForeignKey("compliance_jobs.id"), nullable=False, index=True)
    bid_id = Column(String, ForeignKey("bids.id"), nullable=True)
    tender_id = Column(String, ForeignKey("tenders.id"), nullable=True)
    vendor_user_id = Column(String, nullable=False, index=True)
    status = Column(String, default="pending") # pending | in_progress | resolved
    priority = Column(String, default="medium") # high | medium | low
    trigger_reason = Column(Text, nullable=False)
    resolution = Column(String, nullable=True) # confirmed | overridden | clarified | escalated
    justification = Column(Text, nullable=True)
    assigned_to = Column(String, nullable=True)
    resolved_by = Column(String, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class ReviewDecision(Base):
    __tablename__ = "review_decisions"
    id = Column(String, primary_key=True)
    bid_id = Column(String, ForeignKey("bids.id"))
    officer_id = Column(String, ForeignKey("profiles.id"))
    decision = Column(String, nullable=False)
    justification = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class BidPassport(Base):
    __tablename__ = "bid_passports"
    id = Column(String, primary_key=True)
    bid_id = Column(String, ForeignKey("bids.id"))
    snapshot = Column(Text, nullable=True)
    issued_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class DataGovImport(Base):
    __tablename__ = "data_gov_imports"
    id = Column(Integer, primary_key=True, index=True)
    resource_id = Column(String, nullable=False, index=True)
    title = Column(String, nullable=True)
    publisher = Column(String, nullable=True)
    original_url = Column(Text, nullable=False)
    source_domain = Column(String, nullable=False, default="data.gov.in")
    mime_type = Column(String, nullable=True)
    fetched_at = Column(DateTime, nullable=True)
    sha256 = Column(String(64), nullable=True)
    source_classification = Column(String, nullable=False, default="government_open_data")
    record_count = Column(Integer, nullable=False, default=0)
    raw_metadata = Column(JSON, nullable=True)
    stored_path = Column(String, nullable=True)
    imported_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class HelpTicket(Base):
    __tablename__ = "help_tickets"
    id         = Column(Integer, primary_key=True, index=True)
    ticket_id  = Column(String, unique=True, nullable=False, index=True)
    user_id    = Column(String, nullable=False, index=True)
    user_email = Column(String, nullable=True)
    subject    = Column(String, nullable=False)
    body       = Column(Text, nullable=False)
    category   = Column(String, nullable=False, default="general")
    tender_id  = Column(String, nullable=True)
    status     = Column(String, nullable=False, default="open")   # open|in_progress|resolved|closed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("profiles.id"))
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    category = Column(String, nullable=True)
    severity = Column(String, default="info")
    link = Column(String, nullable=True)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))