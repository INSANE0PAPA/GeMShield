import { createFileRoute } from "@tanstack/react-router";
import { PublicInfoPage, PendingOfficialContent } from "@/components/landing/PublicInfoPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — GeMShield" },
      { name: "description", content: "Terms governing the use of the GeMShield platform." },
      { property: "og:title", content: "Terms of Use — GeMShield" },
      { property: "og:description", content: "Terms governing the use of the GeMShield platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <PublicInfoPage title="Terms of Use" intro="Terms governing the use of the GeMShield platform.">
      <PendingOfficialContent />
    </PublicInfoPage>
  );
}
