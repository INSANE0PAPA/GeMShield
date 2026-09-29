import { BadgeCheck, BarChart3, Bell, BookOpen, ClipboardList, FileSearch, FilePlus2, FileText, Gavel, LayoutDashboard, ScrollText, Search, Settings, ShieldCheck, Users, UsersRound, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DashboardCopy } from "@/lib/dashboard-translations";

export type NavItem = { key: string; title: string; to: string; icon: LucideIcon; exact?: boolean };
const item = (key:string,title:string,to:string,icon:LucideIcon,exact=false):NavItem => ({key,title,to,icon,exact});

export function vendorNav(t: DashboardCopy): NavItem[] { const n=t.nav; return [
 item("dashboard",n.dashboard,"/vendor/dashboard",LayoutDashboard,true), item("find",n.findTenders,"/vendor/find-tenders",Search), item("bids",n.myBids,"/vendor/my-bids",FileText), item("compliance",n.compliance,"/vendor/compliance",ShieldCheck), item("passport",n.passport,"/vendor/bid-passport",BadgeCheck), item("notifications",n.notifications,"/vendor/notifications",Bell), item("profile",n.profile,"/vendor/profile",Settings), item("help",n.help,"/vendor/help",BookOpen)
]; }
export function officerNav(t: DashboardCopy): NavItem[] { const n=t.nav; return [
 item("dashboard",n.dashboard,"/officer/dashboard",LayoutDashboard,true), item("create",n.createTender,"/officer/tenders/create",FilePlus2), item("manage",n.manageTenders,"/officer/tenders/manage",ClipboardList), item("bids",n.bidVerification,"/officer/bids",ShieldCheck), item("ai",n.aiCompliance,"/officer/ai-compliance",FileSearch), item("review",n.humanReview,"/officer/human-review",UsersRound), item("decisions",n.decisions,"/officer/decisions",Gavel), item("reports",n.reports,"/officer/reports",BarChart3), item("vendors",n.vendors,"/officer/vendors",Users), item("rules",n.rules,"/officer/rules",Wrench), item("users",n.users,"/officer/users",Users), item("sources",n.sources,"/officer/sources",FileText), item("audit",n.audit,"/officer/audit",ScrollText), item("notifications",n.notifications,"/officer/notifications",Bell), item("profile",n.profile,"/officer/profile",Settings), item("help",n.help,"/officer/help",BookOpen)
]; }
