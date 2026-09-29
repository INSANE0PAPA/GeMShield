"""
rule_engine.py — Smart, negation-aware compliance checker for GeM bid documents.

Rule types:
  keyword_presence   — keyword found in text, with optional validator routing
  value_range        — numeric extraction + range check

Validators (for rules with "validator" field in rules.json):
  gstin     — validates 15-char GSTIN format + catches negation phrases
  pan       — validates 10-char PAN format + catches negation phrases
  emd       — keyword must appear with an amount AND not be negated
  signatory — keyword must appear and not be negated

Each result dict contains:
  rule_id, rule_name, passed, severity,
  found_value, expected_value, suggestion,
  evidence_text, evidence_page, rule_code
"""

import json
import re
from pathlib import Path
from document_processor import extract_evidence_sentence, find_evidence_page

RULES_PATH = Path(__file__).parent / "rules.json"

# ---------------------------------------------------------------------------
# Negation phrases — if any of these appear within 60 chars of a keyword,
# we treat the rule as FAILED even though the keyword is present.
# ---------------------------------------------------------------------------
NEGATION_PATTERNS = [
    r"not\s+(?:available|provided|attached|enclosed|applicable|submitted|found|mentioned|valid)",
    r"n\s*/\s*a",
    r"nil",
    r"none",
    r"no\s+(?:gstin|pan|emd|signatory|authoris)",
    r"invalid",
    r"not\s+registered",
    r"not\s+required",
    r"exempted?\s+from",
    r"waiver",
    r"details\s+not",
    r"missing",
    r"absent",
]
_NEGATION_RE = re.compile("|".join(NEGATION_PATTERNS), re.IGNORECASE)

# 15-char GSTIN: 2-digit state + 5-alpha PAN name + 4-digit + 1-alpha + 1-alphanum + Z + 1-alphanum
_GSTIN_RE = re.compile(
    r"\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]\b"
)
# 10-char PAN: 5 alpha + 4 digit + 1 alpha
_PAN_RE = re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b")


# ---------------------------------------------------------------------------
# Load rules
# ---------------------------------------------------------------------------

def load_rules():
    with open(RULES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)["rules"]


# ---------------------------------------------------------------------------
# Negation helper
# ---------------------------------------------------------------------------

def _is_negated(keyword: str, text: str) -> tuple[bool, str]:
    """
    Check if `keyword` appears in `text` AND the surrounding context
    contains a negation phrase.  Returns (negated: bool, context_snippet: str).
    """
    idx = text.lower().find(keyword.lower())
    if idx == -1:
        return False, ""
    # Grab a window of 80 chars around the keyword
    window_start = max(0, idx - 30)
    window_end   = min(len(text), idx + len(keyword) + 80)
    window = text[window_start:window_end]
    negated = bool(_NEGATION_RE.search(window))
    return negated, window.strip()


# ---------------------------------------------------------------------------
# Smart validators
# ---------------------------------------------------------------------------

def _validate_gstin(rule: dict, full_text: str, pages: list[dict]) -> dict:
    """
    PASS only when:
      (a) a syntactically valid 15-char GSTIN token is found, AND
      (b) the surrounding context does not contain a negation phrase.
    """
    match = _GSTIN_RE.search(full_text)
    if match:
        gstin_val = match.group(0)
        negated, context = _is_negated(gstin_val, full_text)
        if not negated:
            page = find_evidence_page(gstin_val, pages)
            return _result(rule, True, gstin_val, context, page)
        # GSTIN present but negated
        return _result(rule, False, gstin_val,
                       context, find_evidence_page(gstin_val, pages),
                       override_suggestion=f"A GSTIN token was found ({gstin_val}) but the context suggests it is not valid or not provided. "
                                           + rule["suggestion"])

    # No valid GSTIN token found — check if keyword is there (informational)
    kw_found = next((kw for kw in rule["keywords"] if kw.lower() in full_text.lower()), None)
    evidence  = extract_evidence_sentence(kw_found, full_text) if kw_found else ""
    page      = find_evidence_page(kw_found, pages) if kw_found else None
    return _result(rule, False, kw_found, evidence, page,
                   override_suggestion="No valid GSTIN (15-character format) was found. " + rule["suggestion"])


