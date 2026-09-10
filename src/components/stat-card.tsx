import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "text-zinc-300",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur transition hover:border-zinc-700">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900">
          <Icon className={cn("h-4 w-4", accent)} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
