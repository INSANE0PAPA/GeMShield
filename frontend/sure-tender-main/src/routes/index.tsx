import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type ComponentType } from "react";
import {
  ArrowRight, ArrowUp, BookOpen, CheckCircle2, ChevronDown, ClipboardList, FileText, Globe, HardHat,
  Headphones, HeartPulse, HelpCircle, Leaf, List, Menu, Monitor, Moon, Search, Settings, Sun, Truck,
  UploadCloud, Users, X,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { LANGUAGES, useLanguage, type Language } from "@/lib/language";
import { LANDING_TRANSLATIONS } from "@/lib/landing-translations";
import heroDay from "@/assets/landing/hero-day.jpg";
import heroNight from "@/assets/landing/hero-night.jpg";
import catOffice from "@/assets/landing/cat-office.jpg";
import catIndustrial from "@/assets/landing/cat-industrial.jpg";
import catMedical from "@/assets/landing/cat-medical.jpg";
import catConstruction from "@/assets/landing/cat-construction.jpg";
import catTransport from "@/assets/landing/cat-transport.jpg";
import catServices from "@/assets/landing/cat-services.jpg";
import pillarImg from "@/assets/landing/pillar.jpg";
import flagImg from "@/assets/landing/flag.jpg";
import skylineImg from "@/assets/landing/skyline.jpg";

const TITLE = "GeMShield — Transparent Procurement for a Better Tomorrow";
const DESC =
  "GeMShield assists in verifying bid documents, understanding tender requirements and enabling a transparent, accountable and efficient public procurement process.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

type Icon = ComponentType<{ className?: string }>;

const NAV_HREFS = ["#home", "#categories", "#vendors", "#government", "#resources"];

const CATEGORIES: { label: [string, string]; icon: Icon; img: string; tint: string; iconColor: string }[] = [
  { label: ["Office &", "IT Equipment"], icon: Monitor, img: catOffice, tint: "from-info/10", iconColor: "text-info" },
  { label: ["Industrial &", "Machinery"], icon: Settings, img: catIndustrial, tint: "from-saffron/10", iconColor: "text-saffron" },
  { label: ["Medical &", "Healthcare"], icon: HeartPulse, img: catMedical, tint: "from-india-green/10", iconColor: "text-india-green" },
  { label: ["Construction &", "Infrastructure"], icon: HardHat, img: catConstruction, tint: "from-destructive/10", iconColor: "text-destructive" },
  { label: ["Transport &", "Logistics"], icon: Truck, img: catTransport, tint: "from-primary/10", iconColor: "text-primary dark:text-info" },
  { label: ["Services &", "Manpower"], icon: Leaf, img: catServices, tint: "from-india-green/10", iconColor: "text-india-green" },
];

const VENDOR_STEPS: [Icon, string][] = [
  [Search, "Browse categories"],
  [FileText, "Check tender requirements"],
  [UploadCloud, "Submit your bid documents"],
  [List, "Track application status"],
];
const GOV_STEPS: [Icon, string][] = [
  [ClipboardList, "Create or select tender"],
  [Settings, "Set requirements and rules"],
  [Users, "Review submitted evidence"],
  [CheckCircle2, "Accept, request clarification or reject"],
];

const RESOURCES: { title: string; body: string; icon: Icon; to: string; color: string }[] = [
  { title: "Guidelines & Policies", body: "Official procurement guidelines, rules and circulars.", icon: BookOpen, to: "/policies", color: "text-primary dark:text-info bg-primary/10" },
  { title: "Buyer Help", body: "Information for government buyers and departments.", icon: HelpCircle, to: "/help", color: "text-primary dark:text-info bg-primary/10" },
  { title: "Seller Help", body: "Guidance for vendors and service providers.", icon: Users, to: "/help", color: "text-primary dark:text-info bg-primary/10" },
  { title: "FAQs", body: "Find answers to common questions.", icon: FileText, to: "/faqs", color: "text-primary dark:text-info bg-primary/10" },
  { title: "Contact / Support", body: "Reach out for assistance and support.", icon: Headphones, to: "/contact", color: "text-destructive bg-destructive/10" },
];

function Chakra({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden fill="none" stroke="currentColor">
      <circle cx="50" cy="50" r="46" strokeWidth="2" />
      <circle cx="50" cy="50" r="8" strokeWidth="2" />
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i * 15 * Math.PI) / 180;
        return <line key={i} x1={50 + 8 * Math.cos(a)} y1={50 + 8 * Math.sin(a)} x2={50 + 46 * Math.cos(a)} y2={50 + 46 * Math.sin(a)} strokeWidth="1" />;
      })}
    </svg>
  );
}

function TriDash({ className = "" }: { className?: string }) {
  return (
    <div className={`flex gap-2 ${className}`} aria-hidden>
      <span className="h-0.5 w-6 bg-saffron" />
      <span className="h-0.5 w-6 bg-card" />
      <span className="h-0.5 w-6 bg-india-green" />
    </div>
  );
}

