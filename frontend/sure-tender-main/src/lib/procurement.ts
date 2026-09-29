import { supabase } from "@/integrations/supabase/client";

export const BID_STATUSES = ["draft", "submitted", "under_review", "clarification_required", "completed"] as const;
export type BidStatus = (typeof BID_STATUSES)[number];
export const APPLY_STAGES = ["basic", "documents", "bid", "review"] as const;
export type ApplyStage = (typeof APPLY_STAGES)[number];

export const inr = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const fmtDateTime = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "—";
export const fmtBytes = (n: number | null | undefined) => n == null ? "—" : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

/** Tender details stored by the officer during the four-stage creation flow. */
export type TenderDetails = {
  organisation?: string; product_category?: string; tender_type?: string; procurement_mode?: string; evaluation_method?: string;
  performance_security?: string; bid_validity_days?: string; bid_start?: string; prebid_meeting?: string; bid_opening?: string;
  delivery_location?: string; delivery_period?: string; installation?: string; location_details?: string;
  technical_requirements?: { parameter: string; spec: string }[]; atc?: string; payment_terms?: string; original_nit_date?: string;
};
export const detailsOf = (v: unknown): TenderDetails => (v && typeof v === "object" && !Array.isArray(v) ? (v as TenderDetails) : {});

export function tenderState(closing: string | null, status: string) {
  if (status === "closed" || status === "cancelled") return "closed" as const;
  if (!closing) return "open" as const;
  return new Date(closing).getTime() > Date.now() ? ("open" as const) : ("closed" as const);
}
export function timeLeft(closing: string | null) {
  if (!closing) return null;
  const ms = new Date(closing).getTime() - Date.now(); if (ms <= 0) return null;
  const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
  return `${d} Days ${String(h).padStart(2, "0")} Hrs ${String(m).padStart(2, "0")} Mins left`;
}

export type TenderFilters = { q?: string; category?: string; department?: string; location?: string; type?: string; closeBy?: string; tab?: string; sort?: string; min?: string; max?: string };

import { apiFetch } from "./api-client";

export async function fetchPublishedTenders(f: TenderFilters, ctx: { savedIds?: string[]; vendorCategory?: string | null } = {}, limit = 100) {
  const params = new URLSearchParams();
  params.set("status", "published");
  params.set("limit", String(limit));
  
  if (f.q) params.set("search", f.q);
  if (f.category) params.set("category", f.category);
  if (f.department) params.set("department", f.department);
  if (f.location) params.set("location", f.location);
  if (f.type) params.set("tender_type", f.type);
  if (f.closeBy) params.set("closeBy", f.closeBy);
  if (f.min) params.set("min_val", f.min);
  if (f.max) params.set("max_val", f.max);
  if (f.tab) params.set("tab", f.tab);
  if (f.sort) params.set("sort", f.sort);
  if (ctx.vendorCategory) params.set("vendorCategory", ctx.vendorCategory);
  if (ctx.savedIds && ctx.savedIds.length > 0) params.set("savedIds", ctx.savedIds.join(","));

  const data = await apiFetch(`/api/tenders/?${params.toString()}`);
  return data;
}

export async function fetchTenderFacets() {
  const data = await apiFetch<any>("/api/tenders/facets");
  return {
    categories: data.categories || [],
    departments: data.departments || [],
    locations: data.locations || [],
    types: data.types || []
  };
}

export async function fetchMyBids(userId: string) {
  const data = await apiFetch(`/api/bids/?vendor_id=${encodeURIComponent(userId)}`);
  return data;
}

export async function sha256File(file: File) {
  const d = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function openStoredFile(bucket: "bid-documents" | "tender-documents", path: string, download = false) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300, download ? { download: true } : undefined);
  if (error) throw error;
  window.open(data.signedUrl, "_blank", "noopener");
}
