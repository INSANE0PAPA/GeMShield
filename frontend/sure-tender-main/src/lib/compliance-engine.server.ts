// Port of the original Python rule engine (rule_engine.py + orchestrator.py).
// Rules, validators, negation handling and scoring weights are preserved.
import rulesFile from "./compliance-rules.json";

export type Rule = {
  id: string; name: string; type: "keyword_presence" | "value_range"; validator?: string;
  keywords?: string[]; extraction_pattern?: string; min_value?: number; max_value?: number;
  expected: string; severity: "critical" | "warning" | "info"; suggestion: string; enabled?: boolean;
};
export type Page = { page: number; text: string };
export type RuleResult = {
  rule_code: string; rule_name: string; category: string; severity: string; passed: boolean;
  found_value: string | null; expected: string; suggestion: string; evidence_text: string; evidence_page: number | null;
  source: "rule_engine" | "tender_requirement"; status: string;
  ai_verdict?: string | null; ai_reason?: string | null; ai_confidence?: number | null;
};

export const RULES = (rulesFile as { rules: Rule[] }).rules;

const CATEGORY: Record<string, string> = {
  R001: "Eligibility", R002: "Eligibility", R003: "Commercial", R004: "Financial", R005: "Eligibility", R006: "Financial",
  R007: "Eligibility", R008: "Commercial", R009: "Eligibility", R010: "Technical", R011: "Eligibility", R012: "Commercial",
  R013: "Technical", R014: "Eligibility", R015: "Technical",
};

const NEGATION_RE = new RegExp([
  String.raw`not\s+(?:available|provided|attached|enclosed|applicable|submitted|found|mentioned|valid)`,
  String.raw`n\s*/\s*a`, "nil", "none", String.raw`no\s+(?:gstin|pan|emd|signatory|authoris)`, "invalid",
  String.raw`not\s+registered`, String.raw`not\s+required`, String.raw`exempted?\s+from`, "waiver", String.raw`details\s+not`, "missing", "absent",
].join("|"), "i");
const GSTIN_RE = /\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]\b/;
const PAN_RE = /\b[A-Z]{5}\d{4}[A-Z]\b/;

function isNegated(keyword: string, text: string): [boolean, string] {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return [false, ""];
  const window = text.slice(Math.max(0, idx - 30), Math.min(text.length, idx + keyword.length + 80));
  return [NEGATION_RE.test(window), window.trim()];
}
function evidenceSentence(kw: string, text: string) {
  const idx = text.toLowerCase().indexOf(kw.toLowerCase()); if (idx === -1) return "";
  const start = Math.max(text.lastIndexOf(".", idx) + 1, idx - 160);
  let end = text.indexOf(".", idx + kw.length); if (end === -1 || end - idx > 240) end = Math.min(text.length, idx + 240);
  return text.slice(start, end + 1).replace(/\s+/g, " ").trim();
}
function evidencePage(kw: string | null, pages: Page[]) {
  if (!kw) return null; const k = kw.toLowerCase();
  return pages.find((p) => p.text.toLowerCase().includes(k))?.page ?? null;
}
function result(rule: Rule, passed: boolean, found: string | null, evidence: string, page: number | null, override = ""): RuleResult {
  return {
    rule_code: rule.id, rule_name: rule.name, category: CATEGORY[rule.id] ?? "General", severity: rule.severity, passed,
    found_value: found, expected: rule.expected, suggestion: override || (passed ? "" : rule.suggestion),
    evidence_text: evidence, evidence_page: page, source: "rule_engine",
    status: passed ? "compliant" : found ? (rule.severity === "critical" ? "non_compliant" : "needs_attention") : "missing",
  };
}
const kwFound = (rule: Rule, text: string) => rule.keywords?.find((k) => text.toLowerCase().includes(k.toLowerCase())) ?? null;

