// E2E Milestone 3: upload dokumen asli lewat API aplikasi (dev server) dengan
// sesi login user test → pipeline extract/chunk/embed → status READY →
// semantic search via match_document_chunks. User & data test dibersihkan.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const APP = process.env.APP_URL ?? "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = process.env.LLM_API_KEY;
const baseAI = process.env.LLM_BASE_URL ?? "https://openrouter.ai/api/v1";

const results = [];
const ok = (name, cond, extra = "") =>
  results.push(`${cond ? "✅ PASS" : "❌ FAIL"} — ${name}${extra ? " (" + extra + ")" : ""}`);

async function api(path, { method = "GET", token = serviceRole, headers = {}, body } = {}) {
  const res = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: token === serviceRole ? serviceRole : anonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body,
    signal: AbortSignal.timeout(300_000),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

const ts = Date.now();
const email = `e2e-m3-${ts}@example.com`;
const password = "Test-Password-123";
let userId, userToken;
const uploadedPaths = [];

function appFetch(path, init = {}) {
  const headers = new Headers(init.headers);
  // Supabase SSR menyimpan sesi sebagai JSON mentah di cookie (tanpa encoding).
  const sessionJson = JSON.stringify({
    access_token: userToken,
    refresh_token: userToken, // cukup utk getUser (verifikasi access token)
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
  });
  headers.set("Cookie", `sb-kuphrzigbmjomfhuoeun-auth-token=${sessionJson}`);
  return fetch(`${APP}${path}`, { ...init, headers, signal: AbortSignal.timeout(300_000) });
}

async function embed(text) {
  const r = await fetch(`${baseAI}/embeddings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.EMBEDDING_MODEL ?? "openai/text-embedding-3-small", input: text }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error("embed query gagal: " + JSON.stringify(j).slice(0, 200));
  return j.data[0].embedding;
}

try {
  // 1. User test
  const u = await api("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  userId = u.data?.id;
  if (!userId) throw new Error("buat user gagal");
  const l = await api(`/auth/v1/token?grant_type=password`, { method: "POST", token: anonKey, body: JSON.stringify({ email, password }) });
  userToken = l.data?.access_token;
  if (!userToken) throw new Error("login user gagal");

  // 2. Warm up route handler (kompilasi pertama Next dev)
  const warm = await appFetch("/api/knowledge");
  ok("API aplikasi merespons (auth check)", warm.status === 200, `HTTP ${warm.status}`);

  // 3. Upload Markdown (contoh: catatan deploy ala PRD)
  const md = [
    "# Deploy React ke VPS",
    "",
    "## Setup",
    "Untuk melakukan deployment React ke VPS, gunakan Nginx sebagai reverse proxy.",
    "Build aplikasi dengan npm run build, hasilnya di folder dist atau build.",
    "",
    "## Langkah",
    "1. Copy hasil build ke /var/www/my-app",
    "2. Konfigurasi Nginx untuk serve file statis + proxy API ke port 3001",
    "3. Restart Nginx: sudo systemctl restart nginx",
    "4. Aktifkan HTTPS dengan certbot",
    "",
    "## Troubleshooting",
    "Jika halaman blank, cek console browser untuk error JavaScript, lalu pastikan",
    "base path di package.json sudah benar.",
  ].join("\n");
  const fd = new FormData();
  fd.append("file", new Blob([md], { type: "text/markdown" }), "react-vps-deploy.md");
  const r1 = await appFetch("/api/documents", { method: "POST", body: fd });
  const j1 = await r1.json().catch(() => null);
  const d1 = j1?.document;
  ok("Upload MD → pipeline selesai", r1.status === 201 && d1?.status === "READY",
    `HTTP ${r1.status}, status=${d1?.status}, chunk=${d1?.metadata?.chunk_count}`);
  if (d1?.file_path) uploadedPaths.push(d1.file_path);

  // 4. Upload PDF asli (PRD) — jalur ekstraksi pdfjs/unpdf
  const pdfBytes = await readFile(fileURLToPath(new URL("../docs/Personal AI Knowledge Assistant PRD.pdf", import.meta.url)));
  const fd2 = new FormData();
  fd2.append("file", new Blob([pdfBytes], { type: "application/pdf" }), "prd.pdf");
  const r2 = await appFetch("/api/documents", { method: "POST", body: fd2 });
  const j2 = await r2.json().catch(() => null);
  const d2 = j2?.document;
  ok("Upload PDF asli → pipeline selesai", r2.status === 201 && d2?.status === "READY",
    `HTTP ${r2.status}, status=${d2?.status}, chunk=${d2?.metadata?.chunk_count}`);
  if (d2?.file_path) uploadedPaths.push(d2.file_path);

  // 5. Semantic search: pertanyaan dengan kata BERBEDA dari isi dokumen
  const qEmbed = await embed("Bagaimana cara publish aplikasi React ke server?");
  const rpc = await api("/rest/v1/rpc/match_document_chunks", {
    method: "POST", token: userToken,
    body: JSON.stringify({ query_embedding: qEmbed, match_threshold: 0.2, match_count: 3, p_user_id: userId }),
  });
  const hits = Array.isArray(rpc.data) ? rpc.data : [];
  ok("Semantic search menemukan chunk relevan", hits.length > 0, `${hits.length} hasil`);
  const best = hits[0];
  if (best) {
    console.log("  → Top match: similarity " + best.similarity?.toFixed(3) + " | " + String(best.content).slice(0, 120).replace(/\s+/g, " "));
  } else {
    console.log("  → RPC error:", JSON.stringify(rpc.data)?.slice(0, 200));
    const probe = await api("/rest/v1/rpc/match_document_chunks", {
      method: "POST", token: userToken,
      body: JSON.stringify({ query_embedding: qEmbed, match_threshold: 0, match_count: 3, p_user_id: userId }),
    });
    console.log("  → threshold 0:", JSON.stringify(probe.data)?.slice(0, 300));
  }
} catch (err) {
  ok("E2E selesai tanpa error", false, err.message);
} finally {
  for (const p of uploadedPaths) await api(`/storage/v1/object/user-documents/${encodeURIComponent(p)}`, { method: "DELETE" });
  if (userId) await api(`/auth/v1/admin/users/${userId}`, { method: "DELETE" });
}

console.log(results.join("\n"));
