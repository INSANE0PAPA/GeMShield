import { createFileRoute } from "@tanstack/react-router";
import { SectionScaffold } from "@/components/states/SectionScaffold";

export const Route = createFileRoute("/_authenticated/officer/help")({
  head: () => ({
    meta: [
      { title: "Help & Guidelines — GeMShield" },
      { name: "description", content: "Officer manuals, process guides, FAQs and policy documents." },
      { property: "og:title", content: "Help & Guidelines — GeMShield" },
      { property: "og:description", content: "Officer manuals, process guides, FAQs and policy documents." },
    ],
  }),
  component: OfficerHelp,
});

function OfficerHelp() {
  return (
    <SectionScaffold
      title="Help & Guidelines"
      description="Officer manuals, process guides, FAQs and policy documents."
      note="Role-specific guidance and the document-grounded assistant are delivered in a later phase."
    />
  );
}
