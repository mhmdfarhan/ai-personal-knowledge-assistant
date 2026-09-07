/**
 * Klien AI (OpenAI-compatible) untuk provider seperti OpenRouter.
 * Hanya dipakai di server — API key tidak pernah terekspos ke browser.
 *
 * Base URL & model bisa ditukar ke provider OpenAI-compatible lain lewat env:
 *   LLM_API_KEY, LLM_BASE_URL, LLM_CHAT_MODEL, EMBEDDING_MODEL
 */

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

export const EMBEDDING_BATCH_SIZE = 64;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TokenUsage {
  input: number;
  output: number;
}

export function getAIEnv() {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error(
      "LLM_API_KEY belum diatur di .env.local — salin dari .env.example " +
        "(buat key di https://openrouter.ai/keys).",
    );
  }
  return {
    apiKey,
    baseUrl: (process.env.LLM_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, ""),
    chatModel: process.env.LLM_CHAT_MODEL ?? "openrouter/auto",
    embeddingModel: process.env.EMBEDDING_MODEL ?? "openai/text-embedding-3-small",
  };
}

export function getEmbeddingModel(): string {
  return process.env.EMBEDDING_MODEL ?? "openai/text-embedding-3-small";
}

/**
 * Buat vektor embedding untuk sekumpulan teks.
 * Batching otomatis; retry 1x untuk error jaringan/5xx.
 */
export async function embedTexts(
  inputs: string[],
  model = getEmbeddingModel(),
): Promise<number[][]> {
  const { apiKey, baseUrl } = getAIEnv();
  const embeddings: number[][] = [];

  for (let i = 0; i < inputs.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = inputs.slice(i, i + EMBEDDING_BATCH_SIZE);
    const body = JSON.stringify({ model, input: batch });

    let res: Response | undefined;
    for (let attempt = 0; attempt < 2 && !res?.ok; attempt++) {
      res = await fetch(`${baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
      });
      if (!res.ok && attempt === 0) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    if (!res || !res.ok) {
      const detail = res ? await res.text().catch(() => "") : "";
      throw new Error(
        `Gagal membuat embedding (${res?.status ?? "network"}): ${detail.slice(0, 200)}`,
      );
    }

    const json = (await res.json()) as { data: { embedding: number[] }[] };
    embeddings.push(...json.data.map((d) => d.embedding));
  }

  return embeddings;
}

/**
 * Buka koneksi streaming ke chat completion (SSE dari provider OpenAI-compatible).
 *
 * Mengembalikan:
 *  - stream:   ReadableStream berisi potongan teks jawaban (tanpa markup SSE)
 *  - finished: Promise yang selesai saat stream tuntas, membawa teks penuh,
 *              pemakaian token, dan model yang dipakai (untuk dicatat di DB).
 */
export interface ChatCompletionHandle {
  stream: ReadableStream<string>;
  finished: Promise<{
    content: string;
    usage: TokenUsage | null;
    model: string | null;
  }>;
}

export async function openChatCompletion(
  messages: ChatMessage[],
): Promise<ChatCompletionHandle> {
  const { apiKey, baseUrl, chatModel } = getAIEnv();

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: chatModel, messages, stream: true }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Layanan AI gagal (${res.status}): ${detail.slice(0, 200)}`,
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let controller: ReadableStreamDefaultController<string> | undefined;
  let content = "";
  let usage: TokenUsage | null = null;
  let model: string | null = null;

  const stream = new ReadableStream<string>({
    start(c) {
      controller = c;
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  const finished = (async () => {
    try {
      let doneStream = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line.startsWith("data:")) continue;

          const data = line.slice(5).trim();
          if (data === "[DONE]") {
            doneStream = true;
            break;
          }
          try {
            const json = JSON.parse(data) as {
              choices?: { delta?: { content?: string } }[];
              usage?: { prompt_tokens?: number; completion_tokens?: number };
              model?: string;
            };
            const delta = json.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta) {
              content += delta;
              controller?.enqueue(delta);
            }
            if (json.usage) {
              usage = {
                input: json.usage.prompt_tokens ?? 0,
                output: json.usage.completion_tokens ?? 0,
              };
            }
            model = json.model ?? model;
          } catch {
            // baris non-JSON (mis. event ping) diabaikan
          }
        }
        if (doneStream) break;
      }
      controller?.close();
      return { content, usage, model };
    } catch (err) {
      controller?.error(err);
      throw err;
    }
  })();

  return { stream, finished };
}
