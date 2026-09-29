import { cn } from "@/lib/utils";

export function GemShieldLogo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("select-none", className)}>
      <div className="font-display text-2xl leading-none font-bold tracking-tight text-foreground">
        GeMShield
      </div>
      {!compact && (
        <p className="mt-1 text-[11px] text-muted-foreground">Transparent Procurement. Stronger Bharat.</p>
      )}
      <span className="tricolour-rule mt-1.5 w-20" aria-hidden />
    </div>
  );
}