def _validate_pan(rule: dict, full_text: str, pages: list[dict]) -> dict:
    """
    PASS only when a valid PAN token (ABCDE1234F) is found and not negated.
    """
    match = _PAN_RE.search(full_text)
    if match:
        pan_val = match.group(0)
        negated, context = _is_negated(pan_val, full_text)
        if not negated:
            page = find_evidence_page(pan_val, pages)
            return _result(rule, True, pan_val, context, page)
        return _result(rule, False, pan_val,
                       context, find_evidence_page(pan_val, pages),
                       override_suggestion=f"PAN token found ({pan_val}) but appears negated/invalid. "
                                           + rule["suggestion"])

    kw_found = next((kw for kw in rule["keywords"] if kw.lower() in full_text.lower()), None)
    evidence  = extract_evidence_sentence(kw_found, full_text) if kw_found else ""
    page      = find_evidence_page(kw_found, pages) if kw_found else None
    return _result(rule, False, kw_found, evidence, page,
                   override_suggestion="No valid PAN (10-character format ABCDE1234F) was found. " + rule["suggestion"])


def _validate_emd(rule: dict, full_text: str, pages: list[dict]) -> dict:
    """
    PASS when:
      (a) an EMD keyword is present,
      (b) an amount figure (Rs/₹ + digits) appears nearby, AND
      (c) not negated.
    """
    kw_found = next((kw for kw in rule["keywords"] if kw.lower() in full_text.lower()), None)
    if not kw_found:
        return _result(rule, False, None, "", None)

    negated, context = _is_negated(kw_found, full_text)
    if negated:
        page = find_evidence_page(kw_found, pages)
        return _result(rule, False, kw_found, context, page,
                       override_suggestion="EMD keyword found but appears to be waived/not required. " + rule["suggestion"])

    # Check for an amount near the keyword
    idx = full_text.lower().find(kw_found.lower())
    window_start = max(0, idx - 20)
    window_end   = min(len(full_text), idx + 200)
    window = full_text[window_start:window_end]
    amount_match = re.search(r"(?:Rs\.?|INR|₹)?\s*(\d[\d,]*)", window, re.IGNORECASE)

    page = find_evidence_page(kw_found, pages)
    if amount_match:
        evidence = extract_evidence_sentence(kw_found, full_text)
        return _result(rule, True, f"{kw_found} — ₹{amount_match.group(1)}", evidence, page)

    # Keyword present but no amount detected
    return _result(rule, False, kw_found, context, page,
                   override_suggestion="EMD keyword is present but no monetary amount was detected nearby. "
                                       + rule["suggestion"])


def _validate_signatory(rule: dict, full_text: str, pages: list[dict]) -> dict:
    """
    PASS when signatory keyword is present and NOT negated.
    """
    kw_found = next((kw for kw in rule["keywords"] if kw.lower() in full_text.lower()), None)
    if not kw_found:
        return _result(rule, False, None, "", None)

    negated, context = _is_negated(kw_found, full_text)
    page = find_evidence_page(kw_found, pages)
    if negated:
        return _result(rule, False, kw_found, context, page,
                       override_suggestion="Signatory keyword found but context suggests it is absent or invalid. "
                                           + rule["suggestion"])
    evidence = extract_evidence_sentence(kw_found, full_text)
    return _result(rule, True, kw_found, evidence, page)


# ---------------------------------------------------------------------------
# Generic validators
# ---------------------------------------------------------------------------

def _check_keyword_presence(rule: dict, full_text: str, pages: list[dict]) -> dict:
    """Safe keyword presence — also checks negation."""
    kw_found = next((kw for kw in rule["keywords"] if kw.lower() in full_text.lower()), None)
    if not kw_found:
        return _result(rule, False, None, "", None)

    negated, context = _is_negated(kw_found, full_text)
    page     = find_evidence_page(kw_found, pages)
    evidence = extract_evidence_sentence(kw_found, full_text)
    if negated:
        return _result(rule, False, kw_found, context, page,
                       override_suggestion=f"Keyword '{kw_found}' was found but negated in context. " + rule["suggestion"])
    return _result(rule, True, kw_found, evidence, page)


def _check_value_range(rule: dict, full_text: str, pages: list[dict]) -> dict:
    match = re.search(rule["extraction_pattern"], full_text, re.IGNORECASE)
    found_num = _to_number(match.group(1)) if match else None

    if found_num is None:
        return _result(rule, False, None, "", None,
                       override_suggestion=f"Could not find {rule['name']} in the document. {rule['suggestion']}")

    min_val = rule.get("min_value", float("-inf"))
    max_val = rule.get("max_value", float("+inf"))
    passed  = min_val <= found_num <= max_val

    found_str = str(int(found_num)) if found_num == int(found_num) else str(found_num)
    evidence  = extract_evidence_sentence(match.group(0), full_text)
    page      = find_evidence_page(match.group(0), pages)

    return _result(rule, passed, found_str, evidence, page,
                   override_suggestion="" if passed else rule["suggestion"])


