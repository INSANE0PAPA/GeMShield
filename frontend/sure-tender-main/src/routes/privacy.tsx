import { createFileRoute } from "@tanstack/react-router";
import { PublicInfoPage, PendingOfficialContent } from "@/components/landing/PublicInfoPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — GeMShield" },
      { name: "description", content: "How GeMShield handles personal and procurement data." },
      { property: "og:title", content: "Privacy Policy — GeMShield" },
      { property: "og:description", content: "How GeMShield handles personal and procurement data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PublicInfoPage title="Privacy Policy" intro="How GeMShield handles personal and procurement data.">
      <PendingOfficialContent />
    </PublicInfoPage>
  );
}
