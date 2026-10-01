import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronLeft, Clock, Cpu, Download, Eye, FileText, Filter, Loader2, MoreVertical, Plus, Search, XCircle } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState, ErrorState, LoadingState } from "@/components/states/DataStates";
import { STAGE_LABEL, VERDICT_LABEL, verdictTone } from "@/components/compliance/ComplianceRunView";
import { fmtDateTime } from "@/lib/procurement";
import { RULES_SUMMARY } from "@/lib/compliance-meta";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/officer/ai-compliance/")({
  head: () => ({
    meta: [
      { title: "AI Compliance Check — GeMShield" },
      { name: "description", content: "Automatically verify vendor submissions against GeM rules, technical specifications and documents." },
      { property: "og:title", content: "AI Compliance Check — GeMShield" },
      { property: "og:description", content: "Automatically verify vendor submissions against GeM rules and specifications." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiCompliance,
});

type Row = { id: string; file_name: string; status: string; score: number | null; verdict: string | null; officer_status: string | null; created_at: string; vendor_user_id: string; bid_id: string | null; tender: { reference_no: string; title: string; category: string | null } | null; compliance_results: { passed: boolean; severity: string }[] };

function AiCompliance() {
  const [tab, setTab] = useState<"" | "compliant" | "needs_review" | "non_compliant">("");
  const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [scoreBand, setScoreBand] = useState(""); const [vendor, setVendor] = useState("");
  const [picked, setPicked] = useState<string[]>([]); const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const runs = useQuery({ queryKey: ["compliance-runs", "all"], refetchInterval: 5000, queryFn: async () => { return apiFetch<Row[]>("/api/verification-runs"); } });
  const vendorNames = useQuery({ queryKey: ["vendor-names"], queryFn: async () => { const data = await apiFetch<any[]>("/api/admin/vendors"); return Object.fromEntries(data.map((v) => [v.owner_id, v.legal_name])) as Record<string, string>; } });
  const all = runs.data ?? [];
  const eff = (r: Row) => r.officer_status && r.officer_status !== "clarification" && r.officer_status !== "pending" ? r.officer_status : r.verdict;
  const rows = useMemo(() => all.filter((r) => (!tab || eff(r) === tab) && (!cat || r.tender?.category === cat) && (!vendor || (vendorNames.data?.[r.vendor_user_id] ?? "").toLowerCase().includes(vendor.toLowerCase()))
    && (!scoreBand || (r.score != null && (scoreBand === "85" ? r.score >= 85 : scoreBand === "60" ? r.score >= 60 && r.score < 85 : r.score < 60)))
    && (!q || `${r.file_name} ${r.tender?.reference_no ?? ""} ${r.tender?.title ?? ""} ${vendorNames.data?.[r.vendor_user_id] ?? ""}`.toLowerCase().includes(q.toLowerCase()))), [all, tab, cat, vendor, scoreBand, q, vendorNames.data]);
  const n = (v: string) => all.filter((r) => eff(r) === v).length;
  const bulk = useMutation({ mutationFn: async () => { await apiFetch("/api/verification-runs/bulk-refer", { method: "POST", body: JSON.stringify(picked) }); }, onSuccess: () => { toast.success("Selected checks referred to Human Review"); setPicked([]); qc.invalidateQueries({ queryKey: ["compliance-runs"] }); }, onError: (e: Error) => toast.error(e.message) });
  function exportCsv() { const lines = [["Tender", "Vendor", "Document", "Date", "Score", "Verdict", "Officer"].join(","), ...rows.map((r) => [r.tender?.reference_no ?? "", vendorNames.data?.[r.vendor_user_id] ?? "", r.file_name, r.created_at, r.score ?? "", r.verdict ?? "", r.officer_status ?? ""].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))]; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })); a.download = "ai-compliance.csv"; a.click(); }

  const kpis = [["Total Submissions", all.length, FileText, "text-primary bg-primary/10"], ["Compliant", n("compliant"), CheckCircle2, "text-success bg-success/10"], ["Needs Review", n("needs_review"), Clock, "text-warning bg-warning/15"], ["Non-Compliant", n("non_compliant"), XCircle, "text-destructive bg-destructive/10"]] as const;
  const pie = [{ name: "Compliant", v: n("compliant"), c: "var(--success)" }, { name: "Needs Review", v: n("needs_review"), c: "var(--warning)" }, { name: "Non-Compliant", v: n("non_compliant"), c: "var(--destructive)" }];

  return <div className="grid gap-3 xl:grid-cols-[1fr_280px]">
    <div className="min-w-0 space-y-3">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground"><ChevronLeft className="h-3.5 w-3.5" /><Link to="/officer/dashboard" className="text-primary">Dashboard</Link> › AI Compliance Check</nav>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><Cpu className="h-6 w-6" /></div><div><h1 className="font-display text-2xl font-bold">AI Compliance Check</h1><p className="text-sm text-muted-foreground">Automatically verify vendor submissions against GeM rules, technical specifications and documents.</p></div><Button className="ml-auto" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />Run New Check</Button></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{kpis.map(([l, v, I, tone]) => {
        return <div key={l as string} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left"><div className={cn("flex h-11 w-11 items-center justify-center rounded-lg", tone as string)}><I className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">{l as string}</p><p className="text-2xl font-bold">{v as number}</p><p className="text-[10px] text-muted-foreground">{l === "Total Submissions" ? "All checks" : `${all.length ? Math.round(((v as number) / all.length) * 100) : 0}% of total`}</p></div></div>;
      })}</div>
      <div className="rounded-xl border border-border bg-card">
        <div className="flex gap-1 border-b border-border px-3">{([["", "All Submissions", all.length], ["compliant", "Compliant", n("compliant")], ["needs_review", "Needs Review", n("needs_review")], ["non_compliant", "Non-Compliant", n("non_compliant")]] as const).map(([k, l, c]) => <button key={k} onClick={() => setTab(k)} className={cn("flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium", tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>{l}<span className="rounded-full bg-muted px-1.5 text-[10px]">{c}</span></button>)}</div>
        <div className="flex flex-wrap gap-2 p-3"><div className="relative min-w-56 flex-1"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input className="h-8 pl-8 text-xs" placeholder="Search by tender ID, vendor name, product, or document…" value={q} onChange={(e) => setQ(e.target.value)} /></div><Button size="sm" variant="outline" onClick={exportCsv}><Download className="mr-1 h-3.5 w-3.5" />Export</Button></div>
        {runs.isPending ? <LoadingState /> : runs.error ? <ErrorState error={runs.error} onRetry={() => runs.refetch()} /> : !rows.length ? <div className="p-3"><EmptyState title="No compliance checks" description="Checks appear here once vendors or officers run them on submitted bid documents." /></div> :
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="px-3 py-2"><input type="checkbox" aria-label="Select all" checked={picked.length === rows.length} onChange={(e) => setPicked(e.target.checked ? rows.map((r) => r.id) : [])} /></th>{["#", "Tender ID", "Vendor Name", "Document", "Submission Date", "Compliance Score", "Status", "AI Findings", "Actions"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead><tbody>
            {rows.map((r, i) => { const crit = r.compliance_results.filter((x) => !x.passed && x.severity === "critical").length; const minor = r.compliance_results.filter((x) => !x.passed && x.severity !== "critical").length; const v = eff(r); return <tr key={r.id} className="border-t border-border">
              <td className="px-3 py-2"><input type="checkbox" aria-label="Select" checked={picked.includes(r.id)} onChange={(e) => setPicked((p) => e.target.checked ? [...p, r.id] : p.filter((x) => x !== r.id))} /></td><td className="px-3 py-2">{i + 1}</td><td className="px-3 py-2 font-medium">{r.tender?.reference_no ?? "—"}</td><td className="px-3 py-2">{vendorNames.data?.[r.vendor_user_id] ?? "—"}</td><td className="max-w-40 truncate px-3 py-2">{r.file_name}</td><td className="px-3 py-2">{fmtDateTime(r.created_at)}</td>
              <td className="px-3 py-2">{r.score != null ? <span className={cn("rounded-md border px-2 py-0.5 font-semibold", verdictTone(r.verdict))}>{Math.round(r.score)}%</span> : STAGE_LABEL[r.status]}</td>
              <td className="px-3 py-2">{v ? <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-semibold", verdictTone(v))}>{VERDICT_LABEL[v]}{r.officer_status && r.officer_status !== "clarification" ? " ✓" : ""}</span> : "—"}</td>
              <td className="px-3 py-2 text-[11px]"><span className={crit ? "text-destructive" : "text-success"}>{crit} critical</span><br /><span className="text-muted-foreground">{minor} minor</span></td>
              <td className="px-3 py-2"><div className="flex items-center gap-1"><Button size="icon" variant="outline" className="h-7 w-7" asChild aria-label="View"><Link to="/officer/ai-compliance/$runId" params={{ runId: r.id }}><Eye className="h-3.5 w-3.5" /></Link></Button><Button size="icon" variant="outline" className="h-7 w-7" asChild aria-label="Document"><Link to="/officer/ai-compliance/$runId" params={{ runId: r.id }} search={{ tab: "doc" }}><FileText className="h-3.5 w-3.5" /></Link></Button>
                <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7" aria-label="More actions"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link to="/officer/ai-compliance/$runId" params={{ runId: r.id }}>View submission & decide</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/officer/audit" search={{ entity: r.id }}>View audit trail</Link></DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></td></tr>; })}
          </tbody></table></div>}
        <div className="flex flex-wrap items-center gap-2 border-t border-border p-3 text-xs"><span className="text-muted-foreground">{picked.length} selected</span>
          <Button size="sm" variant="outline" className="h-7 border-warning/40" disabled={!picked.length || bulk.isPending} onClick={() => bulk.mutate()}>Refer to Human Review</Button>
          <span className="ml-auto text-muted-foreground">Approval and rejection are available only in Final Decisions after required review.</span></div>
      </div>
    </div>
    <aside className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4"><p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Filter className="h-4 w-4 text-primary" />Filters<button className="ml-auto text-xs text-primary" onClick={() => { setCat(""); setScoreBand(""); setVendor(""); setQ(""); setTab(""); }}>Reset</button></p>
        <label className="block text-xs">Compliance Score<select className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2" value={scoreBand} onChange={(e) => setScoreBand(e.target.value)}><option value="">All Scores</option><option value="85">85 and above</option><option value="60">60 – 84</option><option value="0">Below 60</option></select></label>
        <label className="mt-2 block text-xs">Product / Service Category<select className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All Categories</option>{[...new Set(all.map((r) => r.tender?.category).filter(Boolean))].map((c) => <option key={c!}>{c}</option>)}</select></label>
        <label className="mt-2 block text-xs">Vendor Name<Input className="mt-1 h-8 text-xs" placeholder="Search vendor…" value={vendor} onChange={(e) => setVendor(e.target.value)} /></label></div>
      <div className="rounded-xl border border-border bg-card p-4"><p className="mb-2 text-sm font-semibold">Compliance Insights</p>{all.length ? <div className="flex items-center gap-2"><div className="relative h-28 w-28"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="v" innerRadius={34} outerRadius={50} strokeWidth={0}>{pie.map((p) => <Cell key={p.name} fill={p.c} />)}</Pie></PieChart></ResponsiveContainer><div className="absolute inset-0 flex flex-col items-center justify-center"><b>{all.length}</b><span className="text-[10px] text-muted-foreground">Total</span></div></div><ul className="space-y-1 text-[11px]">{pie.map((p) => <li key={p.name} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: p.c }} />{p.name} {p.v}</li>)}</ul></div> : <p className="text-xs text-muted-foreground">No data yet.</p>}</div>
      <div className="rounded-xl border border-border bg-card p-4"><p className="mb-2 text-sm font-semibold">Recent AI Scans</p><ul className="space-y-2">{all.slice(0, 5).map((r) => <li key={r.id}><Link to="/officer/ai-compliance/$runId" params={{ runId: r.id }} className="flex items-center gap-2 text-xs"><FileText className="h-4 w-4 text-primary" /><span className="min-w-0 flex-1 truncate">{r.tender?.reference_no ?? r.file_name}<span className="block text-[10px] text-muted-foreground">{fmtDateTime(r.created_at)}</span></span>{r.score != null && <span className={cn("rounded border px-1.5 font-semibold", verdictTone(r.verdict))}>{Math.round(r.score)}%</span>}</Link></li>)}{!all.length && <li className="text-xs text-muted-foreground">No scans yet.</li>}</ul></div>
      <div className="rounded-xl border border-border bg-card p-4"><p className="mb-2 text-sm font-semibold">AI Compliance Rules</p><ul className="space-y-1 text-xs">{RULES_SUMMARY.map((r) => <li key={r} className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" />{r}</li>)}</ul></div>
    </aside>
    <RunNewCheck open={open} onOpenChange={setOpen} />
  </div>;
}

function RunNewCheck({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate(); const qc = useQueryClient();
  const docs = useQuery({ queryKey: ["submitted-bid-docs"], enabled: open, queryFn: async () => { const data = await apiFetch<any[]>("/api/documents/all"); return data; } });
  const start = useMutation({
    mutationFn: async (d: NonNullable<typeof docs.data>[number]) => { 
      const res = await apiFetch<{id: number}>(`/api/verification-runs`, { method: "POST", body: JSON.stringify({ bid_document_id: d.id }) });
      return res.id;
    },
    onSuccess: (id) => { onOpenChange(false); navigate({ to: "/officer/ai-compliance/$runId", params: { runId: String(id) } }); toast.success("Compliance check started"); },
    onError: (e: Error) => toast.error(e.message),
  });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Run New Check</DialogTitle></DialogHeader><p className="text-xs text-muted-foreground">Choose a PDF submitted with a bid. The rule engine runs first; AI reasoning is used only where rules cannot decide.</p>
    {docs.isPending ? <LoadingState /> : docs.error ? <ErrorState error={docs.error} /> : !docs.data.filter((d) => (d.mime_type ?? "").includes("pdf") || d.name.toLowerCase().endsWith(".pdf")).length ? <EmptyState title="No submitted PDF documents" description="Documents appear once vendors submit bids with PDF attachments." /> :
      <ul className="max-h-96 divide-y divide-border overflow-y-auto rounded-md border border-border">{docs.data.filter((d) => (d.mime_type ?? "").includes("pdf") || d.name.toLowerCase().endsWith(".pdf")).map((d) => { const t = (d.bid as unknown as { tender: { reference_no: string; title: string } | null }).tender; return <li key={d.id} className="flex items-center gap-2 p-2 text-xs"><FileText className="h-4 w-4 text-primary" /><div className="min-w-0 flex-1"><p className="truncate font-medium">{d.name}</p><p className="truncate text-muted-foreground">{t?.reference_no} — {t?.title}</p></div><Button size="sm" disabled={start.isPending} onClick={() => start.mutate(d)}>{start.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}Run</Button></li>; })}</ul>}
  </DialogContent></Dialog>;
}
