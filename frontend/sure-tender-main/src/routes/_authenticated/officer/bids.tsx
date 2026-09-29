import { createFileRoute } from "@tanstack/react-router";
import { SectionScaffold } from "@/components/states/SectionScaffold";

export const Route = createFileRoute("/_authenticated/officer/bids")({
  head: () => ({
    meta: [
      { title: "Bid Verification — GeMShield" },
      { name: "description", content: "Inspect submitted bids, their documents and verification state." },
      { property: "og:title", content: "Bid Verification — GeMShield" },
      { property: "og:description", content: "Inspect submitted bids, their documents and verification state." },
    ],
  }),
  component: BidVerification,
});

function BidVerification() {
  return (
    <SectionScaffold
      title="Bid Verification"
      description="Inspect submitted bids, their documents and verification state."
      note="Submitted bids appear here once the vendor application workflow is delivered."
    />
  );
}
