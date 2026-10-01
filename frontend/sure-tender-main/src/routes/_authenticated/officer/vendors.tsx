import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Eye, Filter, Building2, Store } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/states/DataStates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/officer/vendors")({
  head: () => ({
    meta: [
      { title: "Vendor Management — GeMShield" },
      { name: "description", content: "Directory, performance, compliance status, risk and onboarding." },
    ],
  }),
  component: VendorManagement,
});

type Vendor = {
  id: string;
  owner_id: string;
  legal_name: string;
  trade_name: string | null;
  gstin: string | null;
  pan: string | null;
  udyam_number: string | null;
  category: string | null;
  address: string | null;
  state: string | null;
  city: string | null;
  pincode: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  onboarding_status: string;
  verification_notes: string | null;
  status: string;
  created_at: string | null;
};

function VendorManagement() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Vendor | null>(null);

  const vendors = useQuery({
    queryKey: ["vendors-admin"],
    queryFn: async () => {
      return await apiFetch<Vendor[]>("/api/admin/vendors");
    }
  });

  const shown = useMemo(() => {
    if (!vendors.data) return [];
    return vendors.data.filter(v => {
      const q = query.toLowerCase();
      return !q || (v.legal_name && v.legal_name.toLowerCase().includes(q)) || (v.trade_name && v.trade_name.toLowerCase().includes(q)) || (v.gstin && v.gstin.toLowerCase().includes(q));
    });
  }, [vendors.data, query]);

  if (vendors.isPending) return <LoadingState label="Loading vendors..." />;
  if (vendors.error) return <ErrorState error={vendors.error} onRetry={() => vendors.refetch()} />;

  return (
    <div className="space-y-3">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link to="/officer/dashboard" className="text-primary">Dashboard</Link> › Vendor Management
      </nav>
      <header className="flex flex-wrap items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Store className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">Vendor Directory</h1>
          <p className="text-sm text-muted-foreground">Directory of registered vendors, their compliance and verification state.</p>
        </div>
      </header>
      
      <section className="rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-9 pl-8 text-xs" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, trade name, or GSTIN..." />
          </div>
        </div>
        
        {shown.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Legal Name</th>
                  <th className="px-3 py-2 font-medium">Trade Name</th>
                  <th className="px-3 py-2 font-medium">GSTIN</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(v => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="px-3 py-2 font-semibold">{v.legal_name || "—"}</td>
                    <td className="px-3 py-2">{v.trade_name || "—"}</td>
                    <td className="px-3 py-2 font-mono">{v.gstin || "—"}</td>
                    <td className="px-3 py-2 capitalize">{v.category || "—"}</td>
                    <td className="px-3 py-2">
                      <span className={cn("rounded px-2 py-0.5 font-semibold capitalize", v.onboarding_status === "verified" ? "bg-success/10 text-success" : v.onboarding_status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning")}>
                        {v.onboarding_status || "pending"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setSelected(v)} aria-label="View vendor">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4"><EmptyState title="No vendors found" description="There are no vendors matching your search." /></div>
        )}
      </section>

      <VendorDialog vendor={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function VendorDialog({ vendor, onClose }: { vendor: Vendor | null; onClose: () => void }) {
  if (!vendor) return null;
  return (
    <Dialog open={Boolean(vendor)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{vendor.legal_name || "Vendor Details"}</DialogTitle>
          <DialogDescription>Full verification and compliance profile.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <Detail label="Legal Name" value={vendor.legal_name} />
          <Detail label="Trade Name" value={vendor.trade_name} />
          <Detail label="GSTIN" value={vendor.gstin} className="font-mono" />
          <Detail label="PAN" value={vendor.pan} className="font-mono" />
          <Detail label="Udyam Number" value={vendor.udyam_number} className="font-mono" />
          <Detail label="Category" value={vendor.category} />
          <div className="sm:col-span-2">
            <Detail label="Address" value={[vendor.address, vendor.city, vendor.state, vendor.pincode].filter(Boolean).join(", ")} />
          </div>
          <Detail label="Email" value={vendor.contact_email} />
          <Detail label="Phone" value={vendor.contact_phone} />
          <Detail label="Verification Status" value={vendor.onboarding_status} />
          <Detail label="Account Status" value={vendor.status} />
          {vendor.verification_notes && (
            <div className="sm:col-span-2">
              <Detail label="Verification Notes" value={vendor.verification_notes} />
            </div>
          )}
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
