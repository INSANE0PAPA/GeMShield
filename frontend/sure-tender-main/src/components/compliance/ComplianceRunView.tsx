import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bot, CheckCircle2, ChevronLeft, ChevronRight, Clock, Download, ExternalLink, FileSearch, FileText, History, Lightbulb, ListChecks, Loader2, MinusCircle, Search, ShieldCheck, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState, LoadingState, EmptyState } from "@/components/states/DataStates";
import { fmtBytes, fmtDateTime } from "@/lib/procurement";
import { cn } from "@/lib/utils";

export const RUN_STAGES = ["queued", "processing", "extracting", "rule_verification", "ai_analysis", "scoring", "saving", "completed"] as const;
export const STAGE_LABEL: Record<string, string> = { queued: "Queued", processing: "Processing", extracting: "Extracting text", rule_verification: "Rule verification", ai_analysis: "AI analysis", scoring: "Scoring", saving: "Saving", completed: "Completed", failed: "Failed" };
export const VERDICT_LABEL: Record<string, string> = { compliant: "Compliant", needs_review: "Needs Review", non_compliant: "Non-Compliant" };
const TONE: Record<string,{box:string;text:string}> = { success:{box:"border-success/25 bg-success/10",text:"text-success"}, warning:{box:"border-warning/30 bg-warning/10",text:"text-warning"}, destructive:{box:"border-destructive/25 bg-destructive/10",text:"text-destructive"}, primary:{box:"border-primary/25 bg-primary/10",text:"text-primary"} };
const STATUS_LABEL: Record<string, string> = { compliant: "Compliant", needs_attention: "Needs Attention", non_compliant: "Non-Compliant", missing: "Not Found" };
const OFFICER_LABEL: Record<string, string> = { compliant: "Approved as Compliant", needs_review: "Marked for Human Review", non_compliant: "Marked Non-Compliant", clarification: "Clarification Requested" };

export function verdictTone(v: string | null | undefined) {
  return v === "compliant" ? "bg-success/12 text-success border-success/25" : v === "non_compliant" ? "bg-destructive/10 text-destructive border-destructive/25" : "bg-warning/15 text-warning-foreground border-warning/30 dark:text-warning";
}
export function StatusPill({ status }: { status: string }) {
  const Icon = status === "compliant" ? CheckCircle2 : status === "non_compliant" ? XCircle : status === "missing" ? MinusCircle : AlertTriangle;
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold", status === "missing" ? "border-destructive/25 bg-destructive/10 text-destructive" : verdictTone(status === "needs_attention" ? "needs_review" : status))}><Icon className="h-3 w-3" />{STATUS_LABEL[status] ?? status}</span>;
}
export function ScoreDonut({ score, size = 132, verdict }: { score: number | null; size?: number; verdict?: string | null }) {
  const r = 42, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, score ?? 0));
  const color = verdict === "compliant" ? "var(--success)" : verdict === "non_compliant" ? "var(--destructive)" : "var(--warning)";
  return <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`Score ${score ?? "—"} of 100`}><circle cx="50" cy="50" r={r} fill="none" stroke="var(--muted)" strokeWidth="9" /><circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 50 50)" /><text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="fill-foreground" style={{ fontSize: 20, fontWeight: 700 }}>{score == null ? "—" : Math.round(score)}<tspan style={{ fontSize: 9, fontWeight: 500 }} className="fill-muted-foreground"> /100</tspan></text></svg>;
}

