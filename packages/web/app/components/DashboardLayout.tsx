import { Show, SignInButton, UserButton } from "@clerk/react";
import { Link } from "react-router";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          Agent Maker
        </Link>
        <div>
          <Show when="signed-in">
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors">
                Sign In
              </button>
            </SignInButton>
          </Show>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
