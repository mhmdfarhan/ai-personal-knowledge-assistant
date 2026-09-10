import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-950">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-indigo-600/15 blur-[100px]" />
        <div className="absolute right-0 top-[30%] h-[360px] w-[360px] rounded-full bg-violet-600/10 blur-[80px]" />
      </div>

      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-600/20">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-zinc-100">
            Personal AI <span className="font-light text-zinc-400">Assistant</span>
          </span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Landing
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-10 pt-2 sm:pb-16">
        <div className="w-full max-w-sm">
          <div className="rounded-[20px] border border-zinc-800 bg-zinc-900/60 p-6 shadow-2xl backdrop-blur sm:p-7">
            {children}
          </div>
          <p className="mt-6 text-center text-xs text-zinc-500">
            Dengan masuk, kamu menyetujui penggunaan data sesuai kebijakan privasi kami.
          </p>
        </div>
      </main>
    </div>
  );
}
