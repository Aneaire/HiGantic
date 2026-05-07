import type { Metadata } from "next";
import "../../globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s — HiGantic Blog",
    default: "HiGantic Blog",
  },
  description:
    "Insights on AI agents, automation, and building intelligent systems.",
  openGraph: {
    siteName: "HiGantic Blog",
    type: "website",
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 antialiased">
      <BlogNav />
      {children}
      <BlogFooter />
    </div>
  );
}

function BlogNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0b]/90 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <a href="/blog" className="flex items-center gap-3">
          <span className="text-base font-bold tracking-tight text-white">
            HiGantic
          </span>
          <span className="hidden sm:block h-4 w-px bg-zinc-700" />
          <span className="hidden sm:block text-sm text-zinc-500">Blog</span>
        </a>
        <nav className="flex items-center gap-6">
          <a
            href="/blog"
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            All posts
          </a>
          <a
            href="https://higantic.com"
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Product
          </a>
          <a
            href="https://higantic.com"
            className="text-sm font-medium bg-white text-zinc-900 px-3.5 py-1.5 rounded-full hover:bg-zinc-100 transition-colors"
          >
            Get started
          </a>
        </nav>
      </div>
    </header>
  );
}

function BlogFooter() {
  return (
    <footer className="mt-24 border-t border-white/5">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-base font-bold text-white">HiGantic</p>
            <p className="text-sm text-zinc-500 mt-1">
              AI agents that think, remember, and act.
            </p>
          </div>
          <div className="flex gap-8 text-sm text-zinc-500">
            <a href="/blog" className="hover:text-zinc-300 transition-colors">
              Blog
            </a>
            <a
              href="https://higantic.com"
              className="hover:text-zinc-300 transition-colors"
            >
              Home
            </a>
            <a
              href="https://higantic.com/docs"
              className="hover:text-zinc-300 transition-colors"
            >
              Docs
            </a>
          </div>
        </div>
        <p className="mt-10 text-xs text-zinc-700">
          &copy; {new Date().getFullYear()} HiGantic. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
