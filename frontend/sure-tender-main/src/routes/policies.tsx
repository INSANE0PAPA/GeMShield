import { createFileRoute } from "@tanstack/react-router";
import { PublicInfoPage, PendingOfficialContent } from "@/components/landing/PublicInfoPage";

export const Route = createFileRoute("/policies")({
  head: () => ({
    meta: [
      { title: "Guidelines & Policies — GeMShield" },
      { name: "description", content: "Official procurement guidelines, rules and circulars." },
      { property: "og:title", content: "Guidelines & Policies — GeMShield" },
      { property: "og:description", content: "Official procurement guidelines, rules and circulars." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PoliciesPage,
});

function PoliciesPage() {
  return (
    <PublicInfoPage title="Guidelines & Policies" intro="Official procurement guidelines, rules and circulars.">
      <PendingOfficialContent />
    </PublicInfoPage>
  );
}
