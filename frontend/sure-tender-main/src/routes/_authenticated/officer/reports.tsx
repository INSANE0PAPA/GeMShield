import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, 
  Activity, Users, ShieldAlert, Target, BookOpen, AlertTriangle
} from "lucide-react";
import { 
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, 
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis 
} from "recharts";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/states/DataStates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/officer/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — GeMShield" },
      { name: "description", content: "Compliance insights, vendor performance, flags, trends and custom reports." },
    ],
  }),
  component: ReportsPage,
});

const COLORS = ["var(--primary)", "var(--success)", "var(--warning)", "var(--destructive)", "var(--info)"];

function ReportsPage() {
  const [tab, setTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "compliance", label: "AI Compliance Insights", icon: ShieldAlert },
    { id: "vendor", label: "Vendor Performance", icon: Users },
    { id: "product", label: "Product / Service Analysis", icon: Target },
    { id: "flags", label: "Flag Analysis", icon: AlertTriangle },
    { id: "trends", label: "Trends & Forecast", icon: LineChartIcon },
    { id: "custom", label: "Custom Reports", icon: BookOpen },
  ];

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link to="/officer/dashboard" className="text-primary">Dashboard</Link> › Reports & Analytics
      </nav>
      
      <header className="flex flex-wrap items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BarChart3 className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Compliance insights, vendor performance, flags, trends and custom reports.</p>
        </div>
      </header>

      <div className="flex space-x-2 border-b border-border overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-2">
        {tab === "overview" && <OverviewReport />}
        {tab === "compliance" && <ComplianceReport />}
        {tab === "vendor" && <VendorReport />}
        {tab === "product" && <EmptyState title="Not enough data" description="More procurement data is needed to generate Product / Service analysis." />}
        {tab === "flags" && <FlagsReport />}
        {tab === "trends" && <TrendsReport />}
        {tab === "custom" && <EmptyState title="Custom Reports" description="Custom report generation capabilities are not yet configured." />}
      </div>
    </div>
  );
}

function OverviewReport() {
  const query = useQuery({
    queryKey: ["reports", "overview"],
    queryFn: async () => await apiFetch<any>("/api/reports/overview")
  });

  if (query.isPending) return <LoadingState label="Loading overview..." />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const data = query.data;
  
  const stageData = Object.entries(data.bids_by_stage || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <KpiCard title="Total Tenders" value={data.kpis.total_tenders} />
        <KpiCard title="Total Bids" value={data.kpis.total_bids} />
        <KpiCard title="Total Vendors" value={data.kpis.total_vendors} />
        <KpiCard title="Compliance Runs" value={data.kpis.total_compliance_runs} />
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-4 text-sm font-semibold">Bids by Stage</h3>
        {stageData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--card)", borderColor: "var(--border)" }} />
                <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="No Bids" description="No bid data available yet." />
        )}
      </div>
    </div>
  );
}

function ComplianceReport() {
  const query = useQuery({
    queryKey: ["reports", "compliance"],
    queryFn: async () => await apiFetch<any>("/api/reports/compliance")
  });

  if (query.isPending) return <LoadingState label="Loading compliance data..." />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const stats = query.data.rule_stats || {};
  const rules = Object.keys(stats);

  if (rules.length === 0) {
    return <EmptyState title="No Compliance Data" description="No AI compliance jobs have been executed yet." />;
  }

  const chartData = rules.map(rule => ({
    name: rule,
    Pass: stats[rule].pass || 0,
    Fail: stats[rule].fail || 0,
    Warning: stats[rule].warning || 0,
  }));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-4 text-sm font-semibold">Rule Execution Results</h3>
        <div className="h-80">
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} angle={-45} textAnchor="end" />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--card)", borderColor: "var(--border)" }} />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="Pass" stackId="a" fill="var(--success)" />
              <Bar dataKey="Warning" stackId="a" fill="var(--warning)" />
              <Bar dataKey="Fail" stackId="a" fill="var(--destructive)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function VendorReport() {
  const query = useQuery({
    queryKey: ["reports", "vendor"],
    queryFn: async () => await apiFetch<any>("/api/reports/vendor-performance")
  });

  if (query.isPending) return <LoadingState label="Loading vendor performance..." />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const data = query.data;
  const statusData = Object.entries(data.onboarding_status || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-4 text-sm font-semibold">Vendor Onboarding Status</h3>
        {statusData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} label>
                  {statusData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--card)", borderColor: "var(--border)" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="No Vendor Data" description="No vendors have registered yet." />
        )}
      </div>
    </div>
  );
}

function FlagsReport() {
  const query = useQuery({
    queryKey: ["reports", "flags"],
    queryFn: async () => await apiFetch<any>("/api/reports/flags")
  });

  if (query.isPending) return <LoadingState label="Loading flag analysis..." />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const flagsData = Object.entries(query.data.review_cases_by_status || {}).map(([name, value]) => ({ name, value }));

  if (flagsData.length === 0) return <EmptyState title="No Flags" description="No manual review cases or flags have been created yet." />;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold">Review Cases by Status</h3>
      <div className="h-64">
        <ResponsiveContainer>
          <BarChart data={flagsData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
            <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={12} width={100} />
            <Tooltip contentStyle={{ background: "var(--card)", borderColor: "var(--border)" }} />
            <Bar dataKey="value" fill="var(--warning)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TrendsReport() {
  const query = useQuery({
    queryKey: ["reports", "trends"],
    queryFn: async () => await apiFetch<any>("/api/reports/trends")
  });

  if (query.isPending) return <LoadingState label="Loading trends..." />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const trendData = Object.entries(query.data.tenders_over_time || {})
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (trendData.length === 0) return <EmptyState title="No Trends" description="Not enough data to calculate trends." />;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold">Tenders Published Over Time</h3>
      <div className="h-64">
        <ResponsiveContainer>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "var(--card)", borderColor: "var(--border)" }} />
            <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h4 className="text-xs text-muted-foreground">{title}</h4>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
