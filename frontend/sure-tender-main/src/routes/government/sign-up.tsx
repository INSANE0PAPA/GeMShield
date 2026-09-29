import { createFileRoute } from "@tanstack/react-router";
import { AuthExperience } from "@/components/auth/AuthExperience";
const title = "Government Official Registration — GeMShield";
const description = "Submit official details for authorized GeMShield access approval.";
export const Route = createFileRoute("/government/sign-up")({ head:()=>({meta:[{title},{name:"description",content:description},{property:"og:title",content:title},{property:"og:description",content:description},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}), component:()=> <AuthExperience role="officer" mode="signup" /> });