# ---------------------------------------------------------------------------
# Result builder
# ---------------------------------------------------------------------------

def _result(rule: dict, passed: bool, found_value,
            evidence_text: str, evidence_page,
            override_suggestion: str = "") -> dict:
    return {
        "rule_id":       rule["id"],
        "rule_code":     rule["id"],
        "rule_name":     rule["name"],
        "passed":        passed,
        "severity":      rule["severity"],
        "found_value":   found_value,
        "expected_value":rule.get("expected", ""),
        "suggestion":    override_suggestion if override_suggestion else ("" if passed else rule.get("suggestion", "")),
        "evidence_text": evidence_text or "",
        "evidence_page": evidence_page,
    }


def _to_number(raw: str):
    try:
        return float(raw.replace(",", "").strip())
    except (ValueError, AttributeError):
        return None


# ---------------------------------------------------------------------------
# Dispatcher map
# ---------------------------------------------------------------------------
VALIDATOR_MAP = {
    "gstin":     _validate_gstin,
    "pan":       _validate_pan,
    "emd":       _validate_emd,
    "signatory": _validate_signatory,
}


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def check_compliance(full_text: str, pages: list[dict] = None) -> tuple[list, dict]:
    """
    Run every rule against the document text.

    Parameters
    ----------
    full_text : str
        Concatenated document text.
    pages : list[dict], optional
        Per-page breakdown from document_processor.extract().
        If omitted, evidence_page will always be None.

    Returns
    -------
    (results_list, summary_dict)
    """
    if pages is None:
        pages = []

    rules   = load_rules()
    results = []

    for rule in rules:
        validator_name = rule.get("validator")
        if validator_name and validator_name in VALIDATOR_MAP:
            r = VALIDATOR_MAP[validator_name](rule, full_text, pages)
        elif rule["type"] == "keyword_presence":
            r = _check_keyword_presence(rule, full_text, pages)
        elif rule["type"] == "value_range":
            r = _check_value_range(rule, full_text, pages)
        else:
            continue   # unknown type — skip rather than crash
        results.append(r)

    return results, _summarise(results)


def _summarise(results: list) -> dict:
    weights       = {"critical": 40, "warning": 15, "info": 5}
    total         = sum(weights.get(r["severity"], 5) for r in results) or 1
    earned        = sum(weights.get(r["severity"], 5) for r in results if r["passed"])
    score         = round(earned / total * 100, 1)
    passed        = sum(1 for r in results if r["passed"])
    failed        = len(results) - passed
    critical_failed = any((not r["passed"]) and r["severity"] == "critical" for r in results)

    if critical_failed:
        overall = "non_compliant"
    elif score >= 85:
        overall = "compliant"
    else:
        overall = "needs_review"

    return {
        "score":          score,
        "overall_status": overall,
        "rules_checked":  len(results),
        "rules_passed":   passed,
        "rules_failed":   failed,
        "critical_failed": critical_failed,
    }


# ---------------------------------------------------------------------------
# Self-test:  python rule_engine.py
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import json as _json

    # --- Test 1: valid document ---
    sample_pass = """
    Bid submitted by ABC Enterprises. GSTIN: 22ABCDE1234F1Z5. PAN: ABCDE1234F.
    EMD of Rs. 45,000 enclosed. Bid validity 120 days. Annual turnover Rs 25,00,000.
    Udyam Registration UDYAM-WB-00-0000000. Authorised Signatory: R. Sharma.
    Delivery Period: 30 days. Warranty: 12 months. ISO 9001 certified.
    Technical Specifications as per GeM catalogue. Payment Terms: 30 days.
    """
    # --- Test 2: negation traps ---
    sample_negated = """
    GSTIN: NOT AVAILABLE. PAN: N/A.
    EMD not required (waiver applied). Authorised Signatory is absent from document.
    Bid validity 60 days. Annual turnover Rs 1,00,000.
    """

    for label, text in [("SHOULD_PASS", sample_pass), ("SHOULD_FAIL (negation)", sample_negated)]:
        print(f"\n{'='*60}\n{label}\n{'='*60}")
        res, summ = check_compliance(text)
        print(_json.dumps(summ, indent=2))
        for r in res:
            mark = "PASS" if r["passed"] else "FAIL"
            print(f"  [{mark}] {r['rule_id']} {r['rule_name']}")
            if r["evidence_text"]:
                print(f"          evidence: {r['evidence_text'][:80]}")
            if not r["passed"] and r["suggestion"]:
                print(f"          fix:      {r['suggestion'][:80]}")