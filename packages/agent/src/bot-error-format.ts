/**
 * Formats a raw error string from the agent runtime into a short, user-friendly
 * message for external chat surfaces (Slack, Discord). Pattern-matches common
 * failure classes (invalid model, overload, auth, etc.) and falls back to a
 * trimmed version of the raw error so admins can still debug.
 *
 * `integrationLabel` is used in the "pick a valid model" hint so the message
 * points users at the right Settings → Integrations subsection.
 */
export function formatBotError(
  raw: string | undefined,
  integrationLabel: "Slack" | "Discord"
): string {
  // Slack uses *single* for bold; Discord uses **double**.
  const b = integrationLabel === "Slack" ? "*" : "**";
  if (!raw) return `❌ ${b}Something went wrong.${b} No error details were captured.`;
  const msg = raw.toLowerCase();

  // Model selection problems (invalid ID, no access, unknown name, etc.)
  const modelMatch = raw.match(/model\s*[:=]?\s*['"`]?([\w.\-:]+)['"`]?/i);
  if (
    msg.includes("there's an issue with the selected model") ||
    msg.includes("model not found") ||
    msg.includes("invalid model") ||
    msg.includes("unknown model") ||
    (msg.includes("model") &&
      (msg.includes("doesn't exist") ||
        msg.includes("does not exist") ||
        msg.includes("not have access")))
  ) {
    const modelId = modelMatch?.[1];
    return (
      `❌ ${b}Model error${b}\n` +
      (modelId ? `The model \`${modelId}\` isn't available or doesn't exist.\n` : "") +
      `An admin needs to pick a valid model for this bot in ${b}Agent Maker → Settings → Integrations → ${integrationLabel} → Bot Model${b}.`
    );
  }

  if (msg.includes("overloaded") || msg.includes("529") || msg.includes("overloaded_error")) {
    return `⚠️ ${b}The AI provider is overloaded right now.${b}\nThis is a temporary upstream issue — please try again in a moment.`;
  }

  if (
    msg.includes("rate limit") ||
    msg.includes("rate_limit") ||
    msg.includes("429") ||
    msg.includes("too many requests")
  ) {
    return `⏸️ ${b}Rate limit reached.${b}\nPlease wait a minute and try again.`;
  }

  if (
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("unauthorized") ||
    msg.includes("authentication") ||
    msg.includes("api key")
  ) {
    return (
      `🔑 ${b}Authentication problem.${b}\n` +
      `The credentials for this bot's AI provider look invalid or expired. An admin should check ${b}Settings → Integrations${b} in Agent Maker.`
    );
  }

  if (
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("econnreset") ||
    msg.includes("fetch failed") ||
    msg.includes("network")
  ) {
    return `⏱️ ${b}Network/timeout issue talking to the AI provider.${b}\nPlease try again in a moment.`;
  }

  if (
    msg.includes("context length") ||
    msg.includes("too long") ||
    msg.includes("max_tokens") ||
    msg.includes("context_length_exceeded")
  ) {
    return `📏 ${b}The conversation is too long for the model's context window.${b}\nStart a new thread to reset.`;
  }

  const trimmed = raw
    .replace(/Claude Code returned an error result:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
  return `❌ ${b}Something went wrong.${b}\n\`${trimmed}\``;
}
