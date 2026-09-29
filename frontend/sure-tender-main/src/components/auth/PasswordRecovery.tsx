import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Landmark, Loader2, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/language";
import { useTheme } from "@/lib/theme";
import { AUTH_TRANSLATIONS } from "@/lib/auth-translations";
import heroDay from "@/assets/auth/government-day.jpg";
import heroNight from "@/assets/auth/government-night.jpg";

export function PasswordRecovery({ mode = "request" }: { mode?: "request" | "reset" }) {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const t = AUTH_TRANSLATIONS[language];
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [confirmation,setConfirmation]=useState("");
  const recovery = mode === "reset";
  const [sent,setSent]=useState(false);
  const [done,setDone]=useState(false);
  const [busy,setBusy]=useState(false);
  const [show,setShow]=useState(false);

  useEffect(()=>{
    if (!recovery) return;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("type") !== "recovery") toast.error(t.authFailed);
  },[recovery,t.authFailed]);

  async function submit(event:FormEvent){
    event.preventDefault(); setBusy(true);
    try {
      if(recovery){
        if(password!==confirmation){ toast.error(t.passwordMismatch); return; }
        const {error}=await supabase.auth.updateUser({password}); if(error) throw error;
        await supabase.auth.signOut(); setDone(true);
      } else {
        const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${window.location.origin}/reset-password`}); if(error) throw error;
        setSent(true);
      }
    } catch(error){ toast.error(error instanceof Error?error.message:t.authFailed); }
    finally{ setBusy(false); }
  }

  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 py-10 text-foreground">
    <img src={theme==="dark"?heroNight:heroDay} alt="" width={1920} height={640} className="absolute inset-0 h-full w-full object-cover" />
    <div className="absolute inset-0 bg-background/76 backdrop-blur-[2px]" />
    <section className="relative w-full max-w-md rounded-xl border border-border bg-card/95 p-8 shadow-panel">
      <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground"><ArrowLeft className="h-4 w-4" />{t.backHome}</Link>
      <div className="mt-7 grid h-12 w-12 place-items-center rounded-full bg-accent text-primary dark:text-gold"><Landmark /></div>
      <h1 className="mt-5 font-display text-2xl font-bold">{recovery?t.resetTitle:t.forgotTitle}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{recovery?t.resetSub:t.forgotSub}</p>
      {(sent||done)?<div className="mt-6 rounded-lg border border-success/30 bg-success/10 p-4 text-sm"><CheckCircle2 className="mb-2 h-5 w-5 text-success" />{done?t.passwordUpdated:t.resetSent}<div><Link to="/vendor/sign-in" className="mt-4 inline-flex items-center gap-1 font-semibold text-primary">{t.signIn}<ArrowRight className="h-3 w-3" /></Link></div></div>:
      <form onSubmit={submit} className="mt-6 space-y-3">
        {!recovery?<div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input aria-label={t.email} type="email" placeholder={t.email} value={email} onChange={(e)=>setEmail(e.target.value)} required className="h-11 pl-10"/></div>:<>
          {[{label:t.newPassword,value:password,set:setPassword},{label:t.confirmPassword,value:confirmation,set:setConfirmation}].map((field)=><div className="relative" key={field.label}><LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input aria-label={field.label} type={show?"text":"password"} placeholder={field.label} value={field.value} onChange={(e)=>field.set(e.target.value)} required minLength={8} className="h-11 px-10"/><Button type="button" variant="ghost" size="icon" aria-label={show?t.hidePassword:t.showPassword} onClick={()=>setShow(v=>!v)} className="absolute right-1 top-1/2 -translate-y-1/2">{show?<EyeOff/>:<Eye/>}</Button></div>)}</>}
        <Button type="submit" disabled={busy} className="h-11 w-full bg-cta text-cta-foreground">{busy?<Loader2 className="animate-spin"/>:(recovery?t.updatePassword:t.sendReset)}<ArrowRight/></Button>
      </form>}
    </section>
  </main>;
}
