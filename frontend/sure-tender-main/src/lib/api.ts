/**
 * api.ts — FastAPI backend client for GeMShield.
 *
 * All API calls to the GeMShield backend go through this module.
 * The backend URL is configured via VITE_API_URL env var.
 * Auth tokens are automatically attached from the Supabase session.
 */

const API_URL = import.meta.env["VITE_API_URL"] || "http://localhost:8000";

/**
 * Get the current Supabase access token for authenticated API calls.
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Make an authenticated request to the FastAPI backend.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      (body as { detail?: string }).detail ??
      `API error ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

// ─── data.gov.in ───────────────────────────────────────────────────────────────

export interface DataGovSearchResult {
  resource_id: string;
  title: string;
  publisher: string | null;
  updated: string | null;
  datafile: string | null;
  format: string | null;
  page_url: string | null;
}

export async function searchDataGov(q: string) {
  return apiFetch<{ query: string; count: number; results: DataGovSearchResult[] }>(
    `/sources/data-gov/search?q=${encodeURIComponent(q)}`
  );
}

export async function getDataGovResource(resourceId: string) {
  return apiFetch<{
    resource_id: string;
    title: string | null;
    publisher: string | null;
    record_count: number;
    fields: unknown;
    records_preview: unknown[];
    sha256: string;
    source_url: string;
  }>(`/sources/data-gov/resources/${encodeURIComponent(resourceId)}`);
}

export async function importDataGovResource(resourceId: string, title?: string) {
  return apiFetch<{ id: number; resource_id: string; message: string }>(
    "/sources/data-gov/import",
    {
      method: "POST",
      body: JSON.stringify({ resource_id: resourceId, title }),
    }
  );
}

export async function listDataGovImports(skip = 0, limit = 20) {
  return apiFetch<{
    total: number;
    skip: number;
    limit: number;
    imports: Array<{
      id: number;
      resource_id: string;
      title: string | null;
      publisher: string | null;
      original_url: string;
      source_domain: string;
      mime_type: string | null;
      fetched_at: string | null;
      sha256: string;
      source_classification: string;
      record_count: number;
      created_at: string | null;
    }>;
  }>(`/sources/data-gov/imports?skip=${skip}&limit=${limit}`);
}

// ─── Help Desk ─────────────────────────────────────────────────────────────────

export interface HelpMessage {
  role: "user" | "assistant";
  content: string;
}

export async function askHelpDesk(
  messages: HelpMessage[],
  audience: "vendor" | "officer" = "vendor",
  language = "en"
) {
  return apiFetch<{ reply: string }>("/api/helpdesk/ask", {
    method: "POST",
    body: JSON.stringify({ messages, audience, language }),
  });
}

export async function createHelpTicket(
  subject: string,
  body: string,
  category = "general",
  tenderId?: string
) {
  return apiFetch<{ ticket_id: string; status: string; message: string }>(
    "/api/helpdesk/tickets",
    {
      method: "POST",
      body: JSON.stringify({
        subject,
        body,
        category,
        tender_id: tenderId,
      }),
    }
  );
}

export async function listHelpTickets() {
  return apiFetch<{
    tickets: Array<{
      ticket_id: string;
      subject: string;
      category: string;
      status: string;
      tender_id: string | null;
      created_at: string | null;
    }>;
  }>("/api/helpdesk/tickets");
}

// ─── Compliance ────────────────────────────────────────────────────────────────

export async function uploadForCompliance(file: File) {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? "Upload failed");
  }

  return response.json() as Promise<{
    job_id: number;
    status: string;
    filename: string;
    message: string;
  }>;
}

export async function getJobStatus(jobId: number) {
  return apiFetch<{
    job_id: number;
    status: string;
    filename: string;
    score: number | null;
    verdict: string | null;
    created_at: string | null;
    completed_at: string | null;
    progress_message?: string;
    error?: string;
  }>(`/jobs/${jobId}/status`);
}

export async function getJobResults(jobId: number) {
  return apiFetch<{
    job: {
      id: number;
      filename: string;
      status: string;
      score: number | null;
      verdict: string | null;
      page_count: number | null;
      char_count: number | null;
    };
    summary: {
      score: number | null;
      verdict: string | null;
      rules_checked: number;
      rules_passed: number;
      rules_failed: number;
      rag_checks: number;
    };
    rule_results: Array<{
      rule_code: string;
      rule_name: string;
      passed: boolean;
      severity: string;
      found_value: string | null;
      expected_value: string | null;
      evidence_text: string | null;
      evidence_page: number | null;
      suggestion: string | null;
    }>;
    rag_results: Array<{
      rule_content: string;
      verdict: string | null;
      confidence: number | null;
      reason: string | null;
      distance: number | null;
    }>;
    fix_guide: Array<{
      rule_code: string;
      rule_name: string;
      severity: string;
      suggestion: string | null;
      evidence: string | null;
      page: number | null;
    }>;
  }>(`/jobs/${jobId}/results`);
}

export async function listJobs(skip = 0, limit = 20) {
  return apiFetch<{
    total: number;
    skip: number;
    limit: number;
    jobs: Array<{
      id: number;
      filename: string;
      status: string;
      score: number | null;
      verdict: string | null;
      created_at: string | null;
    }>;
  }>(`/jobs?skip=${skip}&limit=${limit}`);
}

// ─── Gemini Compliance Analysis ────────────────────────────────────────────────

export async function analyzeCompliance(
  documentText: string,
  ambiguousRules: unknown[] = [],
  techRequirements: Array<{ parameter: string; spec: string }> = []
) {
  return apiFetch<{
    rules: unknown[];
    requirements: unknown[];
    summary: string;
    confidence: number;
    recommendations: string[];
    model: string;
    advisory: boolean;
  }>("/api/compliance/analyze", {
    method: "POST",
    body: JSON.stringify({
      document_text: documentText,
      ambiguous_rules: ambiguousRules,
      tech_requirements: techRequirements,
    }),
  });
}

// ─── Health Check ──────────────────────────────────────────────────────────────

export async function healthCheck() {
  return apiFetch<{ status: string; service: string; version: string }>("/");
}

// ─── Tenders ───────────────────────────────────────────────────────────────────

export async function createTender(payload: unknown) {
  return apiFetch<{ id: string; message: string }>("/api/tenders/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTender(tenderId: string, payload: unknown) {
  return apiFetch<{ message: string }>(`/api/tenders/${tenderId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function uploadTenderDocument(tenderId: string, file: File) {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/tenders/${tenderId}/documents`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? "Upload failed");
  }

  return response.json() as Promise<{
    id: number;
    filename: string;
    message: string;
  }>;
}
