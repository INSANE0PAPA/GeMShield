import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Eye, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/states/DataStates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/officer/users")({
  head: () => ({
    meta: [
      { title: "User Management — GeMShield" },
      { name: "description", content: "View users, assign roles and permissions, activate or deactivate accounts." },
    ],
  }),
  component: UserManagement,
});

type UserProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  organisation: string | null;
  account_type: string | null;
  approval_status: string;
  roles: string[];
  created_at: string | null;
};

function UserManagement() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<UserProfile | null>(null);

  const users = useQuery({
    queryKey: ["users-admin"],
    queryFn: async () => {
      return await apiFetch<UserProfile[]>("/api/admin/users");
    }
  });

  const shown = useMemo(() => {
    if (!users.data) return [];
    return users.data.filter(u => {
      const q = query.toLowerCase();
      return !q || (u.full_name && u.full_name.toLowerCase().includes(q)) || (u.organisation && u.organisation.toLowerCase().includes(q));
    });
  }, [users.data, query]);

  if (users.isPending) return <LoadingState label="Loading users..." />;
  if (users.error) return <ErrorState error={users.error} onRetry={() => users.refetch()} />;

  return (
    <div className="space-y-3">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link to="/officer/dashboard" className="text-primary">Dashboard</Link> › User Management
      </nav>
      <header className="flex flex-wrap items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">User Directory</h1>
          <p className="text-sm text-muted-foreground">Directory of registered users, profiles and active roles.</p>
        </div>
      </header>
      
      <section className="rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-9 pl-8 text-xs" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or organisation..." />
          </div>
        </div>
        
        {shown.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Organisation</th>
                  <th className="px-3 py-2 font-medium">Account Type</th>
                  <th className="px-3 py-2 font-medium">Roles</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(u => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-3 py-2 font-semibold">{u.full_name || "—"}</td>
                    <td className="px-3 py-2">{u.organisation || "—"}</td>
                    <td className="px-3 py-2 capitalize">{u.account_type || "—"}</td>
                    <td className="px-3 py-2">
                        {u.roles.length > 0 ? u.roles.join(", ") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("rounded px-2 py-0.5 font-semibold capitalize", u.approval_status === "approved" ? "bg-success/10 text-success" : u.approval_status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning")}>
                        {u.approval_status || "pending"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setSelected(u)} aria-label="View user">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4"><EmptyState title="No users found" description="There are no users matching your search." /></div>
        )}
      </section>

      <UserDialog user={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function UserDialog({ user, onClose }: { user: UserProfile | null; onClose: () => void }) {
  if (!user) return null;
  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{user.full_name || "User Details"}</DialogTitle>
          <DialogDescription>Profile and role information.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <Detail label="Full Name" value={user.full_name} />
          <Detail label="Phone" value={user.phone} />
          <Detail label="Organisation" value={user.organisation} />
          <Detail label="Account Type" value={user.account_type} className="capitalize" />
          <Detail label="Status" value={user.approval_status} className="capitalize" />
          <Detail label="Roles" value={user.roles.join(", ")} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value, className }: { label: string; value: string | null | undefined; className?: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("font-medium", className)}>{value || "—"}</div>
    </div>
  );
}
