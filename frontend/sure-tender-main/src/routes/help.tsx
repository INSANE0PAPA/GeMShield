import { createFileRoute } from "@tanstack/react-router";
import { PublicInfoPage, PendingOfficialContent } from "@/components/landing/PublicInfoPage";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & Support — GeMShield" },
      { name: "description", content: "Guidance for government buyers and vendors using GeMShield." },
      { property: "og:title", content: "Help & Support — GeMShield" },
      { property: "og:description", content: "Guidance for government buyers and vendors using GeMShield." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  return (
    <PublicInfoPage title="Help & Support" intro="Guidance for government buyers and vendors using GeMShield.">
      <PendingOfficialContent />
    </PublicInfoPage>
  );
}
