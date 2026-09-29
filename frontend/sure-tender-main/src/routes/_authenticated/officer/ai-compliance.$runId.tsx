import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Cpu } from "lucide-react";
import { z } from "zod";
import { ComplianceRunView } from "@/components/compliance/ComplianceRunView";

export const Route = createFileRoute("/_authenticated/officer/ai-compliance/$runId")({
  validateSearch: z.object({ tab: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Compliance Run Details — GeMShield" },
      { name: "description", content: "Rule results, evidence pages, AI reasoning and the officer decision for one compliance run." },
      { property: "og:title", content: "Compliance Run Details — GeMShield" },
      { property: "og:description", content: "Rule results, evidence pages, AI reasoning and officer decision." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RunPage,
});

function RunPage() {
  const { runId } = Route.useParams(); const { tab } = Route.useSearch();
  return <div className="space-y-3">
    <nav className="flex items-center gap-1 text-xs text-muted-foreground"><ChevronLeft className="h-3.5 w-3.5" /><Link to="/officer/ai-compliance" className="text-primary">AI Compliance Check</Link> › Run details</nav>
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><Cpu className="h-6 w-6" /></div><div><h1 className="font-display text-2xl font-bold">Compliance Run</h1><p className="text-sm text-muted-foreground">Inspect evidence, confirm or override the AI with justification. You hold final authority.</p></div></div>
    <ComplianceRunView runId={runId} audience="officer" {...(tab ? { initialTab: tab } : {})} />
  </div>;
}
