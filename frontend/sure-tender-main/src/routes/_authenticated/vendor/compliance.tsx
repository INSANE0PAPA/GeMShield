import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, FileUp, Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/states/DataStates";
import { ComplianceRunView, STAGE_LABEL, VERDICT_LABEL, verdictTone } from "@/components/compliance/ComplianceRunView";
import { fmtDateTime, sha256File } from "@/lib/procurement";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/vendor/compliance")({
  validateSearch: z.object({ run: z.union([z.string(), z.number()]).transform(String).optional() }),
  head: () => ({
    meta: [
      { title: "Compliance Check — GeMShield" },
      { name: "description", content: "AI-powered verification of your tender documents with complete transparency." },
      { property: "og:title", content: "Compliance Check — GeMShield" },
      { property: "og:description", content: "AI-powered verification of your tender documents with complete transparency." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorCompliance,
});

function VendorCompliance() {
  const { run } = Route.useSearch();
  const navigate = useNavigate();
  return <div className="space-y-3">
    <nav className="flex items-center gap-1 text-xs text-muted-foreground"><ChevronLeft className="h-3.5 w-3.5" /><Link to="/vendor/compliance" search={{}} className="text-primary">Compliance Check</Link>{run && <span>› Report</span>}</nav>
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="h-6 w-6" /></div><div><h1 className="font-display text-2xl font-bold">Compliance Check</h1><p className="text-sm text-muted-foreground">AI-powered verification of your submitted tender documents with complete transparency.</p></div>
      {run && <Button variant="outline" size="sm" className="ml-auto" onClick={() => navigate({ to: "/vendor/compliance", search: {} })}>All checks</Button>}</div>
    {run ? <ComplianceRunView runId={run} audience="vendor" /> : <><UploadPanel /><RunList /></>}
  </div>;
}

function UploadPanel() {
  const { session } = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [bidId, setBidId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const bids = useQuery({ queryKey: ["my-bids-for-check", uid], enabled: Boolean(uid), queryFn: async () => { 
    return apiFetch<any[]>(`/api/bids/`); 
  } });
  const start = useMutation({
    mutationFn: async () => {
      if (!file || !uid) throw new Error("Choose a PDF document first.");
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) throw new Error("Only PDF documents can be checked.");
      if (file.size > 20 * 1024 * 1024) throw new Error("PDF must be 20 MB or smaller.");
      
      const formData = new FormData();
      formData.append("file", file);
      if (bidId) formData.append("bid_id", bidId);

      const token = session.access_token;
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/verification-runs/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return data.id;
    },
    onSuccess: (id) => {
      setFile(null); qc.invalidateQueries({ queryKey: ["compliance-runs"] });
      navigate({ to: "/vendor/compliance", search: { run: id } });
      toast.success("Compliance check started");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
    <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }} className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center">
      <UploadCloud className="h-10 w-10 text-primary" /><p className="mt-2 text-sm font-semibold">{file ? file.name : "Drag & drop your bid PDF here"}</p><p className="text-xs text-muted-foreground">PDF up to 20 MB · text is extracted and checked against 15 GeM rules and the tender's technical requirements</p>
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <Button variant="outline" size="sm" className="mt-3" onClick={() => inputRef.current?.click()}><FileUp className="mr-1 h-4 w-4" />Browse file</Button>
    </div>
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <label className="block text-xs font-semibold">Link to one of my bids (optional)
        <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-xs font-normal" value={bidId} onChange={(e) => setBidId(e.target.value)}><option value="">Standalone document check</option>{bids.data?.map((b) => { const t = b.tender as { title: string; reference_no: string } | null; return <option key={b.id} value={b.id}>{t?.reference_no} — {t?.title} ({b.status})</option>; })}</select></label>
      <p className="text-[11px] text-muted-foreground">Linking a bid also checks the document against that tender's technical requirements.</p>
      <Button className="w-full" disabled={!file || start.isPending} onClick={() => start.mutate()}>{start.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Run Compliance Check</Button>
    </div>
  </div>;
}

function RunList() {
  const { session } = useSession();
  const q = useQuery({ queryKey: ["compliance-runs", "mine", session?.user.id], enabled: Boolean(session), refetchInterval: 4000, queryFn: async () => { 
    return apiFetch<any[]>(`/api/verification-runs`); 
  } });
  if (q.isPending) return <LoadingState label="Loading your checks…" />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data?.length) return <EmptyState title="No compliance checks yet" description="Upload a bid PDF above to run your first check." />;
  return <div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full text-xs"><thead className="bg-muted/50 text-left text-muted-foreground"><tr>{["Document", "Tender", "Checked", "Stage", "Score", "Result", "Department", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead><tbody>
    {q.data.map((r) => { const t = r.tender as { title: string; reference_no: string } | null; return <tr key={r.id} className="border-t border-border"><td className="px-3 py-2 font-medium">{r.file_name}</td><td className="px-3 py-2">{t ? `${t.reference_no}` : "—"}</td><td className="px-3 py-2">{fmtDateTime(r.created_at)}</td><td className="px-3 py-2">{STAGE_LABEL[r.status] || r.status}</td><td className="px-3 py-2 font-semibold">{r.score ?? "—"}</td><td className="px-3 py-2">{r.verdict && <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-semibold", verdictTone(r.verdict))}>{VERDICT_LABEL[r.verdict] || r.verdict}</span>}</td><td className="px-3 py-2 capitalize">{r.officer_status?.replace(/_/g, " ") ?? "Pending"}</td><td className="px-3 py-2"><Button size="sm" variant="outline" className="h-7 text-xs" asChild><Link to="/vendor/compliance" search={{ run: String(r.id) }}>View</Link></Button></td></tr>; })}
  </tbody></table></div>;
}
