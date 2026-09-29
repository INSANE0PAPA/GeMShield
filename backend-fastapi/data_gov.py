"""
data_gov.py — FastAPI router for data.gov.in integration.

Endpoints:
  GET  /sources/data-gov/search?q=<query>     — Search the data.gov.in catalogue
  GET  /sources/data-gov/resources/<id>        — Get resource details
  POST /sources/data-gov/import                — Import a resource into GeMShield
  GET  /sources/data-gov/imports               — List all imported resources
"""

import os
import re
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from db import get_db
from auth import get_current_user, require_roles, AuthUser

log = logging.getLogger(__name__)

router = APIRouter(prefix="/sources/data-gov", tags=["data.gov.in"])

# ─── Configuration ─────────────────────────────────────────────────────────────

DATA_GOV_API_BASE = "https://api.data.gov.in"
DATA_GOV_CATALOGUE = "https://www.data.gov.in/backend/dmspublic/v1/resources"
ALLOWED_HOSTS_RE = re.compile(r"^(www\.)?data\.gov\.in$|\.data\.gov\.in$")
TIMEOUT = 25.0


def _get_api_key() -> str:
    key = os.getenv("DATA_GOV_API_KEY", "")
    if not key:
        raise HTTPException(503, "data.gov.in API key is not configured on the server.")
    return key


# ─── Models ─────────────────────────────────────────────────────────────────────

class CatalogueRow(BaseModel):
    resource_id: str = Field(..., alias="resourceId")
    title: str
    publisher: Optional[str] = None
    updated: Optional[str] = None
    datafile: Optional[str] = None
    format: Optional[str] = None
    page_url: Optional[str] = None

    class Config:
        populate_by_name = True


class ImportRequest(BaseModel):
    resource_id: str = Field(..., pattern=r"^[a-zA-Z0-9\-]{4,64}$")
    title: Optional[str] = None


class ImportedResource(BaseModel):
    id: int
    resource_id: str
    title: Optional[str] = None
    publisher: Optional[str] = None
    original_url: str
    source_domain: str = "data.gov.in"
    mime_type: Optional[str] = None
    fetched_at: str
    sha256: str
    source_classification: str = "government_open_data"
    record_count: int = 0
    created_at: str


# ─── SQLAlchemy model for data_gov_imports ──────────────────────────────────────

from models import DataGovImport


# ─── Helpers ────────────────────────────────────────────────────────────────────

async def _search_catalogue(q: str, limit: int = 25) -> list[dict]:
    """Search the data.gov.in public catalogue."""
    params = {
        "query": q,
        "format": "json",
        "limit": str(limit),
        "offset": "0",
    }
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            resp = await client.get(
                DATA_GOV_CATALOGUE,
                params=params,
                headers={"User-Agent": "GeMShield/1.0"},
            )
        except httpx.TimeoutException:
            raise HTTPException(504, "data.gov.in did not respond in time. Please try again later.")
        except httpx.RequestError as e:
            raise HTTPException(502, f"Could not reach data.gov.in: {e}")

    if resp.status_code != 200:
        raise HTTPException(502, f"data.gov.in catalogue returned status {resp.status_code}.")

    data = resp.json()
    rows = data.get("data", {}).get("rows", [])

    def _first(v):
        return v[0] if isinstance(v, list) and v else v

    results = []
    for r in rows:
        rid = str(_first(r.get("index_name")) or _first(r.get("nid")) or "")
        if not rid:
            continue
        changed = _first(r.get("changed"))
        updated = None
        if changed:
            try:
                updated = datetime.fromtimestamp(int(changed), tz=timezone.utc).isoformat()
            except (ValueError, TypeError):
                pass

        node_alias = _first(r.get("node_alias"))
        results.append({
            "resource_id": rid,
            "title": str(_first(r.get("title")) or "Untitled resource"),
            "publisher": " · ".join(
                filter(None, [_first(r.get("ministry_department")), _first(r.get("org"))])
            ) or None,
            "updated": updated,
            "datafile": _first(r.get("datafile")),
            "format": _first(r.get("file_format")),
            "page_url": f"https://www.data.gov.in{node_alias}" if node_alias else None,
        })

    return results


async def _fetch_data_api(resource_id: str, api_key: str) -> dict:
    """Fetch records from a data.gov.in Data API resource."""
    url = f"{DATA_GOV_API_BASE}/resource/{resource_id}"
    params = {
        "api-key": api_key,
        "format": "json",
        "limit": "100",
    }
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            resp = await client.get(url, params=params)
        except httpx.TimeoutException:
            raise HTTPException(504, "data.gov.in Data API did not respond.")
        except httpx.RequestError as e:
            raise HTTPException(502, f"Could not reach data.gov.in Data API: {e}")

    if resp.status_code != 200:
        raise HTTPException(502, f"data.gov.in Data API returned status {resp.status_code}.")

    text = resp.text
    data = resp.json()
    records = data.get("records", []) if isinstance(data.get("records"), list) else []
    sha = hashlib.sha256(text.encode()).hexdigest()

    return {
        "records": records,
        "title": data.get("title"),
        "publisher": ", ".join(data["org"]) if isinstance(data.get("org"), list) else data.get("org"),
        "fields": data.get("field"),
        "url": url,
        "sha256": sha,
        "record_count": len(records),
        "raw_text": text,
    }


