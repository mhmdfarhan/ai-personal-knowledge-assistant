import { notFound, redirect } from "next/navigation";
import { ChatPanel } from "@/components/chat/chat-panel";
import { createClient } from "@/lib/supabase/server";
import type { Conversation, Message } from "@/types/database";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation) {
    notFound();
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h1 className="flex items-center gap-2 border-b border-zinc-800/70 pb-3 text-sm font-medium text-zinc-400">
        {(conversation as Conversation).title}
      </h1>
      <div className="min-h-0 flex-1 pt-4">
        <ChatPanel
          conversationId={conversationId}
          initialMessages={(messages ?? []) as Message[]}
        />
      </div>
    </div>
  );
}