type Run = { id: string; file_name: string; file_path: string; sha256: string | null; size_bytes: number | null; page_count: number | null; status: string; score: number | null; rule_score: number | null; rag_delta: number | null; verdict: string | null; ai_summary: string | null; ai_confidence: number | null; ai_recommendations: unknown; rules_version: string; error: string | null; officer_status: string | null; officer_note: string | null; officer_decided_at: string | null; created_at: string; completed_at: string | null; bid_id: string | null; tender_id: string | null; tender: { id: string; title: string; reference_no: string; department: string | null; category: string | null; details: unknown } | null; bid: { submitted_at: string | null; status: string } | null };
type Result = { id: string; position: number; rule_code: string; rule_name: string; category: string; severity: string; source: string; passed: boolean; status: string; expected: string | null; found_value: string | null; evidence_text: string | null; evidence_page: number | null; suggestion: string | null; ai_verdict: string | null; ai_reason: string | null; ai_confidence: number | null };

export function useRun(runId: string | undefined) {
  return useQuery({
    queryKey: ["compliance-run", runId], enabled: Boolean(runId),
    refetchInterval: (q) => { const s = (q.state.data as Run | null | undefined)?.status; return s && s !== "completed" && s !== "failed" ? 1200 : false; },
    queryFn: async () => {
      const { data, error } = await supabase.from("compliance_runs").select("*, tender:tenders(id,title,reference_no,department,category,details), bid:bids(submitted_at,status)").eq("id", runId!).maybeSingle();
      if (error) throw error; return data as unknown as Run | null;
    },
  });
}

