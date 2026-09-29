import { supabase } from "@/integrations/supabase/client";

// Get base URL from environment or fallback to standard FastAPI dev port
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function runComplianceCheck({ data }: { data: { runId: string } }) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Authentication required");

  const res = await fetch(`${API_URL}/api/compliance/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Compliance check failed: ${err}`);
  }
  
  return { ok: true };
}

export async function askAssistant({ data }: { data: { messages: any[], audience: string, language: string } }) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Authentication required");

  const res = await fetch(`${API_URL}/api/helpdesk/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Assistant failed: ${err}`);
  }
  
  return await res.json();
}
