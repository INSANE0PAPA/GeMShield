import { createFileRoute } from "@tanstack/react-router";
import { SectionScaffold } from "@/components/states/SectionScaffold";

export const Route = createFileRoute("/_authenticated/officer/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — GeMShield" },
      { name: "description", content: "Compliance insights, vendor performance, flags, trends and custom reports." },
      { property: "og:title", content: "Reports & Analytics — GeMShield" },
      { property: "og:description", content: "Compliance insights, vendor performance, flags, trends and custom reports." },
    ],
  }),
  component: Reports,
});

function Reports() {
  return (
    <SectionScaffold
      title="Reports & Analytics"
      description="Compliance insights, vendor performance, flags, trends and custom reports."
      note="Every chart here is computed from live procurement data, so this section is delivered after tenders and bids exist."
    />
  );
}
