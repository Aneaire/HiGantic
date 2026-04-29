import { useQuery } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import { useParams, Link, Outlet, useLocation } from "react-router";
import { AgentSidebar } from "~/components/AgentSidebar";
import { SettingsSidebar } from "~/components/SettingsSidebar";
import type { Id } from "@agent-maker/shared/convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

export default function AgentLayout() {
  const { agentId } = useParams();
  const location = useLocation();
  const isSettings = location.pathname.endsWith("/settings");
  const [settingsSection, setSettingsSection] = useState("general");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const agent = useQuery(api.agents.get, {
    agentId: agentId as Id<"agents">,
  });

  // Close drawer on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Lock body scroll while drawer is open on mobile
  useEffect(() => {
    if (mobileSidebarOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileSidebarOpen]);

  if (agent === undefined) {
    return (
      <div className="flex h-screen bg-surface">
        <div className="hidden lg:block w-64 border-r border-rule animate-pulse bg-surface-sunken" />
        <div className="flex-1 animate-pulse bg-surface" />
      </div>
    );
  }

  if (agent === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="max-w-sm px-6 sm:px-8 text-left">
          <p className="eyebrow">404</p>
          <h1 className="mt-3 font-display text-3xl leading-tight text-ink">
            Agent not found.
          </h1>
          <p className="mt-3 text-sm text-ink-muted leading-relaxed">
            This agent may have been deleted, or the link is stale.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-strong transition-colors"
          >
            &larr; Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-surface">
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-ink/40 backdrop-blur-[2px] z-40"
        />
      )}

      {/* Sidebar — mobile drawer / desktop static */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex lg:static lg:z-auto transition-transform duration-200 lg:transition-none ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {isSettings ? (
          <SettingsSidebar
            agent={agent}
            activeSection={settingsSection}
            onSectionChange={(s) => {
              setSettingsSection(s);
              setMobileSidebarOpen(false);
            }}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />
        ) : (
          <AgentSidebar
            agent={agent}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />
        )}
      </div>

      <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-surface">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 border-b border-rule px-4 h-12 bg-surface shrink-0">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open menu"
            className="-ml-1 p-1.5 text-ink-muted hover:text-ink transition-colors"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <span className="font-display text-sm leading-none text-ink truncate">
            {agent.name}
          </span>
        </div>
        <Outlet context={{ agent, settingsSection, setSettingsSection }} />
      </main>
    </div>
  );
}
