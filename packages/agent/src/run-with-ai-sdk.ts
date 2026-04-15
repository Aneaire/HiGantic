import { streamText, stepCountIs } from "ai";
import type { Tool, CoreMessage } from "ai";
import { getLanguageModel, getProviderOptions } from "./model-factory.js";

export interface FlusherLike {
  readonly stopped: boolean;
  readonly currentText: string;
  readonly currentToolCalls: Array<{
    id: string;
    name: string;
    input: string;
    output?: string;
    progress?: string;
  }>;
  appendText(delta: string): void;
  setText(text: string): void;
  upsertToolCall(tc: {
    id: string;
    name: string;
    input: string;
    output?: string;
    progress?: string;
  }): void;
}

export interface RunWithAiSdkParams {
  flusher: FlusherLike;
  modelId: string;
  system: string;
  messages: CoreMessage[];
  tools: Record<string, Tool<any, any>>;
  maxSteps?: number;
  /** User-supplied API key for the model provider. When omitted, the model
   * factory falls back to env-var-bound defaults. */
  apiKey?: string | null;
}

/**
 * Shared AI SDK runner used by runAgent, runCreator, and runApiEndpoint.
 * Streams from the model and forwards events to the flusher so real-time
 * updates propagate to the UI via Convex mutations.
 */
export async function runWithAiSdk(params: RunWithAiSdkParams): Promise<void> {
  const toolsArg = Object.keys(params.tools).length > 0 ? params.tools : undefined;

  const result = streamText({
    model: getLanguageModel(params.modelId, { apiKey: params.apiKey }),
    system: params.system,
    messages: params.messages,
    ...(toolsArg ? { tools: toolsArg } : {}),
    ...(toolsArg ? { maxSteps: params.maxSteps ?? 20 } : {}),
    providerOptions: getProviderOptions(params.modelId),
    onError: ({ error }) => {
      console.error("[ai-sdk] Stream error:", error);
    },
  });

  let lastTurnHadToolUse = false;

  for await (const event of result.fullStream) {
    if (params.flusher.stopped) {
      console.log("[agent] User stopped — breaking out of stream loop.");
      break;
    }

    const ev = event as any;

    switch (ev.type) {
      case "text-delta": {
        const delta: string = ev.text ?? ev.textDelta ?? "";
        if (!delta) break;

        // After a tool use, insert a separator before new text
        if (lastTurnHadToolUse && params.flusher.currentText.length > 0) {
          const trimmed = params.flusher.currentText.trimEnd();
          const endsAtBoundary = /[.!?:;\n\r\]})>`"']$/.test(trimmed);
          params.flusher.appendText(endsAtBoundary ? "\n\n" : " ");
          lastTurnHadToolUse = false;
        }

        params.flusher.appendText(delta);
        break;
      }

      case "tool-call": {
        lastTurnHadToolUse = true;
        params.flusher.upsertToolCall({
          id: ev.toolCallId,
          name: ev.toolName,
          input: JSON.stringify(ev.input ?? ev.args ?? {}),
        });
        break;
      }

      case "tool-result": {
        const existing = params.flusher.currentToolCalls.find(
          (t) => t.id === ev.toolCallId
        );
        const rawOutput = ev.output ?? ev.result;
        const output =
          typeof rawOutput === "string" ? rawOutput : JSON.stringify(rawOutput);

        params.flusher.upsertToolCall({
          id: ev.toolCallId,
          name: ev.toolName ?? existing?.name ?? "",
          input: existing?.input ?? JSON.stringify(ev.input ?? ev.args ?? {}),
          output,
          progress: existing?.progress,
        });
        break;
      }

      case "error": {
        throw ev.error instanceof Error ? ev.error : new Error(String(ev.error));
      }
    }
  }
}

/**
 * Non-streaming single-turn generation, used by the /assist-prompt endpoint
 * and other places that need just the final text.
 */
export async function generateOnce(
  modelId: string,
  system: string,
  prompt: string,
  opts: { apiKey?: string | null } = {}
): Promise<string> {
  const { generateText } = await import("ai");
  const result = await generateText({
    model: getLanguageModel(modelId, { apiKey: opts.apiKey }),
    system,
    prompt,
    providerOptions: getProviderOptions(modelId),
  });
  return result.text;
}
