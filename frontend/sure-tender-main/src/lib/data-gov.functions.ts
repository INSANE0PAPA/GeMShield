import { supabase } from "@/integrations/supabase/client";

// Get base URL from environment or fallback to standard FastAPI dev port
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function searchDataGov({ data }: { data: { q: string } }) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Authentication required");

  const q = encodeURIComponent(data.q);
  const res = await fetch(`${API_URL}/sources/data-gov/search?q=${q}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DataGov search failed: ${err}`);
  }
  
  return await res.json();
}

export async function importDataGovResource({ data }: { data: { resourceId: string, title?: string } }) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Authentication required");

  const res = await fetch(`${API_URL}/sources/data-gov/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DataGov import failed: ${err}`);
  }
  
  return await res.json();
}
