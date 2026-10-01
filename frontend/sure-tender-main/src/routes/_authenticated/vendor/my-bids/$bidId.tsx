import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ErrorState, LoadingState, NotFoundState } from "@/components/states/DataStates";
import { fmtDate, inr } from "@/lib/procurement";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/vendor/my-bids/$bidId")({
  head: () => ({ meta: [{ title: "Bid Details — GeMShield" }, { name: "description", content: "Status and details of your bid submission." }, { property: "og:title", content: "Bid Details — GeMShield" }, { property: "og:description", content: "Status and details of your bid submission." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: BidDetail,
});

function BidDetail() {
  const { bidId } = Route.useParams();
  const q = useQuery({ queryKey: ["bid", bidId], queryFn: async () => { const data = await apiFetch<any>(`/api/bids/${bidId}`); return data; } });
  if (q.isPending) return <LoadingState />; if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const b = q.data; if (!b) return <NotFoundState title="Bid not found" />;
  const rows: [string, string][] = [["Status", b.status.replace(/_/g, " ")], ["Quoted amount", inr(b.quoted_amount)], ["Notes", b.notes ?? "—"], ["Submitted", fmtDate(b.submitted_at)], ["Last updated", fmtDate(b.updated_at)], ["Tender closing", fmtDate(b.tender?.closing_at)]];
  return <div className="mx-auto max-w-4xl space-y-2.5">
    <Link to="/vendor/my-bids" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-3.5 w-3.5" />My Bids</Link>
    <DashboardCard icon={FileText} tone="orange" title={b.tender?.title ?? "Bid"} subtitle={b.tender?.reference_no}>
      {rows.map(([k, v]) => <div key={k} className="grid grid-cols-[180px_1fr] border-t border-border px-4 py-2 text-xs capitalize-first"><span className="text-muted-foreground">{k}</span><span>{v}</span></div>)}
    </DashboardCard>
  </div>;
}
