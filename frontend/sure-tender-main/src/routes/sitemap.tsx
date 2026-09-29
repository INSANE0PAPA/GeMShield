import { createFileRoute } from "@tanstack/react-router";
import { PublicInfoPage, PendingOfficialContent } from "@/components/landing/PublicInfoPage";

export const Route = createFileRoute("/sitemap")({
  head: () => ({
    meta: [
      { title: "Sitemap — GeMShield" },
      { name: "description", content: "All public pages of the GeMShield platform." },
      { property: "og:title", content: "Sitemap — GeMShield" },
      { property: "og:description", content: "All public pages of the GeMShield platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SitemapPage,
});

function SitemapPage() {
  return (
    <PublicInfoPage title="Sitemap" intro="All public pages of the GeMShield platform.">
      <PendingOfficialContent />
    </PublicInfoPage>
  );
}
