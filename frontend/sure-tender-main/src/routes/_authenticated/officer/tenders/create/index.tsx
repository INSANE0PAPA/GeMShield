import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/officer/tenders/create/")({
  beforeLoad: () => { throw redirect({ to: "/officer/tenders/create/$stage", params: { stage: "basic" } }); },
});
