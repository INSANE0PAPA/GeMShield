import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { DashboardCard, CompactEmpty } from "@/components/dashboard/DashboardCard";
import { ErrorState, LoadingState } from "@/components/states/DataStates";
import { fmtDate, inr } from "@/lib/procurement";

export const Route = createFileRoute("/_authenticated/officer/tenders/manage")({
  head: () => ({ meta: [{ title: "Manage Tenders — GeMShield" }, { name: "description", content: "View, publish and close tenders." }, { property: "og:title", content: "Manage Tenders — GeMShield" }, { property: "og:description", content: "View, publish and close tenders." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Manage,
});

function Manage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["tenders", "all"], queryFn: async () => { const data = await apiFetch<any>("/api/tenders"); return data; } });
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "published" | "closed" }) => { await apiFetch(`/api/tenders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenders"] }), onError: (e) => toast.error(e.message),
  });
  return <div className="mx-auto max-w-[1320px]"><DashboardCard icon={ClipboardList} title="Manage Tenders" subtitle="All tenders in your organisation" action={<Button size="sm" asChild><Link to="/officer/tenders/create/$stage" params={{ stage: "basic" }}><FilePlus2 className="mr-1.5 h-3.5 w-3.5" />Create Tender</Link></Button>}>
    {q.isPending ? <div className="p-3"><LoadingState /></div> : q.error ? <div className="p-3"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div> : !q.data.length ? <CompactEmpty icon={ClipboardList} title="No tenders yet" description="Create your first tender to start receiving bids." /> :
      <div className="overflow-x-auto border-t border-border"><table className="w-full text-left text-[11px]"><thead className="bg-muted/40 text-muted-foreground"><tr>{["Tender", "Department", "Value", "Closing", "Bids", "Status", ""].map((h) => <th key={h} className="px-4 py-2 font-semibold">{h}</th>)}</tr></thead><tbody>
        {q.data.map((td) => <tr key={td.id} className="border-t border-border"><td className="px-4 py-2"><b className="block">{td.title}</b><small className="text-muted-foreground">{td.reference_no}</small></td><td className="px-4 py-2">{td.department ?? "—"}</td><td className="px-4 py-2">{inr(td.estimated_value)}</td><td className="px-4 py-2">{fmtDate(td.closing_at)}</td><td className="px-4 py-2">{(td.bids as unknown as { count: number }[])[0]?.count ?? 0}</td><td className="px-4 py-2 capitalize">{td.status}</td>
          <td className="px-4 py-2 text-right">{td.status === "draft" && <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: td.id, status: "published" })}>Publish</Button>}{td.status === "published" && <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: td.id, status: "closed" })}>Close</Button>}</td></tr>)}
      </tbody></table></div>}
  </DashboardCard></div>;
}
