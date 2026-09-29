import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye, FileText, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardCard, CompactEmpty } from "@/components/dashboard/DashboardCard";
import { ErrorState, LoadingState } from "@/components/states/DataStates";
import { useSession } from "@/hooks/useSession";
import { useLanguage } from "@/lib/language";
import { DASHBOARD_TRANSLATIONS } from "@/lib/dashboard-translations";
import { BID_STATUSES, fetchMyBids, fmtDate, inr, type BidStatus } from "@/lib/procurement";

export const Route = createFileRoute("/_authenticated/vendor/my-bids/")({
  head: () => ({ meta: [{ title: "My Bids — GeMShield" }, { name: "description", content: "Track and manage all your bid submissions." }, { property: "og:title", content: "My Bids — GeMShield" }, { property: "og:description", content: "Track and manage all your bid submissions." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: MyBids,
});

function MyBids() {
  const { language } = useLanguage(); const t = DASHBOARD_TRANSLATIONS[language]; const v = t.vendor;
  const { session } = useSession(); const uid = session?.user.id;
  const [tab, setTab] = useState<BidStatus>("draft");
  const bids = useQuery({ queryKey: ["bids", "mine", uid], enabled: Boolean(uid), queryFn: () => fetchMyBids(uid!) });
  const labels = [v.drafts, v.submitted, v.review, v.clarification, v.completed];
  const rows = (bids.data ?? []).filter((b) => b.status === tab);
  return <div className="mx-auto max-w-[1320px]"><DashboardCard icon={FileText} tone="orange" title={v.bids} subtitle={v.bidsSub} action={<Button size="sm" asChild><Link to="/vendor/find-tenders">{v.viewTenders}</Link></Button>}>
    <div role="tablist" className="grid grid-cols-5 border-y border-border bg-muted/40 text-center text-[11px]">{BID_STATUSES.map((s, i) => <button key={s} role="tab" aria-selected={tab === s} onClick={() => setTab(s)} className={tab === s ? "border-b-2 border-primary px-1 py-2 font-semibold text-primary" : "px-1 py-2 text-muted-foreground hover:text-foreground"}>{labels[i]} {bids.data ? `(${bids.data.filter((b) => b.status === s).length})` : ""}</button>)}</div>
    {bids.isPending ? <div className="p-3"><LoadingState label={t.states.loading} /></div> : bids.error ? <div className="p-3"><ErrorState error={bids.error} onRetry={() => bids.refetch()} /></div> : !rows.length ? <CompactEmpty icon={FileText} title={`${labels[BID_STATUSES.indexOf(tab)]}: 0`} description={v.noBidsHelp} /> :
      <div className="overflow-x-auto"><table className="w-full text-left text-[11px]"><thead className="text-muted-foreground"><tr>{["Tender", v.department, "Quoted", "Updated", v.closing, ""].map((h) => <th key={h} className="px-4 py-2 font-semibold">{h}</th>)}</tr></thead><tbody>{rows.map((b) => <tr key={b.id} className="border-t border-border">
        <td className="px-4 py-2"><b className="block">{b.tender?.title}</b><small className="text-muted-foreground">{b.tender?.reference_no}</small></td><td className="px-4 py-2">{b.tender?.department ?? "—"}</td><td className="px-4 py-2">{inr(b.quoted_amount)}</td><td className="px-4 py-2">{fmtDate(b.updated_at)}</td><td className="px-4 py-2">{fmtDate(b.tender?.closing_at)}</td>
        <td className="whitespace-nowrap px-4 py-2 text-right"><Button size="icon" variant="ghost" asChild aria-label="View bid"><Link to="/vendor/my-bids/$bidId" params={{ bidId: b.id }}><Eye className="h-4 w-4" /></Link></Button>{b.status === "draft" && b.tender && <Button size="icon" variant="ghost" asChild aria-label="Continue editing"><Link to="/vendor/tenders/$tenderId/apply/$stage" params={{ tenderId: b.tender.id, stage: b.stage }}><Pencil className="h-4 w-4" /></Link></Button>}</td>
      </tr>)}</tbody></table></div>}
  </DashboardCard></div>;
}
