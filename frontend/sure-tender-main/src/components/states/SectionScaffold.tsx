import type { ReactNode } from "react";
import { Construction } from "lucide-react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="ml-auto flex gap-2">{actions}</div>}
    </div>
  );
}

/**
 * Honest placeholder for a section whose backend workflow is delivered in a
 * later build phase. It never renders invented business records.
 */
export function SectionScaffold({
  title,
  description,
  note,
}: {
  title: string;
  description: string;
  note: string;
}) {
  return (
    <div className="space-y-5">
      <PageHeader title={title} description={description} />
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent">
          <Construction className="h-6 w-6 text-accent-foreground" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-foreground">Not available yet</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}
