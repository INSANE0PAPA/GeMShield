import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, CircleDashed, FileText, Info, Paperclip, Pencil, Send, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CompactEmpty } from "@/components/dashboard/DashboardCard";
import { ErrorState, LoadingState, NotFoundState } from "@/components/states/DataStates";
import { Crumbs, TenderHeader } from "@/components/tenders/TenderHeader";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { APPLY_STAGES, detailsOf, fmtDateTime, inr, sha256File, tenderState, timeLeft, type ApplyStage } from "@/lib/procurement";
import { apiFetch } from "@/lib/api";

const API_URL = import.meta.env["VITE_API_URL"] || "http://localhost:8000";

export const Route = createFileRoute("/_authenticated/vendor/tenders/$tenderId/apply/$stage")({
  head: () => ({ meta: [{ title: "Apply for Tender — GeMShield" }, { name: "description", content: "Four-stage bid application: basic information, documents, technical & financial bid, review & submit." }, { property: "og:title", content: "Apply for Tender — GeMShield" }, { property: "og:description", content: "Four-stage bid application." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Apply,
});

const NAMES: Record<ApplyStage, string> = { basic: "Basic Information", documents: "Documents Upload", bid: "Technical & Financial Bid", review: "Review & Submit" };
const BIDDER_TYPES = ["Individual", "Proprietorship", "Partnership", "Private Limited", "LLP", "Public Limited", "Others"];
const DESIGNATIONS = ["Director", "Managing Director", "Proprietor", "Partner", "Authorised Signatory", "Manager", "Other"];
const MANDATORY = [["registration", "Bidder Registration Certificate", "PDF (Max 5 MB)"], ["gst", "GST Registration Certificate", "PDF (Max 5 MB)"], ["pan", "PAN Card", "PDF (Max 2 MB)"], ["authorization", "Authorization Letter", "PDF (Max 5 MB)"]] as const;
const ADDITIONAL = [["past_performance", "Past Performance Certificates", "PDF (Max 10 MB)"], ["oem", "OEM Authorization Certificate", "PDF (Max 10 MB)"], ["other", "Any Other Supporting Document", "PDF / DOCX / XLSX / ZIP (Max 20 MB)"]] as const;
type App = Partial<Record<"bidder_type" | "company" | "cin" | "gstin" | "pan" | "rep_name" | "designation" | "email" | "phone" | "technical_proposal" | "unit_price" | "quantity" | "gst", string>>;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/; const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

async function getAuthToken(): Promise<string | null> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch { return null; }
}

function Apply() {
  const { tenderId, stage: raw } = Route.useParams(); const stage = (APPLY_STAGES as readonly string[]).includes(raw) ? (raw as ApplyStage) : null;
  const { session } = useSession(); const uid = session?.user.id; const navigate = useNavigate(); const qc = useQueryClient();
  const q = useQuery({ queryKey: ["apply", tenderId, uid], enabled: Boolean(uid), queryFn: async () => {
    const [tender, bid, vendor, profile] = await Promise.all([
      apiFetch<any>(`/api/tenders/${tenderId}`).catch(() => null),
      apiFetch<any>(`/api/bids/by-tender/${tenderId}`).catch(() => null),
      apiFetch<any>(`/api/vendors/me`).catch(() => null),
      apiFetch<any>(`/api/profiles/me`).catch(() => null),
    ]);
    return { tender, bid, vendor, profile };
  } });
  const [app, setApp] = useState<App>({}); const [declared, setDeclared] = useState(false); const [busy, setBusy] = useState(false); const [, tick] = useState(0);
  const loaded = useRef(false);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 60000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!q.data || loaded.current) return; loaded.current = true;
    const saved = (q.data.bid?.application ?? {}) as App; const v = q.data.vendor; const p = q.data.profile;
    setApp({ company: v?.legal_name ?? "", gstin: v?.gstin ?? "", pan: v?.pan ?? "", rep_name: p?.full_name ?? "", designation: p?.designation ?? "", email: v?.contact_email ?? p?.email ?? session?.user.email ?? "", phone: v?.mobile_number ?? v?.contact_phone ?? p?.phone ?? "", ...saved });
  }, [q.data, session?.user.email]);
  if (!stage) return <NotFoundState title="Unknown stage" />;
  if (q.isPending) return <LoadingState />; if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const { tender, bid } = q.data; if (!tender) return <NotFoundState title="Tender not found" />;
  if (bid && bid.status !== "draft") return <div className="mx-auto max-w-3xl space-y-3"><CompactEmpty icon={Check} title="This bid has been submitted" description="Submitted bids are locked and cannot be edited unless the officer requests clarification." /><div className="text-center"><Button asChild size="sm"><Link to="/vendor/my-bids/$bidId" params={{ bidId: bid.id }}>View bid</Link></Button></div></div>;
  if (tenderState(tender.closing_at, tender.status) !== "open") return <CompactEmpty icon={XCircle} title="This tender is closed" description="Applications are no longer accepted." />;

  const docs = (bid?.bid_documents ?? []) as { id: string; doc_type: string; name: string }[];
  const docOf = (k: string) => docs.find((d) => d.doc_type === k);
  const idx = APPLY_STAGES.indexOf(stage);
  const up = (k: keyof App, v: string) => setApp((a) => ({ ...a, [k]: v }));
  const unit = Number(app.unit_price || 0), qty = Number(app.quantity || 0), gstPct = Number(app.gst || 0);
  const base = unit * qty, gstAmt = Math.round(base * gstPct) / 100, total = base + gstAmt;
  const basicOk = Boolean(app.bidder_type && app.company && app.gstin && GSTIN_RE.test(app.gstin) && app.pan && PAN_RE.test(app.pan) && app.rep_name && app.designation && app.email && app.phone);
  const docsOk = MANDATORY.every(([k]) => docOf(k)); const techOk = Boolean(app.technical_proposal?.trim()); const finOk = unit > 0 && qty > 0 && app.gst !== undefined && app.gst !== "";
  const d = detailsOf(tender.details);

  const ensureBid = async (nextStage: ApplyStage) => {
    const payload = { application: app as never, quoted_amount: total > 0 ? total : null, notes: app.technical_proposal || null, stage: nextStage };
    const result = await apiFetch<any>(`/api/bids/for-tender/${tenderId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return result.id;
  };
  const go = async (target: ApplyStage | "draft" | "submit") => {
    if (target !== "draft" && APPLY_STAGES.indexOf(target as ApplyStage) > idx || target === "submit") {
      if (stage === "basic" && !basicOk) return toast.error("Please complete all mandatory fields with a valid GSTIN and PAN.");
      if (stage === "bid" && (!techOk || !finOk)) return toast.error("Provide the technical proposal, unit price, quantity and GST.");
    }
    if (target === "submit") { if (!basicOk || !docsOk || !techOk || !finOk) return toast.error("Complete every item in the Final Checklist before submitting."); if (!declared) return toast.error("Please accept the declaration."); }
    setBusy(true);
    try {
      const id = await ensureBid(target === "draft" || target === "submit" ? stage : target);
      if (target === "submit") {
        await apiFetch(`/api/bids/${id}/submit`, { method: "POST" });
        await qc.invalidateQueries({ queryKey: ["bids"] }); toast.success("Bid submitted successfully"); navigate({ to: "/vendor/my-bids/$bidId", params: { bidId: id } }); return;
      }
      await qc.invalidateQueries({ queryKey: ["apply"] });
      if (target === "draft") toast.success("Draft saved"); else navigate({ to: "/vendor/tenders/$tenderId/apply/$stage", params: { tenderId, stage: target } });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    return;
  };

  const upload = async (docType: string, file: File) => {
    if (file.size > 20 * 1024 * 1024) return toast.error("Maximum file size is 20 MB.");
    if (!/\.(pdf|docx|xlsx|zip)$/i.test(file.name)) return toast.error("Only PDF, DOCX, XLSX or ZIP files are allowed.");
    setBusy(true);
    try {
      const id = await ensureBid("documents");
      const token = await getAuthToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", docType);
      const response = await fetch(`${API_URL}/api/bids/${id}/documents`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail ?? "Upload failed");
      }
      await qc.invalidateQueries({ queryKey: ["apply"] }); toast.success(`${file.name} uploaded`);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    return;
  };

  const left = timeLeft(tender.closing_at);
  const deadline = <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-2"><CalendarDays className="h-7 w-7 text-primary" /><div className="text-[11px]"><span className="text-muted-foreground">Application Deadline</span><b className="block text-[14px]">{fmtDateTime(tender.closing_at)}</b>{left && <span className="font-semibold text-destructive">{left}</span>}</div></div>;
  const lbl = (t: string, req = true) => <span className="mb-1 block text-[12px] font-medium">{t}{req && <span className="text-destructive"> *</span>}</span>;
  const uploaded = [...MANDATORY, ...ADDITIONAL].filter(([k]) => docOf(k)).length; const totalDocs = MANDATORY.length + ADDITIONAL.length;

  return <div className="mx-auto max-w-[1320px] space-y-3">
    <Crumbs items={[{ label: "Find Tenders", to: "/vendor/find-tenders" }, { label: "Tender Details", to: "/vendor/tenders/$tenderId", params: { tenderId } }, { label: "Apply for Tender" }]} />
    <TenderHeader tender={tender} showMeta={false} aside={deadline} />
    <ol className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-card px-4 py-3 md:grid-cols-4">{APPLY_STAGES.map((s, i) => <li key={s}><Link to="/vendor/tenders/$tenderId/apply/$stage" params={{ tenderId, stage: s }} disabled={i > idx && !bid} className={cn("flex items-center gap-2 border-b-2 pb-2 text-[12px]", i === idx ? "border-primary font-semibold text-primary" : "border-transparent text-foreground/80")}>
      {i < idx ? <CheckCircle2 className="h-6 w-6 text-success" /> : <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-[11px]", i === idx ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{i + 1}</span>}{NAMES[s]}</Link></li>)}</ol>

    <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
      <section className="rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
        <header className="flex items-start gap-3 border-b border-border px-4 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-info/10 text-info"><FileText className="h-5 w-5" /></span><div><h2 className="font-display text-base font-bold">{idx + 1}. {NAMES[stage]}</h2><p className="text-[11px] text-muted-foreground">{({ basic: "Provide the required bid participation details. Fields marked with * are mandatory.", documents: "Upload the required documents as per tender specifications. Only PDF, DOCX, XLSX, ZIP files are allowed.", bid: "Provide your technical response and financial offer as per the tender requirements.", review: "Please review all the details before submitting your bid. You can go back and edit if needed." } as const)[stage]}</p></div></header>
        <div className="p-4 text-[12px]">
          {stage === "basic" && <div className="space-y-4"><h3 className="text-[13px] font-semibold">Bidder Details</h3>
            <div className="grid gap-4 md:grid-cols-[200px_1fr]"><fieldset>{lbl("Bidder Type")}<div className="space-y-2">{BIDDER_TYPES.map((b) => <label key={b} className="flex items-center gap-2"><input type="radio" name="bt" checked={app.bidder_type === b} onChange={() => up("bidder_type", b)} className="accent-[var(--primary)]" />{b}</label>)}</div></fieldset>
              <div className="space-y-3"><label className="block">{lbl("Company / Organisation Name")}<Input value={app.company ?? ""} onChange={(e) => up("company", e.target.value)} maxLength={200} /></label><label className="block">{lbl("CIN / Registration Number", false)}<Input value={app.cin ?? ""} onChange={(e) => up("cin", e.target.value.toUpperCase())} maxLength={30} /></label>
                <label className="block">{lbl("GSTIN")}<Input value={app.gstin ?? ""} onChange={(e) => up("gstin", e.target.value.toUpperCase())} maxLength={15} aria-invalid={Boolean(app.gstin && !GSTIN_RE.test(app.gstin))} />{app.gstin && !GSTIN_RE.test(app.gstin) && <small className="text-destructive">Enter a valid 15-character GSTIN</small>}</label>
                <label className="block">{lbl("PAN")}<Input value={app.pan ?? ""} onChange={(e) => up("pan", e.target.value.toUpperCase())} maxLength={10} />{app.pan && !PAN_RE.test(app.pan) && <small className="text-destructive">Enter a valid 10-character PAN</small>}</label></div></div>
            <h3 className="text-[13px] font-semibold">Authorized Representative</h3>
            <div className="grid gap-3 md:grid-cols-2"><label>{lbl("Name")}<Input value={app.rep_name ?? ""} onChange={(e) => up("rep_name", e.target.value)} maxLength={120} /></label><label>{lbl("Designation")}<select value={app.designation ?? ""} onChange={(e) => up("designation", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3"><option value="">Select</option>{[...new Set([...(app.designation ? [app.designation] : []), ...DESIGNATIONS])].map((x) => <option key={x}>{x}</option>)}</select></label>
              <label>{lbl("Email Address")}<Input type="email" value={app.email ?? ""} onChange={(e) => up("email", e.target.value)} maxLength={200} /></label><label>{lbl("Contact Number")}<span className="flex gap-2"><span className="flex h-9 items-center rounded-md border border-input px-3">+91</span><Input value={app.phone ?? ""} onChange={(e) => up("phone", e.target.value.replace(/[^0-9 ]/g, ""))} maxLength={12} /></span></label></div></div>}

          {stage === "documents" && <div className="space-y-4">{([["Mandatory Documents", MANDATORY], ["Additional Documents (as per tender)", ADDITIONAL]] as const).map(([title, list]) => <div key={title}><h3 className="mb-2 text-[13px] font-semibold">{title}</h3><ul className="divide-y divide-border rounded-md border border-border">{list.map(([k, name, hint]) => { const doc = docOf(k); return <li key={k} className="flex flex-wrap items-center gap-3 px-3 py-2.5"><FileText className="h-5 w-5 text-destructive" /><span className="flex-1"><b className="block font-medium">{name}</b><small className="text-muted-foreground">{hint}</small></span>
            <label className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5 font-medium text-primary", busy && "pointer-events-none opacity-60")}><Paperclip className="h-3.5 w-3.5" />{doc ? "Replace" : "Upload File"}<input type="file" hidden accept=".pdf,.docx,.xlsx,.zip" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(k, f); e.target.value = ""; }} /></label>
            <span className="w-44 text-[11px]">{doc ? <><span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-4 w-4" />Uploaded</span><small className="block truncate text-muted-foreground">{doc.name}</small></> : <span className="flex items-center gap-1 text-destructive"><XCircle className="h-4 w-4" />Not Uploaded</span>}</span></li>; })}</ul></div>)}</div>}

          {stage === "bid" && <div className="grid gap-4 xl:grid-cols-2"><div><h3 className="mb-2 text-[13px] font-semibold">A. Technical Bid</h3><p className="mb-1 font-medium">Product Compliance Details <span className="text-muted-foreground">(For Reference)</span></p>
            {d.technical_requirements?.length ? <table className="w-full text-left text-[11px]"><thead className="bg-muted/40"><tr><th className="px-2 py-1.5">#</th><th className="px-2 py-1.5">Requirement</th><th className="px-2 py-1.5">Tender Specification</th></tr></thead><tbody>{d.technical_requirements.map((r, i) => <tr key={i} className="border-t border-border"><td className="px-2 py-1.5">{i + 1}</td><td className="px-2 py-1.5">{r.parameter}</td><td className="px-2 py-1.5">{r.spec}</td></tr>)}</tbody></table> : <p className="text-muted-foreground">No technical requirements were published for this tender.</p>}
            <label className="mt-3 block">{lbl("Technical Proposal")}<Textarea rows={6} value={app.technical_proposal ?? ""} onChange={(e) => up("technical_proposal", e.target.value)} maxLength={3000} placeholder="Provide detailed technical compliance and product description as per tender requirements..." /><small className="float-right text-muted-foreground">{(app.technical_proposal ?? "").length}/3000</small></label></div>
            <div><h3 className="text-[13px] font-semibold">B. Financial Bid</h3><p className="mb-2 text-muted-foreground">Provide your price bid as per the prescribed format.</p>
              <div className="grid grid-cols-3 gap-2"><label>{lbl("Unit Price (₹)")}<Input type="number" min={0} value={app.unit_price ?? ""} onChange={(e) => up("unit_price", e.target.value)} /></label><label>{lbl("Quantity")}<Input type="number" min={1} value={app.quantity ?? ""} onChange={(e) => up("quantity", e.target.value)} /></label><label>{lbl("GST (%)")}<select value={app.gst ?? ""} onChange={(e) => up("gst", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2"><option value="">Select</option>{["0", "5", "12", "18", "28"].map((g) => <option key={g}>{g}</option>)}</select></label></div>
              <div className="mt-3 rounded-md border border-border p-3"><p className="mb-2 font-medium">Price Summary <span className="text-muted-foreground">(Auto-calculated)</span></p><Row l="Base Amount" v={inr(base)} /><Row l={`GST Amount (${gstPct}%)`} v={inr(gstAmt)} /><div className="mt-1 flex justify-between rounded bg-info/10 px-2 py-1.5 font-semibold text-primary"><span>Total Bid Value</span><span>{inr(total)}</span></div></div>
              <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3"><p className="font-semibold">Submission Readiness</p><ul className="mt-1 space-y-1"><Check2 ok={techOk} t="Technical details provided" /><Check2 ok={finOk} t="Financial bid filled" /><Check2 ok={docsOk} t={docsOk ? "All mandatory documents uploaded" : "Some mandatory documents pending"} /><li className="flex items-center gap-2 text-muted-foreground"><Info className="h-3.5 w-3.5" />Will be verified in Compliance Check after submission.</li></ul></div></div></div>}

          {stage === "review" && <div className="grid gap-3 md:grid-cols-2">
            <Card title="1. Bidder Information" edit="basic" tenderId={tenderId}><Row l="Company Name" v={app.company} /><Row l="Bidder Type" v={app.bidder_type} /><Row l="CIN" v={app.cin} /><Row l="GSTIN" v={app.gstin} /><Row l="PAN" v={app.pan} /><Row l="Authorized Rep." v={app.rep_name ? `${app.rep_name}${app.designation ? ` (${app.designation})` : ""}` : ""} /><Row l="Email" v={app.email} /><Row l="Contact" v={app.phone ? `+91 ${app.phone}` : ""} /></Card>
            <Card title={`2. Uploaded Documents (${uploaded}/${totalDocs})`} edit="documents" tenderId={tenderId}><ul className="space-y-1">{[...MANDATORY, ...ADDITIONAL].map(([k, n]) => <Check2 key={k} ok={Boolean(docOf(k))} t={docOf(k)?.name ?? n} bad />)}</ul></Card>
            <Card title="3. Technical Bid" edit="bid" tenderId={tenderId}><p className="font-medium">Technical Proposal</p><p className="line-clamp-4 whitespace-pre-line text-muted-foreground">{app.technical_proposal || "—"}</p></Card>
            <Card title="4. Financial Bid" edit="bid" tenderId={tenderId}><Row l="Unit Price" v={inr(unit || null)} /><Row l="Quantity" v={app.quantity} /><Row l={`GST (${gstPct}%)`} v={inr(gstAmt)} /><div className="flex justify-between font-semibold"><span>Total Bid Value</span><span className="text-primary">{inr(total)}</span></div></Card>
            <label className="flex items-start gap-2 rounded-md border border-border p-3 md:col-span-2"><input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} className="mt-0.5" /><span><b>Declaration <span className="text-destructive">*</span></b><br />I hereby declare that all the information provided in this bid is true, correct and complete. I agree to the terms and conditions of the tender and confirm compliance with all requirements.</span></label></div>}
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-border p-3">
          {idx === 0 ? <Button variant="outline" asChild><Link to="/vendor/tenders/$tenderId" params={{ tenderId }}>Cancel</Link></Button> : <Button variant="outline" disabled={busy} onClick={() => go(APPLY_STAGES[idx - 1]!)}><ArrowLeft className="mr-1.5 h-4 w-4" />Previous</Button>}
          <Button variant="outline" className="border-primary text-primary" disabled={busy} onClick={() => go("draft")}>Save as Draft</Button>
          {stage === "review" ? <Button disabled={busy} onClick={() => go("submit")}>Submit Bid<Send className="ml-1.5 h-4 w-4" /></Button> : <Button disabled={busy} onClick={() => go(APPLY_STAGES[idx + 1]!)}>Next<ArrowRight className="ml-1.5 h-4 w-4" /></Button>}
        </footer>
      </section>

      <aside className="space-y-3">
        {stage === "review" ? <><Side title="Final Checklist"><ul className="space-y-1.5"><Check2 ok={basicOk} t="Bidder information verified" /><Check2 ok={docsOk} t="Required documents uploaded" /><Check2 ok={techOk} t="Technical bid completed" /><Check2 ok={finOk} t="Financial bid completed" /><Check2 ok={basicOk && docsOk && techOk && finOk} t="Ready for submission" /></ul></Side>
          <Side title="Important Note" tone>After submission, your bid will be processed in the Compliance Check module where AI will verify all documents against tender requirements. You will be notified of the results.</Side></> :
          stage === "documents" ? <><Side title="File Upload Guidelines"><ul className="list-disc space-y-1 pl-4"><li>Only PDF, DOCX, XLSX, ZIP files are allowed.</li><li>Maximum file size as mentioned (up to 20 MB).</li><li>Ensure documents are clear and valid.</li><li>Password protected files are not allowed.</li><li>Combine multiple pages into a single file where possible.</li></ul></Side>
            <Side title="Upload Progress"><div className="flex items-center gap-4"><Ring value={uploaded} total={totalDocs} /><ul className="space-y-1 text-[11px]"><li className="flex justify-between gap-6"><span className="text-success">● Uploaded</span>{uploaded}</li><li className="flex justify-between gap-6"><span className="text-warning">● Pending</span>{totalDocs - uploaded}</li><li className="flex justify-between gap-6"><span className="text-destructive">● Failed</span>0</li></ul></div></Side></> :
          <Side title="Guidelines"><ul className="list-disc space-y-1 pl-4"><li>Please ensure all details match your official documents.</li><li>Only authorized representatives can submit the bid.</li><li>Fields marked with * are mandatory.</li><li>You can save and continue later.</li></ul></Side>}
      </aside>
    </div>
  </div>;
}

function Row({ l, v }: { l: string; v: string | null | undefined }) { return <div className="grid grid-cols-[120px_1fr] gap-2 py-0.5"><span className="text-muted-foreground">{l}</span><span>{v || "—"}</span></div>; }
function Check2({ ok, t, bad }: { ok: boolean; t: string; bad?: boolean }) { return <li className="flex items-center gap-2">{ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : bad ? <XCircle className="h-4 w-4 shrink-0 text-destructive" /> : <CircleDashed className="h-4 w-4 shrink-0 text-warning" />}<span className="truncate">{t}</span></li>; }
function Card({ title, edit, tenderId, children }: { title: string; edit: ApplyStage; tenderId: string; children: React.ReactNode }) { return <div className="rounded-md border border-border p-3"><div className="mb-2 flex justify-between"><h3 className="text-[13px] font-semibold">{title}</h3><Link to="/vendor/tenders/$tenderId/apply/$stage" params={{ tenderId, stage: edit }} className="flex items-center gap-1 text-primary"><Pencil className="h-3.5 w-3.5" />Edit</Link></div>{children}</div>; }
function Side({ title, children, tone }: { title: string; children: React.ReactNode; tone?: boolean }) { return <section className={cn("rounded-lg border border-border p-4 text-[12px] shadow-[var(--shadow-card)]", tone ? "bg-info/5" : "bg-card")}><h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold">{tone ? <Info className="h-4 w-4 text-info" /> : <Upload className="h-4 w-4 text-info" />}{title}</h3><div className="text-foreground/80">{children}</div></section>; }
function Ring({ value, total }: { value: number; total: number }) { const r = 34, c = 2 * Math.PI * r, p = total ? value / total : 0; return <svg viewBox="0 0 80 80" className="h-20 w-20"><circle cx="40" cy="40" r={r} fill="none" stroke="var(--warning)" strokeWidth="7" /><circle cx="40" cy="40" r={r} fill="none" stroke="var(--success)" strokeWidth="7" strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 40 40)" /><text x="40" y="40" textAnchor="middle" className="fill-foreground text-[14px] font-bold">{value}/{total}</text><text x="40" y="53" textAnchor="middle" className="fill-muted-foreground text-[8px]">Documents</text></svg>; }
