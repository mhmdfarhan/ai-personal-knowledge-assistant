import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  Database,
  FileText,
  Lock,
  MessageCircle,
  Search,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ctaHref = user ? "/dashboard" : "/register";
  const ctaSecondaryHref = user ? "/chat" : "/login";

  return (
    <div className="relative flex flex-col overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 bg-zinc-950" />
        <div className="absolute -top-48 left-1/2 h-[640px] w-[1200px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute -top-32 right-0 h-[480px] w-[480px] rounded-full bg-violet-600/15 blur-[100px]" />
        <div className="absolute left-0 top-[520px] h-[400px] w-[400px] rounded-full bg-sky-600/10 blur-[100px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-600/20">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-zinc-100">
              Personal AI
              <span className="font-light text-zinc-400"> Assistant</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
            <a href="#fitur" className="hover:text-zinc-100">Fitur</a>
            <a href="#cara-kerja" className="hover:text-zinc-100">Cara kerja</a>
            <a href="#keamanan" className="hover:text-zinc-100">Keamanan</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden h-9 items-center justify-center rounded-full px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-900 sm:inline-flex"
                >
                  Dashboard
                </Link>
                <Link
                  href="/chat"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-white px-5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
                >
                  Buka Chat <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden h-9 items-center justify-center rounded-full px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-900 sm:inline-flex"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-white px-5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
                >
                  Daftar gratis <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
            RAG · pgvector · Streaming Chat · OpenRouter
          </div>
          <h1 className="mt-6 bg-gradient-to-b from-zinc-50 to-zinc-400 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl sm:leading-[1.05]">
            Knowledge pribadimu,
            <br />
            dijawab AI dengan sumber.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-base leading-relaxed text-zinc-400 sm:text-lg">
            Simpan catatan & dokumen (PDF, DOCX, MD, TXT). Tanyakan apa saja —
            AI menjawab hanya dari konteks milikmu, lengkap dengan sitasi dan
            markdown yang rapi.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={ctaHref}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:from-indigo-500 hover:to-violet-500 sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              {user ? "Buka dashboard" : "Mulai gratis"}
              <ArrowRight className="h-4 w-4 opacity-80" />
            </Link>
            <Link
              href={ctaSecondaryHref}
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/60 px-6 text-sm font-medium text-zinc-200 backdrop-blur hover:bg-zinc-900 sm:w-auto"
            >
              <MessageCircle className="h-4 w-4" />
              {user ? "Lanjut chat" : "Lihat demo login"}
            </Link>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Tanpa kartu kredit · Data terisolasi per akun (RLS) · Storage privat
          </p>
        </div>

        <div className="relative mx-auto mt-10 max-w-5xl">
          <div className="absolute -inset-3 rounded-[28px] bg-gradient-to-br from-indigo-600/20 via-violet-600/20 to-sky-600/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-900/70 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-1.5 border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-zinc-700" />
              <span className="h-3 w-3 rounded-full bg-zinc-700" />
              <span className="h-3 w-3 rounded-full bg-zinc-700" />
              <span className="ml-3 text-xs text-zinc-500">chat — Personal AI Assistant</span>
            </div>
            <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
              <div className="hidden border-r border-zinc-800 p-3 lg:block">
                <div className="space-y-2">
                  <div className="rounded-xl bg-indigo-600/15 px-3 py-2.5">
                    <p className="text-xs font-medium text-indigo-200">Riset skripsi — Bab 2</p>
                    <p className="text-xs text-indigo-300/70">2 jam lalu</p>
                  </div>
                  <div className="rounded-xl bg-zinc-800/60 px-3 py-2.5">
                    <p className="text-xs font-medium text-zinc-200">Catatan meeting klien</p>
                    <p className="text-xs text-zinc-500">Kemarin</p>
                  </div>
                  <div className="rounded-xl bg-zinc-800/40 px-3 py-2.5">
                    <p className="text-xs font-medium text-zinc-300">Dokumen kontrak</p>
                    <p className="text-xs text-zinc-500">3 hari lalu</p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-dashed border-zinc-700 p-3">
                  <p className="text-xs font-medium text-zinc-300">Storage</p>
                  <p className="mt-1 text-xs text-zinc-500">12 dokumen · 48 MB</p>
                  <div className="mt-2 h-1.5 rounded-full bg-zinc-800">
                    <div className="h-1.5 w-2/3 rounded-full bg-indigo-500" />
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-3 text-sm text-white">
                      Ringkas poin utama dari dokumen “Riset skripsi Bab 2” dan beri sitasinya?
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="rounded-2xl rounded-tl-md border border-zinc-800 bg-zinc-800/60 px-4 py-3">
                        <p className="text-sm leading-relaxed text-zinc-200">
                          Berikut ringkasan 3 poin utama berdasarkan dokumen kamu:
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-zinc-300">
                          <li>Metodologi kualitatif dengan wawancara semi-terstruktur.</li>
                          <li>Temuan: adopsi AI meningkatkan efisiensi 32%.</li>
                          <li>Keterbatasan: sampel terbatas pada UMKM Jawa.</li>
                        </ul>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                          <FileText className="h-3 w-3" /> Riset Bab 2.pdf · hal. 4
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                          <BookOpen className="h-3 w-3" /> Catatan Bab 2
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-2">
                  <span className="flex-1 text-sm text-zinc-500">Tanyakan knowledge-mu…</span>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-900">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="fitur" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
            Semua yang kamu butuh untuk knowledge pribadi
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Dibuat untuk individu, peneliti, dan tim kecil yang ingin AI yang jujur — hanya menjawab dari data milikmu.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: BookOpen,
              title: "Knowledge CRUD",
              desc: "Tulis, kelola, dan cari catatan pribadimu dengan editor yang cepat dan rapi.",
            },
            {
              icon: FileText,
              title: "Upload dokumen",
              desc: "PDF, DOCX, TXT, MD hingga 10 MB. Storage privat per user, bukan publik.",
            },
            {
              icon: Database,
              title: "RAG Pipeline",
              desc: "Ekstraksi teks → chunking → embedding → pgvector. Siap untuk semantic search.",
            },
            {
              icon: Search,
              title: "Semantic search",
              desc: "Temukan konteks paling relevan dengan vector search, bukan keyword saja.",
            },
            {
              icon: MessageCircle,
              title: "AI Chat streaming",
              desc: "Jawaban mengalir real-time via OpenRouter, dengan prompt Knowledge-Only.",
            },
            {
              icon: Shield,
              title: "Sumber & sitasi",
              desc: "Setiap jawaban disertai kartu sumber yang bisa dibuka via signed URL.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur transition hover:border-zinc-700 hover:bg-zinc-900/60"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 group-hover:border-indigo-500/30 group-hover:text-indigo-300">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-zinc-100">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="cara-kerja" className="border-y border-zinc-800/60 bg-zinc-900/20">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Cara kerja</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
                3 langkah dari dokumen ke jawaban
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                Tanpa setup rumit. Upload sekali, langsung bisa ditanya kapan saja.
              </p>
              <div className="mt-8 space-y-5">
                {[
                  { n: "01", t: "Simpan", d: "Tulis knowledge atau upload dokumen. File disimpan di bucket privat user-documents." },
                  { n: "02", t: "Proses RAG", d: "Sistem ekstrak teks, potong jadi chunk, buat embedding dan simpan ke pgvector." },
                  { n: "03", t: "Tanya AI", d: "Kirim pertanyaan → retrieval → prompt grounded → jawaban streaming + sumber." },
                ].map((s) => (
                  <div key={s.n} className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-zinc-900">
                      {s.n}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">{s.t}</p>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-400">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                <Zap className="h-4 w-4 text-amber-400" /> Hallucination control
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Jika tidak ada konteks relevan, AI tidak mengarang — ia akan menjawab jujur bahwa informasi tidak ditemukan di knowledge-mu. Tanpa konteks, tanpa memanggil LLM.
              </p>
              <div className="mt-5 space-y-2 rounded-xl bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-300">
                <p className="text-zinc-500">{"// Prompt system"}</p>
                <p>“Jawab HANYA dari konteks berikut. Jika tidak ada, katakan tidak ditemukan.”</p>
                <p className="pt-2 text-zinc-500">→ Hemat token, lebih jujur.</p>
              </div>
              <ul className="mt-5 space-y-2 text-sm text-zinc-300">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Markdown + syntax highlight</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Tombol salin pada blok kode</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Streaming text/plain bertahap</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="keamanan" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900/40 p-6 sm:p-8">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <Lock className="h-4 w-4 text-indigo-400" /> Keamanan by design
            </div>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
              Data kamu terisolasi total — tidak ada user lain yang bisa melihat knowledge, dokumen, chunk, maupun riwayat chat milikmu.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-sm font-medium text-zinc-200">Row Level Security</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">RLS aktif di semua tabel inti dengan <span className="font-mono text-zinc-300">auth.uid() = user_id</span></p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-sm font-medium text-zinc-200">Storage privat</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">Bucket <span className="font-mono text-zinc-300">user-documents</span> hanya izinkan path <span className="font-mono text-zinc-300">{"{user_id}/…"}</span></p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-sm font-medium text-zinc-200">Service role server-only</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">Kunci rahasia tidak pernah dikirim ke browser</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-sm font-medium text-zinc-200">Proxy + RLS ganda</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">Auth guard di proxy + verifikasi di setiap Route Handler</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-600 p-6 text-white sm:p-8">
            <p className="text-sm font-semibold">Mulai dalam 2 menit</p>
            <p className="mt-2 text-sm leading-relaxed text-indigo-100">
              Daftar, upload dokumen pertamamu, dan langsung tanya AI. Tidak perlu konfigurasi.
            </p>
            <Link
              href={ctaHref}
              className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-indigo-700 hover:bg-zinc-100"
            >
              {user ? "Ke dashboard" : "Buat akun gratis"} <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-center text-xs text-indigo-200">
              {user ? "Kamu sudah login ✓" : "Gratis selama masa beta"}
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900">
              <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
            </span>
            © {new Date().getFullYear()} Personal AI Assistant — RAG untuk knowledge pribadimu.
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href={user ? "/dashboard" : "/login"} className="text-zinc-400 hover:text-zinc-100">Dashboard</Link>
            <Link href="/login" className="text-zinc-400 hover:text-zinc-100">Masuk</Link>
            <Link href="/register" className="text-zinc-400 hover:text-zinc-100">Daftar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
