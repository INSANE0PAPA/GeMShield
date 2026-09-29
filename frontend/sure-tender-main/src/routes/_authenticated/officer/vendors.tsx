import { createFileRoute } from "@tanstack/react-router";
import { SectionScaffold } from "@/components/states/SectionScaffold";

export const Route = createFileRoute("/_authenticated/officer/vendors")({
  head: () => ({
    meta: [
      { title: "Vendor Management — GeMShield" },
      { name: "description", content: "Directory, performance, compliance status, risk and onboarding." },
      { property: "og:title", content: "Vendor Management — GeMShield" },
      { property: "og:description", content: "Directory, performance, compliance status, risk and onboarding." },
    ],
  }),
  component: VendorManagement,
});

function VendorManagement() {
  return (
    <SectionScaffold
      title="Vendor Management"
      description="Directory, performance, compliance status, risk and onboarding."
      note="Registered vendors are listed here; directory and onboarding tooling is delivered in a later phase."
    />
  );
}
