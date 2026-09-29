import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Circle, ClipboardCheck, Database, FileText, IndianRupee, Lightbulb, MapPin, Pencil, Plus, Rocket, Save, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CompactEmpty } from "@/components/dashboard/DashboardCard";
import { ErrorState, LoadingState, NotFoundState } from "@/components/states/DataStates";
import { DataGovPanel, type DataGovSource, type Rec } from "@/components/tenders/DataGovPanel";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { detailsOf, fmtBytes, fmtDate, fmtDateTime, inr, sha256File, type TenderDetails } from "@/lib/procurement";
import { apiFetch } from "@/lib/api";

const STAGES = ["basic", "requirements", "documents", "review"] as const; type Stage = (typeof STAGES)[number];
const META: Record<Stage, [string, string]> = { basic: ["Basic Information", "Tell us about the tender"], requirements: ["Requirements & ATC", "Add technical & commercial details"], documents: ["Documents & Rules", "Upload documents and set compliance"], review: ["Review & Publish", "Verify and publish tender"] };

export const Route = createFileRoute("/_authenticated/officer/tenders/create/$stage")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => (typeof s["id"] === "string" ? { id: s["id"] } : {}),
  head: () => ({ meta: [{ title: "Create New Tender — GeMShield" }, { name: "description", content: "Publish a new tender with complete details, requirements and compliance criteria." }, { property: "og:title", content: "Create New Tender — GeMShield" }, { property: "og:description", content: "Four-stage tender creation for procurement officers." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: CreateTender,
});

type Req = { parameter: string; spec: string; type: string; mandatory: boolean; method: string };
type Rule = { name: string; document: string; type: string; condition: string; severity: "Critical" | "High" | "Medium" | "Low"; document_id?: string };
type Form = { reference_no: string; title: string; department: string; category: string; description: string; closing_at: string; estimated_value: string; emd_amount: string; eligibility: string; location: string } & TenderDetails & { publish_date?: string; tender_category?: string; commercial?: Req[]; atcs?: string[]; rules?: Rule[]; requirements?: Req[] };
const ATC_OPTIONS = ["OEM Authorization Certificate", "Bidder Turnover Criteria", "After Sales Service Support", "Performance Security", "Installation & Commissioning", "Additional Warranty Terms"];
const toLocal = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const pick = (r: Rec, re: RegExp) => { for (const [k, v] of Object.entries(r)) if (re.test(k) && v != null && String(v).trim() && String(v).trim() !== "NA") return String(v).trim(); return ""; };

function CreateTender() {
  const { stage: raw } = Route.useParams(); const { id } = Route.useSearch(); const stage = (STAGES as readonly string[]).includes(raw) ? (raw as Stage) : null;
  const navigate = useNavigate(); const qc = useQueryClient(); const { session } = useSession();
  const q = useQuery({ queryKey: ["tender-draft", id], enabled: Boolean(id), queryFn: async () => {
    const [data, docs] = await Promise.all([
      apiFetch<any>(`/api/tenders/${id}`).catch(() => null),
      apiFetch<any[]>(`/api/tenders/${id}/documents`).catch(() => [])
    ]);
    return { tender: data, docs: docs ?? [] };
  } });
  const depts = useQuery({ queryKey: ["dept-options"], queryFn: async () => { const { data: a } = await supabase.from("departments").select("name"); const tenders = await apiFetch<any[]>("/api/tenders/facets"); const b = tenders.map((t: any) => t.department); return [...new Set([...(a ?? []).map((x) => x.name), ...b].filter(Boolean) as string[])].sort(); } });
  const [f, setF] = useState<Form>(() => ({ reference_no: `GEM/${new Date().getFullYear()}/${Math.floor(100000 + Math.random() * 900000)}`, title: "", department: "", category: "", description: "", closing_at: "", estimated_value: "", emd_amount: "", eligibility: "", location: "", requirements: [], commercial: [], atcs: [], rules: [] }));
  const [source, setSource] = useState<DataGovSource | null>(null); const [dgOpen, setDgOpen] = useState(false); const [busy, setBusy] = useState(false); const [confirm, setConfirm] = useState(false);
  const loaded = useRef<string | null>(null);
  useEffect(() => {
    const t = q.data?.tender; if (!t || loaded.current === t.id) return; loaded.current = t.id; const d = detailsOf(t.details) as Form;
    setF((p) => ({ ...p, ...d, reference_no: t.reference_no, title: t.title, department: t.department ?? "", category: t.category ?? "", description: t.description ?? "", closing_at: toLocal(t.closing_at), estimated_value: t.estimated_value?.toString() ?? "", emd_amount: t.emd_amount?.toString() ?? "", eligibility: t.eligibility ?? "", location: t.location ?? "", requirements: d.requirements ?? (d.technical_requirements ?? []).map((r) => ({ ...r, type: "Technical", mandatory: true, method: "Document Proof" })) }));
  }, [q.data]);
  const up = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  if (!stage) return <NotFoundState title="Unknown stage" />;
  if (id && q.isPending) return <LoadingState />; if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (id && q.data && !q.data.tender) return <NotFoundState title="Tender draft not found" />;
  if (q.data?.tender && q.data.tender.status !== "draft") return <CompactEmpty icon={ShieldCheck} title="This tender is already published" description="Published tenders are changed through amendments so their history is preserved." />;
  const idx = STAGES.indexOf(stage); const docs = q.data?.docs ?? [];

  const useRecord = (s: DataGovSource) => {
    const r = s.record; const cap = pick(r, /capacity/i); const proj = pick(r, /(project|name_of_work|title|work|item|description)/i);
    setSource(s); setDgOpen(false);
    setF((p) => ({ ...p, title: p.title || (proj ? `${cap ? `${cap} MW ` : ""}${proj}` : p.title), department: p.department || pick(r, /(organi[sz]ation|department|ministry|buyer)/i) || (s.org ?? ""), location: p.location || pick(r, /(location|state|district|city)/i) || proj.split(",").at(-1)?.trim() || "", delivery_location: p.delivery_location || proj,
      description: p.description || `Based on official data.gov.in record (${s.title ?? s.resourceId}):\n${Object.entries(r).map(([k, v]) => `${k}: ${v}`).join("\n")}`, ...(pick(r, /(nit|date)/i) ? { original_nit_date: pick(r, /(nit|date)/i) } : {}) }));
    toast.success("Official record loaded — review every field before publishing.");
  };

  const basicMissing = ([["title", f.title], ["department", f.department], ["organisation", f.organisation], ["tender category", f.tender_category], ["product category", f.product_category], ["description", f.description], ["bid start date", f.bid_start], ["bid end date", f.closing_at], ["bid opening date", f.bid_opening], ["estimated value", f.estimated_value], ["tender type", f.tender_type], ["procurement mode", f.procurement_mode], ["evaluation method", f.evaluation_method], ["delivery location", f.delivery_location], ["delivery period", f.delivery_period]] as const).filter(([, v]) => !v).map(([k]) => k);
  const checklist: [string, boolean][] = [["Tender Title", Boolean(f.title)], ["Department & Category", Boolean(f.department && f.tender_category && f.product_category)], ["Key Dates", Boolean(f.bid_start && f.closing_at && f.bid_opening)], ["Procurement Details", Boolean(f.estimated_value && f.tender_type && f.procurement_mode && f.evaluation_method)], ["Delivery Location", Boolean(f.delivery_location && f.delivery_period)], ["Technical Requirements (Next Step)", Boolean(f.requirements?.length)], ["ATC / Terms & Conditions (Next Step)", Boolean(f.atcs?.length || f.atc)], ["Supporting Documents (Next Step)", docs.length > 0]];

  const save = async (next: Stage | "draft" | "publish") => {
    if ((next !== "draft" && idx === 0 && next !== "basic") && basicMissing.length) return void toast.error(`Please fill: ${basicMissing.join(", ")}`);
    if (next === "publish" && !confirm) return void toast.error("Please confirm the declaration before publishing.");
    if (!f.title || !f.closing_at) return void toast.error("Tender title and bid end date are required even for a draft.");
    setBusy(true);
    try {
      const { reference_no, title, department, category, description, closing_at, estimated_value, emd_amount, eligibility, location, ...rest } = f;
      const details = { ...rest, technical_requirements: (f.requirements ?? []).map((r) => ({ parameter: r.parameter, spec: r.spec })), atc: [...(f.atcs ?? []), ...(f.atc ? [] : [])].join("\n") || f.atc };
      const row = { reference_no, title, department, category: category || f.product_category || null, description, closing_at: new Date(closing_at).toISOString(), estimated_value: estimated_value ? Number(estimated_value) : null, emd_amount: emd_amount ? Number(emd_amount) : null, eligibility: eligibility || null, location: location || f.delivery_location || null, details: details as never,
        ...(source ? { source_type: "data_gov_in", source_resource_id: source.resourceId, source_title: source.title, source_org: source.org, source_url: source.url, source_record: source.record as never, source_sha256: source.sha256, source_fetched_at: source.fetchedAt } : {}),
        ...(next === "publish" ? { status: "published", published_at: new Date().toISOString() } : {}) };
      let tid = id;
      if (tid) { await apiFetch(`/api/tenders/${tid}`, { method: "PUT", body: JSON.stringify(row) }); }
      else { const res = await apiFetch<{ id: string; message: string }>("/api/tenders/", { method: "POST", body: JSON.stringify({ ...row, status: next === "publish" ? "published" : "draft" }) }); tid = res.id; }
      await qc.invalidateQueries({ queryKey: ["tenders"] }); await qc.invalidateQueries({ queryKey: ["tender-draft"] });
      if (next === "publish") { toast.success("Tender published — vendors can now find it"); navigate({ to: "/officer/tenders/manage" }); return; }
      if (next === "draft") { toast.success("Draft saved"); if (!id) navigate({ to: "/officer/tenders/create/$stage", params: { stage }, search: { id: tid } }); return; }
      navigate({ to: "/officer/tenders/create/$stage", params: { stage: next }, search: { id: tid } });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const uploadDocs = async (files: FileList) => {
    if (!id) return void toast.error("Save the draft first.");
    setBusy(true);
    try { for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name}: max 20 MB`); continue; }
      const formData = new FormData(); formData.append("file", file);
      const res = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + `/api/tenders/${id}/documents`, { method: "POST", headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` }, body: formData });
      if (!res.ok) { const txt = await res.text(); throw new Error(`Upload failed: ${txt}`); }
    } await qc.invalidateQueries({ queryKey: ["tender-draft"] }); toast.success("Documents uploaded"); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const removeDoc = async (docId: string, path: string) => { try { await apiFetch(`/api/tenders/${id}/documents/${docId}`, { method: "DELETE" }); qc.invalidateQueries({ queryKey: ["tender-draft"] }); } catch(e) { toast.error((e as Error).message); } };

  const L = ({ t, req = true, extra }: { t: string; req?: boolean; extra?: string }) => <span className="mb-1 block text-[12px] font-medium">{t}{req && <span className="text-destructive"> *</span>}{extra && <span className="font-normal text-muted-foreground"> {extra}</span>}</span>;
  const S = ({ k, opts, ph }: { k: keyof Form; opts: string[]; ph: string }) => <select value={(f[k] as string) ?? ""} onChange={(e) => up(k, e.target.value as never)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-[12px]"><option value="">{ph}</option>{opts.map((o) => <option key={o}>{o}</option>)}</select>;

  return <div className="mx-auto max-w-[1400px] space-y-3">
    <nav className="flex items-center gap-1.5 text-[11px]"><ArrowLeft className="h-3.5 w-3.5 text-primary" /><Link to="/officer/dashboard" className="text-primary">Dashboard</Link><span className="text-muted-foreground">› Create Tender</span></nav>
    <div className="flex flex-wrap items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-xl bg-info/10 text-info"><FileText className="h-7 w-7" /></span><div className="flex-1"><h1 className="font-display text-2xl font-bold">Create New Tender</h1><p className="text-[13px] text-muted-foreground">Publish a new tender with complete details, requirements and compliance criteria.</p></div>
      <Button variant="outline" className="border-primary text-primary" disabled={busy} onClick={() => save("draft")}><Save className="mr-1.5 h-4 w-4" />Save as Draft</Button><Button variant="outline" asChild><Link to="/officer/tenders/manage"><X className="mr-1.5 h-4 w-4" />Cancel</Link></Button></div>

    <ol className="grid gap-3 rounded-lg border border-border bg-card px-4 py-3 md:grid-cols-4">{STAGES.map((s, i) => <li key={s} className="flex items-center gap-3">{i < idx ? <CheckCircle2 className="h-9 w-9 shrink-0 text-success" /> : <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold", i === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{i + 1}</span>}<span><b className="block text-[13px]">{META[s][0]}</b><small className={cn("text-[11px]", i === idx ? "text-primary" : "text-muted-foreground")}>{META[s][1]}</small></span></li>)}</ol>

    <div className="grid gap-3 xl:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-3">
        {stage === "basic" && <>
          <Sec n="1." icon={FileText} title="Basic Information" sub="Provide the basic details of the tender." tone="blue"><div className="grid gap-3 md:grid-cols-3">
            <label><L t="Tender Title" /><Input value={f.title} maxLength={200} onChange={(e) => up("title", e.target.value)} placeholder="Enter a clear and concise title for the tender" /><small className="float-right text-[10px] text-muted-foreground">{f.title.length}/200</small></label>
            <label><L t="Tender ID" req={false} extra="(Auto-generated)" /><Input value={f.reference_no} readOnly className="bg-muted" /></label>
            <label><L t="Department" /><Input list="dept-list" value={f.department} onChange={(e) => up("department", e.target.value)} placeholder="Select Department" /><datalist id="dept-list">{(depts.data ?? []).map((d) => <option key={d} value={d} />)}</datalist></label>
            <label><L t="Organisation / Office" /><Input value={f.organisation ?? ""} onChange={(e) => up("organisation", e.target.value)} placeholder="Organisation / Office" /></label>
            <label><L t="Tender Category" /><S k="tender_category" opts={["Goods", "Services", "Works"]} ph="Select Category" /></label>
            <label><L t="Product / Service Category" /><Input value={f.product_category ?? ""} onChange={(e) => up("product_category", e.target.value)} placeholder="Select Category (GeM)" /></label>
            <label className="md:col-span-3"><L t="Brief Description" /><Textarea rows={3} maxLength={1000} value={f.description} onChange={(e) => up("description", e.target.value)} placeholder="Provide a summary of the requirement, scope and objectives..." /><small className="float-right text-[10px] text-muted-foreground">{f.description.length}/1000</small></label></div></Sec>
          <Sec n="2." icon={CalendarDays} title="Important Dates" sub="Set the key timeline for the tender." tone="green"><div className="grid gap-3 md:grid-cols-5">
            <label><L t="Publish Date" req={false} /><Input value={fmtDate(new Date().toISOString())} readOnly className="bg-muted" /></label>
            <label><L t="Bid Start Date" /><Input type="datetime-local" value={f.bid_start ?? ""} onChange={(e) => up("bid_start", e.target.value)} /></label>
            <label><L t="Bid End Date" /><Input type="datetime-local" value={f.closing_at} onChange={(e) => up("closing_at", e.target.value)} /></label>
            <label><L t="Pre-Bid Meeting" req={false} extra="(Optional)" /><Input type="datetime-local" value={f.prebid_meeting ?? ""} onChange={(e) => up("prebid_meeting", e.target.value)} /></label>
            <label><L t="Bid Opening Date" /><Input type="datetime-local" value={f.bid_opening ?? ""} onChange={(e) => up("bid_opening", e.target.value)} /></label></div></Sec>
          <Sec n="3." icon={IndianRupee} title="Procurement Details" sub="Specify the financial and procurement information." tone="purple"><div className="grid gap-3 md:grid-cols-6">
            <label><L t="Estimated Value (₹)" /><Input type="number" min={0} value={f.estimated_value} onChange={(e) => up("estimated_value", e.target.value)} placeholder="Enter estimated value" /></label>
            <label><L t="EMD (₹)" req={false} extra="(Optional)" /><Input type="number" min={0} value={f.emd_amount} onChange={(e) => up("emd_amount", e.target.value)} placeholder="Enter EMD amount" /></label>
            <label><L t="Performance Security (₹)" req={false} extra="(Optional)" /><Input type="number" min={0} value={f.performance_security ?? ""} onChange={(e) => up("performance_security", e.target.value)} placeholder="Enter amount" /></label>
            <label><L t="Tender Type" /><S k="tender_type" opts={["Open Tender", "Limited Tender", "Single Tender", "Global Tender"]} ph="Select Type" /></label>
            <label><L t="Procurement Mode" /><S k="procurement_mode" opts={["Bid", "Reverse Auction", "Bid + Reverse Auction", "Direct Purchase", "L1 Purchase", "EPC"]} ph="Select Mode" /></label>
            <label><L t="Evaluation Method" /><S k="evaluation_method" opts={["L1 (Lowest Price)", "QCBS", "Technical + Financial", "Item-wise L1", "Total Value L1"]} ph="Select Method" /></label></div></Sec>
          <Sec n="4." icon={MapPin} title="Delivery & Location" sub="Specify the delivery location and period." tone="orange"><div className="grid gap-3 md:grid-cols-[1.4fr_1fr_0.8fr_1.6fr]">
            <label><L t="Delivery Location" /><Input value={f.delivery_location ?? ""} onChange={(e) => up("delivery_location", e.target.value)} placeholder="Enter delivery location / PIN code" /></label>
            <label><L t="Delivery Period" /><S k="delivery_period" opts={["15 days", "30 days", "45 days", "60 days", "90 days", "180 days", "12 months", "18 months", "24 months"]} ph="Select period" /></label>
            <fieldset><L t="Installation Required?" req={false} /><div className="flex h-9 items-center gap-4 text-[12px]">{["Yes", "No"].map((o) => <label key={o} className="flex items-center gap-1.5"><input type="radio" checked={(f.installation ?? "No") === o} onChange={() => up("installation", o)} />{o}</label>)}</div></fieldset>
            <label><L t="Additional Location Details" req={false} extra="(Optional)" /><Textarea rows={2} maxLength={500} value={f.location_details ?? ""} onChange={(e) => up("location_details", e.target.value)} placeholder="Enter detailed address, special instructions, etc..." /></label></div></Sec>
        </>}

        {stage === "requirements" && <ReqStage f={f} up={up} />}

        {stage === "documents" && <Sec n="3." icon={FileText} title="Documents & Rules" sub="Upload tender documents and set compliance rules for verification." tone="blue">
          <div className="grid gap-4 lg:grid-cols-2"><label className={cn("flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-6 text-center text-[12px]", busy && "pointer-events-none opacity-60")}><Upload className="h-8 w-8 text-primary" /><span className="mt-2">Drag & drop files here or</span><b className="text-primary">Browse Files</b><small className="mt-1 text-muted-foreground">Supported: PDF, DOCX, XLSX, ZIP | Max size: 20 MB</small><input type="file" multiple hidden accept=".pdf,.docx,.xlsx,.zip" onChange={(e) => { if (e.target.files?.length) uploadDocs(e.target.files); e.target.value = ""; }} /></label>
            <div><p className="mb-2 text-[13px] font-semibold">Uploaded Documents ({docs.length})</p>{!docs.length ? <p className="text-[12px] text-muted-foreground">No documents uploaded yet.</p> : <ul className="space-y-2">{docs.map((d) => <li key={d.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-[12px]"><FileText className="h-5 w-5 text-destructive" /><span className="flex-1"><b className="block">{d.name}</b><small className="text-muted-foreground">{fmtBytes(d.size_bytes)} • Uploaded on {fmtDate(d.created_at)}</small></span><Button size="icon" variant="ghost" aria-label="Remove" onClick={() => removeDoc(d.id, d.file_path)}><Trash2 className="h-4 w-4 text-destructive" /></Button></li>)}</ul>}</div></div>
          <RulesEditor rules={f.rules ?? []} docs={docs} onChange={(r) => up("rules", r)} /></Sec>}

        {stage === "review" && <Sec n="4." icon={ClipboardCheck} title="Review & Publish" sub="Verify all details before publishing the tender." tone="blue">
          <div className="rounded-lg border border-border p-4"><div className="flex flex-wrap items-center gap-3"><h3 className="font-display text-lg font-bold">{f.title || "Untitled tender"}</h3>{!basicMissing.length && <span className="rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-semibold text-success">Ready to Publish</span>}<Link to="/officer/tenders/create/$stage" params={{ stage: "basic" }} search={id ? { id } : {}} className="ml-auto flex items-center gap-1 text-[12px] text-primary"><Pencil className="h-3.5 w-3.5" />Edit Section</Link></div>
            <p className="text-[12px] text-muted-foreground">Tender ID: {f.reference_no} · {f.department} {f.organisation ? `| ${f.organisation}` : ""}</p><p className="mt-2 whitespace-pre-line text-[12px]">{f.description}</p>
            <div className="mt-3 grid gap-2 text-[12px] sm:grid-cols-3">{([["Category", f.product_category], ["Tender Type", f.tender_type], ["Bid Start Date", fmtDateTime(f.bid_start)], ["Bid End Date", fmtDateTime(f.closing_at)], ["Pre-bid Meeting", f.prebid_meeting ? fmtDateTime(f.prebid_meeting) : "—"], ["Bid Opening Date", fmtDateTime(f.bid_opening)], ["Estimated Value", inr(f.estimated_value ? Number(f.estimated_value) : null)], ["Procurement Mode", f.procurement_mode], ["Delivery", `${f.delivery_location ?? "—"} · ${f.delivery_period ?? "—"}`]] as const).map(([k, v]) => <div key={k} className="rounded-md bg-muted/50 px-3 py-2"><small className="text-muted-foreground">{k}</small><b className="block font-medium">{v || "—"}</b></div>)}</div>
            <ul className="mt-3 divide-y divide-border rounded-md border border-border text-[12px]"><li className="flex justify-between px-3 py-2"><b>Requirements Summary</b><span className="text-muted-foreground">{f.requirements?.length ?? 0} Technical • {f.commercial?.length ?? 0} Commercial • {f.atcs?.length ?? 0} ATCs</span></li><li className="flex justify-between px-3 py-2"><b>Documents Uploaded</b><span className="text-muted-foreground">{docs.length} Documents • Total {fmtBytes(docs.reduce((a, d) => a + (d.size_bytes ?? 0), 0))}</span></li><li className="flex justify-between px-3 py-2"><b>Compliance Rules</b><span className="text-muted-foreground">{f.rules?.length ?? 0} Rules • {(f.rules ?? []).filter((r) => r.severity === "Critical").length} Critical</span></li></ul>
            {source && <p className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">Based on data.gov.in: {source.title} · SHA-256 {source.sha256.slice(0, 12)}…</p>}
            {basicMissing.length > 0 && <p className="mt-3 text-[12px] text-destructive">Missing: {basicMissing.join(", ")}</p>}
            <label className="mt-3 flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-[12px]"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />I confirm that all information provided is accurate and complies with GeM guidelines.</label></div></Sec>}

        <div className="flex justify-between">{idx > 0 ? <Button variant="outline" className="border-primary text-primary" disabled={busy} onClick={() => save(STAGES[idx - 1]!)}><ArrowLeft className="mr-1.5 h-4 w-4" />Back: {META[STAGES[idx - 1]!][0]}</Button> : <span />}
          {stage === "review" ? <div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => save("draft")}><Save className="mr-1.5 h-4 w-4" />Save as Draft</Button><Button className="bg-success text-success-foreground hover:bg-success/90" disabled={busy || basicMissing.length > 0} onClick={() => save("publish")}><Rocket className="mr-1.5 h-4 w-4" />Publish Tender</Button></div> : <Button disabled={busy} onClick={() => save(STAGES[idx + 1]!)}>Next: {META[STAGES[idx + 1]!][0]}<ArrowRight className="ml-1.5 h-4 w-4" /></Button>}</div>
      </div>

      <aside className="space-y-3">
        <section className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]"><h3 className="flex items-center gap-2 text-[13px] font-semibold"><Database className="h-4 w-4 text-info" />Official data from data.gov.in</h3><p className="mt-1 text-[12px] text-muted-foreground">{source ? `Using: ${source.title ?? source.resourceId}` : "Start this tender from a real record in an Open Government Data dataset."}</p><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" className="flex-1 border-primary text-primary" onClick={() => setDgOpen(true)}>{source ? "Change record" : "Browse datasets"}</Button>{source && <Button size="sm" variant="ghost" onClick={() => setSource(null)}>Clear</Button>}</div></section>
        <section className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-[12px]"><h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold"><Lightbulb className="h-4 w-4 text-warning" />Guidelines & Tips</h3><ul className="list-disc space-y-1 pl-4 text-foreground/80"><li>Ensure the tender title is clear and specific.</li><li>Select the correct GeM category for better visibility.</li><li>Upload detailed technical specifications in the next step.</li><li>Include all necessary ATC (Additional Terms & Conditions).</li><li>Review the timeline carefully before publishing.</li></ul></section>
        <section className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]"><h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold"><ClipboardCheck className="h-4 w-4 text-info" />Required Information Checklist</h3><ul className="space-y-2 text-[12px]">{checklist.map(([l, ok]) => <li key={l} className="flex items-center gap-2">{ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}{l}</li>)}</ul></section>
      </aside>
    </div>
    <Dialog open={dgOpen} onOpenChange={setDgOpen}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Official data from data.gov.in</DialogTitle></DialogHeader><DataGovPanel onUse={useRecord} /></DialogContent></Dialog>
    {session ? null : null}
  </div>;
}

function Sec({ n, icon: Icon, title, sub, tone, children }: { n: string; icon: typeof FileText; title: string; sub: string; tone: "blue" | "green" | "purple" | "orange"; children: React.ReactNode }) {
  const t = { blue: "bg-info/10 text-info", green: "bg-success/12 text-success", purple: "bg-secondary text-primary", orange: "bg-warning/15 text-warning" }[tone];
  return <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-card)]"><header className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3"><span className={cn("flex h-11 w-11 items-center justify-center rounded-full", t)}><Icon className="h-5 w-5" /></span><div><h2 className="font-display text-lg font-bold">{n} {title}</h2><p className="text-[12px] text-muted-foreground">{sub}</p></div></header><div className="p-4">{children}</div></section>;
}

function ReqStage({ f, up }: { f: Form; up: <K extends keyof Form>(k: K, v: Form[K]) => void }) {
  const [tab, setTab] = useState<"technical" | "commercial" | "atc">("technical");
  const list = tab === "commercial" ? f.commercial ?? [] : f.requirements ?? []; const key = tab === "commercial" ? "commercial" : "requirements";
  const [draft, setDraft] = useState<Req>({ parameter: "", spec: "", type: "Technical", mandatory: true, method: "Document Proof" }); const [edit, setEdit] = useState<number | null>(null);
  const add = () => { if (!draft.parameter.trim() || !draft.spec.trim()) return void toast.error("Enter the requirement and its specification."); const next = [...list]; const r = { ...draft, type: tab === "commercial" ? "Commercial" : "Technical" }; if (edit != null) next[edit] = r; else next.push(r); up(key, next); setDraft({ parameter: "", spec: "", type: "Technical", mandatory: true, method: "Document Proof" }); setEdit(null); return; };
  return <Sec n="2." icon={ClipboardCheck} title="Requirements & ATC" sub="Define the technical and commercial requirements, including ATCs." tone="blue">
    <div role="tablist" className="mb-3 flex border-b border-border text-[12px]">{([["technical", "Technical Requirements"], ["commercial", "Commercial Requirements"], ["atc", "Additional Terms & Conditions (ATC)"]] as const).map(([k, l]) => <button key={k} role="tab" onClick={() => setTab(k)} className={cn("border-b-2 px-4 py-2", tab === k ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground")}>{l}</button>)}</div>
    {tab !== "atc" ? <>
      <div className="mb-3 grid gap-2 md:grid-cols-[1fr_1.4fr_110px_150px_auto]"><Input placeholder="Requirement (e.g. Processor)" value={draft.parameter} onChange={(e) => setDraft({ ...draft, parameter: e.target.value })} /><Input placeholder="Specification (e.g. Minimum Intel i5 12th Gen)" value={draft.spec} onChange={(e) => setDraft({ ...draft, spec: e.target.value })} /><select value={draft.mandatory ? "Yes" : "No"} onChange={(e) => setDraft({ ...draft, mandatory: e.target.value === "Yes" })} className="h-9 rounded-md border border-input bg-background px-2 text-[12px]"><option>Yes</option><option>No</option></select><select value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value })} className="h-9 rounded-md border border-input bg-background px-2 text-[12px]">{["Document Proof", "Test Report", "Certificate", "Self Declaration", "Physical Inspection"].map((m) => <option key={m}>{m}</option>)}</select><Button variant="outline" className="border-primary text-primary" onClick={add}><Plus className="mr-1 h-4 w-4" />{edit != null ? "Update" : "Add Requirement"}</Button></div>
      {!list.length ? <p className="text-[12px] text-muted-foreground">No requirements added yet.</p> : <table className="w-full text-left text-[12px]"><thead className="bg-muted/40 text-muted-foreground"><tr>{["#", "Requirement / Specification", "Type", "Mandatory", "Compliance Method", "Actions"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead><tbody>{list.map((r, i) => <tr key={i} className="border-t border-border"><td className="px-3 py-2">{i + 1}</td><td className="px-3 py-2">{r.parameter}: {r.spec}</td><td className="px-3 py-2"><span className="rounded bg-info/10 px-2 py-0.5 text-info">{r.type}</span></td><td className="px-3 py-2"><span className={cn("rounded px-2 py-0.5", r.mandatory ? "bg-success/12 text-success" : "bg-muted")}>{r.mandatory ? "Yes" : "No"}</span></td><td className="px-3 py-2">{r.method}</td><td className="px-3 py-2"><button aria-label="Edit" onClick={() => { setDraft(r); setEdit(i); }} className="mr-3"><Pencil className="h-4 w-4" /></button><button aria-label="Delete" onClick={() => up(key, list.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></button></td></tr>)}</tbody></table>}
      <label className="mt-4 block"><span className="mb-1 block text-[12px] font-medium">Eligibility Criteria</span><Textarea rows={3} maxLength={5000} value={f.eligibility} onChange={(e) => up("eligibility", e.target.value)} /></label></> :
      <><p className="mb-2 text-[13px] font-semibold">GeM Additional Terms & Conditions (ATC)</p><div className="grid gap-2 sm:grid-cols-2">{ATC_OPTIONS.map((o) => <label key={o} className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={f.atcs?.includes(o) ?? false} onChange={(e) => up("atcs", e.target.checked ? [...(f.atcs ?? []), o] : (f.atcs ?? []).filter((x) => x !== o))} />{o}</label>)}</div>
        <label className="mt-4 block"><span className="mb-1 block text-[12px] font-medium">Custom ATC text</span><Textarea rows={4} maxLength={5000} value={f.atc ?? ""} onChange={(e) => up("atc", e.target.value)} /></label>
        <label className="mt-3 block"><span className="mb-1 block text-[12px] font-medium">Payment Terms</span><Input value={f.payment_terms ?? ""} onChange={(e) => up("payment_terms", e.target.value)} /></label>
        <label className="mt-3 block"><span className="mb-1 block text-[12px] font-medium">Bid Validity (days)</span><Input type="number" min={1} value={f.bid_validity_days ?? ""} onChange={(e) => up("bid_validity_days", e.target.value)} /></label></>}
  </Sec>;
}

function RulesEditor({ rules, docs, onChange }: { rules: Rule[]; docs: { id: string; name: string }[]; onChange: (r: Rule[]) => void }) {
  const [tab, setTab] = useState<"rules" | "mapping">("rules");
  const blank: Rule = { name: "", document: "", type: "Document Presence", condition: "", severity: "High" };
  const [d, setD] = useState<Rule>(blank);
  const sev = useMemo(() => ({ Critical: "bg-destructive/10 text-destructive", High: "bg-warning/15 text-warning", Medium: "bg-warning/10 text-foreground", Low: "bg-muted" }), []);
  return <div className="mt-5"><div role="tablist" className="mb-3 flex border-b border-border text-[12px]">{([["rules", "Compliance Rules"], ["mapping", "Document Mapping"]] as const).map(([k, l]) => <button key={k} role="tab" onClick={() => setTab(k)} className={cn("border-b-2 px-4 py-2", tab === k ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground")}>{l}</button>)}</div>
    {tab === "rules" ? <><div className="mb-3 grid gap-2 md:grid-cols-[1.2fr_1fr_1fr_1.2fr_110px_auto]"><Input placeholder="Rule name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /><Input placeholder="Applicable document" value={d.document} onChange={(e) => setD({ ...d, document: e.target.value })} /><select value={d.type} onChange={(e) => setD({ ...d, type: e.target.value })} className="h-9 rounded-md border border-input bg-background px-2 text-[12px]">{["Document Presence", "Value Check", "Format & Validity", "Date Check"].map((x) => <option key={x}>{x}</option>)}</select><Input placeholder="Condition (e.g. ≥ ₹2 Crore)" value={d.condition} onChange={(e) => setD({ ...d, condition: e.target.value })} /><select value={d.severity} onChange={(e) => setD({ ...d, severity: e.target.value as Rule["severity"] })} className="h-9 rounded-md border border-input bg-background px-2 text-[12px]">{["Critical", "High", "Medium", "Low"].map((x) => <option key={x}>{x}</option>)}</select><Button variant="outline" className="border-primary text-primary" onClick={() => { if (!d.name || !d.condition) return void toast.error("Enter a rule name and condition."); onChange([...rules, d]); setD(blank); return; }}><Plus className="mr-1 h-4 w-4" />Add Rule</Button></div>
      {!rules.length ? <p className="text-[12px] text-muted-foreground">No compliance rules defined yet.</p> : <table className="w-full text-left text-[12px]"><thead className="bg-muted/40 text-muted-foreground"><tr>{["#", "Rule Name", "Applicable Document", "Rule Type", "Condition", "Severity", "Actions"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead><tbody>{rules.map((r, i) => <tr key={i} className="border-t border-border"><td className="px-3 py-2">{i + 1}</td><td className="px-3 py-2">{r.name}</td><td className="px-3 py-2">{r.document || "—"}</td><td className="px-3 py-2">{r.type}</td><td className="px-3 py-2">{r.condition}</td><td className="px-3 py-2"><span className={cn("rounded px-2 py-0.5", sev[r.severity])}>{r.severity}</span></td><td className="px-3 py-2"><button aria-label="Edit" className="mr-3" onClick={() => { setD(r); onChange(rules.filter((_, j) => j !== i)); }}><Pencil className="h-4 w-4" /></button><button aria-label="Delete" onClick={() => onChange(rules.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></button></td></tr>)}</tbody></table>}</> :
      !rules.length ? <p className="text-[12px] text-muted-foreground">Add compliance rules first, then map each to an uploaded tender document.</p> : <table className="w-full text-left text-[12px]"><tbody>{rules.map((r, i) => <tr key={i} className="border-t border-border"><td className="px-3 py-2">{r.name}</td><td className="px-3 py-2"><select value={r.document_id ?? ""} onChange={(e) => onChange(rules.map((x, j) => (j === i ? { ...x, document_id: e.target.value } : x)))} className="h-8 w-full rounded-md border border-input bg-background px-2"><option value="">Not mapped</option>{docs.map((dd) => <option key={dd.id} value={dd.id}>{dd.name}</option>)}</select></td></tr>)}</tbody></table>}
  </div>;
}
