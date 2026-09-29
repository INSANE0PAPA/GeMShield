import { createFileRoute } from "@tanstack/react-router";
import { SectionScaffold } from "@/components/states/SectionScaffold";

export const Route = createFileRoute("/_authenticated/officer/users")({
  head: () => ({
    meta: [
      { title: "User Management — GeMShield" },
      { name: "description", content: "View users, assign roles and permissions, activate or deactivate accounts." },
      { property: "og:title", content: "User Management — GeMShield" },
      { property: "og:description", content: "View users, assign roles and permissions, activate or deactivate accounts." },
    ],
  }),
  component: UserManagement,
});

function UserManagement() {
  return (
    <SectionScaffold
      title="User Management"
      description="View users, assign roles and permissions, activate or deactivate accounts."
      note="Role administration is delivered in the administration phase."
    />
  );
}
