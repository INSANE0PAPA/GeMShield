import { createFileRoute } from "@tanstack/react-router";
import { PublicInfoPage, PendingOfficialContent } from "@/components/landing/PublicInfoPage";

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility — GeMShield" },
      { name: "description", content: "GeMShield accessibility statement and support." },
      { property: "og:title", content: "Accessibility — GeMShield" },
      { property: "og:description", content: "GeMShield accessibility statement and support." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccessibilityPage,
});

function AccessibilityPage() {
  return (
    <PublicInfoPage title="Accessibility" intro="GeMShield accessibility statement and support.">
      <PendingOfficialContent />
    </PublicInfoPage>
  );
}
