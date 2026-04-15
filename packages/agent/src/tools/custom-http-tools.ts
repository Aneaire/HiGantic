import { tool } from "../ai-sdk-shim.js";
import { z } from "zod";

interface CustomToolConfig {
  _id: string;
  name: string;
  description: string;
  endpoint: string;
  method: string;
  inputSchema?: any;
  headers?: Record<string, string>;
}

/**
 * Generates MCP tools from user-defined HTTP endpoint configurations.
 * Each custom tool becomes an MCP tool that makes an HTTP request.
 */
export function createCustomHttpTools(configs: CustomToolConfig[]) {
  return configs.map((config) => createHttpTool(config));
}

function createHttpTool(config: CustomToolConfig) {
  // Build zod schema from inputSchema if provided
  const schema: Record<string, z.ZodTypeAny> = {};

  if (config.inputSchema && typeof config.inputSchema === "object") {
    for (const [key, def] of Object.entries(config.inputSchema)) {
      const fieldDef = def as any;
      let zodField: z.ZodTypeAny;

      switch (fieldDef.type) {
        case "number":
          zodField = z.number();
          break;
        case "boolean":
          zodField = z.boolean();
          break;
        case "array":
          zodField = z.array(z.any());
          break;
        case "object":
          zodField = z.record(z.any());
          break;
        default:
          zodField = z.string();
      }

      if (fieldDef.description) {
        zodField = zodField.describe(fieldDef.description);
      }

      if (fieldDef.optional) {
        zodField = zodField.optional();
      }

      schema[key] = zodField;
    }
  }

  // If no input schema, add a generic body field for POST/PUT/PATCH
  if (
    Object.keys(schema).length === 0 &&
    ["POST", "PUT", "PATCH"].includes(config.method)
  ) {
    schema.body = z
      .string()
      .optional()
      .describe("Request body (JSON string)");
  }

  // Always allow query params for GET
  if (config.method === "GET" && Object.keys(schema).length === 0) {
    schema.query = z
      .string()
      .optional()
      .describe("Query parameters (e.g. ?key=value&key2=value2)");
  }

  return tool(
    `custom_${config.name}`,
    config.description,
    schema,
    async (input: Record<string, any>) => {
      try {
        let url = config.endpoint;
        const fetchOpts: RequestInit = {
          method: config.method,
          headers: {
            "Content-Type": "application/json",
            ...(config.headers ?? {}),
          },
        };

        // Build request based on method
        if (config.method === "GET") {
          if (input.query) {
            url += (url.includes("?") ? "&" : "?") + input.query;
          }
        } else {
          // POST/PUT/PATCH/DELETE — send input as JSON body
          const { body: rawBody, ...otherFields } = input;
          const bodyData =
            Object.keys(otherFields).length > 0
              ? otherFields
              : rawBody
                ? JSON.parse(rawBody)
                : undefined;

          if (bodyData) {
            fetchOpts.body = JSON.stringify(bodyData);
          }
        }

        // Execute with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        fetchOpts.signal = controller.signal;

        const response = await fetch(url, fetchOpts);
        clearTimeout(timeout);

        const responseText = await response.text();

        // Truncate large responses
        const maxLen = 10000;
        const truncated =
          responseText.length > maxLen
            ? responseText.substring(0, maxLen) + "\n...(truncated)"
            : responseText;

        return {
          content: [
            {
              type: "text" as const,
              text: `HTTP ${response.status} ${response.statusText}\n\n${truncated}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error calling ${config.endpoint}: ${err.message}`,
            },
          ],
        };
      }
    }
  );
}
