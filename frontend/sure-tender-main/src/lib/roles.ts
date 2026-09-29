export type AppRole = "admin" | "procurement_officer" | "reviewer" | "vendor";

export const OFFICER_ROLES: AppRole[] = ["admin", "procurement_officer", "reviewer"];

export function isOfficerRole(roles: AppRole[]) {
  return roles.some((r) => OFFICER_ROLES.includes(r));
}

export function isVendorRole(roles: AppRole[]) {
  return roles.includes("vendor");
}

export function homeRouteForRoles(roles: AppRole[]): "/officer/dashboard" | "/vendor/dashboard" {
  if (isOfficerRole(roles)) return "/officer/dashboard";
  return "/vendor/dashboard";
}

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrator",
  procurement_officer: "Procurement Officer",
  reviewer: "Reviewer",
  vendor: "Vendor",
};