export function JobProgress({ run }: { run: Pick<Run, "status" | "error" | "file_name"> }) {
  const idx = RUN_STAGES.indexOf(run.status as (typeof RUN_STAGES)[number]);
  return <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-center gap-2 text-sm font-semibold">{run.status === "failed" ? <XCircle className="h-4 w-4 text-destructive" /> : run.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Loader2 className="h-4 w-4 animate-spin text-primary" />}{run.file_name} — {STAGE_LABEL[run.status] ?? run.status}</div>
    <ol className="mt-3 grid grid-cols-4 gap-2 md:grid-cols-8">{RUN_STAGES.map((s, i) => <li key={s} className={cn("rounded-md border px-2 py-1.5 text-center text-[10px] font-medium", run.status === "failed" ? "border-border text-muted-foreground" : i < idx || run.status === "completed" ? "border-success/30 bg-success/10 text-success" : i === idx ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{STAGE_LABEL[s]}</li>)}</ol>
    {run.error && <p className="mt-3 text-xs text-destructive">{run.error}</p>}
  </div>;
}

export function ComplianceRunView({ runId, audience, initialTab }: { runId: string; audience: "vendor" | "officer"; initialTab?: string }) {
  const qc = useQueryClient();
  const runQ = useRun(runId);
  const run = runQ.data;
  const resQ = useQuery({ queryKey: ["compliance-results", runId], enabled: run?.status === "completed", queryFn: async () => { const { data, error } = await supabase.from("compliance_results").select("*").eq("run_id", runId).order("position"); if (error) throw error; return data as Result[]; } });
  const histQ = useQuery({ queryKey: ["compliance-history", runId, run?.status, run?.officer_status], enabled: Boolean(run), queryFn: async () => { const { data, error } = await supabase.from("audit_logs").select("id,action,summary,actor_role,actor_email,created_at").eq("entity_id", runId).order("created_at", { ascending: false }); if (error) throw error; return data; } });
  const [tab, setTab] = useState<"req" | "doc" | "missing" | "ai" | "history">((["req","doc","missing","ai","history"].includes(initialTab ?? "") ? initialTab : "req") as "req");
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [st, setSt] = useState("");
  const [page, setPage] = useState(1);
  const results = resQ.data ?? [];
  const filtered = useMemo(() => results.filter((r) => (!q || `${r.rule_name} ${r.expected}`.toLowerCase().includes(q.toLowerCase())) && (!cat || r.category === cat) && (!st || r.status === st)), [results, q, cat, st]);
  const counts = { compliant: results.filter((r) => r.status === "compliant").length, attention: results.filter((r) => r.status === "needs_attention").length, non: results.filter((r) => r.status === "non_compliant" || r.status === "missing").length };
  const selected = results.find((r) => r.id === sel) ?? null;
  const pct = (n: number) => (results.length ? Math.round((n / results.length) * 100) : 0);

  const docUrl = useQuery({ queryKey: ["run-doc-url", run?.file_path], enabled: Boolean(run?.file_path), staleTime: 240_000, queryFn: async () => { const { data, error } = await supabase.storage.from("bid-documents").createSignedUrl(run!.file_path, 300); if (error) throw error; return data.signedUrl; } });

  const decide = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("compliance_runs").update({ officer_status: "needs_review", officer_note: "Referred from compliance evidence review", officer_id: u.user?.id ?? null, officer_decided_at: new Date().toISOString() }).eq("id", runId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Referred to Human Review"); qc.invalidateQueries({ queryKey: ["compliance-run", runId] }); qc.invalidateQueries({ queryKey: ["compliance-runs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (runQ.isPending) return <LoadingState label="Loading compliance check…" />;
  if (runQ.error) return <ErrorState error={runQ.error} onRetry={() => runQ.refetch()} />;
  if (!run) return <EmptyState title="Compliance check not found" description="It may have been removed or you may not have access to it." />;
  const recs = Array.isArray(run.ai_recommendations) ? (run.ai_recommendations as string[]) : [];
  const openPage = (p: number | null) => { setPage(p ?? 1); setTab("doc"); };
  const reviewText = run.officer_status ? OFFICER_LABEL[run.officer_status] : run.bid?.submitted_at ? "Under Department Review" : "Not yet submitted to department";

  return <div className="space-y-3">
    {/* Tender strip */}
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-6 w-6" /></div>
      <div className="min-w-0 flex-1"><p className="truncate font-semibold">{run.tender?.title ?? run.file_name}</p><p className="text-xs text-muted-foreground">{run.tender?.reference_no ?? "Standalone document check"}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">{[run.tender?.category, run.tender?.department].filter(Boolean).map((t) => <span key={t} className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{t}</span>)}</div></div>
      <div className="text-xs"><p className="text-muted-foreground">Bid Submission Date</p><p className="font-semibold">{fmtDateTime(run.bid?.submitted_at)}</p></div>
      <div className="text-xs"><p className="text-muted-foreground">Checked</p><p className="font-semibold">{fmtDateTime(run.completed_at ?? run.created_at)}</p></div>
      <div className="text-xs"><p className="text-muted-foreground">Department</p><p className="font-semibold">{run.tender?.department ?? "—"}</p></div>
      {run.tender && <Button variant="outline" size="sm" asChild><Link to={audience === "vendor" ? "/vendor/tenders/$tenderId" : "/officer/tenders/manage"} params={{ tenderId: run.tender.id }}>View Tender Details <ChevronRight className="ml-1 h-3.5 w-3.5" /></Link></Button>}
    </div>

    {run.status !== "completed" ? <JobProgress run={run} /> : <>
      <div className="grid gap-3 lg:grid-cols-[1.1fr_1.4fr_1fr]">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"><div><p className="mb-1 text-sm font-semibold">Overall Compliance Score</p><ScoreDonut score={run.score} verdict={run.verdict} /></div>
          <div className="space-y-2"><span className={cn("inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold", verdictTone(run.verdict))}>{VERDICT_LABEL[run.verdict ?? ""] ?? run.verdict}</span><p className="text-xs text-muted-foreground">Rule engine {run.rule_score ?? "—"}% {run.rag_delta ? `· AI adjustment ${run.rag_delta > 0 ? "+" : ""}${run.rag_delta}` : ""}</p><p className="text-[11px] text-muted-foreground">{run.rules_version} · {run.page_count ?? "—"} pages</p></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="mb-3 text-sm font-semibold">Requirement Summary</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[["Compliant", counts.compliant, "success", CheckCircle2], ["Needs Attention", counts.attention, "warning", AlertTriangle], ["Non-Compliant", counts.non, "destructive", XCircle], ["Total Requirements", results.length, "primary", ListChecks]].map(([l, n, tone, Icon]) => { const I = Icon as typeof CheckCircle2; return <div key={l as string} className={cn("rounded-lg border p-3", TONE[tone as string]!.box)}><div className="flex items-center gap-2"><I className={cn("h-5 w-5", TONE[tone as string]!.text)} /><span className="text-xl font-bold">{n as number}</span></div><p className="mt-1 text-[11px] font-semibold">{l as string}</p><p className="text-[10px] text-muted-foreground">{l === "Total Requirements" ? "Rules + tender specs" : `${pct(n as number)}% of requirements`}</p></div>; })}</div></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="mb-2 text-sm font-semibold">Government Review Status</p><div className="rounded-lg border border-warning/30 bg-warning/10 p-3"><p className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-warning" />{reviewText}</p><p className="mt-1 text-[11px] text-muted-foreground">{run.officer_note ? `Officer note: ${run.officer_note}` : "AI results are advisory. The procurement officer makes the final decision; low-confidence items go to human review, never auto-rejected."}</p>{run.officer_decided_at && <p className="mt-1 text-[10px] text-muted-foreground">{fmtDateTime(run.officer_decided_at)}</p>}</div></div>
      </div>

      {audience === "officer" && <div className="rounded-xl border border-primary/30 bg-card p-4"><p className="text-sm font-semibold">Verification Outcome</p><p className="text-xs text-muted-foreground">AI findings are advisory. Refer uncertain evidence to Human Review; approval or rejection is recorded only in Final Decisions after review requirements are resolved.</p>
        <div className="mt-2 flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={decide.isPending || run.officer_status === "needs_review"} onClick={() => decide.mutate()}><AlertTriangle className="mr-1 h-4 w-4" />{run.officer_status === "needs_review" ? "Referred to Human Review" : "Refer to Human Review"}</Button>{run.bid_id && <Button size="sm" variant="outline" asChild><Link to="/officer/decisions">Open Final Decisions</Link></Button>}</div></div>}

      <div className="flex gap-1 overflow-x-auto border-b border-border">{([["req", "Requirement-wise Analysis", ListChecks], ["doc", "Document-wise View", FileText], ["missing", `Missing / Mismatched Items (${counts.non + counts.attention})`, FileSearch], ["ai", "AI Insights", Lightbulb], ["history", "Review History", History]] as const).map(([k, l, I]) => <button key={k} onClick={() => setTab(k)} className={cn("flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium", tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}><I className="h-3.5 w-3.5" />{l}</button>)}</div>

      {resQ.isPending ? <LoadingState /> : resQ.error ? <ErrorState error={resQ.error} /> : <>
        {tab === "req" && <div className={cn("grid gap-3", selected && "xl:grid-cols-[1fr_340px]")}>
          <div className="rounded-xl border border-border bg-card">
            <div className="flex flex-wrap gap-2 border-b border-border p-3"><div className="relative min-w-48 flex-1"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input className="h-8 pl-8 text-xs" placeholder="Search requirements (e.g., warranty, GSTIN, experience…)" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All Categories</option>{[...new Set(results.map((r) => r.category))].map((c) => <option key={c}>{c}</option>)}</select>
              <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={st} onChange={(e) => setSt(e.target.value)}><option value="">All Statuses</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-muted/50 text-left text-muted-foreground"><tr>{["#", "Requirement / Clause", "Category", "Expected Criteria", "Status", "Evidence Found", "Actions"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>{filtered.map((r, i) => <tr key={r.id} className={cn("border-t border-border", sel === r.id && "bg-primary/5")}><td className="px-3 py-2">{i + 1}</td><td className="px-3 py-2 font-medium">{r.rule_name}<span className="block text-[10px] text-muted-foreground">{r.rule_code} · {r.severity}</span></td><td className="px-3 py-2">{r.category}</td><td className="max-w-56 px-3 py-2 text-muted-foreground">{r.expected}</td><td className="px-3 py-2"><StatusPill status={r.status} /></td>
                <td className="px-3 py-2">{r.evidence_page ? <button className="flex items-center gap-1 text-left text-primary hover:underline" onClick={() => openPage(r.evidence_page)}><FileText className="h-3.5 w-3.5" />{run.file_name.slice(0, 22)}<span className="text-muted-foreground">· Page {r.evidence_page}</span></button> : <span className="text-destructive">Not Found</span>}</td>
                <td className="px-3 py-2"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSel(r.id)}>View</Button></td></tr>)}
                {!filtered.length && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No requirements match these filters.</td></tr>}</tbody></table></div>
            <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">Showing {filtered.length} of {results.length} requirements</p>
          </div>
          {selected && <RequirementPanel r={selected} fileName={run.file_name} onClose={() => setSel(null)} onPage={openPage} onNav={(d) => { const i = filtered.findIndex((x) => x.id === selected.id); const n = filtered[i + d]; if (n) setSel(n.id); }} />}
        </div>}

        {tab === "doc" && <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
          <div className="rounded-xl border border-border bg-card p-3"><p className="mb-2 text-sm font-semibold">Submitted Document</p><div className="rounded-lg border border-primary/30 bg-primary/5 p-2 text-xs"><p className="font-semibold">{run.file_name}</p><p className="text-muted-foreground">{fmtBytes(run.size_bytes)} · {run.page_count ?? "—"} pages</p><span className="mt-1 inline-block rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">Analyzed</span></div>
            <dl className="mt-3 space-y-1 text-[11px]"><dt className="text-muted-foreground">SHA-256</dt><dd className="break-all font-mono">{run.sha256 ?? "—"}</dd><dt className="mt-2 text-muted-foreground">Evidence pages</dt><dd className="flex flex-wrap gap-1">{[...new Set(results.map((r) => r.evidence_page).filter(Boolean))].sort((a, b) => a! - b!).map((p) => <button key={p} onClick={() => setPage(p!)} className={cn("rounded border px-1.5", page === p ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{p}</button>)}</dd></dl></div>
          <div className="rounded-xl border border-border bg-card p-3"><div className="mb-2 flex items-center gap-2 text-xs"><span className="font-semibold">Document Viewer</span><span className="text-muted-foreground">Page</span><Input type="number" min={1} max={run.page_count ?? undefined} className="h-7 w-16 text-xs" value={page} onChange={(e) => setPage(Math.max(1, Number(e.target.value) || 1))} /><span className="text-muted-foreground">of {run.page_count ?? "—"}</span>
            {docUrl.data && <><Button size="sm" variant="ghost" className="ml-auto h-7" asChild><a href={docUrl.data} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button><Button size="sm" variant="ghost" className="h-7" asChild><a href={docUrl.data} download={run.file_name}><Download className="h-3.5 w-3.5" /></a></Button></>}</div>
            {docUrl.isPending ? <LoadingState label="Opening document…" /> : docUrl.error ? <ErrorState error={docUrl.error} /> : <iframe key={page} title={run.file_name} src={`${docUrl.data}#page=${page}`} className="h-[640px] w-full rounded-md border border-border bg-muted" />}</div>
        </div>}

        {tab === "missing" && <div className="space-y-3"><div className="grid grid-cols-2 gap-2 md:grid-cols-4">{[["Missing Evidence", results.filter((r) => r.status === "missing").length, "destructive"], ["Mismatched / Insufficient", counts.attention, "warning"], ["Critical Failures", results.filter((r) => !r.passed && r.severity === "critical").length, "destructive"], ["AI Cannot Determine", results.filter((r) => r.ai_verdict === "cannot_determine").length, "primary"]].map(([l, n, t]) => <div key={l as string} className={cn("rounded-xl border p-3", TONE[t as string]!.box)}><p className="text-2xl font-bold">{n as number}</p><p className="text-xs font-semibold">{l as string}</p></div>)}</div>
          <div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full text-xs"><thead className="bg-muted/50 text-left text-muted-foreground"><tr>{["#", "Requirement", "Issue Type", "Details", "Severity", "Status", "Actions"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead><tbody>
            {results.filter((r) => !r.passed).map((r, i) => <tr key={r.id} className="border-t border-border"><td className="px-3 py-2">{i + 1}</td><td className="px-3 py-2 font-medium">{r.rule_name}</td><td className="px-3 py-2">{r.status === "missing" ? "Missing" : "Mismatch"}</td><td className="max-w-72 px-3 py-2 text-muted-foreground">{r.suggestion}</td><td className="px-3 py-2 capitalize">{r.severity}</td><td className="px-3 py-2"><StatusPill status={r.status} /></td><td className="px-3 py-2"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setSel(r.id); setTab("req"); }}>View Requirement</Button></td></tr>)}
            {!results.some((r) => !r.passed) && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No missing or mismatched items.</td></tr>}</tbody></table></div></div>}

        {tab === "ai" && <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]"><div className="space-y-3"><div className="flex gap-4 rounded-xl border border-border bg-card p-4"><ScoreDonut score={run.score} verdict={run.verdict} size={100} /><div><p className="text-sm font-semibold">AI Compliance Summary</p><p className="mt-1 text-xs text-muted-foreground">{run.ai_summary || "No AI summary was produced for this run."}</p></div></div>
          <div className="rounded-xl border border-border bg-card p-4"><p className="mb-2 text-sm font-semibold">Detailed AI Insights</p><ul className="space-y-2">{results.filter((r) => r.ai_reason).map((r) => <li key={r.id} className="flex items-start gap-2 text-xs"><StatusPill status={r.status} /><div><p className="font-semibold">{r.rule_name}</p><p className="text-muted-foreground">{r.ai_reason}</p></div></li>)}{!results.some((r) => r.ai_reason) && <li className="text-xs text-muted-foreground">AI reasoning was only needed where rules could not decide; none recorded for this run.</li>}</ul></div></div>
          <div className="space-y-3"><div className="rounded-xl border border-border bg-card p-4"><p className="mb-2 text-sm font-semibold">Recommendations</p><ol className="space-y-2">{recs.map((t, i) => <li key={i} className="flex gap-2 text-xs"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>{t}</li>)}{!recs.length && <li className="text-xs text-muted-foreground">No recommendations.</li>}</ol></div>
            <div className="rounded-xl border border-border bg-primary/5 p-4"><p className="flex items-center justify-between text-sm font-semibold">AI Confidence <span className="text-lg">{run.ai_confidence != null ? `${Math.round(run.ai_confidence * 100)}%` : "—"}</span></p><p className="mt-1 text-[11px] text-muted-foreground">Advisory only. Items below confidence thresholds are flagged for human review.</p></div></div></div>}

        {tab === "history" && <div className="rounded-xl border border-border bg-card p-4"><p className="mb-3 text-sm font-semibold">Compliance Analysis Timeline</p>{histQ.isPending ? <LoadingState /> : !histQ.data?.length ? <p className="text-xs text-muted-foreground">No history recorded yet.</p> : <ol className="space-y-4 border-l border-border pl-5">{histQ.data.map((h) => <li key={h.id} className="relative"><span className="absolute -left-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary"><ShieldCheck className="h-2.5 w-2.5 text-primary-foreground" /></span><p className="text-xs font-semibold">{h.action}</p><p className="text-[11px] text-muted-foreground">{h.summary}</p><p className="text-[10px] text-muted-foreground">{fmtDateTime(h.created_at)} · {h.actor_role ?? "system"}</p></li>)}</ol>}</div>}
      </>}
    </>}
  </div>;
}

