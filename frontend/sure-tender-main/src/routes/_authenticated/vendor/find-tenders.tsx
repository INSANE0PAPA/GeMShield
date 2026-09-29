import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Bell, Bookmark, BookmarkCheck, CalendarDays, ChevronDown, Clock, FileQuestion, FileSearch, Hourglass, LayoutGrid, List, MapPin, Plus, Search, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompactEmpty } from "@/components/dashboard/DashboardCard";
import { ErrorState, LoadingState } from "@/components/states/DataStates";
import { StatusPill, tenderTags } from "@/components/tenders/TenderHeader";
import { useSession } from "@/hooks/useSession";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import heroDay from "@/assets/auth/government-day.jpg";
import heroNight from "@/assets/auth/government-night.jpg";
import { fetchPublishedTenders, fetchTenderFacets, fmtDate, tenderState, type TenderFilters } from "@/lib/procurement";
import { apiFetch } from "@/lib/api";

const KEYS = ["q", "category", "department", "location", "type", "closeBy", "tab", "sort", "min", "max", "view"] as const;
type S = Partial<Record<(typeof KEYS)[number], string>>;

export const Route = createFileRoute("/_authenticated/vendor/find-tenders")({
  validateSearch: (s: Record<string, unknown>): S => { const o: S = {}; for (const k of KEYS) { const v = s[k]; if (typeof v === "string" && v) o[k] = v; } return o; },
  head: () => ({ meta: [{ title: "Find Tenders — GeMShield" }, { name: "description", content: "Discover government procurement opportunities relevant to your business." }, { property: "og:title", content: "Find Tenders — GeMShield" }, { property: "og:description", content: "Discover government procurement opportunities relevant to your business." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: FindTenders,
});

const TABS = [["", "All Tenders", List], ["recommended", "Recommended for You", Star], ["closing", "Closing Soon", Clock], ["saved", "Saved Tenders", Bookmark]] as const;

function FindTenders() {
  const search = Route.useSearch(); const navigate = useNavigate(); const qc = useQueryClient(); const { theme } = useTheme();
  const { session } = useSession(); const uid = session?.user.id;
  const [q, setQ] = useState(search.q ?? ""); const [openFilter, setOpenFilter] = useState<string | null>(null);
  const set = (patch: S) => navigate({ to: "/vendor/find-tenders", search: ((p: S) => { const n: S = { ...p, ...patch }; for (const k of KEYS) if (!n[k]) delete n[k]; return n; }) as never });
  const saved = useQuery({ queryKey: ["saved", uid], enabled: Boolean(uid), queryFn: async () => { const data = await apiFetch<any[]>("/api/tenders/saved"); return data.map((r) => r.tender_id); } });
  const vendor = useQuery({ queryKey: ["vendor-self", uid], enabled: Boolean(uid), queryFn: async () => { try { const data = await apiFetch<any>("/api/vendors/me"); return data; } catch { return null; } } });
  const filters: TenderFilters = search;
  const tenders = useQuery({ queryKey: ["tenders", "search", filters, saved.data, vendor.data?.category], enabled: search.tab !== "saved" || saved.isSuccess, queryFn: () => fetchPublishedTenders(filters, { savedIds: saved.data ?? [], vendorCategory: vendor.data?.category ?? null }) });
  const facets = useQuery({ queryKey: ["tenders", "facets"], queryFn: fetchTenderFacets });
  const toggle = useMutation({
    mutationFn: async (id: string) => { if (saved.data?.includes(id)) { await apiFetch(`/api/tenders/saved/${id}`, { method: "DELETE" }); return false; } await apiFetch(`/api/tenders/saved/${id}`, { method: "POST" }); return true; },
    onSuccess: (s) => { toast.success(s ? "Tender saved" : "Removed from saved"); qc.invalidateQueries({ queryKey: ["saved"] }); }, onError: (e: Error) => toast.error(e.message),
  });
  const submit = (e: FormEvent) => { e.preventDefault(); set({ q: q.trim() }); };
  const f = facets.data;
  const selectCls = "h-10 w-full rounded-md border border-input bg-background px-3 text-[12px] text-foreground";
  const sel = (k: keyof S, label: string, all: string, opts: string[]) => <label className="min-w-0"><span className="mb-1.5 block text-[12px] font-medium text-foreground">{label}</span><select value={search[k] ?? ""} onChange={(e) => set({ [k]: e.target.value })} className={selectCls}><option value="">{all}</option>{opts.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>;
  const grid = search.view === "grid";
  const activeCount = ["category", "department", "location", "type", "closeBy", "min", "max", "q"].filter((k) => search[k as keyof S]).length;

  return <div className="mx-auto max-w-[1320px] space-y-4">
    <section className="relative min-h-36 overflow-hidden rounded-lg">
      <img src={theme === "dark" ? heroNight : heroDay} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/10" />
      <div className="relative z-10 px-6 py-5"><h1 className="font-display text-4xl font-bold text-foreground">Find <span className="text-primary">Tenders</span></h1><p className="mt-2 max-w-md text-base leading-snug text-muted-foreground">Discover government procurement opportunities relevant to your business.</p></div>
      <blockquote className="absolute right-8 top-6 z-10 hidden w-52 font-display text-sm italic leading-snug text-foreground xl:block">“More opportunities. A more transparent procurement ecosystem.”<span className="tricolour-rule mt-2 w-14" /></blockquote>
    </section>

    <form onSubmit={submit} className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex gap-3"><span className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by tender title, keyword, or tender ID..." className="h-10 pl-9 text-[13px]" /></span><Button type="submit" className="h-10 px-6"><Search className="mr-2 h-4 w-4" />Search</Button></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {sel("category", "Category", "All Categories", f?.categories ?? [])}
        {sel("department", "Department / Organisation", "All Departments", f?.departments ?? [])}
        {sel("location", "Location", "All India", f?.locations ?? [])}
        {sel("type", "Tender Type", "All Types", f?.types ?? [])}
        <label className="min-w-0"><span className="mb-1.5 block text-[12px] font-medium">Closing Date</span><Input type="date" value={search.closeBy ?? ""} onChange={(e) => set({ closeBy: e.target.value })} className="h-10 text-[12px]" /></label>
      </div>
    </form>

    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="min-w-0">
        <div role="tablist" className="flex overflow-x-auto border-b border-border">{TABS.map(([val, label, Icon]) => { const on = (search.tab ?? "") === val; return <button key={val} role="tab" aria-selected={on} onClick={() => set({ tab: val })} className={cn("flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-[13px]", on ? "border-primary font-semibold text-primary" : "border-transparent text-foreground/80 hover:text-foreground")}><Icon className="h-4 w-4" />{label}</button>; })}</div>
        <div className="flex flex-wrap items-center justify-between gap-2 py-3"><p className="text-sm"><b className="font-display text-xl">Tenders</b> <span className="text-[12px] text-muted-foreground">({tenders.data ? `${tenders.data.length} result${tenders.data.length === 1 ? "" : "s"}` : "loading"}{activeCount ? " relevant to your search" : ""})</span></p>
          <div className="flex items-center gap-2 text-[12px]"><span className="text-muted-foreground">Sort by:</span><select value={search.sort ?? ""} onChange={(e) => set({ sort: e.target.value })} className="h-8 rounded-md border border-input bg-background px-2 text-[12px]"><option value="">Closing Date (Earliest)</option><option value="newest">Recently Published</option><option value="value">Estimated Value (Highest)</option></select>
            <Button type="button" size="icon" variant={grid ? "ghost" : "secondary"} className="h-8 w-8" aria-label="List view" onClick={() => set({ view: "" })}><List className="h-4 w-4" /></Button><Button type="button" size="icon" variant={grid ? "secondary" : "ghost"} className="h-8 w-8" aria-label="Grid view" onClick={() => set({ view: "grid" })}><LayoutGrid className="h-4 w-4" /></Button></div></div>
        <div className="rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
          {tenders.isPending ? <div className="p-4"><LoadingState label="Loading tenders…" /></div> : tenders.error ? <div className="p-4"><ErrorState error={tenders.error} onRetry={() => tenders.refetch()} /></div> : !tenders.data.length ? <CompactEmpty icon={FileQuestion} title={search.tab === "saved" ? "No saved tenders" : search.tab === "recommended" ? (vendor.data?.category ? "No tenders match your business category" : "Add your business category to get recommendations") : "No tenders match these filters"} description={search.tab === "recommended" && !vendor.data?.category ? "Set your category in Profile & Settings." : "Try clearing some filters."} /> :
            <ul className={cn(grid ? "grid gap-3 p-3 md:grid-cols-2" : "divide-y divide-border")}>{tenders.data.map((td) => { const isSaved = saved.data?.includes(td.id); const docs = (td.tender_documents as unknown as { count: number }[])[0]?.count ?? 0;
              return <li key={td.id} className={cn("flex flex-wrap gap-4 px-5 py-4", grid && "flex-col rounded-lg border border-border")}>
                <div className="w-20 shrink-0"><StatusPill state={tenderState(td.closing_at, td.status)} /></div>
                <div className="min-w-0 flex-1"><Link to="/vendor/tenders/$tenderId" params={{ tenderId: td.id }} className="text-[15px] font-semibold text-foreground hover:text-primary">{td.title}</Link><p className="text-[12px] text-muted-foreground">{td.department ?? "—"}</p>
                  <p className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted-foreground"><span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{td.location ?? "All India"}</span><span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Published: {fmtDate(td.published_at)}</span><span className="flex items-center gap-1.5"><Hourglass className="h-3.5 w-3.5" />Closes: {fmtDate(td.closing_at)}</span></p>
                  <div className="mt-2 flex flex-wrap gap-2">{tenderTags(td)}</div></div>
                <div className="flex shrink-0 flex-col items-end gap-2"><div className="flex gap-2"><Button type="button" variant="outline" className="h-10" onClick={() => toggle.mutate(td.id)} disabled={toggle.isPending}>{isSaved ? <BookmarkCheck className="mr-1.5 h-4 w-4 text-primary" /> : <Bookmark className="mr-1.5 h-4 w-4" />}{isSaved ? "Saved" : "Save"}</Button><Button asChild className="h-10"><Link to="/vendor/tenders/$tenderId" params={{ tenderId: td.id }}>View Details<ArrowRight className="ml-1.5 h-4 w-4" /></Link></Button></div>
                  <Link to="/vendor/tenders/$tenderId" params={{ tenderId: td.id }} search={{ tab: "documents" }} className="text-[12px] font-medium text-primary underline">View Documents ({docs})</Link></div>
              </li>; })}</ul>}
        </div>
      </div>

      <aside className="space-y-4">
        <section className="rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
          <header className="flex items-center justify-between px-4 py-3"><h2 className="text-sm font-semibold">Filters</h2><button type="button" onClick={() => { setQ(""); navigate({ to: "/vendor/find-tenders", search: {} }); }} className="text-[12px] text-primary underline">Clear All</button></header>
          {([["category", "Category", f?.categories], ["department", "Department / Organisation", f?.departments], ["location", "Location", f?.locations], ["type", "Tender Type", f?.types]] as const).map(([k, label, opts]) => <FilterRow key={k} label={label} open={openFilter === k} onToggle={() => setOpenFilter(openFilter === k ? null : k)}>
            {(opts ?? []).length ? <div className="space-y-1">{(opts ?? []).map((o) => <label key={o} className="flex items-center gap-2 text-[12px]"><input type="radio" name={k} checked={search[k] === o} onChange={() => set({ [k]: o })} />{o}</label>)}</div> : <p className="text-[11px] text-muted-foreground">No options yet</p>}</FilterRow>)}
          <FilterRow label="Estimated Value Range (₹)" open={openFilter === "value"} onToggle={() => setOpenFilter(openFilter === "value" ? null : "value")}><div className="flex gap-2"><Input type="number" min={0} placeholder="Min" defaultValue={search.min} onBlur={(e) => set({ min: e.target.value })} className="h-8 text-[12px]" /><Input type="number" min={0} placeholder="Max" defaultValue={search.max} onBlur={(e) => set({ max: e.target.value })} className="h-8 text-[12px]" /></div></FilterRow>
          <FilterRow label="Closing Date" open={openFilter === "closing"} onToggle={() => setOpenFilter(openFilter === "closing" ? null : "closing")}><Input type="date" value={search.closeBy ?? ""} onChange={(e) => set({ closeBy: e.target.value })} className="h-8 text-[12px]" /></FilterRow>
          <FilterRow label="Keywords" open={openFilter === "kw"} onToggle={() => setOpenFilter(openFilter === "kw" ? null : "kw")}><Input placeholder="e.g. solar" defaultValue={search.q} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); set({ q: e.currentTarget.value.trim() }); } }} className="h-8 text-[12px]" /></FilterRow>
        </section>
        <section className="flex gap-3 rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]"><Bell className="h-6 w-6 shrink-0 text-primary" /><div className="flex-1"><h2 className="text-sm font-semibold">Set Tender Alerts</h2><p className="mt-1 text-[12px] text-muted-foreground">Save tenders you are interested in; updates to saved tenders appear in Notifications.</p><Button type="button" variant="outline" className="mt-3 w-full border-primary text-primary" onClick={() => set({ tab: "saved" })}><Plus className="mr-1.5 h-4 w-4" />View Saved Tenders</Button></div></section>
        <Link to="/vendor/help" className="flex gap-3 rounded-lg border border-border bg-muted/40 p-4"><FileSearch className="h-8 w-8 shrink-0 text-primary" /><div className="flex-1"><h2 className="text-sm font-semibold">Discover Procurement Opportunities</h2><p className="mt-1 text-[12px] text-muted-foreground">Save tenders, set alerts and get personalized recommendations.</p><ArrowRight className="ml-auto mt-1 h-4 w-4 text-primary" /></div></Link>
      </aside>
    </div>
  </div>;
}

function FilterRow({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return <div className="border-t border-border px-4"><button type="button" onClick={onToggle} className="flex w-full items-center justify-between py-2 text-[12px] text-foreground/90">{label}<ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} /></button>{open && <div className="pb-3">{children}</div>}</div>;
}
