import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { BookOpen, Bot, ChevronLeft, ChevronRight, Copy, FileText, Headphones, Loader2, PlayCircle, Rocket, Search, Send, ShieldCheck, Wallet, Wrench, Download, ClipboardList } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askAssistant } from "@/lib/compliance.functions";
import { useSession } from "@/hooks/useSession";
import { useLanguage } from "@/lib/language";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/vendor/help")({
  head: () => ({
    meta: [
      { title: "Help & Guidelines — GeMShield" },
      { name: "description", content: "Find answers, learn processes, and get instant help with the GeMShield AI Assistant." },
      { property: "og:title", content: "Help & Guidelines — GeMShield" },
      { property: "og:description", content: "Vendor guides, FAQs and the GeMShield AI Assistant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorHelp,
});

type Msg = { role: "user" | "assistant"; content: string; at: string };
const GUIDES = [
  { icon: Rocket, tone: "text-destructive bg-destructive/10", title: "Getting Started", desc: "Registration, profile setup and eligibility", q: "How do I register and complete my vendor profile?" },
  { icon: FileText, tone: "text-primary bg-primary/10", title: "Tender Participation", desc: "Find tenders, submit bids and track status", q: "How do I find a tender and submit a bid?" },
  { icon: ShieldCheck, tone: "text-success bg-success/10", title: "Compliance & Certification", desc: "OEM authorization, compliance checks and standards", q: "How does the GeMShield compliance check score my documents?" },
  { icon: Wallet, tone: "text-warning bg-warning/15", title: "Financial Information", desc: "EMD, turnover and payment terms", q: "What financial details (EMD, turnover) must my bid include?" },
  { icon: ClipboardList, tone: "text-destructive bg-destructive/10", title: "Bid Management", desc: "Drafts, submission and clarifications", q: "Can I edit a bid after I submit it?" },
  { icon: Wrench, tone: "text-primary bg-primary/10", title: "Troubleshooting", desc: "Common issues and fixes", q: "My PDF shows no readable text in the compliance check. What should I do?" },
];
const TOPICS = ["How to register as a vendor?", "Document verification process", "Product compliance requirements", "How to submit a bid?", "OEM authorization", "Bid validity period", "Technical specifications format", "What is EMD?"];

function VendorHelp() {
  const ask = askAssistant;
  const { session } = useSession();
  const { language } = useLanguage();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState(""); const [filter, setFilter] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs]);
  const send = useMutation({
    mutationFn: async (text: string) => { const next = [...msgs, { role: "user" as const, content: text, at: new Date().toISOString() }]; setMsgs(next); setInput(""); const r = await ask({ data: { audience: "vendor", language, messages: next.slice(-20).map(({ role, content }) => ({ role, content })) } }); return r.reply; },
    onSuccess: (reply) => setMsgs((m) => [...m, { role: "assistant", content: reply, at: new Date().toISOString() }]),
    onError: (e: Error) => { toast.error(e.message); setMsgs((m) => [...m, { role: "assistant", content: `Sorry — I couldn't answer right now (${e.message}).`, at: new Date().toISOString() }]); },
  });
  const go = (q: string) => { if (!send.isPending && q.trim()) { send.mutate(q.trim()); chatRef.current?.scrollIntoView({ behavior: "smooth" }); } };
  async function ticket() { const text = window.prompt("Describe your issue for the support team:"); if (!text?.trim() || !session) return; try { await apiFetch("/api/helpdesk/tickets", { method: "POST", body: JSON.stringify({ subject: "Support Request", body: text.slice(0, 500), category: "general" }) }); toast.success("Support ticket raised — the procurement team will review it."); } catch (e: any) { toast.error(e.message); } }
  const time = (d: string) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const topics = TOPICS.filter((t) => t.toLowerCase().includes(filter.toLowerCase()));

  return <div className="space-y-3">
    <nav className="flex items-center gap-1 text-xs text-muted-foreground"><ChevronLeft className="h-3.5 w-3.5" /><Link to="/vendor/dashboard" className="text-primary">Home</Link> › Help & Guidelines</nav>
    <div className="flex flex-wrap items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card text-primary"><BookOpen className="h-6 w-6" /></div><div><h1 className="font-display text-2xl font-bold">Help & Guidelines</h1><p className="text-sm text-muted-foreground">Find answers, learn processes, and get instant help with our AI Assistant.</p></div>
      <div className="ml-auto flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => go("Walk me through the full vendor process step by step.")}><PlayCircle className="mr-1 h-4 w-4" />Guided Walkthrough</Button><Button variant="outline" size="sm" asChild><a href="https://gem.gov.in/" target="_blank" rel="noopener noreferrer"><Download className="mr-1 h-4 w-4" />Official GeM Resources</a></Button><Button variant="outline" size="sm" onClick={ticket}><Headphones className="mr-1 h-4 w-4" />Raise a Support Ticket</Button></div></div>

    <div className="grid gap-3 xl:grid-cols-[1.35fr_1fr]">
      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-info/10 p-5"><h2 className="font-display text-2xl font-bold text-primary">Get Instant Help with<br />GeMShield Assistant</h2><p className="mt-2 max-w-sm text-sm text-muted-foreground">Your AI-powered guide for everything related to GeM procurement, compliance, and bidding.</p><div className="mt-3 flex flex-wrap gap-2 text-[11px]">{["24×7 Support", "Instant Answers", "Grounded in approved guidance"].map((t, i) => <span key={t} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1"><span className={["bg-success", "bg-primary", "bg-gold"][i] + " h-2 w-2 rounded-full"} />{t}</span>)}</div><Bot className="absolute -right-2 bottom-0 h-32 w-32 text-primary/25" /></div>
        <section><div className="flex items-center"><div><h3 className="text-sm font-semibold">Browse Guidelines</h3><p className="text-xs text-muted-foreground">Step-by-step guides — each opens an answer from the assistant.</p></div></div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{GUIDES.map((g) => <button key={g.title} onClick={() => go(g.q)} className="flex items-start gap-3 rounded-lg border border-border p-3 text-left hover:border-primary/50"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${g.tone}`}><g.icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-xs font-semibold">{g.title}</span><span className="block text-[11px] text-muted-foreground">{g.desc}</span></span><ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 self-end text-muted-foreground" /></button>)}</div></section>
        <section><h3 className="text-sm font-semibold">Popular Topics</h3><div className="relative mt-2"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input className="h-8 pl-8 text-xs" placeholder="Filter topics…" value={filter} onChange={(e) => setFilter(e.target.value)} /></div><div className="mt-2 flex flex-wrap gap-2">{topics.map((t) => <button key={t} onClick={() => go(t)} className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] hover:border-primary hover:text-primary"><Search className="h-3 w-3" />{t}</button>)}</div></section>
        <section><h3 className="text-sm font-semibold">Useful Resources</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{[["GeM Portal", "Official Government e-Marketplace", "https://gem.gov.in/"], ["GeM General Terms & Conditions", "Official GTC documents on GeM", "https://gem.gov.in/termsAndConditions"], ["Open Government Data", "Official datasets (data.gov.in)", "https://data.gov.in/"], ["My Compliance Check", "Check a bid PDF before submitting", "/vendor/compliance"]].map(([t, d, h]) => h!.startsWith("/") ? <Link key={t} to={h!} className="flex items-center gap-2 rounded-lg border border-border p-3 text-xs hover:border-primary/50"><ShieldCheck className="h-5 w-5 text-success" /><span><b className="block">{t}</b><span className="text-muted-foreground">{d}</span></span></Link> : <a key={t} href={h} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-border p-3 text-xs hover:border-primary/50"><FileText className="h-5 w-5 text-destructive" /><span><b className="block">{t}</b><span className="text-muted-foreground">{d}</span></span></a>)}</div></section>
      </div>

      <div ref={chatRef} className="flex h-[760px] flex-col rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border p-4"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10"><Bot className="h-6 w-6 text-primary" /></span><div className="flex-1"><p className="flex items-center gap-2 font-semibold">GeMShield Assistant <span className="rounded bg-primary/10 px-1.5 text-[10px] text-primary">AI</span></p><p className="text-[11px] text-muted-foreground">Ask anything about GeM procurement, compliances, tenders and more.</p></div><span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">● Online</span></div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="flex gap-2"><Bot className="mt-1 h-6 w-6 shrink-0 text-primary" /><div className="rounded-xl bg-muted p-3 text-xs"><p>Hello! I'm your GeMShield Assistant. I can help you with:</p><ul className="mt-1 list-disc pl-4"><li>Registration and profile setup</li><li>Finding and participating in tenders</li><li>Document and compliance requirements</li><li>OEM authorization and product listing</li><li>Payment and financial queries</li><li>General guidelines and troubleshooting</li></ul><p className="mt-1">How can I assist you today?</p></div></div>
          {msgs.map((m, i) => m.role === "user" ? <div key={i} className="flex justify-end"><div className="max-w-[80%] rounded-xl bg-primary px-3 py-2 text-xs text-primary-foreground">{m.content}<p className="mt-1 text-right text-[9px] opacity-70">{time(m.at)}</p></div></div>
            : <div key={i} className="flex gap-2"><Bot className="mt-1 h-6 w-6 shrink-0 text-primary" /><div className="max-w-[88%] rounded-xl bg-muted p-3 text-xs"><div className="prose prose-sm max-w-none text-xs text-foreground dark:prose-invert [&_li]:my-0.5 [&_p]:my-1"><ReactMarkdown>{m.content}</ReactMarkdown></div><div className="mt-1 flex items-center gap-2 text-[9px] text-muted-foreground">{time(m.at)}<button aria-label="Copy answer" className="ml-auto" onClick={() => { navigator.clipboard.writeText(m.content); toast.success("Copied"); }}><Copy className="h-3 w-3" /></button></div></div></div>)}
          {send.isPending && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Assistant is thinking…</div>}
          <div ref={endRef} />
        </div>
        <div className="flex flex-wrap gap-2 px-4 pb-2">{["How to register?", "What is compliance score?", "How to submit a bid?"].map((q) => <button key={q} onClick={() => go(q)} className="rounded-full border border-primary/30 px-3 py-1 text-[11px] text-primary">{q}</button>)}</div>
        <form className="flex gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); go(input); }}><Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question here…" maxLength={2000} /><Button type="submit" size="icon" disabled={send.isPending || !input.trim()} aria-label="Send"><Send className="h-4 w-4" /></Button></form>
        <p className="px-3 pb-2 text-center text-[10px] text-muted-foreground">AI responses are for guidance only. For official information, please refer to GeM policies.</p>
      </div>
    </div>
  </div>;
}
