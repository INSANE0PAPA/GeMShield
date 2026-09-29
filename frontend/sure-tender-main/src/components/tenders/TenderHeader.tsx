import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, ChevronRight, Hourglass, Landmark, MapPin, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { detailsOf, fmtDate, fmtDateTime, tenderState } from "@/lib/procurement";

type T = { title: string; reference_no: string; category: string | null; department: string | null; location: string | null; published_at: string | null; closing_at: string | null; status: string; details: unknown };

export function StatusPill({ state }: { state: "open" | "closed" }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", state === "open" ? "bg-success/12 text-success" : "bg-muted text-muted-foreground")}>
    <span className={cn("h-2 w-2 rounded-full", state === "open" ? "bg-success" : "bg-muted-foreground")} />{state === "open" ? "Open" : "Closed"}</span>;
}

export function Tag({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "grey" | "green" | "orange" | "purple" }) {
  const tones = { blue: "bg-info/10 text-info", grey: "bg-muted text-foreground/80", green: "bg-success/12 text-success", orange: "bg-warning/15 text-warning", purple: "bg-secondary text-primary" };
  return <span className={cn("inline-flex rounded-md px-2.5 py-0.5 text-[11px] font-medium", tones[tone])}>{children}</span>;
}

export function tenderTags(t: T) {
  const d = detailsOf(t.details);
  return [t.category && <Tag key="c">{t.category}</Tag>, d.procurement_mode && <Tag key="m" tone="grey">{d.procurement_mode}</Tag>, d.tender_type && <Tag key="t" tone="green">{d.tender_type}</Tag>].filter(Boolean);
}

export function Crumbs({ items }: { items: { label: string; to?: string; params?: Record<string, string> }[] }) {
  return <nav className="flex items-center gap-1.5 text-[11px]">
    <ArrowLeft className="h-3.5 w-3.5 text-primary" />
    {items.map((it, i) => <span key={it.label} className="flex items-center gap-1.5">
      {it.to ? <Link to={it.to as never} params={it.params as never} className="text-primary hover:underline">{it.label}</Link> : <span className="text-muted-foreground">{it.label}</span>}
      {i < items.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
    </span>)}
  </nav>;
}

export function TenderHeader({ tender, actions, aside, showMeta = true }: { tender: T; actions?: ReactNode; aside?: ReactNode; showMeta?: boolean }) {
  const st = tenderState(tender.closing_at, tender.status);
  return <section className="rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
    <div className="flex flex-wrap items-start gap-4 px-4 py-3">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info"><Monitor className="h-7 w-7" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3"><h1 className="font-display text-xl font-bold leading-tight text-foreground">{tender.title}</h1><StatusPill state={st} /></div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Tender ID: {tender.reference_no}</p>
        <div className="mt-2 flex flex-wrap gap-2">{tenderTags(tender)}</div>
      </div>
      {aside}
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
    {showMeta && <div className="grid gap-2 border-t border-border px-4 py-2.5 text-[11px] text-foreground/80 sm:grid-cols-2 lg:grid-cols-4">
      <span className="flex items-center gap-2"><Landmark className="h-4 w-4 text-muted-foreground" />{tender.department ?? "—"}</span>
      <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{tender.location ?? "All India"}</span>
      <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" />Published: {fmtDate(tender.published_at)}</span>
      <span className="flex items-center gap-2"><Hourglass className="h-4 w-4 text-muted-foreground" />Closes: {fmtDateTime(tender.closing_at)}</span>
    </div>}
  </section>;
}
