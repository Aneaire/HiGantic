"use client";

import { Providers } from "../providers";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";

const NAV_ITEMS = [
  { href: "/defaults", label: "Model Defaults" },
  { href: "/manage-blog", label: "Blog Posts" },
  { href: "/blog-categories", label: "Blog Categories" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="min-h-screen flex">
        <Sidebar />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </Providers>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-800/60 flex flex-col">
      <div className="px-5 py-5 border-b border-zinc-800/60">
        <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
          HiGantic
        </p>
        <p className="text-sm font-semibold text-zinc-200 mt-0.5">Admin</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/defaults" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-zinc-800 text-zinc-100 font-medium"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-zinc-800/60">
        <button
          onClick={() => signOut({ redirectUrl: "/" })}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
