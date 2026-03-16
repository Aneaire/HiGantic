import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import type { Doc } from "@agent-maker/shared/convex/_generated/dataModel";

export function ChatMessageList({
  messages,
  onSendSuggestion,
}: {
  messages: Doc<"messages">[];
  onSendSuggestion?: (content: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or content updates
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Only auto-scroll if user is near the bottom
    const threshold = 150;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold;

    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Always scroll to bottom on initial load
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, []);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        Send a message to start the conversation
      </div>
    );
  }

  // Only show suggestions on the very last assistant message that is "done"
  const lastMsg = messages[messages.length - 1];
  const showSuggestionsFor =
    lastMsg?.role === "assistant" && lastMsg?.status === "done"
      ? lastMsg._id
      : null;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6"
    >
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((msg) => (
          <ChatMessage
            key={msg._id}
            message={msg}
            showSuggestions={msg._id === showSuggestionsFor}
            onSendSuggestion={onSendSuggestion}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