function RequirementPanel({ r, fileName, onClose, onPage, onNav }: { r: Result; fileName: string; onClose: () => void; onPage: (p: number | null) => void; onNav: (d: number) => void }) {
  const [t, setT] = useState<"details" | "evidence" | "ai" | "guide">("details");
  return <aside className="rounded-xl border border-border bg-card p-3">
    <div className="flex items-center gap-1"><p className="flex-1 text-sm font-semibold">Requirement Details</p><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onNav(-1)}><ChevronLeft className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onNav(1)}><ChevronRight className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button></div>
    <div className="mt-1 flex items-center justify-between gap-2"><p className="text-xs font-semibold">{r.rule_name}</p><StatusPill status={r.status} /></div>
    <div className="mt-3 grid grid-cols-4 rounded-md bg-muted p-0.5 text-[11px]">{([["details", "Details"], ["evidence", `Evidence (${r.evidence_page ? 1 : 0})`], ["ai", "AI Analysis"], ["guide", "Guidelines"]] as const).map(([k, l]) => <button key={k} onClick={() => setT(k)} className={cn("rounded px-1 py-1", t === k ? "bg-card font-semibold text-primary shadow-sm" : "text-muted-foreground")}>{l}</button>)}</div>
    <div className="mt-3 space-y-2 text-xs">
      {t === "details" && <dl className="grid grid-cols-[110px_1fr] gap-y-2"><dt className="text-muted-foreground">Clause</dt><dd>{r.rule_code}</dd><dt className="text-muted-foreground">Category</dt><dd>{r.category}</dd><dt className="text-muted-foreground">Severity</dt><dd className="capitalize">{r.severity}</dd><dt className="text-muted-foreground">Expected</dt><dd>{r.expected}</dd><dt className="text-muted-foreground">Your Submission</dt><dd className={cn("rounded p-1.5", r.passed ? "bg-success/10" : "bg-destructive/10 text-destructive")}>{r.found_value ?? "Not found in document"}{r.evidence_page ? ` (Page ${r.evidence_page})` : ""}</dd><dt className="text-muted-foreground">Reason</dt><dd>{r.suggestion || "Meets the requirement."}</dd></dl>}
      {t === "evidence" && (r.evidence_page ? <div className="rounded-lg border border-border p-2"><p className="font-semibold">{fileName} · Page {r.evidence_page}</p><p className="mt-1 rounded bg-warning/15 p-2 text-muted-foreground">“{r.evidence_text || r.found_value}”</p><Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => onPage(r.evidence_page)}>Open page {r.evidence_page}</Button></div> : <p className="text-muted-foreground">No supporting evidence was found in the document.</p>)}
      {t === "ai" && (r.ai_verdict ? <div className="space-y-2"><div className="rounded-lg border border-warning/30 bg-warning/10 p-2"><p className="flex items-center gap-1 font-semibold"><Bot className="h-3.5 w-3.5" />AI verdict: {r.ai_verdict.replace(/_/g, " ")}</p><p className="mt-1 text-muted-foreground">{r.ai_reason}</p></div><p>Confidence: <b>{r.ai_confidence != null ? `${Math.round(r.ai_confidence * 100)}%` : "—"}</b></p><p className="text-[11px] text-muted-foreground">Advisory only — the officer decides.</p></div> : <p className="text-muted-foreground">Settled by the deterministic rule engine; AI reasoning was not needed.</p>)}
      {t === "guide" && <div className="space-y-2"><div className="rounded-lg border border-border p-2"><p className="font-semibold">Clause {r.rule_code} — {r.rule_name}</p><p className="mt-1 text-muted-foreground">{r.expected}</p></div>{r.suggestion && <div className="rounded-lg bg-primary/5 p-2"><p className="font-semibold">Suggestion</p><p className="text-muted-foreground">{r.suggestion}</p></div>}</div>}
    </div>
  </aside>;
}
