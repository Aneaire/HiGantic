import { useEffect, useRef, useCallback } from "react";
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
  const userScrolledUp = useRef(false);

  // Track if the user has manually scrolled away from the bottom
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    userScrolledUp.current = distanceFromBottom > 200;
  }, []);

  // Auto-scroll to bottom on new messages or content updates
  useEffect(() => {
    const container = containerRef.current;
    if (!container || userScrolledUp.current) return;

    // Use scrollTop instead of scrollIntoView to avoid snap-to-top behavior
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [messages]);

  // Always scroll to bottom on initial load
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
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
      onScroll={handleScroll}
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
