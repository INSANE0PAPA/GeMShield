import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardCard({ icon: Icon, title, subtitle, action, children, className, tone = "blue" }: { icon?: LucideIcon; title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string; tone?: "blue"|"green"|"orange"|"purple"|"red" }) {
  const tones = { blue:"bg-info/10 text-info", green:"bg-success/10 text-success", orange:"bg-warning/15 text-warning", purple:"bg-secondary text-primary", red:"bg-destructive/10 text-destructive" };
  return <section className={cn("overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-card)]", className)}>
    <header className="flex min-h-14 items-start gap-3 px-4 py-3">
      {Icon && <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", tones[tone])}><Icon className="h-5 w-5"/></span>}
      <div className="min-w-0"><h2 className="font-display text-base font-bold leading-tight text-foreground">{title}</h2>{subtitle && <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{subtitle}</p>}</div>
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </header>
    {children}
  </section>;
}

export function CompactEmpty({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) {
  return <div className="flex min-h-28 flex-col items-center justify-center border-t border-border px-5 py-5 text-center"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"><Icon className="h-5 w-5 text-muted-foreground"/></span><p className="mt-2 text-xs font-semibold text-foreground">{title}</p>{description && <p className="mt-1 max-w-md text-[10px] leading-relaxed text-muted-foreground">{description}</p>}</div>;
}
