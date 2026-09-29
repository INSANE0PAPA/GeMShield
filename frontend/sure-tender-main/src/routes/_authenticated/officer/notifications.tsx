import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/components/pages/NotificationsPage";

export const Route = createFileRoute("/_authenticated/officer/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — GeMShield Officer" },
      { name: "description", content: "Workflow alerts for tenders, verification runs and review cases." },
      { property: "og:title", content: "Notifications — GeMShield Officer" },
      { property: "og:description", content: "Workflow alerts for tenders, verification runs and review cases." },
    ],
  }),
  component: NotificationsPage,
});
