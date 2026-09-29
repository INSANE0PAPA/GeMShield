import { createFileRoute } from "@tanstack/react-router";
import { AuthExperience } from "@/components/auth/AuthExperience";
const title = "Create Vendor Account — GeMShield";
const description = "Register a vendor account to participate in government tenders.";
export const Route = createFileRoute("/vendor/sign-up")({ head:()=>({meta:[{title},{name:"description",content:description},{property:"og:title",content:title},{property:"og:description",content:description},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}), component:()=> <AuthExperience role="vendor" mode="signup" /> });
