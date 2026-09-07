import { NextResponse } from "next/server";
import { openChatCompletion, type ChatMessage } from "@/lib/ai";
import { getSessionUser } from "@/lib/api";

function errorDetail(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
import { buildRagMessages, NO_CONTEXT_ANSWER } from "@/lib/rag/prompt";
import { retrieveContext } from "@/lib/rag/retrieve";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGE_LENGTH = 4000;
const HISTORY_LIMIT = 8;

function textStream(text: string): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      controller.enqueue(text);
      controller.close();
    },
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { conversation_id?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body tidak valid." }, { status: 400 });
  }

  const question = typeof body.message === "string" ? body.message.trim() : "";
  if (!question) {
    return NextResponse.json({ error: "Pertanyaan tidak boleh kosong." }, { status: 400 });
  }
  if (question.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Pertanyaan maksimal ${MAX_MESSAGE_LENGTH} karakter.` },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  let conversationId = body.conversation_id;

  // 1) Selesaikan/validasi conversation (buat baru bila tidak ada).
  if (conversationId) {
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv) {
      return NextResponse.json(
        { error: "Percakapan tidak ditemukan." },
        { status: 404 },
      );
    }
  } else {
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title: question.length > 60 ? `${question.slice(0, 60)}…` : question,
      })
      .select("id")
      .single();
    if (convError || !conv) {
      return NextResponse.json(
        { error: "Gagal membuat percakapan." },
        { status: 500 },
      );
    }
    conversationId = conv.id;
  }

  // 2) Riwayat singkat (sebelum user message baru masuk DB).
  const { data: historyRows } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  const history: ChatMessage[] = [...(historyRows ?? [])]
    .reverse()
    .filter(
      (m): m is ChatMessage =>
        m.role === "user" || m.role === "assistant" || m.role === "system",
    )
    .map((m) => ({ role: m.role, content: m.content }));

  // 3) Simpan pertanyaan user.
  const { error: userMsgError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    user_id: user.id,
    role: "user",
    content: question,
  });
  if (userMsgError) {
    return NextResponse.json(
      { error: "Gagal menyimpan pesan." },
      { status: 500 },
    );
  }

  const respond = (text: string, contextFound: boolean, srcs: unknown[] = []) => {
    const headers = new Headers({
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Conversation-Id": conversationId!,
      "X-Context-Found": contextFound ? "1" : "0",
      "X-Sources-Json": encodeURIComponent(JSON.stringify(srcs)),
    });
    return new Response(textStream(text).pipeThrough(new TextEncoderStream()), {
      headers,
    });
  };

  // 4) Retrieval semantik atas knowledge user.
  let contextChunks;
  let contextFound = true;
  try {
    const result = await retrieveContext(supabase, user.id, question);
    contextChunks = result.chunks;
    contextFound = result.hasContext;
  } catch (err) {
    // Retrieval gagal (mis. embedding down) → jawaban ramah, tetap streaming.
    const message =
      "Maaf, terjadi kesalahan ketika mencari knowledge. Silakan coba lagi.";
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "assistant",
      content: message,
      metadata: { error: true, error_detail: errorDetail(err) },
    });
    return respond(message, false);
  }

  const sources = contextChunks.map((c) => ({
    document_id: c.document_id,
    document_title: c.document_title,
    similarity: Number(c.similarity.toFixed(3)),
  }));

  // 5) Tanpa konteks relevan → jawaban jujur sesuai PRD (tanpa panggil LLM).
  if (!contextFound) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "assistant",
      content: NO_CONTEXT_ANSWER,
      metadata: { sources: [], no_context: true },
    });
    return respond(NO_CONTEXT_ANSWER, false);
  }

  // 6) Ada konteks → streaming jawaban LLM.
  const llmMessages = buildRagMessages({
    question,
    contextChunks,
    history,
  });

  let llm;
  try {
    llm = await openChatCompletion(llmMessages);
  } catch (err) {
    const message = "Maaf, terjadi kesalahan ketika memproses pertanyaan.";
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "assistant",
      content: message,
      metadata: { error: true, error_detail: errorDetail(err) },
    });
    return respond(message, true);
  }

  const response = new Response(
    llm.stream.pipeThrough(new TextEncoderStream()),
    {
      headers: new Headers({
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Conversation-Id": conversationId!,
        "X-Context-Found": "1",
        "X-Sources-Json": encodeURIComponent(JSON.stringify(sources)),
      }),
    },
  );

  // 7) Persist jawaban setelah stream selesai (jalan paralel).
  llm.finished
    .then(async ({ content, usage, model }) => {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: "assistant",
        content,
        metadata: { sources, usage, model },
      });
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    })
    .catch(async () => {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: "assistant",
        content: "Maaf, terjadi kesalahan ketika memproses pertanyaan.",
        metadata: { sources, error: true },
      });
    });

  return response;
}
