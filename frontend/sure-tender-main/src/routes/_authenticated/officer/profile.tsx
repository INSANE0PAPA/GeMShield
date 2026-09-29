import { createFileRoute } from "@tanstack/react-router";
import { ProfileSettingsPage } from "@/components/pages/ProfileSettingsPage";

export const Route = createFileRoute("/_authenticated/officer/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Settings — GeMShield Officer" },
      { name: "description", content: "Manage your officer account details, security and appearance settings." },
      { property: "og:title", content: "Profile & Settings — GeMShield Officer" },
      { property: "og:description", content: "Manage your officer account details, security and appearance." },
    ],
  }),
  component: ProfileSettingsPage,
});
