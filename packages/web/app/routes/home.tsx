import { Show, SignInButton } from "@clerk/react";
import {
  Brain,
  Globe,
  Database,
  Mail,
  Workflow,
  Shield,
  ArrowRight,
  Check,
  Terminal,
  FileText,
  Webhook,
  Clock,
  Users,
  Cpu,
  Code2,
  Puzzle,
  Star,
  ArrowUpRight,
  Minus,
  Layers,
} from "lucide-react";
import { Link } from "react-router";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import type { Route } from "./+types/home";

const HeroScene = lazy(() => import("~/components/three/HeroScene"));
const IntegrationNetwork = lazy(() => import("~/components/IntegrationNetwork"));
const DashboardView = lazy(() => import("~/components/DashboardView"));

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "HiGantic — AI Agents That Think, Remember, and Act" },
    {
      name: "description",
      content:
        "Build autonomous AI agents with persistent memory, tools, and automations. Powered by Gemini and OpenAI.",
    },
  ];
}

export default function HomePage() {
  return (
    <>
      <Show when="signed-out">
        <LandingPage />
      </Show>
      <Show when="signed-in">
        <Suspense fallback={
          <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
            <div className="h-8 w-8 rounded-lg bg-neon-400/10 animate-pulse" />
          </div>
        }>
          <DashboardView />
        </Suspense>
      </Show>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   LANDING PAGE — Complete refactor with immersive Three.js
   ═══════════════════════════════════════════════════════════════════════ */

function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-x-clip">
      <LandingNav />
      <Hero />
      <TrustBar />
      <WhatItDoes />
      <ShowDontTell />
      <ToolTape />
      <Pricing />
      <BottomCTA />
      <Footer />
    </div>
  );
}

/* ── Intersection observer ──────────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

const COPYRIGHT_YEAR = new Date().getFullYear();

/* ── Model Slide Badge ──────────────────────────────────────────────── */
/*
 * SUPPORTED_MODELS: When adding a new AI model to the platform, add it here.
 * This list drives the animated "Powered by" badge on the landing page hero.
 * See CLAUDE.md / AGENTS.md for the full checklist when adding a model.
 */
const SUPPORTED_MODELS = [
  { name: "Gemini", color: "text-blue-400" },
  { name: "OpenAI", color: "text-green-400" },
];

/* ── Nav ────────────────────────────────────────────────────────────── */
function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-500 border-b ${
        scrolled
          ? "bg-zinc-950/80 backdrop-blur-2xl border-zinc-800/40 shadow-lg shadow-black/20"
          : "bg-transparent border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-tight">
          <div className="h-8 w-8 rounded-lg bg-neon-400/10 ring-1 ring-neon-400/25 overflow-hidden flex items-center justify-center">
            <img src="/logo.png" alt="HiGantic" className="h-5 w-5 object-contain" />
          </div>
          <span className="text-zinc-100">HiGantic</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-[13px] text-zinc-500">
          <a href="#what" className="hover:text-zinc-200 transition-colors nav-underline">Product</a>
          <a href="#how" className="hover:text-zinc-200 transition-colors nav-underline">How it works</a>
          <a href="#tools" className="hover:text-zinc-200 transition-colors nav-underline">Tools</a>
          <a href="#pricing" className="hover:text-zinc-200 transition-colors nav-underline">Pricing</a>
          <Link to="/docs" className="hover:text-zinc-200 transition-colors nav-underline">Docs</Link>
        </div>

        <div className="flex items-center gap-3">
          <SignInButton mode="modal">
            <button className="text-[13px] font-medium bg-zinc-100 text-zinc-900 px-5 py-2 rounded-lg hover:bg-white transition-all hover:shadow-lg hover:shadow-white/10">
              Sign in
            </button>
          </SignInButton>
        </div>
      </div>
    </nav>
  );
}

