import { tool as aiTool, type Tool } from "ai";
import { z, type ZodRawShape } from "zod";

type TextBlock = { type: "text"; text: string };
type LegacyResult = { content: Array<TextBlock> } | string;
type LegacyHandler = (input: any) => Promise<LegacyResult> | LegacyResult;

/**
 * Shim matching the Claude Agent SDK's `tool(name, desc, schema, handler)`
 * signature but producing an AI SDK tool keyed by name. Consumers spread the
 * returned records together to build a `Record<string, Tool>` for `streamText`.
 */
export function tool(
  name: string,
  description: string,
  schemaShape: ZodRawShape,
  handler: LegacyHandler,
): Record<string, Tool<any, any>> {
  return {
    [name]: aiTool({
      description,
      inputSchema: z.object(schemaShape),
      execute: async (input: any) => {
        const result = await handler(input);
        if (typeof result === "string") return result;
        if (result && typeof result === "object" && Array.isArray((result as any).content)) {
          return (result as any).content
            .map((c: any) => (typeof c?.text === "string" ? c.text : ""))
            .filter(Boolean)
            .join("\n");
        }
        return JSON.stringify(result);
      },
    }) as Tool<any, any>,
  };
}

/**
 * Shim for the Claude SDK's `createSdkMcpServer({ name, version, tools })`.
 * Flattens an array of per-tool records into a single `{ tools }` bundle that
 * the runners pass directly to `streamText({ tools })`.
 */
export function createSdkMcpServer(args: {
  name: string;
  version: string;
  tools: Array<Record<string, Tool<any, any>>>;
}): { tools: Record<string, Tool<any, any>> } {
  return { tools: Object.assign({}, ...args.tools) };
}
