import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { officerNav } from "@/components/layout/navigation";
import { useProfile } from "@/hooks/useSession";
import { LoadingState, ForbiddenState, ErrorState } from "@/components/states/DataStates";
import { isOfficerRole, isVendorRole } from "@/lib/roles";
import { useLanguage } from "@/lib/language";
import { DASHBOARD_TRANSLATIONS } from "@/lib/dashboard-translations";
export const Route=createFileRoute("/_authenticated/officer")({component:OfficerLayout});
function OfficerLayout(){const {data,isPending,error,refetch}=useProfile();const navigate=useNavigate();const {language}=useLanguage();const t=DASHBOARD_TRANSLATIONS[language];const roles=data?.roles??[];useEffect(()=>{if(!isPending&&data&&!isOfficerRole(roles)&&isVendorRole(roles))navigate({to:"/vendor/dashboard",replace:true});},[isPending,data,roles,navigate]);return <AppShell items={officerNav(t)} footerQuote={t.officer.footer} searchPlaceholder={t.officer.intro} notificationsHref="/officer/notifications" profileHref="/officer/profile">{isPending?<LoadingState label={t.states.loading}/>:error?<ErrorState error={error} onRetry={()=>refetch()}/>:!isOfficerRole(roles)?<ForbiddenState description="This area is for government procurement officers."/>:<Outlet/>}</AppShell>}