function Wordmark({ tagline }: { tagline: string }) {
  return (
    <Link to="/" className="block shrink-0 whitespace-nowrap">
      <div className="font-display text-2xl font-semibold leading-none text-foreground">GeMShield</div>
      <div className="mt-1 max-w-52 whitespace-normal text-[11px] leading-tight text-muted-foreground">{tagline}</div>
      <div className="tricolour-rule mt-1.5 h-0.5 w-full" />
    </Link>
  );
}

function SectionTitle({ title, sub, link, to }: { title: string; sub: string; link: string; to: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="border-l-4 border-saffron pl-3 font-display text-2xl font-semibold text-foreground md:text-[26px]">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
      </div>
      <a href={to} className="inline-flex items-center gap-2 text-sm font-medium text-primary dark:text-gold">
        {link} <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}

function LandingPage() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const t = LANDING_TRANSLATIONS[language];
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const dark = theme === "dark";

  const goTenders = () => navigate({ to: "/vendor/find-tenders", search: (q.trim() ? { q: q.trim() } : {}) as never });
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    goTenders();
  };

  return (
    <div id="home" className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="relative mx-auto flex max-w-[1536px] items-center gap-6 px-6 py-3 lg:px-10 min-[1700px]:px-20">
          <Wordmark tagline={t.tagline} />
          <nav className="ml-2 hidden items-center gap-5 whitespace-nowrap text-[13px] min-[1400px]:flex">
            {t.nav.map((label, i) => (
              <a key={NAV_HREFS[i]} href={NAV_HREFS[i]} className={i === 0 ? "border-b-2 border-primary pb-1 font-medium text-foreground dark:border-gold dark:text-gold" : "pb-1 text-foreground/80 hover:text-foreground"}>
                {label}
              </a>
            ))}
            <Link to="/help" className="pb-1 text-foreground/80 hover:text-foreground">{t.help}</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 whitespace-nowrap">
            <form onSubmit={onSearch} className="hidden items-center gap-2 rounded-full border border-border bg-background px-4 py-2 min-[1400px]:flex">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchLong} aria-label={t.searchShort} className="w-28 bg-transparent text-xs outline-none placeholder:text-muted-foreground" />
            </form>
            <div className="relative hidden md:block">
              <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select aria-label={t.language} className="max-w-28 appearance-none rounded-full border border-border bg-background py-2 pl-9 pr-8 text-xs text-foreground" value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
                {LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            </div>
            <div className="hidden items-center rounded-full bg-foreground/90 p-1 sm:flex" role="group" aria-label={t.theme}>
              <button onClick={() => setTheme("light")} aria-label={t.lightTheme} className={`rounded-full p-1.5 ${!dark ? "bg-card text-foreground" : "text-background/70"}`}><Sun className="h-4 w-4" /></button>
              <button onClick={() => setTheme("dark")} aria-label={t.darkTheme} className={`rounded-full p-1.5 ${dark ? "bg-card text-gold" : "text-background"}`}><Moon className="h-4 w-4" /></button>
            </div>
            <Link to="/auth" search={{ mode: "signin" } as never} className="hidden rounded-md border border-primary px-5 py-2 text-sm font-medium text-primary sm:inline-block dark:border-foreground/60 dark:text-foreground">{t.login}</Link>
            <Link to="/auth" search={{ mode: "signup" } as never} className="hidden rounded-md bg-cta px-5 py-2 text-sm font-medium text-cta-foreground sm:inline-block">{t.signup}</Link>
            <button className="min-[1400px]:hidden" aria-label={t.openMenu} onClick={() => setMobileOpen((o) => !o)}>
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
          <Chakra className="pointer-events-none absolute right-2 top-1 hidden h-14 w-14 text-muted-foreground/20 2xl:block" />
        </div>
        {mobileOpen && (
          <div className="border-t border-border px-6 py-4 min-[1400px]:hidden">
            <form onSubmit={onSearch} className="mb-3 flex items-center gap-2 rounded-full border border-border px-4 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
               <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchShort} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </form>
            <div className="flex flex-col gap-3 text-sm">
               {t.nav.map((label, i) => <a key={NAV_HREFS[i]} href={NAV_HREFS[i]} onClick={() => setMobileOpen(false)}>{label}</a>)}
               <Link to="/help">{t.help}</Link>
               <div className="relative">
                 <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                 <select aria-label={t.language} className="w-full appearance-none rounded-md border border-border bg-background py-2 pl-9 pr-8 text-sm" value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
                   {LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
                 </select>
                 <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2" />
               </div>
              <div className="flex gap-2 pt-2">
                 <button onClick={() => setTheme(dark ? "light" : "dark")} className="rounded-md border border-border px-3 py-2">{dark ? t.lightTheme : t.darkTheme}</button>
                 <Link to="/auth" search={{ mode: "signin" } as never} className="rounded-md border border-primary px-4 py-2 text-primary dark:text-foreground">{t.login}</Link>
                 <Link to="/auth" search={{ mode: "signup" } as never} className="rounded-md bg-cta px-4 py-2 text-cta-foreground">{t.signup}</Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img src={dark ? heroNight : heroDay} alt="" width={1920} height={640} className="absolute inset-0 h-full w-full object-cover object-right" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent md:via-background/40" />
        <Chakra className="pointer-events-none absolute right-10 top-16 hidden h-40 w-40 text-muted-foreground/15 lg:block" />
        <div className="relative mx-auto grid max-w-[1536px] gap-8 px-6 py-10 md:py-12 lg:grid-cols-[1fr_auto] lg:px-20">
          <div className="max-w-xl">
            <TriDash className="mb-6 [&>span:nth-child(2)]:hidden" />
            <p className="text-[11px] font-medium uppercase text-foreground/80 [letter-spacing:0.12em]">{t.eyebrow}</p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] text-foreground md:text-[44px] lg:text-[48px]">
              {t.heroLines[0]}<br />{t.heroLines[1]}<br /><span className="text-hero-accent">{t.heroLines[2]}</span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-foreground/80">
              {t.heroBody}
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <a href="#categories" className="inline-flex items-center gap-3 rounded-md bg-cta px-7 py-3 text-sm font-semibold text-cta-foreground shadow-panel">{t.explore} <ArrowRight className="h-4 w-4" /></a>
              <Link to="/auth" search={{ mode: "signup" } as never} className="inline-flex items-center gap-3 rounded-md border border-primary bg-card/80 px-10 py-3 text-sm font-semibold text-primary dark:border-foreground/60 dark:bg-transparent dark:text-foreground">{t.getStarted} <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
          <div className="hidden flex-col items-end justify-between lg:flex">
            <blockquote className="max-w-[190px] border-l border-foreground/20 pl-4 font-display text-[17px] italic leading-snug text-foreground/85 dark:text-foreground">
              “{t.heroQuote}”
              <TriDash className="mt-3 [&>span:nth-child(2)]:hidden" />
            </blockquote>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="mx-auto max-w-[1536px] scroll-mt-20 px-6 py-6 lg:px-16">
        <SectionTitle title={t.categoriesTitle} sub={t.categoriesSub} link={t.viewCategories} to="#categories" />
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {CATEGORIES.map((c, index) => {
            const I = c.icon;
            return (
              <button key={c.label[1]} onClick={goTenders} className={`group relative flex min-h-28 overflow-hidden rounded-lg border border-border bg-gradient-to-r ${c.tint} to-card text-left shadow-card transition hover:shadow-panel dark:to-card`}>
                <div className="flex w-[52%] flex-col justify-between p-3.5">
                  <I className={`h-6 w-6 ${c.iconColor}`} />
                  <span className="text-[12px] font-medium leading-tight text-foreground">{t.categories[index]?.[0]}<br />{t.categories[index]?.[1]}</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-card text-foreground shadow-card dark:bg-primary dark:text-primary-foreground"><ArrowRight className="h-3 w-3" /></span>
                </div>
                <img src={c.img} alt="" loading="lazy" width={816} height={816} className="w-[48%] object-cover transition group-hover:scale-105" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Vendors / Government */}
      <section className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <div id="vendors" className="relative scroll-mt-20 overflow-hidden bg-panel-warm">
          <img src={pillarImg} alt="" loading="lazy" className="absolute inset-y-0 left-0 hidden h-full w-40 object-cover md:block [mask-image:linear-gradient(to_right,black_60%,transparent)]" />
          <div className="relative px-6 py-6 md:pl-52 md:pr-8">
             <h2 className="border-l-2 border-saffron pl-4 font-display text-2xl font-semibold text-foreground">{t.vendors}</h2>
             <p className="mt-1 max-w-xs pl-4 text-sm text-muted-foreground">{t.vendorsSub}</p>
             <Steps steps={VENDOR_STEPS} labels={t.vendorSteps} tone="warm" />
             <a href="#resources" className="mt-4 inline-flex items-center gap-2 rounded-md border border-foreground/40 px-5 py-2 text-xs font-medium text-foreground dark:border-gold">{t.vendorMore} <ArrowRight className="h-4 w-4" /></a>
          </div>
        </div>
        <div id="government" className="relative scroll-mt-20 overflow-hidden bg-panel-cool">
          <img src={flagImg} alt="" loading="lazy" className="absolute inset-y-0 right-0 hidden h-full w-40 object-cover md:block [mask-image:linear-gradient(to_left,black_60%,transparent)]" />
          <div className="relative px-6 py-6 md:pl-8 md:pr-48">
             <h2 className="border-l-2 border-india-green pl-4 font-display text-2xl font-semibold text-foreground dark:border-info">{t.government}</h2>
             <p className="mt-1 max-w-xs pl-4 text-sm text-muted-foreground">{t.governmentSub}</p>
             <Steps steps={GOV_STEPS} labels={t.governmentSteps} tone="cool" />
             <a href="#resources" className="mt-4 inline-flex items-center gap-2 rounded-md border border-primary px-5 py-2 text-xs font-medium text-primary dark:border-info dark:text-foreground">{t.governmentMore} <ArrowRight className="h-4 w-4" /></a>
          </div>
        </div>
      </section>

      {/* Resources */}
      <section id="resources" className="mx-auto max-w-[1536px] scroll-mt-20 px-6 py-6 lg:px-16">
        <SectionTitle title={t.resourcesTitle} sub={t.resourcesSub} link={t.viewResources} to="#resources" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {RESOURCES.map((r, index) => {
            const I = r.icon;
            return (
              <Link key={r.title} to={r.to} className="flex items-center gap-4 rounded-md border border-border bg-card p-4 shadow-card transition hover:shadow-panel">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${r.color}`}><I className="h-5 w-5" /></span>
                <span className="flex-1">
                   <span className="block text-sm font-semibold text-foreground">{t.resources[index]?.title}</span>
                   <span className="block text-xs text-muted-foreground">{t.resources[index]?.body}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-foreground/70" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative overflow-hidden bg-footer text-footer-foreground">
        <img src={skylineImg} alt="" loading="lazy" className="absolute inset-y-0 left-0 hidden h-full w-[42%] object-cover opacity-80 md:block [mask-image:linear-gradient(to_right,black_60%,transparent)]" />
        <Chakra className="pointer-events-none absolute -bottom-8 right-6 h-36 w-36 opacity-10" />
        <div className="relative mx-auto grid max-w-[1536px] gap-8 px-6 py-6 md:grid-cols-[1fr_auto_auto_auto_auto] md:pl-[33%] lg:pr-20">
          <div>
            <div className="font-display text-2xl">GeMShield</div>
             <div className="mt-2 max-w-40 text-xs opacity-80">{t.tagline}</div>
            <div className="tricolour-rule mt-3 h-0.5 w-14" />
          </div>
           <FooterCol title={t.quickLinks} items={[[t.nav[0] ?? "", "#home"], [t.nav[1] ?? "", "#categories"], [t.nav[2] ?? "", "#vendors"], [t.nav[3] ?? "", "#government"]]} />
           <FooterCol title={t.resourcesLabel} items={[[t.policies, "/policies"], [t.helpSupport, "/help"], [t.resources[3]?.title ?? "", "/faqs"], [t.contact, "/contact"]]} />
           <FooterCol title={t.legal} items={[[t.privacy, "/privacy"], [t.terms, "/terms"], [t.accessibility, "/accessibility"], [t.sitemap, "/sitemap"]]} />
          <div className="flex items-start gap-6 md:border-l md:border-footer-foreground/20 md:pl-10">
            <blockquote className="max-w-[220px] font-display text-sm italic opacity-90">
               “{t.footerQuote}”
              <TriDash className="mt-3 [&>span:nth-child(2)]:hidden" />
            </blockquote>
             <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label={t.backTop} className="flex h-8 w-8 items-center justify-center rounded-md border border-footer-foreground/40">
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Steps({ steps, labels, tone }: { steps: [Icon, string][]; labels: string[]; tone: "warm" | "cool" }) {
  const circle = tone === "warm" ? "bg-saffron/15 text-saffron" : "bg-primary/10 text-primary dark:bg-info/20 dark:text-info";
  return (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:flex sm:items-start sm:justify-between">
       {steps.map(([I], i) => (
         <div key={i} className="flex items-start gap-2 sm:flex-1">
          <div className="flex flex-1 flex-col items-center text-center">
            <span className={`flex h-11 w-11 items-center justify-center rounded-full ${circle} ${i === 3 && tone === "cool" ? "!bg-india-green/15 !text-india-green" : ""}`}><I className="h-5 w-5" /></span>
             <span className="mt-2 text-[11px] leading-tight text-foreground">{labels[i]}</span>
          </div>
          {i < steps.length - 1 && <ArrowRight className="mt-3.5 hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />}
        </div>
      ))}
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <div className="text-xs font-semibold">{title}</div>
      <ul className="mt-2 space-y-1 text-xs opacity-80">
        {items.map(([l, h]) => (
          <li key={l}>{h.startsWith("#") ? <a href={h} className="hover:underline">{l}</a> : <Link to={h} className="hover:underline">{l}</Link>}</li>
        ))}
      </ul>
    </div>
  );
}
