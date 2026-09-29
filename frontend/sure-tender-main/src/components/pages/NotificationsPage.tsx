import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/states/DataStates";
import { PageHeader } from "@/components/states/SectionScaffold";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";

const SEVERITY_CLASS: Record<string, string> = {
  info: "bg-info/15 text-info",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  critical: "bg-destructive/15 text-destructive",
};

export function NotificationsPage() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const data = await apiFetch<any>("/api/notifications?limit=200");
      return data.notifications;
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await apiFetch("/api/notifications/read-all", { method: "PUT" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
    },
  });

  const unread = (query.data ?? []).filter((n) => !n.read_at).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications"
        description="Bid updates, clarifications, decisions and system alerts."
        actions={
          unread > 0 ? (
            <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
              <CheckCheck className="mr-2 h-4 w-4" /> Mark all as read
            </Button>
          ) : undefined
        }
      />

      {query.isPending ? (
        <LoadingState label="Loading notifications…" />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data?.length ? (
        <ul className="space-y-2">
          {query.data.map((n) => (
            <li
              key={n.id}
              className={cn(
                "flex gap-3 rounded-xl border border-border bg-card p-4",
                !n.read_at && "border-l-4 border-l-primary",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  SEVERITY_CLASS[n.severity] ?? SEVERITY_CLASS['info'],
                )}
              >
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.category} · {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No notifications"
          description="Updates about your tenders, bids and decisions will appear here."
        />
      )}
    </div>
  );
}
