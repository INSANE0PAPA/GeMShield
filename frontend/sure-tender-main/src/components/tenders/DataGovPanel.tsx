import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompactEmpty } from "@/components/dashboard/DashboardCard";
import { ErrorState, LoadingState } from "@/components/states/DataStates";
import { importDataGovResource, searchDataGov } from "@/lib/data-gov.functions";
import { fmtDate } from "@/lib/procurement";

export type Rec = Record<string, unknown>;
export type DataGovSource = { importId: string; resourceId: string; title: string | null; org: string | null; url: string; sha256: string; fetchedAt: string; record: Rec };

/** Officer-only: search the data.gov.in catalogue, import a dataset with provenance, and pick one record to start a tender from. */
export function DataGovPanel({ onUse }: { onUse: (s: DataGovSource) => void }) {
  const qc = useQueryClient(); const searchFn = searchDataGov; const importFn = importDataGovResource;
  const [q, setQ] = useState("tenders"); const [open, setOpen] = useState<string | null>(null);
  const results = useMutation({ mutationFn: (query: string) => searchFn({ data: { q: query } }), onError: (e) => toast.error(e.message) });
  const imp = useMutation({ mutationFn: (v: { resourceId: string; title?: string }) => importFn({ data: v }), onSuccess: async (r) => { await qc.invalidateQueries({ queryKey: ["data-gov-imports"] }); setOpen(r.id); toast.success("Dataset imported with source and fingerprint"); }, onError: (e) => toast.error(e.message) });
  const imports = useQuery({ queryKey: ["data-gov-imports"], queryFn: async () => { const data = await apiFetch<any[]>("/sources/data-gov/imports"); return data; } });
  const current = imports.data?.find((i) => i.id === open);
  return <div className="space-y-3 text-[12px]">
    <form onSubmit={(e) => { e.preventDefault(); if (q.trim().length >= 2) results.mutate(q.trim()); }} className="flex gap-2"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search data.gov.in, e.g. tenders, procurement" className="h-9" /><Button size="sm" className="h-9" disabled={results.isPending}><Search className="mr-1 h-4 w-4" />Search</Button></form>
    {results.isPending && <LoadingState label="Searching data.gov.in…" />}
    {results.error && <ErrorState error={results.error} onRetry={() => results.mutate(q)} />}
    {results.data && (results.data.length ? <ul className="max-h-60 divide-y divide-border overflow-auto rounded-md border border-border">{results.data.map((r) => <li key={r.resourceId} className="flex items-center justify-between gap-2 px-3 py-2"><span className="min-w-0"><b className="block">{r.title}</b><small className="text-muted-foreground">{r.org ?? "—"} · {r.format ?? "—"}</small></span><Button size="sm" variant="outline" disabled={imp.isPending} onClick={() => imp.mutate({ resourceId: r.resourceId, title: r.title })}><Download className="mr-1 h-3.5 w-3.5" />Import</Button></li>)}</ul> : <CompactEmpty icon={Search} title="No datasets found" description="data.gov.in returned no matching resources." />)}
    <p className="font-semibold">Imported datasets</p>
    {imports.isPending ? <LoadingState /> : imports.error ? <ErrorState error={imports.error} onRetry={() => imports.refetch()} /> : !imports.data.length ? <CompactEmpty icon={Database} title="No datasets imported yet" /> :
      <ul className="divide-y divide-border rounded-md border border-border">{imports.data.map((i) => <li key={i.id} className="flex items-center justify-between gap-2 px-3 py-2"><span className="min-w-0"><b className="block">{i.title ?? i.resource_id}</b><small className="text-muted-foreground">{i.record_count} records · fetched {fmtDate(i.fetched_at)} · SHA-256 {i.sha256.slice(0, 10)}… · <a href={i.source_url} target="_blank" rel="noreferrer" className="text-primary underline">source</a></small></span><Button size="sm" variant="ghost" onClick={() => setOpen(open === i.id ? null : i.id)}>{open === i.id ? "Hide" : "Choose record"}</Button></li>)}</ul>}
    {current && <div className="max-h-72 overflow-auto rounded-md border border-border"><table className="w-full text-left text-[11px]"><tbody>{(current.records as Rec[]).map((r, idx) => <tr key={idx} className="border-t border-border first:border-0"><td className="px-3 py-1.5">{Object.entries(r).slice(0, 5).map(([k, v]) => <span key={k} className="mr-3 inline-block"><span className="text-muted-foreground">{k}:</span> {String(v)}</span>)}</td><td className="px-3 py-1.5 text-right"><Button size="sm" onClick={() => onUse({ importId: current.id, resourceId: current.resource_id, title: current.title, org: current.org, url: current.source_url, sha256: current.sha256, fetchedAt: current.fetched_at, record: r })}>Use record</Button></td></tr>)}</tbody></table></div>}
  </div>;
}
