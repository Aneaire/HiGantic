import { tool } from "../ai-sdk-shim.js";
import { z } from "zod";
import type { AgentConvexClient } from "../convex-client.js";
import { embedText } from "../embeddings.js";

export function createRagTools(
  convexClient: AgentConvexClient,
  agentId: string,
  googleApiKey?: string | null
) {
  const searchDocuments = tool(
    "search_documents",
    "Search uploaded documents in the knowledge base for relevant information. Use this when the user asks about content from uploaded files.",
    {
      query: z
        .string()
        .describe("The search query to find relevant document content"),
    },
    async (input) => {
      try {
        const embedding = await embedText(input.query, googleApiKey);
        const results = await convexClient.searchDocumentChunks(agentId, embedding);

        if (!results || results.length === 0) {
          return {
            content: [
              { type: "text" as const, text: "No relevant content found in uploaded documents." },
            ],
          };
        }

        const text = results
          .map(
            (r: any) =>
              `[Source: ${r.fileName}]\n${r.content}`
          )
          .join("\n\n---\n\n");

        return { content: [{ type: "text" as const, text }] };
      } catch (err: any) {
        return {
          content: [
            { type: "text" as const, text: `Error searching documents: ${err.message}` },
          ],
        };
      }
    }
  );

  return [searchDocuments];
}
