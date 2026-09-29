import { createFileRoute } from "@tanstack/react-router";
import { AuthExperience } from "@/components/auth/AuthExperience";
const title = "Vendor Sign In — GeMShield";
const description = "Secure access for registered GeMShield vendors.";
export const Route = createFileRoute("/vendor/sign-in")({ head:()=>({meta:[{title},{name:"description",content:description},{property:"og:title",content:title},{property:"og:description",content:description},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}), component:()=> <AuthExperience role="vendor" mode="signin" /> });
