import { createFileRoute } from "@tanstack/react-router";
import { ProfileSettingsPage } from "@/components/pages/ProfileSettingsPage";

export const Route = createFileRoute("/_authenticated/vendor/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Settings — GeMShield Vendor" },
      { name: "description", content: "Manage your vendor account details, security and appearance settings." },
      { property: "og:title", content: "Profile & Settings — GeMShield Vendor" },
      { property: "og:description", content: "Manage your vendor account details, security and appearance." },
    ],
  }),
  component: ProfileSettingsPage,
});
