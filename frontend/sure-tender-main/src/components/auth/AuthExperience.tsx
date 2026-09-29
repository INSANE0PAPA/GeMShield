import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, ArrowRight, BadgeCheck, Building2, CheckCircle2, ChevronDown, Eye, EyeOff,
  FileCheck2, Globe2, Landmark, Loader2, LockKeyhole, Mail, MapPin, Moon, Phone, Scale,
  ShieldCheck, Store, Sun, UserRound, UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LANGUAGES, useLanguage, type Language } from "@/lib/language";
import { useTheme } from "@/lib/theme";
import { AUTH_TRANSLATIONS } from "@/lib/auth-translations";
import { homeRouteForRoles, type AppRole } from "@/lib/roles";
import heroDay from "@/assets/auth/government-day.jpg";
import heroNight from "@/assets/auth/government-night.jpg";

type Role = "vendor" | "officer";
type Mode = "signin" | "signup";
type FormState = {
  fullName: string; email: string; phone: string; organisation: string; gstin: string; pan: string;
  employeeId: string; department: string; designation: string; office: string; password: string;
};
const EMPTY: FormState = { fullName:"",email:"",phone:"",organisation:"",gstin:"",pan:"",employeeId:"",department:"",designation:"",office:"",password:"" };

function Wordmark({ tagline }: { tagline: string }) {
  return <Link to="/" className="inline-block"><div className="font-display text-[25px] font-semibold leading-none text-foreground">GeMShield</div><div className="mt-1 text-[9px] text-foreground/70">{tagline}</div><span className="tricolour-rule mt-2 block h-0.5 w-20" /></Link>;
}

function Field({ icon, label, type="text", value, onChange, required=true, children }: { icon: ReactNode; label: string; type?: string; value: string; onChange:(value:string)=>void; required?:boolean; children?:ReactNode }) {
  return <div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground">{icon}</span>{children ?? <Input aria-label={label} placeholder={`${label}${required ? " *" : ""}`} type={type} value={value} onChange={(event)=>onChange(event.target.value)} required={required} className="h-10 border-input bg-background/55 pl-10 text-xs shadow-none" />}</div>;
}

function GoogleMark() {
  return <span className="grid h-5 w-5 place-items-center rounded-full font-bold text-info" aria-hidden>G</span>;
}

