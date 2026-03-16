import { Type } from "lucide-react";
import type { Doc } from "@agent-maker/shared/convex/_generated/dataModel";

export function MarkdownPage({ tab }: { tab: Doc<"sidebarTabs"> }) {
  const config = tab.config as { content?: string } | undefined;
  const content = config?.content ?? "";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-zinc-800 px-6 py-3 flex items-center gap-2 shrink-0">
        <Type className="h-4 w-4 text-zinc-400" />
        <h2 className="text-sm font-medium">{tab.label}</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {content ? (
          <div className="max-w-2xl mx-auto prose prose-invert prose-sm prose-zinc">
            <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300">
              {content}
            </pre>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
            This page is empty. The agent can write content here during
            conversations.
          </div>
        )}
      </div>
    </div>
  );
}
