import { createFileRoute } from "@tanstack/react-router";
import { PasswordRecovery } from "@/components/auth/PasswordRecovery";

export const Route = createFileRoute("/forgot-password")({
  head:()=>({meta:[
    {title:"Password recovery — GeMShield"},
    {name:"description",content:"Securely recover your GeMShield account."},
    {property:"og:title",content:"Password recovery — GeMShield"},
    {property:"og:description",content:"Securely recover your GeMShield account."},
  ]}),
  component:PasswordRecovery,
});
