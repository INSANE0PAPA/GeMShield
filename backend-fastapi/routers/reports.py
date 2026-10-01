from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from db import get_db
from auth import require_roles, AuthUser
from models import Tender, Bid, ComplianceJob, RuleResult, Vendor, HumanReviewCase

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/overview")
def get_overview(
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    total_tenders = db.query(Tender).count()
    total_bids = db.query(Bid).count()
    total_vendors = db.query(Vendor).count()
    total_compliance_runs = db.query(ComplianceJob).count()

    # Bids by stage
    bids_by_stage = db.query(Bid.stage, func.count(Bid.id)).group_by(Bid.stage).all()
    bids_stage_dict = {stage: count for stage, count in bids_by_stage if stage}

    return {
        "kpis": {
            "total_tenders": total_tenders,
            "total_bids": total_bids,
            "total_vendors": total_vendors,
            "total_compliance_runs": total_compliance_runs,
        },
        "bids_by_stage": bids_stage_dict
    }

@router.get("/compliance")
def get_compliance_insights(
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    # Rule results aggregated
    results = db.query(RuleResult.rule_code, RuleResult.passed, RuleResult.severity, func.count(RuleResult.id))\
        .group_by(RuleResult.rule_code, RuleResult.passed, RuleResult.severity).all()
    
    rule_stats = {}
    for r_code, passed, severity, count in results:
        if not r_code: continue
        if r_code not in rule_stats:
            rule_stats[r_code] = {"Pass": 0, "Fail": 0, "Warning": 0}
        
        if passed:
            rule_stats[r_code]["Pass"] += count
        else:
            if severity and severity.lower() == "warning":
                rule_stats[r_code]["Warning"] += count
            else:
                rule_stats[r_code]["Fail"] += count

    overall_pass = db.query(ComplianceJob).filter(ComplianceJob.status == "completed").count() # approximation
    total_jobs = db.query(ComplianceJob).count()

    return {
        "rule_stats": rule_stats,
        "total_jobs": total_jobs,
        "completed_jobs": overall_pass
    }

@router.get("/vendor-performance")
def get_vendor_performance(
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    # Vendors grouped by status
    status_counts = db.query(Vendor.onboarding_status, func.count(Vendor.id)).group_by(Vendor.onboarding_status).all()
    
    # top vendors by bids
    top_vendors = db.query(Bid.vendor_user_id, func.count(Bid.id).label('bid_count'))\
        .group_by(Bid.vendor_user_id).order_by(func.count(Bid.id).desc()).limit(10).all()

    vendors = {v_id: count for v_id, count in top_vendors}

    return {
        "onboarding_status": {st: ct for st, ct in status_counts if st},
        "top_bidders": vendors
    }

@router.get("/flags")
def get_flag_analysis(
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    # Flags from human review cases
    flags = db.query(HumanReviewCase.status, func.count(HumanReviewCase.id)).group_by(HumanReviewCase.status).all()
    
    return {
        "review_cases_by_status": {st: ct for st, ct in flags if st}
    }

@router.get("/trends")
def get_trends(
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    # Tenders created over time (by month/day)
    # Using a simple cast for SQLite/Postgres compatibility if possible, or just fetch all and aggregate in python
    tenders = db.query(Tender.created_at).all()
    trend = {}
    for (created_at,) in tenders:
        if created_at:
            month = created_at.strftime("%Y-%m")
            trend[month] = trend.get(month, 0) + 1

    return {"tenders_over_time": trend}

@router.post("/custom")
def generate_custom_report(
    body: dict,
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
):
    # Return empty / generic for now
    return {"message": "Custom reports not yet implemented with real data parameters."}
