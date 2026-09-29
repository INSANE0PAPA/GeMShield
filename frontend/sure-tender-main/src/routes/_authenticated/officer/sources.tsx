import { createFileRoute } from "@tanstack/react-router";
import { SectionScaffold } from "@/components/states/SectionScaffold";

export const Route = createFileRoute("/_authenticated/officer/sources")({
  head: () => ({
    meta: [
      { title: "Source Library — GeMShield" },
      { name: "description", content: "Government reference resources imported from data.gov.in with provenance." },
      { property: "og:title", content: "Source Library — GeMShield" },
      { property: "og:description", content: "Government reference resources imported from data.gov.in with provenance." },
    ],
  }),
  component: SourceLibrary,
});

function SourceLibrary() {
  return (
    <SectionScaffold
      title="Source Library"
      description="Government reference resources imported from data.gov.in with provenance."
      note="data.gov.in import requires a government API key and is delivered in the final integration phase."
    />
  );
}
