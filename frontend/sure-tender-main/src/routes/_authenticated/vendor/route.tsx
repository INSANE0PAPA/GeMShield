import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { vendorNav } from "@/components/layout/navigation";
import { useProfile } from "@/hooks/useSession";
import { LoadingState, ForbiddenState, ErrorState } from "@/components/states/DataStates";
import { isOfficerRole, isVendorRole } from "@/lib/roles";
import { useLanguage } from "@/lib/language";
import { DASHBOARD_TRANSLATIONS } from "@/lib/dashboard-translations";
export const Route=createFileRoute("/_authenticated/vendor")({component:VendorLayout});
function VendorLayout(){const {data,isPending,error,refetch}=useProfile();const navigate=useNavigate();const {language}=useLanguage();const t=DASHBOARD_TRANSLATIONS[language];const roles=data?.roles??[];useEffect(()=>{if(!isPending&&data&&!isVendorRole(roles)&&isOfficerRole(roles))navigate({to:"/officer/dashboard",replace:true});},[isPending,data,roles,navigate]);return <AppShell items={vendorNav(t)} footerQuote={t.vendor.footer} searchPlaceholder={t.vendor.findSub} notificationsHref="/vendor/notifications" profileHref="/vendor/profile">{isPending?<LoadingState label={t.states.loading}/>:error?<ErrorState error={error} onRetry={()=>refetch()}/>:!isVendorRole(roles)?<ForbiddenState description="This area is for registered vendors."/>:<Outlet/>}</AppShell>}
