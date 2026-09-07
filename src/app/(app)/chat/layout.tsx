import { redirect } from "next/navigation";
import { ConversationList } from "@/components/chat/conversation-list";
import { createClient } from "@/lib/supabase/server";
import type { Conversation } from "@/types/database";

export const metadata = { title: "AI Chat" };

export default async function ChatLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);

  const conversations = (data ?? []) as Conversation[];

  return (
    <div className="mx-auto flex h-[calc(100dvh-7rem)] w-full max-w-6xl flex-col gap-4 lg:flex-row">
      <aside className="shrink-0 lg:w-64 lg:border-r lg:border-zinc-800/70 lg:pr-4">
        <div className="h-44 overflow-y-auto lg:h-full">
          <ConversationList initialConversations={conversations} />
        </div>
      </aside>
      <main className="flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