export function AuthExperience({ role, mode }: { role: Role; mode: Mode }) {
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const t = AUTH_TRANSLATIONS[language];
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const dark = theme === "dark";
  const isVendor = role === "vendor";
  const isSignup = mode === "signup";
  const set = (key: keyof FormState) => (value: string) => setForm((current)=>({ ...current, [key]: value }));

  const rolePath = (nextRole: Role, nextMode: Mode) => nextRole === "vendor"
    ? (nextMode === "signin" ? "/vendor/sign-in" : "/vendor/sign-up")
    : (nextMode === "signin" ? "/government/sign-in" : "/government/sign-up");

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return;
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", data.user.id),
        supabase.from("profiles").select("account_type,approval_status").eq("id", data.user.id).maybeSingle(),
      ]);
      const appRoles = (roles ?? []).map((item)=>item.role as AppRole);
      if (appRoles.length) navigate({ to: homeRouteForRoles(appRoles), replace:true });
      else if (profile?.account_type === "officer") {
        await supabase.auth.signOut();
        if (active) setNotice(t.pending);
      }
    });
    return ()=>{ active = false; };
  }, [navigate, t.pending]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setNotice(null);
    try {
      if (!isSignup) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) throw error;
        const [{ data: roles }, { data: profile }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", data.user.id),
          supabase.from("profiles").select("account_type,approval_status").eq("id", data.user.id).maybeSingle(),
        ]);
        const appRoles = (roles ?? []).map((item)=>item.role as AppRole);
        if (!appRoles.length && profile?.account_type === "officer") {
          await supabase.auth.signOut(); setNotice(t.pending); return;
        }
        navigate({ to: homeRouteForRoles(appRoles), replace:true });
        return;
      }
      if (!agreed) { toast.error(`${t.agree} ${t.terms}`); return; }
      const metadata = isVendor ? {
        account_type:"vendor", full_name:form.fullName.trim(), phone:form.phone.trim(), organisation:form.organisation.trim(), gstin:form.gstin.trim(), pan:form.pan.trim(), language, theme,
      } : {
        account_type:"officer", full_name:form.fullName.trim(), phone:form.phone.trim(), organisation:form.department.trim(), employee_official_id:form.employeeId.trim(), ministry_department:form.department.trim(), designation:form.designation.trim(), office_location:form.office.trim(), language, theme,
      };
      const { data, error } = await supabase.auth.signUp({ email:form.email.trim(), password:form.password, options:{ emailRedirectTo:`${window.location.origin}${rolePath(role,"signin")}`, data:metadata } });
      if (error) throw error;
      if (data.session) await supabase.auth.signOut();
      setNotice(isVendor ? t.confirmEmail : `${t.confirmEmail} ${t.pending}`);
      setForm(EMPTY); setAgreed(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.authFailed);
    } finally { setBusy(false); }
  }

  async function handleGoogle() {
    if (isSignup) { toast.info(t.requiredRegistration); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}${rolePath(role,"signin")}` }});
    if (error) { toast.error(t.authFailed); setBusy(false); return; }
    if (!data.url) setBusy(false);
  }

  const hero = isSignup ? (isVendor ? t.vendorSignupHero : t.officialSignupHero) : (isVendor ? t.vendorHero : t.officialHero);
  const intro = isSignup ? (isVendor ? t.vendorSignupIntro : t.officialSignupIntro) : (isVendor ? t.vendorIntro : t.officialIntro);
  const features = isSignup ? (isVendor ? t.vendorSignupFeatures : t.officialSignupFeatures) : (isVendor ? t.vendorFeatures : t.officialFeatures);
  const featureIcons = isVendor ? [BadgeCheck, Scale, ShieldCheck, CheckCircle2] : [ShieldCheck, FileCheck2, Landmark, Scale];
  const footer = isVendor ? t.vendorFooter : t.officialFooter;

  return <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
    <img src={dark ? heroNight : heroDay} alt="" aria-hidden width={1920} height={640} className="absolute inset-0 h-full w-full object-cover object-center" />
    <div className="absolute inset-0 bg-gradient-to-r from-background/62 via-background/18 to-transparent dark:from-background/38 dark:via-background/5" />
    <div className="relative mx-auto grid min-h-screen max-w-[1536px] lg:grid-cols-[1fr_0.98fr]">
      <section className="relative flex min-h-[42vh] flex-col px-6 py-6 sm:px-10 lg:min-h-screen lg:px-14 lg:py-8 xl:px-20">
        <div className="flex items-start justify-between gap-4">
          <Wordmark tagline="Transparent Procurement. Stronger Bharat." />
          <div className="flex gap-2 lg:hidden">
            <LanguageControl label={t.language} language={language} setLanguage={setLanguage} />
            <ThemeControl label={t.theme} dark={dark} setTheme={setTheme} />
          </div>
        </div>
        <div className="my-auto max-w-[460px] py-10 lg:py-6">
          <h1 className="font-display text-[38px] font-semibold leading-[1.02] sm:text-[48px] lg:text-[56px]">
            {hero.map((line,index)=>line ? <span key={line} className="block">{index === 2 || (!isVendor && index === 1 && isSignup) ? <span className="text-hero-accent">{line}</span> : line}</span> : null)}
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-foreground/78">{intro}</p>
          <ul className="mt-7 space-y-3">
            {features.map((feature,index)=>{ const Icon=featureIcons[index] ?? ShieldCheck; return <li key={feature} className="flex items-center gap-3 text-xs font-medium"><span className="grid h-7 w-7 place-items-center rounded-full border border-border bg-background/72 text-hero-accent"><Icon className="h-4 w-4" /></span>{feature}</li>; })}
          </ul>
        </div>
        <div className="w-fit rounded-md border border-border bg-background/72 px-4 py-3 backdrop-blur-sm"><div className="flex flex-wrap items-center gap-3 text-[10px] font-medium"><Landmark className="h-5 w-5 text-primary dark:text-gold" />{footer.map((item,index)=><span key={item} className="flex items-center gap-3">{index > 0 && <span className="h-3 w-px bg-border" />}{item}</span>)}</div></div>
      </section>

      <section className="flex items-center justify-center px-4 py-5 sm:px-8 lg:py-7">
        <div className="w-full max-w-[570px] rounded-xl border border-border bg-card/94 p-6 shadow-panel backdrop-blur-md sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div className="hidden items-center gap-2 lg:flex"><LanguageControl label={t.language} language={language} setLanguage={setLanguage} /><ThemeControl label={t.theme} dark={dark} setTheme={setTheme} /></div>
            <Link to="/" className="ml-auto inline-flex items-center gap-2 text-[11px] font-medium text-foreground/75"><ArrowLeft className="h-3.5 w-3.5" />{t.backHome}</Link>
          </div>
          <div className="mt-5">
            <h2 className="text-xl font-bold">{isSignup ? (isVendor ? t.createVendor : t.createOfficial) : t.welcome}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{isSignup ? (isVendor ? t.vendorRegisterSub : t.officialRegisterSub) : (isVendor ? t.vendorSignInSub : t.officialSignInSub)}</p>
          </div>

          {!isSignup && <div className="mt-5 grid grid-cols-2 gap-2 rounded-md bg-muted/55 p-1">
            <Button type="button" variant={isVendor ? "outline" : "ghost"} className={isVendor ? "border-primary bg-background text-primary shadow-none" : "shadow-none"} onClick={()=>navigate({to:rolePath("vendor","signin")})}><Store />{t.vendor}</Button>
            <Button type="button" variant={!isVendor ? "outline" : "ghost"} className={!isVendor ? "border-primary bg-background text-primary shadow-none" : "shadow-none"} onClick={()=>navigate({to:rolePath("officer","signin")})}><Landmark />{t.official}</Button>
          </div>}

          {notice && <div role="status" className="mt-4 rounded-md border border-info/30 bg-info/10 px-4 py-3 text-xs leading-relaxed text-foreground">{notice}</div>}

          <form onSubmit={handleSubmit} className="mt-4 space-y-2.5">
            {isSignup && <>
              <Field icon={<UserRound className="h-4 w-4" />} label={t.fullName} value={form.fullName} onChange={set("fullName")} />
              <div className="grid gap-2 sm:grid-cols-2"><Field icon={<Mail className="h-4 w-4" />} label={isVendor?t.email:t.emailOfficial} type="email" value={form.email} onChange={set("email")} /><Field icon={<Phone className="h-4 w-4" />} label={t.mobile} type="tel" value={form.phone} onChange={set("phone")} /></div>
              {isVendor ? <>
                <Field icon={<Building2 className="h-4 w-4" />} label={t.business} value={form.organisation} onChange={set("organisation")} />
                <div className="grid gap-2 sm:grid-cols-2"><Field icon={<Building2 className="h-4 w-4" />} label={t.gstin} value={form.gstin} onChange={set("gstin")} required={false} /><Field icon={<BadgeCheck className="h-4 w-4" />} label={t.pan} value={form.pan} onChange={set("pan")} /></div>
              </> : <>
                <Field icon={<BadgeCheck className="h-4 w-4" />} label={t.employeeId} value={form.employeeId} onChange={set("employeeId")} />
                <Field icon={<Landmark className="h-4 w-4" />} label={t.department} value={form.department} onChange={set("department")} />
                <div className="grid gap-2 sm:grid-cols-2"><Field icon={<UsersRound className="h-4 w-4" />} label={t.designation} value={form.designation} onChange={set("designation")} /><Field icon={<MapPin className="h-4 w-4" />} label={t.office} value={form.office} onChange={set("office")} /></div>
              </>}
            </>}
            {!isSignup && <Field icon={<Mail className="h-4 w-4" />} label={isVendor?t.emailVendor:t.emailOfficial} type="email" value={form.email} onChange={set("email")} />}
            <Field icon={<LockKeyhole className="h-4 w-4" />} label={isSignup?t.createPassword:t.password} type={showPassword?"text":"password"} value={form.password} onChange={set("password")}><Input aria-label={isSignup?t.createPassword:t.password} placeholder={`${isSignup?t.createPassword:t.password} *`} type={showPassword?"text":"password"} value={form.password} onChange={(event)=>set("password")(event.target.value)} required minLength={8} autoComplete={isSignup?"new-password":"current-password"} className="h-10 border-input bg-background/55 px-10 text-xs shadow-none" /><Button type="button" variant="ghost" size="icon" aria-label={showPassword?t.hidePassword:t.showPassword} onClick={()=>setShowPassword((value)=>!value)} className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2">{showPassword?<EyeOff />:<Eye />}</Button></Field>
            {!isSignup && <div className="flex justify-end"><Link to="/forgot-password" className="text-[11px] font-semibold text-primary dark:text-info">{t.forgot}</Link></div>}
            {isSignup && <label className="flex items-start gap-2 pt-1 text-[10px] text-muted-foreground"><Checkbox checked={agreed} onCheckedChange={(value)=>setAgreed(value===true)} aria-label={t.agree} /><span>{t.agree} <Link to="/terms" className="underline">{t.terms}</Link> &amp; <Link to="/privacy" className="underline">{t.privacy}</Link></span></label>}
            <Button type="submit" className="h-11 w-full bg-cta text-cta-foreground" disabled={busy}>{busy?<Loader2 className="animate-spin" />:(isSignup?t.signUp:t.signIn)}<ArrowRight /></Button>
          </form>

          <div className="my-4 flex items-center gap-3"><span className="h-px flex-1 bg-border"/><span className="text-[10px] text-muted-foreground">{t.continueWith}</span><span className="h-px flex-1 bg-border"/></div>
          <div className="grid gap-2 sm:grid-cols-2"><Button type="button" variant="outline" onClick={handleGoogle} disabled={busy}><GoogleMark />{t.google}</Button><Button type="button" variant="outline" onClick={()=>toast.info("DigiLocker connection is not configured yet.")}><ShieldCheck className="text-info" />{t.digilocker}</Button></div>
          <p className="mt-6 text-center text-[11px] text-muted-foreground">{isSignup?t.haveAccount:t.noAccount} <Link to={rolePath(role,isSignup?"signin":"signup")} className="ml-1 font-semibold text-primary dark:text-info">{isSignup?(isVendor?t.signInVendor:t.signInOfficial):(isVendor?t.signUpVendor:t.signUpOfficial)} <ArrowRight className="inline h-3 w-3" /></Link></p>
        </div>
      </section>
    </div>
  </main>;
}

function LanguageControl({ label, language, setLanguage }: { label:string; language:Language; setLanguage:(language:Language)=>void }) {
  return <div className="relative"><Globe2 className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"/><select aria-label={label} value={language} onChange={(event)=>setLanguage(event.target.value as Language)} className="h-8 max-w-28 appearance-none rounded-md border border-border bg-background/85 py-1 pl-7 pr-6 text-[10px]"><option value="en">English</option>{LANGUAGES.slice(1).map((item)=><option key={item.code} value={item.code}>{item.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2"/></div>;
}
function ThemeControl({ label, dark, setTheme }: { label:string; dark:boolean; setTheme:(theme:"light"|"dark")=>void }) {
  return <div role="group" aria-label={label} className="flex rounded-md border border-border bg-background/85 p-0.5"><Button type="button" variant="ghost" size="icon" aria-label="Light" className={`h-7 w-7 ${!dark?"bg-accent":""}`} onClick={()=>setTheme("light")}><Sun /></Button><Button type="button" variant="ghost" size="icon" aria-label="Dark" className={`h-7 w-7 ${dark?"bg-accent text-gold":""}`} onClick={()=>setTheme("dark")}><Moon /></Button></div>;
}
