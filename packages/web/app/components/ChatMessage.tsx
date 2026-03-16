import { useState } from "react";
import {
  Bot,
  User,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Check,
  Wrench,
  Copy,
  CheckCheck,
  ArrowRight,
  CircleDot,
  Send,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Doc } from "@agent-maker/shared/convex/_generated/dataModel";

// ── Copy button (hover-reveal) ──────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-zinc-700/50 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all opacity-0 group-hover:opacity-100"
    >
      {copied ? (
        <CheckCheck className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

// ── Tool call card ──────────────────────────────────────────────────────

function ToolCallCard({
  tc,
  isStreaming,
}: {
  tc: { id: string; name: string; input: any; output?: string };
  isStreaming: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasOutput = tc.output !== undefined;
  const isRunning = !hasOutput && isStreaming;

  let inputDisplay = "";
  try {
    const parsed =
      typeof tc.input === "string" ? JSON.parse(tc.input) : tc.input;
    inputDisplay = JSON.stringify(parsed, null, 2);
  } catch {
    inputDisplay = String(tc.input ?? "");
  }

  const outputPreview = tc.output
    ? tc.output.length > 120
      ? tc.output.substring(0, 120) + "..."
      : tc.output
    : null;

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60 backdrop-blur-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-zinc-800/50 transition-colors text-left"
      >
        <div className="shrink-0">
          {isRunning ? (
            <div className="h-5 w-5 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Loader2 className="h-3 w-3 text-amber-400 animate-spin" />
            </div>
          ) : hasOutput ? (
            <div className="h-5 w-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <Check className="h-3 w-3 text-emerald-400" />
            </div>
          ) : (
            <div className="h-5 w-5 rounded-full bg-zinc-700/50 flex items-center justify-center">
              <Wrench className="h-3 w-3 text-zinc-500" />
            </div>
          )}
        </div>

        <span className="font-mono text-xs font-medium text-zinc-300 flex-1 truncate">
          {tc.name}
        </span>

        {isRunning && (
          <span className="text-[10px] font-medium text-amber-400/80 uppercase tracking-wider">
            Running
          </span>
        )}
        {hasOutput && !expanded && outputPreview && (
          <span className="text-[11px] text-zinc-500 truncate max-w-[200px] hidden sm:block">
            {outputPreview}
          </span>
        )}

        <div className="shrink-0 text-zinc-500">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800">
          {inputDisplay && inputDisplay !== "{}" && (
            <div className="px-3.5 py-2.5 border-b border-zinc-800/60">
              <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                Input
              </div>
              <div className="group relative">
                <pre className="text-xs text-zinc-400 font-mono bg-zinc-950/50 rounded-lg p-2.5 overflow-x-auto max-h-48 overflow-y-auto">
                  {inputDisplay}
                </pre>
                <CopyButton text={inputDisplay} />
              </div>
            </div>
          )}

          {hasOutput && tc.output && (
            <div className="px-3.5 py-2.5">
              <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                Output
              </div>
              <div className="group relative">
                <pre className="text-xs text-zinc-400 font-mono bg-zinc-950/50 rounded-lg p-2.5 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-all">
                  {tc.output}
                </pre>
                <CopyButton text={tc.output} />
              </div>
            </div>
          )}

          {isRunning && (
            <div className="px-3.5 py-3 flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Executing...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Interactive question cards ──────────────────────────────────────────

type Question = { id: string; question: string; options: string[] };

function QuestionCards({
  questions,
  onSubmit,
}: {
  questions: Question[];
  onSubmit: (answers: string) => void;
}) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = questions.every((q) => selections[q.id]);

  function handleSelect(questionId: string, option: string) {
    if (submitted) return;
    setSelections((prev) => ({
      ...prev,
      [questionId]: prev[questionId] === option ? "" : option,
    }));
  }

  function handleSubmit() {
    if (!allAnswered || submitted) return;
    setSubmitted(true);

    // Build a natural-language answer string
    const answerLines = questions.map((q) => {
      const answer = selections[q.id];
      return `${q.question} → ${answer}`;
    });
    onSubmit(answerLines.join("\n"));
  }

  return (
    <div className="space-y-3">
      {questions.map((q, qi) => {
        const selected = selections[q.id];
        return (
          <div
            key={q.id}
            className="border border-zinc-800 rounded-xl bg-zinc-900/40 overflow-hidden"
          >
            {/* Question header */}
            <div className="px-3.5 py-2.5 flex items-start gap-2.5">
              <div className="shrink-0 mt-0.5">
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    selected
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {submitted && selected ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    qi + 1
                  )}
                </div>
              </div>
              <p className="text-sm text-zinc-200 leading-snug flex-1">
                {q.question}
              </p>
            </div>

            {/* Options */}
            <div className="px-3.5 pb-3 flex flex-wrap gap-1.5">
              {q.options.map((option) => {
                const isSelected = selected === option;
                return (
                  <button
                    key={option}
                    onClick={() => handleSelect(q.id, option)}
                    disabled={submitted}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all duration-150 ${
                      submitted
                        ? isSelected
                          ? "bg-blue-500/15 border border-blue-500/30 text-blue-300"
                          : "bg-zinc-900/40 border border-zinc-800/50 text-zinc-600"
                        : isSelected
                          ? "bg-blue-500/15 border border-blue-500/40 text-blue-300 shadow-sm shadow-blue-500/10"
                          : "bg-zinc-800/40 border border-zinc-700/60 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/70 hover:text-zinc-100"
                    }`}
                  >
                    <CircleDot
                      className={`h-3 w-3 shrink-0 ${
                        isSelected ? "text-blue-400" : "text-zinc-600"
                      }`}
                    />
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Submit button */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all duration-150 ${
            allAnswered
              ? "bg-blue-600 text-white hover:bg-blue-500 shadow-sm shadow-blue-500/20"
              : "bg-zinc-800/50 text-zinc-500 cursor-not-allowed"
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          {allAnswered
            ? "Send answers"
            : `Select ${questions.length - Object.values(selections).filter(Boolean).length} more`}
        </button>
      )}
    </div>
  );
}

// ── Main ChatMessage component ──────────────────────────────────────────

export function ChatMessage({
  message,
  showSuggestions,
  onSendSuggestion,
}: {
  message: Doc<"messages">;
  showSuggestions?: boolean;
  onSendSuggestion?: (content: string) => void;
}) {
  const isUser = message.role === "user";
  const isStreaming = message.status === "processing";
  const isError = message.status === "error";
  const isPending = message.status === "pending";

  // ── User message ──────────────────────────────────────────────────────
  if (isUser) {
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm bg-zinc-100 text-zinc-900">
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-700 mt-0.5">
          <User className="h-4 w-4 text-zinc-300" />
        </div>
      </div>
    );
  }

  // ── Assistant message ─────────────────────────────────────────────────
  const hiddenTools = new Set(["suggest_replies", "ask_questions"]);
  const visibleToolCalls = message.toolCalls?.filter(
    (tc) => !hiddenTools.has(tc.name)
  );
  const hasToolCalls = visibleToolCalls && visibleToolCalls.length > 0;

  const hasSuggestions =
    showSuggestions &&
    message.suggestions &&
    message.suggestions.length > 0;

  const hasQuestions =
    showSuggestions &&
    message.questions &&
    message.questions.length > 0;

  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 mt-0.5">
        <Bot className="h-4 w-4 text-zinc-400" />
      </div>

      <div className="flex-1 min-w-0 space-y-3">
        {/* Tool calls */}
        {hasToolCalls && (
          <div className="space-y-2">
            {visibleToolCalls!.map((tc) => (
              <ToolCallCard
                key={tc.id}
                tc={tc}
                isStreaming={isStreaming}
              />
            ))}
          </div>
        )}

        {/* Pending state */}
        {isPending && !message.content ? (
          <div className="flex items-center gap-2 text-zinc-500 text-sm py-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Thinking...</span>
          </div>
        ) : message.content ? (
          /* Markdown content */
          <div
            className={`text-sm leading-relaxed prose prose-invert prose-zinc max-w-none
              prose-p:my-1.5 prose-headings:my-3 prose-li:my-0.5
              prose-pre:bg-zinc-950/60 prose-pre:border prose-pre:border-zinc-800 prose-pre:rounded-xl
              prose-code:text-emerald-400 prose-code:font-medium
              prose-code:before:content-none prose-code:after:content-none
              prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
              prose-table:border-collapse
              prose-th:border prose-th:border-zinc-700 prose-th:px-3 prose-th:py-1.5 prose-th:bg-zinc-800/60
              prose-td:border prose-td:border-zinc-800 prose-td:px-3 prose-td:py-1.5
              prose-strong:text-zinc-100 prose-strong:font-semibold
              prose-blockquote:border-zinc-700 prose-blockquote:text-zinc-400
              ${isError ? "text-red-200" : "text-zinc-200"}`}
          >
            <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-zinc-400 ml-0.5 animate-pulse rounded-sm align-middle" />
            )}
          </div>
        ) : null}

        {/* Error message */}
        {isError && message.error && (
          <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {message.error}
          </div>
        )}

        {/* Interactive questions */}
        {hasQuestions && (
          <QuestionCards
            questions={message.questions as Question[]}
            onSubmit={(answers) => onSendSuggestion?.(answers)}
          />
        )}

        {/* Suggested replies */}
        {hasSuggestions && !hasQuestions && (
          <div className="flex flex-wrap gap-2 pt-1">
            {message.suggestions!.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => onSendSuggestion?.(suggestion)}
                className="group inline-flex items-center gap-1.5 rounded-xl border border-zinc-700/80 bg-zinc-900/60 px-3.5 py-2 text-xs text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-100 transition-all duration-150"
              >
                <ArrowRight className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
