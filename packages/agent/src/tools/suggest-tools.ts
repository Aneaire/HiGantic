import { tool } from "../ai-sdk-shim.js";
import { z } from "zod";
import type { AgentConvexClient } from "../convex-client.js";

export function createSuggestTools(
  convexClient: AgentConvexClient,
  messageId: string
) {
  const suggestReplies = tool(
    "suggest_replies",
    `Suggest follow-up questions or actions the user might want to take next. Call this at the END of your response to provide 2-4 clickable suggestions. Keep each suggestion concise (under 60 chars). Make them specific and actionable, not generic.`,
    {
      suggestions: z
        .array(z.string())
        .min(2)
        .max(4)
        .describe(
          "Array of 2-4 suggested follow-up messages the user might want to send"
        ),
    },
    async (input) => {
      await convexClient.setSuggestions(messageId, input.suggestions);
      return {
        content: [
          {
            type: "text" as const,
            text: `Set ${input.suggestions.length} suggested replies.`,
          },
        ],
      };
    }
  );

  const askQuestions = tool(
    "ask_questions",
    `Present the user with interactive multiple-choice questions. Use this INSTEAD of writing questions as plain text whenever you need the user to choose between options. Each question gets rendered as a clickable card where the user can select their answer. Use this for onboarding flows, preference gathering, configuration choices, etc. Do NOT also write the questions in your text response — the tool handles the display.`,
    {
      questions: z
        .array(
          z.object({
            id: z
              .string()
              .describe(
                "Unique short identifier for this question, e.g. 'spreadsheet_type', 'tech_level'"
              ),
            question: z
              .string()
              .describe(
                "The question text to display. Keep it concise."
              ),
            options: z
              .array(z.string())
              .min(2)
              .max(6)
              .describe(
                "The selectable options. Keep each option short (under 40 chars)."
              ),
          })
        )
        .min(1)
        .max(6)
        .describe("Array of questions with selectable options"),
    },
    async (input) => {
      await convexClient.setQuestions(messageId, input.questions);
      return {
        content: [
          {
            type: "text" as const,
            text: `Presented ${input.questions.length} question(s) to the user. Wait for their selections.`,
          },
        ],
      };
    }
  );

  return [suggestReplies, askQuestions];
}
