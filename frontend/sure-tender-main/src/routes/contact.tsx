import { createFileRoute } from "@tanstack/react-router";
import { PublicInfoPage, PendingOfficialContent } from "@/components/landing/PublicInfoPage";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact / Support — GeMShield" },
      { name: "description", content: "Reach the GeMShield support team for assistance." },
      { property: "og:title", content: "Contact / Support — GeMShield" },
      { property: "og:description", content: "Reach the GeMShield support team for assistance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <PublicInfoPage title="Contact / Support" intro="Reach the GeMShield support team for assistance.">
      <PendingOfficialContent />
    </PublicInfoPage>
  );
}
