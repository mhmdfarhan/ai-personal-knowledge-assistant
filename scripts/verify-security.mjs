// Verifikasi keamanan end-to-end via REST (tanpa supabase-js agar tidak butuh WebSocket):
// RLS antar user, storage privat, dan fungsi vector search.
// Membuat 2 user test + data milik A, memastikan B tidak bisa mengakses, lalu cleanup.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

const results = [];
const ok = (name, cond, extra = "") =>
  results.push(`${cond ? "✅ PASS" : "❌ FAIL"} — ${name}${extra ? " (" + extra + ")" : ""}`);

const jh = (token, extra = {}) => ({
  apikey: token === serviceRole ? serviceRole : anonKey,
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  ...extra,
});

async function api(path, { method = "GET", token = serviceRole, body, raw } = {}) {
  const res = await fetch(`${url}${path}`, {
    method,
    headers: raw
      ? { apikey: anonKey, Authorization: `Bearer ${token}`, ...raw.headers }
      : jh(token, raw?.headers),
    body,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

const ts = Date.now();
const emailA = `sec-a-${ts}@example.com`;
const emailB = `sec-b-${ts}@example.com`;
const password = "Test-Password-123";
const embedding = [1, ...new Array(1535).fill(0)]; // vector(1536)
let idA, idB, tokenA, tokenB;
const uploadedPaths = [];

try {
  // Buat user A & B (email_confirm true agar langsung bisa login)
  const a = await api("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email: emailA, password, email_confirm: true }) });
  const b = await api("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email: emailB, password, email_confirm: true }) });
  idA = a.data?.id; idB = b.data?.id;
  if (!idA || !idB) throw new Error("gagal buat user test: " + JSON.stringify(a.data || b.data));

  const la = await api(`/auth/v1/token?grant_type=password`, { method: "POST", token: anonKey, body: JSON.stringify({ email: emailA, password }) });
  const lb = await api(`/auth/v1/token?grant_type=password`, { method: "POST", token: anonKey, body: JSON.stringify({ email: emailB, password }) });
  tokenA = la.data?.access_token; tokenB = lb.data?.access_token;
  if (!tokenA || !tokenB) throw new Error("gagal login user test");

  // A menulis knowledge, dokumen, dan chunk ber-embedding
  const k = await api("/rest/v1/knowledge", { method: "POST", token: tokenA, body: JSON.stringify({ user_id: idA, title: "Rahasia A", content: "Hanya milik user A." }) });
  if (k.status >= 400) throw new Error("insert knowledge A: " + JSON.stringify(k.data));

  const d = await api("/rest/v1/documents", {
    method: "POST", token: tokenA,
    body: JSON.stringify({ user_id: idA, title: "catatan A.pdf", file_name: "catatan A.pdf", file_path: `${idA}/dummy.pdf`, mime_type: "application/pdf", file_size: 10, status: "READY" }),
  });
  if (d.status >= 400) throw new Error("insert dokumen A: " + JSON.stringify(d.data));
  const dq = await api("/rest/v1/documents?select=id&order=created_at.desc&limit=1", { token: tokenA });
  const docA = Array.isArray(dq.data) ? dq.data[0] : null;
  if (!docA?.id) throw new Error("ambil id dokumen A gagal");

  const c = await api("/rest/v1/document_chunks", {
    method: "POST", token: tokenA,
    body: JSON.stringify({ document_id: docA.id, user_id: idA, content: "Laravel menggunakan middleware untuk authentication.", chunk_index: 0, embedding }),
  });
  if (c.status >= 400) throw new Error("insert chunk A: " + JSON.stringify(c.data));

  // RLS knowledge
  const ka = await api("/rest/v1/knowledge?select=id", { token: tokenA });
  const kb = await api("/rest/v1/knowledge?select=id", { token: tokenB });
  ok("Knowledge milik A terlihat oleh A", Array.isArray(ka.data) && ka.data.length === 1);
  ok("Knowledge milik A TIDAK terlihat oleh B (RLS)", Array.isArray(kb.data) && kb.data.length === 0);

  // Vector search (fungsi match_document_chunks)
  const rpcBody = JSON.stringify({ query_embedding: embedding, match_threshold: 0.5, match_count: 5, p_user_id: idA });
  const ra = await api("/rest/v1/rpc/match_document_chunks", { method: "POST", token: tokenA, body: rpcBody });
  ok("Fungsi match_document_chunks ada & A mendapat 1 chunk", !ra.data?.message && Array.isArray(ra.data) && ra.data.length === 1, ra.data?.message ?? `${ra.data?.length} chunk`);

  const rb = await api("/rest/v1/rpc/match_document_chunks", { method: "POST", token: tokenB, body: JSON.stringify({ query_embedding: embedding, match_threshold: 0.5, match_count: 5, p_user_id: idB }) });
  ok("Vector search oleh B TIDAK membocorkan chunk A", !rb.data?.message && Array.isArray(rb.data) && rb.data.length === 0, rb.data?.message ?? "0 chunk");

  // Storage privat
  const pathA = `${idA}/rahasia-a.txt`;
  const up = await api(`/storage/v1/object/user-documents/${encodeURIComponent(pathA)}`, {
    method: "POST", token: tokenA,
    raw: { headers: { "Content-Type": "text/plain", "x-upsert": "false" } },
    body: "rahasia milik A",
  });
  ok("A bisa upload ke bucket privat", up.status === 200, `HTTP ${up.status}`);
  if (up.status === 200) uploadedPaths.push(pathA);

  const dlA = await api(`/storage/v1/object/user-documents/${encodeURIComponent(pathA)}`, { token: tokenA });
  ok("A bisa download file miliknya sendiri", dlA.status === 200, `HTTP ${dlA.status}`);

  const dlB = await api(`/storage/v1/object/user-documents/${encodeURIComponent(pathA)}`, { token: tokenB });
  ok("B TIDAK bisa download file milik A", dlB.status !== 200, `HTTP ${dlB.status}`);

  const listB = await api("/storage/v1/object/list/user-documents", { method: "POST", token: tokenB, body: JSON.stringify({ prefix: idA, limit: 100 }) });
  ok("B TIDAK bisa melihat isi folder A", (Array.isArray(listB.data) && listB.data.length === 0), JSON.stringify(listB.data)?.slice(0, 60));
} catch (err) {
  ok("Skrip selesai tanpa error", false, err.message);
} finally {
  // Cleanup: file + kedua user (FK cascade menghapus knowledge/documents/chunks)
  for (const p of uploadedPaths) {
    await api(`/storage/v1/object/user-documents/${encodeURIComponent(p)}`, { method: "DELETE" });
  }
  if (idA) await api(`/auth/v1/admin/users/${idA}`, { method: "DELETE" });
  if (idB) await api(`/auth/v1/admin/users/${idB}`, { method: "DELETE" });
}

console.log(results.join("\n"));
