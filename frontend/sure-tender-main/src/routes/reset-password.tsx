import { createFileRoute } from "@tanstack/react-router";
import { PasswordRecovery } from "@/components/auth/PasswordRecovery";

export const Route = createFileRoute("/reset-password")({
  head:()=>({meta:[
    {title:"Set a new password — GeMShield"},
    {name:"description",content:"Securely set a new password for your GeMShield account."},
    {property:"og:title",content:"Set a new password — GeMShield"},
    {property:"og:description",content:"Securely set a new password for your GeMShield account."},
  ]}),
  component:()=> <PasswordRecovery mode="reset" />,
});