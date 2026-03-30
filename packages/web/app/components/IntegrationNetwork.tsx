/**
 * IntegrationNetwork — HTML/SVG overlay showing integration logos
 * arranged around the outer edges, connected by clean thin lines.
 * Bubbles stay clear of the center where the 3D logo lives.
 */

import { useEffect, useRef, useState, useMemo } from "react";

/* ── Integration definitions ───────────────────────────────────────── */
interface IntegrationNode {
  id: string;
  label: string;
  x: number;
  y: number;
  size: "sm" | "md";
  icon: React.ReactNode;
  color: string;
  delay: number;
}

/*
 * Positions arranged in a smooth arc (clockwise) around the right side,
 * curving around the 3D logo which sits roughly at 65-75% x, 40-60% y.
 * This creates an intentional orbital feel instead of random scatter.
 */
const INTEGRATIONS: IntegrationNode[] = [
  {
    id: "calendar",
    label: "Calendar",
    x: 48,
    y: 8,
    size: "sm",
    color: "border-blue-400/30",
    delay: 0,
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#4285F4" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    id: "slack",
    label: "Slack",
    x: 66,
    y: 5,
    size: "md",
    color: "border-[#4A154B]/40",
    delay: 0.15,
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
        <path d="M6 15a2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2h2v2zm1 0a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-5z" fill="#E01E5A"/>
        <path d="M9 6a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2v2H9zm0 1a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5z" fill="#36C5F0"/>
        <path d="M18 9a2 2 0 0 1 2-2 2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2V9zm-1 0a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5z" fill="#2EB67D"/>
        <path d="M15 18a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2h2zm0-1a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-5z" fill="#ECB22E"/>
      </svg>
    ),
  },
  {
    id: "notion",
    label: "Notion",
    x: 88,
    y: 14,
    size: "md",
    color: "border-zinc-400/30",
    delay: 0.3,
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.29 2.29c-.42-.326-.98-.7-2.055-.607L3.48 2.828c-.466.046-.56.28-.374.466l1.353.914zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.886c-.56.047-.747.327-.747.934zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.747 0-.933-.234-1.494-.933l-4.577-7.186v6.953l1.448.327s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.513.28-.886.747-.933l3.222-.186z" fillRule="evenodd"/>
      </svg>
    ),
  },
  {
    id: "github",
    label: "GitHub",
    x: 96,
    y: 38,
    size: "sm",
    color: "border-zinc-400/25",
    delay: 0.45,
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/>
      </svg>
    ),
  },
  {
    id: "gmail",
    label: "Gmail",
    x: 94,
    y: 62,
    size: "md",
    color: "border-red-400/30",
    delay: 0.6,
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
        <path d="M2 6l10 7 10-7v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" stroke="#EA4335" strokeWidth="1.5" fill="none"/>
        <path d="M22 6l-10 7L2 6" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: "discord",
    label: "Discord",
    x: 84,
    y: 82,
    size: "sm",
    color: "border-indigo-400/30",
    delay: 0.75,
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#5865F2">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    ),
  },
  {
    id: "sheets",
    label: "Sheets",
    x: 66,
    y: 92,
    size: "sm",
    color: "border-green-400/30",
    delay: 0.9,
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#34A853" strokeWidth="1.8" strokeLinecap="round">
        <rect x="4" y="3" width="16" height="18" rx="1"/>
        <line x1="4" y1="9" x2="20" y2="9"/>
        <line x1="4" y1="15" x2="20" y2="15"/>
        <line x1="12" y1="3" x2="12" y2="21"/>
      </svg>
    ),
  },
  {
    id: "webhook",
    label: "Webhooks",
    x: 48,
    y: 88,
    size: "sm",
    color: "border-cyan-400/30",
    delay: 1.05,
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#22D3EE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2"/>
        <path d="M6 7.04c.68-.98 1.74-1.64 2.97-1.64 1.24 0 2.3.66 2.97 1.64"/>
        <circle cx="12" cy="12" r="2"/>
        <path d="M12 14v4"/>
        <path d="M12 6V2"/>
      </svg>
    ),
  },
];

/*
 * Connections follow the arc — each node connects to its neighbors
 * forming a smooth C-shaped path around the 3D logo.
 */
const CONNECTIONS: [string, string][] = [
  ["calendar", "slack"],
  ["slack", "notion"],
  ["notion", "github"],
  ["github", "gmail"],
  ["gmail", "discord"],
  ["discord", "sheets"],
  ["sheets", "webhook"],
];

/* ── Component ─────────────────────────────────────────────────────── */
export default function IntegrationNetwork() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setDimensions({ w: el.offsetWidth, h: el.offsetHeight });
    measure(); // initial sync measurement
    let timeout: ReturnType<typeof setTimeout>;
    const debouncedMeasure = () => {
      clearTimeout(timeout);
      timeout = setTimeout(measure, 150);
    };
    const ro = new ResizeObserver(debouncedMeasure);
    ro.observe(el);
    return () => { ro.disconnect(); clearTimeout(timeout); };
  }, []);

  const nodePositions = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    for (const node of INTEGRATIONS) {
      map[node.id] = {
        x: (node.x / 100) * dimensions.w,
        y: (node.y / 100) * dimensions.h,
      };
    }
    return map;
  }, [dimensions]);

  const sizeClasses = {
    sm: "h-14 w-14",
    md: "h-[4.5rem] w-[4.5rem]",
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[1] pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* ── SVG connection lines ── */}
      {dimensions.w > 0 && (
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {CONNECTIONS.map(([from, to], i) => {
            const a = nodePositions[from];
            const b = nodePositions[to];
            if (!a || !b) return null;

            return (
              <line
                key={`${from}-${to}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#34d399"
                strokeOpacity="0.18"
                strokeWidth="1"
                strokeDasharray="4 6"
                className="network-line"
                style={{ animationDelay: `${i * 0.25}s` }}
              />
            );
          })}
        </svg>
      )}

      {/* ── Integration bubbles ── */}
      {INTEGRATIONS.map((node) => (
        <div
          key={node.id}
          className={`absolute flex items-center justify-center rounded-full bg-zinc-900/90 border ${node.color} shadow-lg network-bubble ${sizeClasses[node.size]}`}
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            transform: "translate(-50%, -50%)",
            animationDelay: `${node.delay}s`,
          }}
          title={node.label}
        >
          <div className="text-zinc-300">{node.icon}</div>
        </div>
      ))}
    </div>
  );
}
