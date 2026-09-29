import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Bookmark, BookmarkCheck, CalendarDays, CheckCircle2, ClipboardList, Download, Eye, FileArchive, FileText, Home, IndianRupee, Info, Landmark, ListChecks, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CompactEmpty } from "@/components/dashboard/DashboardCard";
import { ErrorState, LoadingState, NotFoundState } from "@/components/states/DataStates";
import { Crumbs, TenderHeader } from "@/components/tenders/TenderHeader";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { detailsOf, fmtBytes, fmtDateTime, inr, openStoredFile, tenderState } from "@/lib/procurement";
import { apiFetch } from "@/lib/api";

const TABS = [["overview", "Overview", Home], ["documents", "Documents", FileText], ["technical", "Technical Requirements", ListChecks], ["financial", "Financial Details", IndianRupee], ["dates", "Important Dates", CalendarDays], ["atc", "Requirements & ATC", ClipboardList]] as const;
type Tab = (typeof TABS)[number][0];

export const Route = createFileRoute("/_authenticated/vendor/tenders/$tenderId/")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => (TABS.some(([k]) => k === s['tab']) ? { tab: s['tab'] as Tab } : {}),
  head: () => ({ meta: [{ title: "Tender Details — GeMShield" }, { name: "description", content: "Full details of a published government tender." }, { property: "og:title", content: "Tender Details — GeMShield" }, { property: "og:description", content: "Full details of a published government tender." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: TenderDetail,
});

function TenderDetail() {
  const { tenderId } = Route.useParams(); const { tab = "overview" } = Route.useSearch(); const navigate = useNavigate(); const qc = useQueryClient();
  const { session } = useSession(); const uid = session?.user.id;
  const q = useQuery({ queryKey: ["tender", tenderId], queryFn: async () => {
    const [tender, docs] = await Promise.all([
      apiFetch<any>(`/api/tenders/${tenderId}`),
      apiFetch<any[]>(`/api/tenders/${tenderId}/documents`)
    ]);
    return { tender, docs: docs ?? [] };
  } });
  const saved = useQuery({ queryKey: ["saved", uid, tenderId], enabled: Boolean(uid), queryFn: async () => { const data = await apiFetch<any[]>("/api/tenders/saved"); return data.some(d => d.tender_id === tenderId); } });
  const toggle = useMutation({ mutationFn: async () => { if (saved.data) { await apiFetch(`/api/tenders/saved/${tenderId}`, { method: "DELETE" }); } else { await apiFetch(`/api/tenders/saved/${tenderId}`, { method: "POST" }); } }, onSuccess: () => qc.invalidateQueries({ queryKey: ["saved"] }), onError: (e: Error) => toast.error(e.message) });
  if (q.isPending) return <LoadingState />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const { tender: td, docs } = q.data; if (!td) return <NotFoundState title="Tender not found" />;
  const d = detailsOf(td.details); const open = tenderState(td.closing_at, td.status) === "open";
  const open_ = (path: string, dl = false) => openStoredFile("tender-documents", path, dl).catch((e) => toast.error(e.message));

  return <div className="mx-auto max-w-[1320px] space-y-3">
    <Crumbs items={[{ label: "Find Tenders", to: "/vendor/find-tenders" }, { label: "Tender Details" }]} />
    <TenderHeader tender={td} actions={<><Button variant="outline" onClick={() => toggle.mutate()} disabled={toggle.isPending}>{saved.data ? <BookmarkCheck className="mr-1.5 h-4 w-4 text-primary" /> : <Bookmark className="mr-1.5 h-4 w-4" />}{saved.data ? "Saved" : "Save"}</Button>
      {open ? <Button asChild><Link to="/vendor/tenders/$tenderId/apply/$stage" params={{ tenderId, stage: "basic" }}>Apply for Tender</Link></Button> : <Button disabled>Closed</Button>}</>} />
    <div role="tablist" className="flex overflow-x-auto rounded-lg border border-border bg-card">{TABS.map(([k, label, Icon]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => navigate({ to: "/vendor/tenders/$tenderId", params: { tenderId }, search: { tab: k }, replace: true })} className={cn("flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-[12px]", tab === k ? "border-primary font-semibold text-primary" : "border-transparent text-foreground/80")}><Icon className="h-4 w-4" />{label}</button>)}</div>

    <section className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      {tab === "overview" && <><H title="Tender Overview" sub="Scope and key information for this tender." />
        <p className="whitespace-pre-line text-[13px] leading-relaxed text-foreground/90">{td.description ?? "No description provided."}</p>
        <KV rows={[["Organisation", d.organisation ?? td.department], ["Category", td.category], ["Product / Service Category", d.product_category], ["Tender Type", d.tender_type], ["Procurement Mode", d.procurement_mode], ["Evaluation Method", d.evaluation_method], ["Delivery Location", d.delivery_location ?? td.location], ["Delivery Period", d.delivery_period], ["Installation Required", d.installation]]} /></>}

      {tab === "documents" && <><H title={`Tender Documents (${docs.length})`} sub="Download all documents to understand the requirements and conditions." action={docs.length > 0 && <Button variant="outline" className="border-primary text-primary" onClick={() => docs.forEach((x) => open_(x.file_path, true))}><Download className="mr-1.5 h-4 w-4" />Download All</Button>} />
        {!docs.length ? <CompactEmpty icon={FileText} title="No documents attached" description="The procurement officer has not attached documents to this tender." /> :
          <table className="w-full text-left text-[12px]"><thead className="bg-muted/40 text-muted-foreground"><tr>{["#", "Document Name", "Type", "Size", "Action"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead><tbody>{docs.map((x, i) => <tr key={x.id} className="border-t border-border"><td className="px-3 py-2">{i + 1}</td><td className="px-3 py-2"><span className="flex items-center gap-2"><FileText className="h-4 w-4 text-destructive" />{x.name}</span></td><td className="px-3 py-2 uppercase">{x.name.split(".").pop()}</td><td className="px-3 py-2">{fmtBytes(x.size_bytes)}</td>
            <td className="px-3 py-2"><button onClick={() => open_(x.file_path)} className="mr-6 inline-flex items-center gap-1 text-primary"><Eye className="h-4 w-4" />View</button><button onClick={() => open_(x.file_path, true)} className="inline-flex items-center gap-1 text-primary"><Download className="h-4 w-4" />Download</button></td></tr>)}</tbody></table>}
        <div className="mt-4 grid gap-3 md:grid-cols-2"><Note icon={Info} title="Document Information">Please read all documents carefully before submitting your bid. Ensure compliance with all requirements.</Note>
          <Note icon={FileArchive} title="Supported File Formats"><span className="mt-1 flex gap-2">{["PDF", "XLSX", "DOCX", "ZIP"].map((f) => <span key={f} className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold">{f}</span>)}</span><span className="mt-1 block">Maximum file size: 20 MB per file</span></Note></div></>}

      {tab === "technical" && <><H title="Technical Requirements" sub="Detailed technical specifications and requirements for the goods/services." />
        {!d.technical_requirements?.length ? <CompactEmpty icon={ListChecks} title="No technical requirements published" /> :
          <table className="w-full text-left text-[12px]"><thead className="bg-muted/40 text-muted-foreground"><tr>{["#", "Parameter", "Specification Requirement"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead><tbody>{d.technical_requirements.map((r, i) => <tr key={i} className="border-t border-border"><td className="px-3 py-2">{i + 1}</td><td className="px-3 py-2">{r.parameter}</td><td className="px-3 py-2">{r.spec}</td></tr>)}</tbody></table>}
        <div className="mt-4 grid gap-3 md:grid-cols-2"><Note icon={CheckCircle2} title="Compliance Requirements" tone="green">Products must meet the specified technical standards. Compliance certificates are to be submitted with the bid.</Note><Note icon={AlertCircle} title="Important Notes" tone="orange">Any deviation requires prior approval. Detailed technical literature must be provided.</Note></div></>}

      {tab === "financial" && <><H title="Financial Details" sub="Price bid format, EMD, and other financial information." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{([[IndianRupee, "Estimated Value", inr(td.estimated_value)], [Landmark, "EMD Amount", inr(td.emd_amount)], [ShieldCheck, "Performance Security", d.performance_security ? inr(Number(d.performance_security)) : "—"], [CalendarDays, "Bid Validity", d.bid_validity_days ? `${d.bid_validity_days} Days` : "—"]] as const).map(([Icon, l, v]) => <div key={l} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-info/10 text-info"><Icon className="h-5 w-5" /></span><span><small className="block text-[11px] text-muted-foreground">{l}</small><b className="text-[14px]">{v}</b></span></div>)}</div>
        <h3 className="mt-5 text-sm font-semibold">Financial Terms</h3>
        <KV rows={[["Estimated Value", inr(td.estimated_value)], ["EMD Amount", inr(td.emd_amount)], ["Performance Security", d.performance_security ? inr(Number(d.performance_security)) : null], ["Payment Terms", d.payment_terms], ["Price Bid Opening", d.bid_opening ? fmtDateTime(d.bid_opening) : "To be announced after technical evaluation"]]} />
        <p className="mt-3 flex items-center gap-2 rounded-md bg-warning/10 px-3 py-2 text-[12px] text-foreground"><AlertCircle className="h-4 w-4 text-warning" />All prices must be quoted in INR and inclusive of all applicable taxes, duties and charges unless otherwise specified.</p></>}

      {tab === "dates" && <><H title="Important Dates" sub="Key dates and timeline for this tender." />
        <ol className="relative ml-3 space-y-4 border-l-2 border-primary/60 pl-6">{([["Published Date", td.published_at, "Tender published on GeMShield"], ["Bid Start Date", d.bid_start ?? td.published_at, "Bidding starts from this date"], ["Pre-Bid Meeting", d.prebid_meeting, "Pre-bid meeting for bidder queries"], ["Bid Submission Deadline", td.closing_at, "Last date for submission of bids"], ["Technical Bid Opening", d.bid_opening, "Opening of technical bids"], ["Financial Bid Opening", null, "Will be announced after technical evaluation"], ["Contract Award", null, "Result will be published on GeMShield"]] as const).map(([l, dt, s]) => <li key={l} className="relative flex items-start gap-4"><span className="absolute -left-[33px] top-1 h-3.5 w-3.5 rounded-full border-2 border-card bg-primary" /><span className="w-40 shrink-0 rounded-md bg-muted px-3 py-1 text-center text-[12px]">{dt ? fmtDateTime(dt) : "To be announced"}</span><span><b className="block text-[13px]">{l}</b><small className="text-[12px] text-muted-foreground">{s}</small></span></li>)}</ol></>}

      {tab === "atc" && <><H title="Requirements & ATC" sub="Eligibility criteria and Additional Terms & Conditions." />
        <h3 className="text-sm font-semibold">Eligibility Criteria</h3><p className="mt-1 whitespace-pre-line text-[13px] text-foreground/90">{td.eligibility ?? "Not specified by the procurement officer."}</p>
        <h3 className="mt-4 text-sm font-semibold">Additional Terms & Conditions (ATC)</h3><p className="mt-1 whitespace-pre-line text-[13px] text-foreground/90">{d.atc ?? "Not specified by the procurement officer."}</p></>}
    </section>
  </div>;
}

function H({ title, sub, action }: { title: string; sub: string; action?: React.ReactNode }) { return <div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="font-display text-lg font-bold">{title}</h2><p className="text-[12px] text-muted-foreground">{sub}</p></div>{action}</div>; }
function KV({ rows }: { rows: [string, string | null | undefined][] }) { return <dl className="mt-3 overflow-hidden rounded-md border border-border text-[12px]">{rows.map(([k, v], i) => <div key={k} className="grid grid-cols-[40px_220px_1fr] border-t border-border first:border-0"><span className="px-3 py-2 text-muted-foreground">{i + 1}</span><dt className="px-3 py-2">{k}</dt><dd className="px-3 py-2">{v || "—"}</dd></div>)}</dl>; }
function Note({ icon: Icon, title, children, tone = "blue" }: { icon: typeof Info; title: string; children: React.ReactNode; tone?: "blue" | "green" | "orange" }) { const t = { blue: "bg-info text-info-foreground", green: "bg-success text-success-foreground", orange: "bg-warning text-warning-foreground" }[tone]; return <div className="flex gap-3 rounded-lg border border-border p-4"><span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", t)}><Icon className="h-4 w-4" /></span><div className="text-[12px] text-muted-foreground"><b className="block text-[13px] text-foreground">{title}</b>{children}</div></div>; }
