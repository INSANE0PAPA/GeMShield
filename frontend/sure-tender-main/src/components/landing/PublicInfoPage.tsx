import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { GemShieldLogo } from "@/components/brand/GemShieldLogo";

export function PublicInfoPage({ title, intro, children }: { title: string; intro: string; children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/"><GemShieldLogo /></Link>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="font-display text-4xl font-semibold text-foreground">{title}</h1>
        <div className="tricolour-rule mt-3 h-1 w-24" />
        <p className="mt-6 max-w-3xl text-muted-foreground">{intro}</p>
        <div className="mt-8 space-y-4 text-foreground">{children}</div>
      </main>
    </div>
  );
}

export function PendingOfficialContent() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-card">
      Official content for this page has not been published yet. Please refer to the authorised GeM / government
      sources until the approved text is added here.
    </div>
  );
}
