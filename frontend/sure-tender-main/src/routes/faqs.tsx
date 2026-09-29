import { createFileRoute } from "@tanstack/react-router";
import { PublicInfoPage, PendingOfficialContent } from "@/components/landing/PublicInfoPage";

export const Route = createFileRoute("/faqs")({
  head: () => ({
    meta: [
      { title: "Frequently Asked Questions — GeMShield" },
      { name: "description", content: "Answers to common questions about GeMShield procurement compliance." },
      { property: "og:title", content: "Frequently Asked Questions — GeMShield" },
      { property: "og:description", content: "Answers to common questions about GeMShield procurement compliance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FaqsPage,
});

function FaqsPage() {
  return (
    <PublicInfoPage title="Frequently Asked Questions" intro="Answers to common questions about GeMShield procurement compliance.">
      <PendingOfficialContent />
    </PublicInfoPage>
  );
}