function tokenValidator(re: RegExp, label: string) {
  return (rule: Rule, text: string, pages: Page[]) => {
    const m = text.match(re);
    if (m) {
      const [neg, ctx] = isNegated(m[0], text);
      if (!neg) return result(rule, true, m[0], ctx, evidencePage(m[0], pages));
      return result(rule, false, m[0], ctx, evidencePage(m[0], pages), `A ${label} token was found (${m[0]}) but the context suggests it is not valid or not provided. ${rule.suggestion}`);
    }
    const kw = kwFound(rule, text);
    return result(rule, false, kw, kw ? evidenceSentence(kw, text) : "", evidencePage(kw, pages), `No valid ${label} was found. ${rule.suggestion}`);
  };
}
function validateEmd(rule: Rule, text: string, pages: Page[]) {
  const kw = kwFound(rule, text); if (!kw) return result(rule, false, null, "", null);
  const [neg, ctx] = isNegated(kw, text); const page = evidencePage(kw, pages);
  if (neg) return result(rule, false, kw, ctx, page, "EMD keyword found but appears to be waived/not required. " + rule.suggestion);
  const idx = text.toLowerCase().indexOf(kw.toLowerCase());
  const amount = text.slice(Math.max(0, idx - 20), idx + 200).match(/(?:Rs\.?|INR|₹)?\s*(\d[\d,]*)/i);
  if (amount) return result(rule, true, `${kw} — ₹${amount[1]}`, evidenceSentence(kw, text), page);
  return result(rule, false, kw, ctx, page, "EMD keyword is present but no monetary amount was detected nearby. " + rule.suggestion);
}
function keywordPresence(rule: Rule, text: string, pages: Page[]) {
  const kw = kwFound(rule, text); if (!kw) return result(rule, false, null, "", null);
  const [neg, ctx] = isNegated(kw, text); const page = evidencePage(kw, pages);
  if (neg) return result(rule, false, kw, ctx, page, `Keyword '${kw}' was found but negated in context. ${rule.suggestion}`);
  return result(rule, true, kw, evidenceSentence(kw, text), page);
}
function valueRange(rule: Rule, text: string, pages: Page[]) {
  const m = text.match(new RegExp(rule.extraction_pattern!, "i"));
  const num = m ? Number(m[1]!.replace(/,/g, "")) : NaN;
  if (!m || Number.isNaN(num)) return result(rule, false, null, "", null, `Could not find ${rule.name} in the document. ${rule.suggestion}`);
  const passed = num >= (rule.min_value ?? -Infinity) && num <= (rule.max_value ?? Infinity);
  return result(rule, passed, String(num), evidenceSentence(m[0], text), evidencePage(m[0], pages), passed ? "" : rule.suggestion);
}

export function checkCompliance(text: string, pages: Page[], rules: Rule[] = RULES): RuleResult[] {
  return rules.filter((rule) => rule.enabled !== false).map((rule) => {
    if (rule.validator === "gstin") return tokenValidator(GSTIN_RE, "GSTIN (15-character format)")(rule, text, pages);
    if (rule.validator === "pan") return tokenValidator(PAN_RE, "PAN (10-character format ABCDE1234F)")(rule, text, pages);
    if (rule.validator === "emd") return validateEmd(rule, text, pages);
    if (rule.type === "value_range") return valueRange(rule, text, pages);
    return keywordPresence(rule, text, pages); // signatory validator is identical to negation-aware presence
  });
}

export function scoreAndVerdict(rules: RuleResult[], rag: { verdict: string; confidence: number }[]) {
  const w: Record<string, number> = { critical: 40, warning: 15, info: 5 };
  const total = rules.reduce((s, r) => s + (w[r.severity] ?? 5), 0) || 1;
  const earned = rules.filter((r) => r.passed).reduce((s, r) => s + (w[r.severity] ?? 5), 0);
  let delta = 0;
  for (const v of rag) { if (v.verdict === "compliant") delta += 2 * v.confidence; else if (v.verdict === "non_compliant") delta -= 2 * v.confidence; }
  delta = Math.max(-10, Math.min(10, delta));
  const ruleScore = (earned / total) * 100;
  const score = Math.round(Math.max(0, Math.min(100, ruleScore + delta)) * 10) / 10;
  const criticalFailed = rules.some((r) => !r.passed && r.severity === "critical");
  const verdict = criticalFailed ? "non_compliant" : score >= 85 ? "compliant" : "needs_review";
  return { score, verdict, ruleScore: Math.round(ruleScore * 10) / 10, delta: Math.round(delta * 10) / 10 };
}

