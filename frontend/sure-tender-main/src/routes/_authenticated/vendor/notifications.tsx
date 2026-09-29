import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/components/pages/NotificationsPage";

export const Route = createFileRoute("/_authenticated/vendor/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — GeMShield Vendor" },
      { name: "description", content: "Bid updates, clarification requests and decision alerts for your bids." },
      { property: "og:title", content: "Notifications — GeMShield Vendor" },
      { property: "og:description", content: "Bid updates, clarification requests and decision alerts." },
    ],
  }),
  component: NotificationsPage,
});
