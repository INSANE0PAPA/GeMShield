import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2, Lock, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
      {children}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <Frame>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
    </Frame>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Frame>
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </Frame>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : "Something went wrong loading this data.";
  return (
    <Frame>
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-5 w-5 text-destructive" />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">Could not load this data</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Frame>
  );
}

export function ForbiddenState({ description }: { description?: string }) {
  return (
    <Frame>
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-warning/15">
        <Lock className="h-5 w-5 text-warning" />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">You do not have access to this area</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {description ?? "Your account role does not permit this action. Contact your administrator."}
      </p>
    </Frame>
  );
}

export function NotFoundState({ title = "Record not found", description }: { title?: string; description?: string }) {
  return (
    <Frame>
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
        <SearchX className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
    </Frame>
  );
}
