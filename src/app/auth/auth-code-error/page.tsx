import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export const metadata = { title: "Tautan tidak valid" };

export default function AuthCodeErrorPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
        <AlertTriangle className="h-6 w-6 text-red-400" />
      </div>
      <h1 className="mt-4 text-lg font-semibold text-zinc-100">
        Tautan tidak valid atau sudah kedaluwarsa
      </h1>
      <p className="mt-1 max-w-sm text-center text-sm text-zinc-400">
        Coba minta tautan baru, atau masuk kembali menggunakan email dan
        password kamu.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
      >
        Kembali ke Login
      </Link>
    </div>
  );
}
