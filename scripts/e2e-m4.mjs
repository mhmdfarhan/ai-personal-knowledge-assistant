// E2E Milestone 4: AI Chat — upload dokumen, bertanya, verifikasi jawaban
// streaming berbasis knowledge, sumber tersimpan, dan jalur "tidak ada konteks".
const APP = process.env.APP_URL ?? "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

const results = [];
const ok = (name, cond, extra = "") =>
  results.push(`${cond ? "✅ PASS" : "❌ FAIL"} — ${name}${extra ? " (" + extra + ")" : ""}`);

async function api(path, { method = "GET", token = serviceRole, body } = {}) {
  const res = await fetch(`${url}${path}`, {
    method,
    headers: { apikey: token === serviceRole ? serviceRole : anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body,
    signal: AbortSignal.timeout(300_000),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

const ts = Date.now();
const email = `e2e-m4-${ts}@example.com`;
const password = "Test-Password-123";
let userId, userToken;
const uploadedPaths = [];

function sessionCookie() {
  return `sb-kuphrzigbmjomfhuoeun-auth-token=${JSON.stringify({
    access_token: userToken,
    refresh_token: userToken,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
  })}`;
}

async function app(path, init = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("Cookie")) headers.set("Cookie", sessionCookie());
  if (init.body && typeof init.body === "string") headers.set("Content-Type", "application/json");
  return fetch(`${APP}${path}`, { ...init, headers, signal: AbortSignal.timeout(300_000) });
}

try {
  const u = await api("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  userId = u.data?.id;
  const l = await api("/auth/v1/token?grant_type=password", { method: "POST", token: anonKey, body: JSON.stringify({ email, password }) });
  userToken = l.data?.access_token;
  if (!userId || !userToken) throw new Error("gagal buat/login user test");

  // 1. Upload dokumen
  const md = [
    "# Deploy React ke VPS",
    "",
    "## Setup",
    "Untuk deployment React ke VPS, gunakan Nginx sebagai reverse proxy.",
    "Build aplikasi dengan npm run build, hasilnya di folder dist.",
    "",
    "## Langkah",
    "1. Copy hasil build ke /var/www/my-app",
    "2. Konfigurasi Nginx untuk serve file statis",
    "3. Restart Nginx: sudo systemctl restart nginx",
  ].join("\n");
  const fd = new FormData();
  fd.append("file", new Blob([md], { type: "text/markdown" }), "deploy-notes.md");
  const up = await app("/api/documents", { method: "POST", body: fd });
  const upj = await up.json();
  ok("Upload dokumen → READY", up.status === 201 && upj?.document?.status === "READY", `chunks=${upj?.document?.metadata?.chunk_count}`);
  if (upj?.document?.file_path) uploadedPaths.push(upj.document.file_path);

  // 2. Tanya (streaming)
  const chatRes = await app("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message: "Bagaimana cara publish aplikasi React ke server?" }),
  });
  const convId = chatRes.headers.get("x-conversation-id");
  const contextFound = chatRes.headers.get("x-context-found");
  ok("POST /api/chat streaming (200, text/plain)", chatRes.status === 200 && (chatRes.headers.get("content-type") ?? "").includes("text/plain"), `HTTP ${chatRes.status}`);
  ok("Header X-Conversation-Id & X-Context-Found", !!convId && contextFound === "1");

  let answer = "";
  const reader = chatRes.body.pipeThrough(new TextDecoderStream()).getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    answer += value;
  }
  ok("Jawaban tiba secara streaming (banyak potongan)", chunks.length >= 2, `${chunks.length} chunk`);
  const lower = answer.toLowerCase();
  ok("Jawaban grounded pada knowledge (menyebut Nginx/reverse proxy)", lower.includes("nginx") || lower.includes("reverse proxy"), `"${answer.slice(0, 110).replace(/\s+/g, " ")}…"`);
  ok("Jawaban menyebut sumber [1]", answer.includes("[1]"));

  // 2b. Header sumber (M5) + tautan file dokumen
  const srcHeader = chatRes.headers.get("x-sources-json");
  const srcList = srcHeader ? JSON.parse(decodeURIComponent(srcHeader)) : [];
  ok("Header X-Sources-Json berisi judul dokumen", Array.isArray(srcList) && srcList.length >= 1 && typeof srcList[0]?.document_title === "string", srcList[0]?.document_title);
  if (srcList[0]?.document_id) {
    const fileRes = await app(`/api/documents/${srcList[0].document_id}/file`);
    const fileJson = await fileRes.json().catch(() => null);
    ok("Signed URL dokumen tersedia", fileRes.status === 200 && typeof fileJson?.url === "string" && fileJson.url.startsWith("http"), `HTTP ${fileRes.status}`);
  }

  // 3. Persistensi pesan + metadata sumber
  let stored = null;
  for (let i = 0; i < 10 && !stored; i++) {
    const r = await app(`/api/conversations/${convId}`);
    const j = await r.json();
    const msgs = j.messages ?? [];
    if (msgs.length >= 2 && msgs[msgs.length - 1]?.role === "assistant") stored = j;
    else await new Promise((r2) => setTimeout(r2, 300));
  }
  const msgs = stored?.messages ?? [];
  const lastMsg = msgs[msgs.length - 1];
  ok("User & assistant tersimpan di DB", msgs.length === 2, `${msgs.length} pesan`);
  ok("Metadata sumber tersimpan", Array.isArray(lastMsg?.metadata?.sources) && lastMsg.metadata.sources.length >= 1, `sources=${lastMsg?.metadata?.sources?.length}`);
  ok("Conversation terdaftar di list", (await app("/api/conversations")).status === 200);

  // 4. Pertanyaan tanpa konteks → jawaban jujur, tanpa panggil LLM
  const nc = await app("/api/chat", {
    method: "POST",
    body: JSON.stringify({ conversation_id: convId, message: "Ceritakan tentang resep kue coklat" }),
  });
  let ncText = "";
  const ncr = nc.body.pipeThrough(new TextDecoderStream()).getReader();
  while (true) { const { done, value } = await ncr.read(); if (done) break; ncText += value; }
  ok("X-Context-Found=0 untuk pertanyaan tak relevan", nc.headers.get("x-context-found") === "0");
  ok("Jawaban jujur 'tidak menemukan'", ncText.toLowerCase().includes("tidak menemukan"), `"${ncText.slice(0, 90)}…"`);
} catch (err) {
  ok("E2E selesai tanpa error", false, err.message);
} finally {
  for (const p of uploadedPaths) await api(`/storage/v1/object/user-documents/${encodeURIComponent(p)}`, { method: "DELETE" });
  if (userId) await api(`/auth/v1/admin/users/${userId}`, { method: "DELETE" });
}

console.log(results.join("\n"));