/* ── Hero — Immersive Three.js background ───────────────────────────── */
function Hero() {
  return (
    <section className="relative min-h-[100vh] flex items-center overflow-hidden">
      {/* ── Three.js Scene — full bleed background ── */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={
          <div className="absolute inset-0 bg-zinc-950">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-neon-400/[0.04] blur-[180px] rounded-full" />
            <div className="absolute top-20 right-0 w-[500px] h-[400px] bg-blue-500/[0.025] blur-[150px] rounded-full" />
          </div>
        }>
          <HeroScene />
        </Suspense>
      </div>

      {/* ── Integration network overlay — logo bubbles + connections ── */}
      <div className="absolute inset-0 z-[1] hidden lg:block">
        <Suspense fallback={null}>
          <IntegrationNetwork />
        </Suspense>
      </div>

      {/* ── Gradient overlays for text readability ── */}
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/60 to-zinc-950/20 z-[2] pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-zinc-950 to-transparent z-[2] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-zinc-950/80 to-transparent z-[2] pointer-events-none" />

      {/* ── Content ── */}
      <div className="relative z-[3] max-w-7xl mx-auto px-6 pt-24 pb-20 w-full">
        <div className="max-w-2xl">
          <h1
            className="text-[clamp(2.8rem,7vw,5rem)] font-bold leading-[1.05] tracking-tight fade-in-up-slow"
            style={{ animationDelay: "0.1s" }}
          >
            Your ideas deserve
            <br />
            <span
              className="bg-gradient-to-r from-neon-400 via-neon-300 to-emerald-300 bg-clip-text text-transparent"
              style={{ filter: "drop-shadow(0 0 28px rgba(52, 211, 153, 0.4)) drop-shadow(0 0 64px rgba(52, 211, 153, 0.15))" }}
            >
              agents that ship.
            </span>
          </h1>

          <p
            className="mt-6 text-lg md:text-xl text-zinc-400 leading-relaxed max-w-xl fade-in-up-slow"
            style={{ animationDelay: "0.2s" }}
          >
            Build AI agents that remember context, use 50+ tools,
            browse the web, manage tasks, and run automations — all through conversation.
          </p>

          <div
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-10 fade-in-up-slow"
            style={{ animationDelay: "0.3s" }}
          >
            <SignInButton mode="modal">
              <button className="group relative text-sm font-semibold bg-neon-400 text-zinc-950 px-7 py-3.5 rounded-xl hover:bg-neon-300 transition-all glow-neon overflow-hidden">
                <span className="relative z-10 flex items-center gap-2">
                  Start building free
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
            </SignInButton>
            <Link
              to="/docs"
              className="group flex items-center gap-2 text-sm font-medium text-zinc-300 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-100 px-6 py-3.5 rounded-xl transition-all hover:bg-zinc-800/50"
            >
              <Terminal className="h-4 w-4" />
              Read the docs
              <ArrowUpRight className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>

          {/* Quick stats */}
          <div
            className="flex items-center gap-8 mt-14 fade-in-up-slow"
            style={{ animationDelay: "0.4s" }}
          >
            {[
              { value: "50+", label: "Built-in tools" },
              { value: "< 2min", label: "To deploy" },
              { value: "24/7", label: "Autonomous" },
            ].map((stat, i) => (
              <div key={stat.label} className="flex items-center gap-8">
                <div className="text-left">
                  <div className="text-xl font-bold text-zinc-100">{stat.value}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{stat.label}</div>
                </div>
                {i < 2 && <div className="w-px h-8 bg-zinc-800" />}
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div
            className="mt-10 flex items-center gap-3 fade-in-up-slow"
            style={{ animationDelay: "0.5s" }}
          >
            <div className="flex -space-x-2">
              {[
                "bg-gradient-to-br from-neon-400 to-emerald-600",
                "bg-gradient-to-br from-blue-400 to-indigo-600",
                "bg-gradient-to-br from-amber-400 to-orange-600",
                "bg-gradient-to-br from-pink-400 to-rose-600",
                "bg-gradient-to-br from-violet-400 to-purple-600",
              ].map((gradient, i) => (
                <div
                  key={i}
                  className={`h-7 w-7 rounded-full ${gradient} ring-2 ring-zinc-950 flex items-center justify-center text-[10px] font-bold text-white/90`}
                >
                  {["A", "M", "J", "S", "R"][i]}
                </div>
              ))}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-xs text-zinc-500">
                Trusted by <span className="text-zinc-300 font-medium">500+</span> builders
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Subtle scroll chevron ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[3] fade-in-up-slow" style={{ animationDelay: "0.6s" }}>
        <svg className="w-5 h-5 text-zinc-700 scroll-indicator" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}

/* ── Trust Bar — replaces the old Marquee ───────────────────────────── */
function TrustBar() {
  const tools = [
    "web_search", "store_memory", "recall_memory", "create_task", "save_note",
    "send_email", "schedule_action", "fire_webhook", "search_documents",
    "send_slack_message", "create_notion_page", "google_calendar",
    "image_generation", "write_page", "set_timer", "send_agent_message",
  ];

  return (
    <div className="relative py-6 border-y border-zinc-800/20 overflow-hidden bg-zinc-950">
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-zinc-950 to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-zinc-950 to-transparent z-10" />
      <div className="flex gap-6 marquee-scroll">
        {[...tools, ...tools].map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="shrink-0 text-[11px] font-mono text-zinc-700/70 whitespace-nowrap"
          >
            {t}()
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── What It Does — redesigned feature showcase ──────────────────────── */
function WhatItDoes() {
  const { ref, inView } = useInView(0.08);

  return (
    <section id="what" ref={ref} className="relative max-w-7xl mx-auto px-6 py-28 md:py-36">
      {/* Section header */}
      <div className="text-center mb-20">
        <p
          className={`text-[11px] font-mono uppercase tracking-[0.2em] text-neon-400/70 mb-4 transition-all duration-700 ${
            inView ? "opacity-100" : "opacity-0"
          }`}
        >
          The platform
        </p>
        <h2
          className={`text-3xl md:text-5xl font-bold tracking-tight leading-tight max-w-2xl mx-auto transition-all duration-700 ${
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "80ms" }}
        >
          Not another chatbot.
          <br />
          <span className="text-zinc-500">A workspace that thinks.</span>
        </h2>
      </div>

      {/* Feature grid — 2x2 with spotlight cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Memory */}
        <FeatureCard
          inView={inView}
          delay={100}
          icon={Brain}
          iconColor="text-neon-400"
          label="Memory"
          title="Remembers everything"
          desc="Agents store facts, preferences, and context across every conversation. They recall what matters, when it matters."
          accentColor="neon"
        >
          <div className="mt-5 space-y-2 font-mono text-[11px]">
            {[
              { cat: "preference", val: "User prefers concise bullet points", color: "text-neon-400/60" },
              { cat: "fact", val: "Q1 revenue target: $2.4M", color: "text-blue-400/60" },
              { cat: "context", val: "Working on competitor analysis", color: "text-purple-400/60" },
            ].map((m, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg bg-zinc-950/60 border border-zinc-800/30 px-3 py-2"
              >
                <span className={`${m.color} shrink-0 mt-px`}>[{m.cat}]</span>
                <span className="text-zinc-500">{m.val}</span>
              </div>
            ))}
          </div>
        </FeatureCard>

        {/* Tools */}
        <FeatureCard
          inView={inView}
          delay={180}
          icon={Layers}
          iconColor="text-blue-400"
          label="Tools"
          title="50+ built-in capabilities"
          desc="Web search, email, Slack, Notion, Google Workspace, webhooks, scheduled actions, and custom endpoints."
          accentColor="blue"
        >
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              { icon: Globe, name: "Search", c: "text-neon-400/60" },
              { icon: Mail, name: "Email", c: "text-rose-400/60" },
              { icon: Database, name: "RAG", c: "text-purple-400/60" },
              { icon: Workflow, name: "Actions", c: "text-amber-400/60" },
              { icon: Shield, name: "Vault", c: "text-cyan-400/60" },
              { icon: Webhook, name: "Hooks", c: "text-orange-400/60" },
            ].map((t, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-zinc-800/40 bg-zinc-950/40 px-3 py-2.5 group hover:border-zinc-700/50 transition-colors"
              >
                <t.icon className={`h-3.5 w-3.5 ${t.c} group-hover:opacity-100 opacity-70 transition-opacity`} />
                <span className="text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors">{t.name}</span>
              </div>
            ))}
          </div>
        </FeatureCard>

        {/* Pages */}
        <FeatureCard
          inView={inView}
          delay={260}
          icon={FileText}
          iconColor="text-purple-400"
          label="Pages"
          title="A workspace per agent"
          desc="Kanban tasks, markdown notes, spreadsheets, data tables — agents create and manage them autonomously."
          accentColor="purple"
        >
          <div className="mt-5 flex gap-2">
            {[
              { name: "Tasks", icon: "kanban", color: "border-amber-500/20 text-amber-400/70" },
              { name: "Notes", icon: "doc", color: "border-blue-500/20 text-blue-400/70" },
              { name: "Sheets", icon: "grid", color: "border-purple-500/20 text-purple-400/70" },
            ].map((p) => (
              <div
                key={p.name}
                className={`flex-1 rounded-lg border ${p.color} bg-zinc-950/40 p-3 text-center hover:bg-zinc-950/60 transition-colors`}
              >
                <div className={`text-lg mb-1 ${p.color}`}>
                  {p.icon === "kanban" ? "▦" : p.icon === "doc" ? "◫" : "⊞"}
                </div>
                <div className="text-[11px] text-zinc-500">{p.name}</div>
              </div>
            ))}
          </div>
        </FeatureCard>

        {/* Automations */}
        <FeatureCard
          inView={inView}
          delay={340}
          icon={Clock}
          iconColor="text-amber-400"
          label="Automations"
          title="Runs while you sleep"
          desc="Event-driven workflows trigger on task creation, email receipt, or any custom event. Cron schedules keep agents working 24/7."
          accentColor="amber"
        >
          <div className="mt-5 font-mono text-[11px] space-y-2">
            {[
              { trigger: "on", event: "task.created", arrow: "→", action: "send_slack_message", color: "text-amber-400/60" },
              { trigger: "on", event: "email.received", arrow: "→", action: "store_memory → create_task", color: "text-amber-400/60" },
              { trigger: "cron", event: "0 9 * * 1", arrow: "→", action: "weekly_report", color: "text-cyan-400/60" },
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-zinc-950/60 border border-zinc-800/30 px-3 py-2 text-zinc-600">
                <span className={row.color}>{row.trigger}</span>
                <span className="text-zinc-500">{row.event}</span>
                <span className="text-zinc-700">{row.arrow}</span>
                <span className="text-zinc-400">{row.action}</span>
              </div>
            ))}
          </div>
        </FeatureCard>
      </div>
    </section>
  );
}

function FeatureCard({
  inView,
  delay,
  icon: Icon,
  iconColor,
  label,
  title,
  desc,
  accentColor,
  children,
}: {
  inView: boolean;
  delay: number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  label: string;
  title: string;
  desc: string;
  accentColor: "neon" | "blue" | "purple" | "amber";
  children?: React.ReactNode;
}) {
  const glowMap = {
    neon: "hover:shadow-neon-400/[0.03]",
    blue: "hover:shadow-blue-400/[0.03]",
    purple: "hover:shadow-purple-400/[0.03]",
    amber: "hover:shadow-amber-400/[0.03]",
  };

  return (
    <div
      className={`group relative rounded-2xl border border-zinc-800/50 bg-zinc-900/20 p-6 md:p-8 transition-all duration-700 hover:border-zinc-700/60 hover:bg-zinc-900/30 hover:shadow-2xl ${glowMap[accentColor]} ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Icon + label header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`h-9 w-9 rounded-xl bg-zinc-900/80 border border-zinc-800/50 flex items-center justify-center group-hover:border-zinc-700/60 transition-colors`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-600">{label}</span>
      </div>

      <h3 className="text-lg md:text-xl font-semibold text-zinc-200 mb-2">{title}</h3>
      <p className="text-[13px] text-zinc-500 leading-relaxed max-w-md">{desc}</p>
      {children}
    </div>
  );
}

/* ── Show Don't Tell — vertical timeline ─────────────────────────────── */
function ShowDontTell() {
  const { ref, inView } = useInView(0.08);

  const steps = [
    {
      n: "01",
      title: "Describe your agent in plain language",
      body: "Talk to the creator agent. Describe what you need — it asks clarifying questions, suggests tools, and builds your agent through conversation.",
      visual: (
        <div className="space-y-2 text-[12px] font-mono">
          <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/20 px-3.5 py-2.5">
            <span className="text-zinc-500">you:</span>{" "}
            <span className="text-zinc-300">I need an agent that monitors competitor pricing</span>
          </div>
          <div className="rounded-lg bg-neon-400/5 border border-neon-400/10 px-3.5 py-2.5">
            <span className="text-neon-400/70">creator:</span>{" "}
            <span className="text-zinc-400">I'll set up web search, memory, and a daily cron schedule. Should it post updates to Slack?</span>
          </div>
        </div>
      ),
    },
    {
      n: "02",
      title: "It selects the right tools automatically",
      body: "Based on your description, the creator selects from 17+ tool sets — memory, web search, pages, email, Slack, Notion, Google, and more.",
      visual: (
        <div className="flex flex-wrap gap-2 text-[11px] font-mono">
          {["memory", "web_search", "pages", "slack", "schedules"].map((t) => (
            <span
              key={t}
              className="text-neon-400/70 border border-neon-400/20 rounded-lg px-3 py-1.5 bg-neon-400/5 hover:bg-neon-400/10 transition-colors"
            >
              {t}
            </span>
          ))}
        </div>
      ),
    },
    {
      n: "03",
      title: "Your agent goes live instantly",
      body: "Deployed with its own workspace, conversation history, memory store, and pages. Chat with it, run automations, or expose it as an API.",
      visual: (
        <div className="flex items-center gap-4 text-[12px] font-mono">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-neon-400 status-pulse" />
            <span className="text-neon-400/80">active</span>
          </div>
          <div className="h-3 w-px bg-zinc-800" />
          <span className="text-zinc-500">3 pages</span>
          <div className="h-3 w-px bg-zinc-800" />
          <span className="text-zinc-500">cron: 0 9 * * *</span>
        </div>
      ),
    },
  ];

  return (
    <section id="how" ref={ref} className="relative max-w-7xl mx-auto px-6 py-28 md:py-36">
      {/* Header */}
      <div className="text-center mb-20">
        <p
          className={`text-[11px] font-mono uppercase tracking-[0.2em] text-neon-400/70 mb-4 transition-all duration-700 ${
            inView ? "opacity-100" : "opacity-0"
          }`}
        >
          How it works
        </p>
        <h2
          className={`text-3xl md:text-5xl font-bold tracking-tight leading-tight max-w-2xl mx-auto transition-all duration-700 ${
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "80ms" }}
        >
          Describe it. We build it.
          <br />
          <span className="text-zinc-500">You use it.</span>
        </h2>
      </div>

      {/* Timeline */}
      <div className="relative max-w-3xl mx-auto">
        {/* Vertical connector */}
        <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-neon-400/30 via-zinc-800/40 to-transparent" />

        <div className="space-y-16">
          {steps.map((step, i) => (
            <div
              key={step.n}
              className={`relative flex gap-6 md:gap-10 transition-all duration-700 ${
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${200 + i * 150}ms` }}
            >
              {/* Step marker */}
              <div className="shrink-0 relative z-10">
                <div className="h-12 w-12 md:h-16 md:w-16 rounded-2xl border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-sm md:text-base font-bold text-zinc-500">{step.n}</span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <h3 className="text-lg md:text-xl font-semibold text-zinc-200 mb-2">{step.title}</h3>
                <p className="text-[13px] text-zinc-500 leading-relaxed mb-5 max-w-lg">{step.body}</p>
                <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/20 p-4">
                  {step.visual}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Tool Tape — capabilities grid ───────────────────────────────────── */
function ToolTape() {
  const { ref, inView } = useInView(0.08);

  const tools = [
    { icon: Brain, name: "Memory", desc: "Store & recall across sessions", color: "group-hover:text-neon-400" },
    { icon: Globe, name: "Web Search", desc: "Search & fetch live data", color: "group-hover:text-blue-400" },
    { icon: FileText, name: "Pages", desc: "Notes, tasks, spreadsheets", color: "group-hover:text-purple-400" },
    { icon: Mail, name: "Email", desc: "Send via Resend or Gmail", color: "group-hover:text-rose-400" },
    { icon: Clock, name: "Schedules", desc: "Cron & interval triggers", color: "group-hover:text-amber-400" },
    { icon: Webhook, name: "Webhooks", desc: "Inbound & outbound hooks", color: "group-hover:text-orange-400" },
    { icon: Users, name: "Multi-Agent", desc: "Agent-to-agent delegation", color: "group-hover:text-cyan-400" },
    { icon: Code2, name: "REST API", desc: "Expose agents as endpoints", color: "group-hover:text-indigo-400" },
    { icon: Shield, name: "Credentials", desc: "AES-256 encrypted vault", color: "group-hover:text-emerald-400" },
    { icon: Database, name: "RAG", desc: "Vector search on documents", color: "group-hover:text-violet-400" },
    { icon: Puzzle, name: "Custom Tools", desc: "Your own HTTP endpoints", color: "group-hover:text-pink-400" },
    { icon: Cpu, name: "Multi-Model", desc: "Gemini, OpenAI & more", color: "group-hover:text-teal-400" },
  ];

  return (
    <section id="tools" ref={ref} className="py-28 md:py-36 border-t border-zinc-800/20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <p
            className={`text-[11px] font-mono uppercase tracking-[0.2em] text-neon-400/70 mb-4 transition-all duration-700 ${
              inView ? "opacity-100" : "opacity-0"
            }`}
          >
            Capabilities
          </p>
          <h2
            className={`text-3xl md:text-4xl font-bold tracking-tight transition-all duration-700 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "80ms" }}
          >
            Everything an agent needs.
          </h2>
          <p
            className={`mt-3 text-zinc-500 max-w-md mx-auto transition-all duration-700 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "140ms" }}
          >
            A complete toolkit for autonomous AI — no assembly required.
          </p>
        </div>

        {/* Tool grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {tools.map((tool, i) => (
            <div
              key={tool.name}
              className={`group relative rounded-xl border border-zinc-800/40 bg-zinc-900/20 p-4 hover:border-zinc-700/50 hover:bg-zinc-900/40 transition-all duration-500 cursor-default ${
                inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: `${180 + i * 35}ms` }}
            >
              <tool.icon className={`h-5 w-5 text-zinc-600 ${tool.color} transition-colors mb-3`} />
              <div className="text-[13px] font-medium text-zinc-300">{tool.name}</div>
              <div className="text-[11px] text-zinc-600 mt-1 leading-relaxed">{tool.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ────────────────────────────────────────────────────────── */
function Pricing() {
  const { ref, inView } = useInView();

  const plans = [
    {
      name: "Free",
      price: "$0",
      note: "No card required",
      items: [
        { text: "3 agents", included: true },
        { text: "Tasks, Notes, Markdown", included: true },
        { text: "Memory & web search", included: true },
        { text: "5 pages per agent", included: true },
        { text: "Spreadsheets & APIs", included: false },
        { text: "Automations", included: false },
      ],
      cta: "Get started",
      featured: false,
    },
    {
      name: "Pro",
      price: "$29",
      note: "/month",
      items: [
        { text: "10 agents", included: true },
        { text: "All page types", included: true },
        { text: "Full automation & cron", included: true },
        { text: "20 pages per agent", included: true },
        { text: "REST API endpoints", included: true },
        { text: "PostgreSQL connections", included: true },
      ],
      cta: "Start trial",
      featured: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      note: "",
      items: [
        { text: "100 agents", included: true },
        { text: "Everything in Pro", included: true },
        { text: "20 concurrent jobs", included: true },
        { text: "SSO & team management", included: true },
        { text: "Custom integrations", included: true },
        { text: "Dedicated support & SLA", included: true },
      ],
      cta: "Talk to us",
      featured: false,
    },
  ];

  return (
    <section id="pricing" ref={ref} className="max-w-7xl mx-auto px-6 py-28 md:py-36">
      <div className="text-center mb-16">
        <p
          className={`text-[11px] font-mono uppercase tracking-[0.2em] text-neon-400/70 mb-4 transition-all duration-700 ${
            inView ? "opacity-100" : "opacity-0"
          }`}
        >
          Pricing
        </p>
        <h2
          className={`text-3xl md:text-5xl font-bold tracking-tight transition-all duration-700 ${
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "80ms" }}
        >
          Start free. Scale when ready.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {plans.map((plan, i) => (
          <div
            key={plan.name}
            className={`relative rounded-2xl border p-7 transition-all duration-700 ${
              plan.featured
                ? "border-neon-400/25 bg-neon-400/[0.03] ring-1 ring-neon-400/10"
                : "border-zinc-800/50 bg-zinc-900/20 hover:border-zinc-700/50"
            } ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            style={{ transitionDelay: `${150 + i * 80}ms` }}
          >
            {plan.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="text-[10px] font-mono uppercase tracking-wider bg-neon-400 text-zinc-950 px-3 py-1 rounded-full font-semibold">
                  Most popular
                </span>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-3">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                {plan.note && <span className="text-sm text-zinc-600">{plan.note}</span>}
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {plan.items.map((item) => (
                <div key={item.text} className="flex items-center gap-3 text-[13px]">
                  {item.included ? (
                    <Check className="h-4 w-4 text-neon-400/70 shrink-0" />
                  ) : (
                    <Minus className="h-4 w-4 text-zinc-700 shrink-0" />
                  )}
                  <span className={item.included ? "text-zinc-400" : "text-zinc-700"}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>

            <SignInButton mode="modal">
              <button
                className={`w-full text-[13px] font-semibold py-3 rounded-xl transition-all ${
                  plan.featured
                    ? "bg-neon-400 text-zinc-950 hover:bg-neon-300 glow-neon-sm"
                    : "border border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-800/60 hover:border-zinc-700"
                }`}
              >
                {plan.cta}
              </button>
            </SignInButton>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Bottom CTA ─────────────────────────────────────────────────────── */
function BottomCTA() {
  const { ref, inView } = useInView();

  return (
    <section ref={ref} className="relative border-t border-zinc-800/20 overflow-hidden">
      {/* Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-neon-400/[0.03] blur-[200px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 hero-dot-grid opacity-[0.02] pointer-events-none" />

      {/* Floating rings decoration */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none hidden md:block opacity-50">
        <CTARings />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-28 md:py-36">
        <div
          className={`max-w-2xl mx-auto text-center transition-all duration-700 ${
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
            Stop configuring.
            <br />
            <span className="bg-gradient-to-r from-neon-400 via-neon-300 to-emerald-300 bg-clip-text text-transparent">
              Start shipping agents.
            </span>
          </h2>
          <p className="text-zinc-500 text-lg mb-10 max-w-md mx-auto">
            Free to start. No credit card. Your first agent is a conversation away.
          </p>
          <SignInButton mode="modal">
            <button className="group text-sm font-semibold bg-neon-400 text-zinc-950 px-8 py-4 rounded-xl hover:bg-neon-300 transition-all glow-neon">
              Get started free
              <ArrowRight className="inline ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </SignInButton>
        </div>
      </div>
    </section>
  );
}

/* ── CTA Rings — concentric orbiting rings with nodes ─────────────── */
function CTARings() {
  return (
    <svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ctaCenterGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.15" />
          <stop offset="70%" stopColor="#34d399" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="120" fill="url(#ctaCenterGlow)" />
      <circle cx="200" cy="200" r="60" fill="none" stroke="#34d399" strokeOpacity="0.08" strokeWidth="0.75" />
      <circle cx="200" cy="200" r="110" fill="none" stroke="#34d399" strokeOpacity="0.06" strokeWidth="0.75" strokeDasharray="4 8" className="cta-ring-spin" />
      <circle cx="200" cy="200" r="160" fill="none" stroke="#34d399" strokeOpacity="0.04" strokeWidth="0.75" strokeDasharray="2 12" className="cta-ring-spin-reverse" />
      <circle r="3" fill="#34d399" opacity="0.6">
        <animateMotion dur="12s" repeatCount="indefinite" path="M200,140 A60,60 0 1,1 199.99,140" />
      </circle>
      <circle r="2.5" fill="#60a5fa" opacity="0.5">
        <animateMotion dur="20s" repeatCount="indefinite" path="M200,90 A110,110 0 1,1 199.99,90" />
      </circle>
      <circle r="2" fill="#34d399" opacity="0.3">
        <animateMotion dur="30s" repeatCount="indefinite" path="M200,40 A160,160 0 1,1 199.99,40" />
      </circle>
      <circle cx="200" cy="200" r="4" fill="#34d399" opacity="0.5" className="constellation-pulse" />
      <circle cx="200" cy="200" r="2" fill="#34d399" opacity="0.9" />
    </svg>
  );
}

/* ── Footer ─────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-zinc-800/20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 text-sm text-zinc-600">
            <div className="h-6 w-6 rounded-md bg-neon-400/10 ring-1 ring-neon-400/20 overflow-hidden flex items-center justify-center">
              <img src="/logo.png" alt="" className="h-4 w-4 object-contain" />
            </div>
            <span>&copy; {COPYRIGHT_YEAR} HiGantic</span>
          </div>

          <div className="flex items-center gap-6 text-[13px] text-zinc-600">
            <Link to="/docs" className="hover:text-zinc-300 transition-colors">Docs</Link>
            <a href="#pricing" className="hover:text-zinc-300 transition-colors">Pricing</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

