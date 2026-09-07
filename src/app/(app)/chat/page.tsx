import { ChatPanel } from "@/components/chat/chat-panel";

export default function NewChatPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatPanel conversationId={null} initialMessages={[]} />
    </div>
  );
}
