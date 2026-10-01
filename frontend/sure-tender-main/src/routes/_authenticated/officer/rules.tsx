import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BookOpenCheck, ChevronLeft, Eye, FileClock, Filter, Plus, Save, Search, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/states/DataStates";
import { useLanguage } from "@/lib/language";
import { WORKSPACE_TRANSLATIONS } from "@/lib/workspace-translations";
import { cn } from "@/lib/utils";
import type { Json } from "@/integrations/supabase/types";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/officer/rules")({
  head: () => ({ meta: [{ title: "Rule Management — GeMShield" }, { name: "description", content: "Versioned deterministic compliance rules for procurement verification." }, { property: "og:title", content: "Rule Management — GeMShield" }, { property: "og:description", content: "Versioned deterministic compliance rules for procurement verification." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: RuleManagement,
});

type Rule = { id:string; name:string; type:string; validator?:string; keywords?:string[]; extraction_pattern?:string; min_value?:number; max_value?:number; expected:string; severity:"critical"|"warning"|"info"; suggestion:string; enabled?:boolean };
type Version = { id:string; version:string; status:string; rules:unknown; change_summary:string|null; created_at:string; published_at:string|null };
const parseRules = (value: unknown): Rule[] => Array.isArray(value) ? value.filter((x): x is Rule => Boolean(x) && typeof x === "object" && "id" in x && "name" in x) : [];
const categories: Record<string,string> = { R001:"Eligibility",R002:"Eligibility",R003:"Commercial",R004:"Financial",R005:"Eligibility",R006:"Financial",R007:"Eligibility",R008:"Commercial",R009:"Eligibility",R010:"Technical",R011:"Eligibility",R012:"Commercial",R013:"Technical",R014:"Eligibility",R015:"Technical" };

function RuleManagement() {
  const { language } = useLanguage(); const { common, rules: t } = WORKSPACE_TRANSLATIONS[language]; const qc = useQueryClient();
  const [query,setQuery]=useState(""); const [severity,setSeverity]=useState(""); const [category,setCategory]=useState(""); const [selected,setSelected]=useState<Rule|null>(null); const [versionId,setVersionId]=useState("");
  const [createOpen,setCreateOpen]=useState(false); const [versionName,setVersionName]=useState(""); const [summary,setSummary]=useState(""); const [publishReason,setPublishReason]=useState("");
  const versions=useQuery({queryKey:["rule-versions"],queryFn:async()=>{return await apiFetch<Version[]>("/api/admin/rules/versions");}});
  const chosen=versions.data?.find((v)=>v.id===versionId)??versions.data?.find((v)=>v.status==="published")??versions.data?.[0]; const allRules=parseRules(chosen?.rules);
  const shown=useMemo(()=>allRules.filter((r)=>{const cat=categories[r.id]??"General";return(!query||`${r.id} ${r.name} ${r.expected}`.toLowerCase().includes(query.toLowerCase()))&&(!severity||r.severity===severity)&&(!category||cat===category)}),[allRules,query,severity,category]);
  
  const createDraft=useMutation({
    mutationFn:async()=>{
      if(versionName.trim().length<3)throw new Error("Enter a version name.");
      if(!summary.trim())throw new Error("Enter a change summary.");
      const base=versions.data?.find((v)=>v.status==="published");
      if(!base)throw new Error("No published rulebook is available to copy.");
      const res = await apiFetch<{id:string}>("/api/admin/rules/versions", {
          method: "POST", body: JSON.stringify({ version: versionName.trim(), change_summary: summary.trim(), rules: base.rules })
      });
      return res.id;
    },
    onSuccess:async(id)=>{toast.success(t.draftCreated);setCreateOpen(false);setVersionName("");setSummary("");setVersionId(id);await qc.invalidateQueries({queryKey:["rule-versions"]});},
    onError:(e:Error)=>toast.error(e.message)
  });
  
  const saveRule=useMutation({
    mutationFn:async(rule:Rule)=>{
      if(!chosen||chosen.status!=="draft")throw new Error(t.immutable);
      if(!rule.id.trim()||!rule.name.trim()||!rule.expected.trim())throw new Error("Code, name and expected evidence are required.");
      const next=allRules.some((r)=>r.id===rule.id)?allRules.map((r)=>r.id===rule.id?rule:r):[...allRules,rule];
      await apiFetch(`/api/admin/rules/versions/${chosen.id}`, { method: "PATCH", body: JSON.stringify({ rules: next }) });
    },
    onSuccess:async()=>{toast.success(t.ruleSaved);setSelected(null);await qc.invalidateQueries({queryKey:["rule-versions"]});},
    onError:(e:Error)=>toast.error(e.message)
  });
  
  const publish=useMutation({
    mutationFn:async()=>{
      if(!chosen||chosen.status!=="draft")throw new Error("Select a draft version.");
      await apiFetch(`/api/admin/rules/versions/${chosen.id}/publish`, { method: "POST", body: JSON.stringify({ justification: publishReason.trim() }) });
    },
    onSuccess:async()=>{toast.success(t.versionPublished);setPublishReason("");await qc.invalidateQueries({queryKey:["rule-versions"]});},
    onError:(e:Error)=>toast.error(e.message)
  });
  if(versions.isPending)return <LoadingState label={common.loading}/>; if(versions.error)return <ErrorState error={versions.error} onRetry={()=>versions.refetch()}/>;
  const kpis: [string,string|number,LucideIcon,string][] = [[t.activeVersion,versions.data?.find(v=>v.status==="published")?.version??"—",ShieldCheck,"bg-success/12 text-success"],[t.totalRules,allRules.length,BookOpenCheck,"bg-primary/10 text-primary"],[t.criticalRules,allRules.filter(r=>r.severity==="critical").length,AlertTriangle,"bg-destructive/10 text-destructive"],[t.drafts,versions.data?.filter(v=>v.status==="draft").length??0,FileClock,"bg-warning/15 text-warning"]];
  return <div className="space-y-3">
    <nav className="flex items-center gap-1 text-xs text-muted-foreground"><ChevronLeft className="h-3.5 w-3.5"/><Link to="/officer/dashboard" className="text-primary">{common.dashboard}</Link> › {t.title}</nav>
    <header className="flex flex-wrap items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><BookOpenCheck className="h-6 w-6"/></span><div><h1 className="font-display text-2xl font-bold">{t.title}</h1><p className="text-sm text-muted-foreground">{t.description}</p></div><div className="ml-auto flex gap-2">{chosen?.status === "draft" && <Button onClick={() => setSelected({ id: "", name: "", type: "keyword_presence", expected: "", severity: "info", suggestion: "", keywords: [] } as any)}><Plus className="mr-1 h-4 w-4"/>Add Rule</Button>}<Button variant="outline" onClick={()=>setCreateOpen(true)}><Plus className="mr-1 h-4 w-4"/>{t.newVersion}</Button></div></header>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{kpis.map(([label,value,Icon,tone])=><div key={label} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"><span className={cn("flex h-11 w-11 items-center justify-center rounded-lg",tone)}><Icon className="h-5 w-5"/></span><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{String(value)}</p></div></div>)}</div>
    <section className="rounded-lg border border-border bg-card"><div className="flex flex-wrap items-center gap-2 border-b border-border p-3"><select className="h-9 min-w-48 rounded-md border border-input bg-background px-2 text-xs" value={chosen?.id??""} onChange={e=>setVersionId(e.target.value)} aria-label={t.selectVersion}>{versions.data?.map(v=><option key={v.id} value={v.id}>{v.version} · {t[v.status as "published"|"archived"|"draft"]??v.status}</option>)}</select><div className="relative min-w-56 flex-1"><Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="h-9 pl-8 text-xs" value={query} onChange={e=>setQuery(e.target.value)} placeholder={`${common.search}…`}/></div><Filter className="h-4 w-4 text-muted-foreground"/><select className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={category} onChange={e=>setCategory(e.target.value)}><option value="">{t.allCategories}</option>{[...new Set(allRules.map(r=>categories[r.id]??"General"))].map(x=><option key={x}>{x}</option>)}</select><select className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={severity} onChange={e=>setSeverity(e.target.value)}><option value="">{t.allSeverities}</option>{["critical","warning","info"].map(x=><option key={x}>{x}</option>)}</select></div>
      {shown.length?<div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-muted/50 text-left text-muted-foreground"><tr>{[t.code,t.rule,t.category,t.type,t.expected,t.severity,t.status,common.actions].map(h=><th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead><tbody>{shown.map(r=><tr key={r.id} className="border-t border-border"><td className="px-3 py-2 font-mono font-semibold text-primary">{r.id}</td><td className="px-3 py-2 font-semibold">{r.name}</td><td className="px-3 py-2">{categories[r.id]??"General"}</td><td className="px-3 py-2">{r.type.replace(/_/g," ")}</td><td className="max-w-sm px-3 py-2 text-muted-foreground">{r.expected}</td><td className="px-3 py-2"><span className={cn("rounded px-2 py-0.5 font-semibold capitalize",r.severity==="critical"?"bg-destructive/10 text-destructive":r.severity==="warning"?"bg-warning/15 text-warning":"bg-info/10 text-info")}>{r.severity}</span></td><td className="px-3 py-2"><span className={cn("rounded px-2 py-0.5",r.enabled===false?"bg-muted text-muted-foreground":"bg-success/10 text-success")}>{r.enabled===false?t.disabled:t.enabled}</span></td><td className="px-3 py-2"><Button size="icon" variant="outline" className="h-7 w-7" onClick={()=>setSelected({...r})} aria-label={chosen?.status==="draft"?t.edit:t.inspect}><Eye className="h-3.5 w-3.5"/></Button></td></tr>)}</tbody></table></div>:<div className="p-4"><EmptyState title={t.noRules}/></div>}
    </section>
    {chosen?.status==="draft"&&<section className="flex flex-wrap items-end gap-3 rounded-lg border border-warning/30 bg-card p-4"><div className="min-w-64 flex-1"><Label>{t.publishReason}</Label><Textarea rows={2} value={publishReason} onChange={e=>setPublishReason(e.target.value)} placeholder={t.publishReason}/></div><Button disabled={publish.isPending||publishReason.trim().length<10} onClick={()=>publish.mutate()}><Send className="mr-1 h-4 w-4"/>{t.publish}</Button></section>}
    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent><DialogHeader><DialogTitle>{t.draftTitle}</DialogTitle><DialogDescription>{t.immutable}</DialogDescription></DialogHeader><Label>{t.versionName}</Label><Input value={versionName} onChange={e=>setVersionName(e.target.value)}/><Label>{t.changeSummary}</Label><Textarea value={summary} onChange={e=>setSummary(e.target.value)}/><DialogFooter><Button variant="outline" onClick={()=>setCreateOpen(false)}>{common.cancel}</Button><Button onClick={()=>createDraft.mutate()} disabled={createDraft.isPending}><Plus className="mr-1 h-4 w-4"/>{t.newVersion}</Button></DialogFooter></DialogContent></Dialog>
    <RuleDialog rule={selected} editable={chosen?.status==="draft"} onClose={()=>setSelected(null)} onSave={r=>saveRule.mutate(r)} copy={t} common={common}/>
  </div>;
}

function RuleDialog({rule,editable,onClose,onSave,copy,common}:{rule:Rule|null;editable:boolean;onClose:()=>void;onSave:(r:Rule)=>void;copy:ReturnType<typeof ruleCopy>;common:WorkspaceCopyCommon}) {
  const [draft,setDraft]=useState<Rule|null>(null); const current=draft?.id===rule?.id?draft:rule;
  if(!current)return null; const change=<K extends keyof Rule>(key:K,value:Rule[K])=>setDraft({...current,[key]:value});
  return <Dialog open={Boolean(rule)} onOpenChange={open=>{if(!open){setDraft(null);onClose();}}}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{current.id} · {current.name}</DialogTitle><DialogDescription>{editable?copy.edit:copy.immutable}</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><Field label={copy.code}><Input disabled={!editable} value={current.id} onChange={e=>change("id",e.target.value)}/></Field><Field label={copy.rule}><Input disabled={!editable} value={current.name} onChange={e=>change("name",e.target.value)}/></Field><Field label={copy.type}><select disabled={!editable} value={current.type} onChange={e=>change("type",e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"><option value="keyword_presence">keyword presence</option><option value="value_range">value range</option></select></Field><Field label={copy.severity}><select disabled={!editable} value={current.severity} onChange={e=>change("severity",e.target.value as Rule["severity"])} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">{["critical","warning","info"].map(s=><option key={s}>{s}</option>)}</select></Field><div className="sm:col-span-2"><Field label={copy.expected}><Textarea disabled={!editable} value={current.expected} onChange={e=>change("expected",e.target.value)}/></Field></div><div className="sm:col-span-2"><Field label={copy.keywords}><Input disabled={!editable} value={(current.keywords??[]).join(", ")} onChange={e=>change("keywords",e.target.value.split(",").map(x=>x.trim()).filter(Boolean))}/></Field></div><div className="sm:col-span-2"><Field label={copy.suggestion}><Textarea disabled={!editable} value={current.suggestion} onChange={e=>change("suggestion",e.target.value)}/></Field></div>{editable&&<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={current.enabled!==false} onChange={e=>change("enabled",e.target.checked)}/>{copy.enabled}</label>}</div><DialogFooter><Button variant="outline" onClick={onClose}>{common.close}</Button>{editable&&<Button onClick={()=>onSave(current)}><Save className="mr-1 h-4 w-4"/>{common.save}</Button>}</DialogFooter></DialogContent></Dialog>;
}
type WorkspaceCopyCommon = (typeof WORKSPACE_TRANSLATIONS)["en"]["common"];
const ruleCopy=()=>WORKSPACE_TRANSLATIONS.en.rules;
function Field({label,children}:{label:string;children:React.ReactNode}){return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>}