def _sha256_str(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


# ─── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/search", summary="Search data.gov.in catalogue")
async def search_data_gov(
    q: str = Query(..., min_length=2, max_length=100, description="Search query"),
    limit: int = Query(25, ge=1, le=100),
    user: AuthUser = Depends(require_roles("admin", "procurement_officer", "reviewer")),
):
    """
    Search the data.gov.in public catalogue for resources matching the query.
    Returns resource metadata — resource_id, title, publisher, format, URL.
    The API key is NOT exposed to the client.
    """
    results = await _search_catalogue(q, limit)
    return {
        "query": q,
        "count": len(results),
        "results": results,
    }


@router.get("/resources/{resource_id}", summary="Get data.gov.in resource details")
async def get_resource(
    resource_id: str,
    user: AuthUser = Depends(require_roles("admin", "procurement_officer", "reviewer")),
):
    """
    Fetch details and a preview of records from a specific data.gov.in resource.
    Uses the server-side API key.
    """
    api_key = _get_api_key()
    data = await _fetch_data_api(resource_id, api_key)
    return {
        "resource_id": resource_id,
        "title": data.get("title"),
        "publisher": data.get("publisher"),
        "record_count": data.get("record_count", 0),
        "fields": data.get("fields"),
        "records_preview": data.get("records", [])[:20],
        "sha256": data.get("sha256"),
        "source_url": data.get("url"),
    }


@router.post("/import", summary="Import a data.gov.in resource")
async def import_resource(
    body: ImportRequest,
    user: AuthUser = Depends(require_roles("admin", "procurement_officer")),
    db: Session = Depends(get_db),
):
    """
    Import a data.gov.in resource into GeMShield.
    Stores metadata, SHA-256, record count, and provenance.
    
    Important distinctions maintained:
    - dataset != government report != procurement resource
    - CSV/JSON never turned into fake PDFs
    - Generic government reports never presented as bidder submissions
    """
    api_key = _get_api_key()

    # First try catalogue search if title is provided
    catalogue_hit = None
    if body.title:
        results = await _search_catalogue(body.title, 50)
        catalogue_hit = next(
            (r for r in results if r["resource_id"] == body.resource_id),
            None,
        )

    if catalogue_hit and catalogue_hit.get("datafile"):
        # Download the CSV/file from the catalogue
        file_url = catalogue_hit["datafile"]
        parsed = httpx.URL(file_url)
        if not ALLOWED_HOSTS_RE.match(str(parsed.host)):
            raise HTTPException(400, "File is not hosted on data.gov.in.")

        fmt = (catalogue_hit.get("format") or "").lower()
        if "csv" not in fmt and not str(parsed.path).lower().endswith(".csv"):
            # Determine mime type from format
            pass

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            try:
                resp = await client.get(str(file_url))
            except httpx.TimeoutException:
                raise HTTPException(504, "data.gov.in file download timed out.")

        if resp.status_code != 200:
            raise HTTPException(502, f"data.gov.in file unavailable (status {resp.status_code}).")

        content = resp.text
        sha = _sha256_str(content)
        mime = resp.headers.get("content-type", "text/csv").split(";")[0].strip()

        import_record = DataGovImport(
            resource_id=body.resource_id,
            title=catalogue_hit.get("title", body.title),
            publisher=catalogue_hit.get("publisher"),
            original_url=catalogue_hit.get("page_url") or str(file_url),
            source_domain="data.gov.in",
            mime_type=mime,
            fetched_at=datetime.now(timezone.utc),
            sha256=sha,
            source_classification="government_open_data",
            record_count=content.count("\n"),
            raw_metadata={
                "format": catalogue_hit.get("format"),
                "datafile": catalogue_hit.get("datafile"),
                "updated": catalogue_hit.get("updated"),
            },
            imported_by=user.user_id,
        )
    else:
        # Fall back to Data API
        data = await _fetch_data_api(body.resource_id, api_key)
        if not data["records"]:
            raise HTTPException(404, "This data.gov.in resource returned no records.")

        import_record = DataGovImport(
            resource_id=body.resource_id,
            title=data.get("title") or body.title,
            publisher=data.get("publisher"),
            original_url=data.get("url", ""),
            source_domain="data.gov.in",
            mime_type="application/json",
            fetched_at=datetime.now(timezone.utc),
            sha256=data["sha256"],
            source_classification="government_open_data",
            record_count=data["record_count"],
            raw_metadata={
                "fields": data.get("fields"),
                "record_sample": data["records"][:5],
            },
            imported_by=user.user_id,
        )

    db.add(import_record)
    db.commit()
    db.refresh(import_record)

    log.info(
        "Imported data.gov.in resource %s (id=%d, records=%d, sha=%s)",
        body.resource_id, import_record.id, import_record.record_count, import_record.sha256,
    )

    return {
        "id": import_record.id,
        "resource_id": import_record.resource_id,
        "title": import_record.title,
        "publisher": import_record.publisher,
        "original_url": import_record.original_url,
        "mime_type": import_record.mime_type,
        "sha256": import_record.sha256,
        "record_count": import_record.record_count,
        "source_classification": import_record.source_classification,
        "message": "Resource imported successfully.",
    }


@router.get("/imports", summary="List imported data.gov.in resources")
async def list_imports(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user: AuthUser = Depends(require_roles("admin", "procurement_officer", "reviewer")),
    db: Session = Depends(get_db),
):
    """
    List all data.gov.in resources that have been imported into GeMShield.
    Returns provenance metadata for each import.
    """
    total = db.query(DataGovImport).count()
    imports = (
        db.query(DataGovImport)
        .order_by(DataGovImport.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "imports": [
            {
                "id": imp.id,
                "resource_id": imp.resource_id,
                "title": imp.title,
                "publisher": imp.publisher,
                "original_url": imp.original_url,
                "source_domain": imp.source_domain,
                "mime_type": imp.mime_type,
                "fetched_at": imp.fetched_at.isoformat() if imp.fetched_at else None,
                "sha256": imp.sha256,
                "source_classification": imp.source_classification,
                "record_count": imp.record_count,
                "created_at": imp.created_at.isoformat() if imp.created_at else None,
            }
            for imp in imports
        ],
    }
