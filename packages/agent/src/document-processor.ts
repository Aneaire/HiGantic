import { embed } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { AgentConvexClient } from "./convex-client.js";

const CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 200;

interface ProcessDocumentParams {
  documentId: string;
  storageUrl: string;
  fileName: string;
  fileType: string;
  agentId: string;
  convexClient: AgentConvexClient;
}

export async function processDocument(params: ProcessDocumentParams) {
  const { documentId, storageUrl, fileName, fileType, agentId, convexClient } = params;

  // Resolve Google AI key: prefer agent-owner's stored credential, fall back
  // to server env var. Used for both embeddings and image description.
  const userGoogleKey = await convexClient.getAiProviderApiKey(agentId, "google_ai");
  const geminiApiKey =
    userGoogleKey ??
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    null;
  const google = createGoogleGenerativeAI({
    apiKey: geminiApiKey ?? undefined,
  });

  try {
    await convexClient.updateDocumentStatus(documentId, "processing");

    // Download file
    const response = await fetch(storageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    // Extract text based on file type
    const text = await extractText(response, fileType, geminiApiKey);

    if (!text.trim()) {
      throw new Error("No text content could be extracted from the file");
    }

    // Chunk the text
    const chunks = chunkText(text);

    // Generate embeddings
    const embeddingModel = google.textEmbeddingModel("text-embedding-004");

    // Batch embed chunks (10 at a time to respect rate limits)
    const embeddedChunks: Array<{
      chunkIndex: number;
      content: string;
      embedding: number[];
    }> = [];

    for (let i = 0; i < chunks.length; i += 10) {
      const batch = chunks.slice(i, i + 10);
      const embeddings = await Promise.all(
        batch.map(async (chunk) => {
          const { embedding } = await embed({ model: embeddingModel, value: chunk });
          return embedding;
        })
      );

      for (let j = 0; j < batch.length; j++) {
        embeddedChunks.push({
          chunkIndex: i + j,
          content: batch[j],
          embedding: embeddings[j],
        });
      }
    }

    // Store chunks
    await convexClient.storeDocumentChunks(documentId, agentId, embeddedChunks);

    // Update status to ready
    await convexClient.updateDocumentStatus(documentId, "ready", embeddedChunks.length);

    // Emit document.ready event
    await convexClient.emitEvent(agentId, "document.ready", "document_processor", {
      documentId,
      fileName,
      chunkCount: embeddedChunks.length,
    });

    console.log(
      `[document-processor] Processed "${fileName}": ${embeddedChunks.length} chunks`
    );
  } catch (err: any) {
    console.error(`[document-processor] Error processing "${fileName}":`, err.message);
    await convexClient.updateDocumentStatus(documentId, "error", undefined, err.message);
  }
}

const IMAGE_TYPES = ["png", "jpg", "jpeg", "webp", "gif"];
const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

async function extractText(
  response: Response,
  fileType: string,
  geminiApiKey: string | null
): Promise<string> {
  if (IMAGE_TYPES.includes(fileType)) {
    return await describeImage(response, fileType, geminiApiKey);
  }

  switch (fileType) {
    case "pdf": {
      const { PDFParse } = await import("pdf-parse");
      const buffer = Buffer.from(await response.arrayBuffer());
      const pdf = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await pdf.getText();
      await pdf.destroy();
      return result.text;
    }
    case "docx": {
      const mammoth = await import("mammoth");
      const buffer = Buffer.from(await response.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    case "txt":
    case "md":
    case "csv":
      return await response.text();
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

async function describeImage(
  response: Response,
  fileType: string,
  geminiApiKey: string | null
): Promise<string> {
  if (!geminiApiKey) {
    throw new Error(
      "No Google AI API key available for image description. Add a Google AI credential in Settings → Credentials or set GEMINI_API_KEY."
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mimeType = IMAGE_MIME[fileType] ?? "image/png";

  // Use Gemini REST API directly for vision (avoids SDK version issues)
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

  const apiResponse = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64,
              },
            },
            {
              text: "Describe this image in thorough detail. Include all visible text, data, labels, colors, layout, and any other information that would be useful for someone searching for this image's content later. If it contains a chart, table, or diagram, describe the structure and all data points.",
            },
          ],
        },
      ],
    }),
  });

  if (!apiResponse.ok) {
    const errBody = await apiResponse.text();
    throw new Error(`Gemini vision API error (${apiResponse.status}): ${errBody}`);
  }

  const data = await apiResponse.json();
  const description =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!description.trim()) {
    throw new Error("Vision model returned empty description for image");
  }

  return `[Image description]\n${description}`;
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];

  if (text.length <= CHUNK_SIZE) {
    return [text];
  }

  let start = 0;
  while (start < text.length) {
    let end = start + CHUNK_SIZE;

    if (end >= text.length) {
      chunks.push(text.slice(start));
      break;
    }

    // Try to break at paragraph boundary
    const paragraphBreak = text.lastIndexOf("\n\n", end);
    if (paragraphBreak > start + CHUNK_SIZE / 2) {
      end = paragraphBreak + 2;
    } else {
      // Try sentence boundary
      const sentenceBreak = text.lastIndexOf(". ", end);
      if (sentenceBreak > start + CHUNK_SIZE / 2) {
        end = sentenceBreak + 2;
      }
    }

    chunks.push(text.slice(start, end));
    start = end - CHUNK_OVERLAP;
  }

  return chunks;
}
