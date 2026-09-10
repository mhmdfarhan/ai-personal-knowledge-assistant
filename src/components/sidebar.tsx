"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileUp,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  NotebookText,
  Settings,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "AI Chat", icon: MessagesSquare },
  { href: "/knowledge", label: "Knowledge", icon: NotebookText },
  { href: "/documents", label: "Dokumen", icon: FileUp },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

export function Sidebar({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";

  return (
    <aside className="flex shrink-0 flex-col border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-xl lg:min-h-screen lg:w-[272px] lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-2 px-4 py-4 lg:px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-md shadow-indigo-600/20">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-zinc-100">
            Personal AI
            <span className="font-light text-zinc-400"> Assistant</span>
          </span>
        </Link>
        <button
          onClick={handleSignOut}
          title="Keluar"
          className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 lg:hidden"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex gap-1.5 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-1 lg:pb-0 lg:pt-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-full px-3.5 py-2 text-sm font-medium transition-all lg:rounded-xl",
                active
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t border-zinc-800 p-4 lg:block">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 text-xs font-semibold text-zinc-200 ring-1 ring-zinc-700">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-100">{name}</p>
            <p className="truncate text-xs text-zinc-500">{email}</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Keluar"
            className="rounded-full p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <Link
          href="/"
          className="mt-3 block text-center text-xs text-zinc-500 hover:text-zinc-300"
        >
          ← Kembali ke landing
        </Link>
      </div>
    </aside>
  );
}
