import { embed } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const defaultGoogle = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

/** Generate a text embedding. Pass a BYOK key to use the agent owner's stored
 * Google AI credential; omit it to fall back to the server's env var. */
export async function embedText(
  text: string,
  apiKey?: string | null
): Promise<number[]> {
  const google = apiKey
    ? createGoogleGenerativeAI({ apiKey })
    : defaultGoogle;
  const { embedding } = await embed({
    model: google.textEmbeddingModel("text-embedding-004"),
    value: text,
  });
  return embedding;
}
