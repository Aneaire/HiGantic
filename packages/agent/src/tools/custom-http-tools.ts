import { tool } from "../ai-sdk-shim.js";
import { z } from "zod";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
type BodyType = "json" | "form-data" | "url-encoded" | "raw";
type ResponseFormat = "auto" | "json" | "text";
type PaginationMode = "none" | "next_url" | "offset";

interface Auth {
  type: "none" | "bearer" | "basic" | "header" | "query";
  token?: string;
  username?: string;
  password?: string;
  name?: string;
  value?: string;
}

interface Pagination {
  mode: PaginationMode;
  nextUrlPath?: string;
  paramName?: string;
  paramStartValue?: number;
  paramStep?: number;
  maxPages?: number;
}

interface CustomToolConfig {
  _id: string;
  name: string;
  description: string;
  endpoint: string;
  method: HttpMethod;
  inputSchema?: any;
  headers?: Record<string, string>;
  auth?: Auth;
  bodyType?: BodyType;
  rawBody?: string;
  queryParams?: { name: string; value: string }[];
  pagination?: Pagination;
  responseFormat?: ResponseFormat;
  fullResponse?: boolean;
  neverError?: boolean;
  timeoutMs?: number;
  followRedirects?: boolean;
  ignoreSSL?: boolean;
}

export function createCustomHttpTools(configs: CustomToolConfig[]) {
  return configs.map((config) => createHttpTool(config));
}

// ── Helpers ────────────────────────────────────────────────────────────

function getNestedPath(obj: any, path?: string): any {
  if (!path || !obj) return undefined;
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

function appendQueryParams(url: string, params: { name: string; value: string }[]): string {
  if (!params.length) return url;
  const sep = url.includes("?") ? "&" : "?";
  return url + sep + params.map((p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(p.value)}`).join("&");
}

function buildAuthHeaders(auth?: Auth): Record<string, string> {
  if (!auth || auth.type === "none") return {};
  if (auth.type === "bearer") return { Authorization: `Bearer ${auth.token ?? ""}` };
  if (auth.type === "basic") {
    const encoded = btoa(`${auth.username ?? ""}:${auth.password ?? ""}`);
    return { Authorization: `Basic ${encoded}` };
  }
  if (auth.type === "header" && auth.name) return { [auth.name]: auth.value ?? "" };
  return {};
}

function applyAuthQueryParam(url: string, auth?: Auth): string {
  if (auth?.type === "query" && auth.name) {
    return appendQueryParams(url, [{ name: auth.name, value: auth.value ?? "" }]);
  }
  return url;
}

function buildBody(
  input: Record<string, any>,
  bodyType: BodyType | undefined,
  rawBody: string | undefined,
  method: HttpMethod
): { body: BodyInit | undefined; contentType: string | undefined } {
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return { body: undefined, contentType: undefined };

  const effectiveType = bodyType ?? "json";

  if (effectiveType === "raw") {
    return { body: rawBody ?? "", contentType: undefined };
  }
  if (effectiveType === "url-encoded") {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined && v !== null) params.append(k, String(v));
    }
    return { body: params.toString(), contentType: "application/x-www-form-urlencoded" };
  }
  if (effectiveType === "form-data") {
    const fd = new FormData();
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined && v !== null) fd.append(k, String(v));
    }
    return { body: fd, contentType: undefined }; // let fetch set boundary
  }
  // default: json
  if (Object.keys(input).length === 0) return { body: undefined, contentType: undefined };
  return { body: JSON.stringify(input), contentType: "application/json" };
}

async function parseResponse(res: Response, format: ResponseFormat = "auto"): Promise<any> {
  const text = await res.text();
  if (format === "text") return text;
  if (format === "json") return JSON.parse(text);
  // auto
  try { return JSON.parse(text); } catch { return text; }
}

function truncate(text: string, max = 10000): string {
  if (typeof text !== "string") text = JSON.stringify(text);
  return text.length > max ? text.substring(0, max) + "\n...(truncated)" : text;
}

// ── Core tool factory ──────────────────────────────────────────────────

function createHttpTool(config: CustomToolConfig) {
  const schema: Record<string, z.ZodTypeAny> = {};

  if (config.inputSchema && typeof config.inputSchema === "object") {
    for (const [key, def] of Object.entries(config.inputSchema)) {
      const fieldDef = def as any;
      let zodField: z.ZodTypeAny;
      switch (fieldDef.type) {
        case "number":  zodField = z.number(); break;
        case "boolean": zodField = z.boolean(); break;
        case "array":   zodField = z.array(z.any()); break;
        case "object":  zodField = z.record(z.any()); break;
        default:        zodField = z.string();
      }
      if (fieldDef.description) zodField = zodField.describe(fieldDef.description);
      if (fieldDef.optional) zodField = zodField.optional();
      schema[key] = zodField;
    }
  }

  // Fallback hints if no schema defined
  if (Object.keys(schema).length === 0) {
    if (["POST", "PUT", "PATCH"].includes(config.method)) {
      schema.body = z.string().optional().describe("Request body (JSON string)");
    }
    if (config.method === "GET") {
      schema.query = z.string().optional().describe("Extra query parameters (e.g. key=value&key2=value2)");
    }
  }

  return tool(
    `custom_${config.name}`,
    config.description,
    schema,
    async (input: Record<string, any>) => {
      try {
        return await executeRequest(config, input);
      } catch (err: any) {
        if (config.neverError) {
          return { content: [{ type: "text" as const, text: `Error: ${err.message}` }] };
        }
        return { content: [{ type: "text" as const, text: `Error calling ${config.endpoint}: ${err.message}` }] };
      }
    }
  );
}

async function executeRequest(config: CustomToolConfig, input: Record<string, any>): Promise<any> {
  const paginationMode = config.pagination?.mode ?? "none";

  if (paginationMode !== "none") {
    return await executePaginated(config, input);
  }

  const result = await singleRequest(config, config.endpoint, input, 0);
  return formatResult(result, config);
}

async function singleRequest(
  config: CustomToolConfig,
  baseUrl: string,
  input: Record<string, any>,
  pageOffset: number
): Promise<{ status: number; statusText: string; headers: Record<string, string>; body: any }> {
  let url = baseUrl;

  // Path param substitution ({param} in URL)
  for (const [key, val] of Object.entries(input)) {
    url = url.replace(`{${key}}`, encodeURIComponent(String(val)));
  }

  // Static query params
  if (config.queryParams?.length) {
    url = appendQueryParams(url, config.queryParams);
  }

  // Extra GET query from input.query fallback
  if (config.method === "GET" && input.query && typeof input.query === "string") {
    url += (url.includes("?") ? "&" : "?") + input.query;
  }

  // Pagination offset param
  if (config.pagination?.mode === "offset" && config.pagination.paramName) {
    const start = config.pagination.paramStartValue ?? 0;
    const step = config.pagination.paramStep ?? 1;
    url = appendQueryParams(url, [{ name: config.pagination.paramName, value: String(start + pageOffset * step) }]);
  }

  // Auth query param
  url = applyAuthQueryParam(url, config.auth);

  // Auth headers
  const authHeaders = buildAuthHeaders(config.auth);

  // Body
  const bodyInput = { ...input };
  delete bodyInput.query; // don't send the GET-only fallback field in body
  const { body, contentType } = buildBody(bodyInput, config.bodyType, config.rawBody, config.method);

  // Assemble headers
  const headers: Record<string, string> = { ...(config.headers ?? {}), ...authHeaders };
  if (contentType) headers["Content-Type"] = contentType;

  const fetchOpts: RequestInit = {
    method: config.method,
    headers,
    redirect: config.followRedirects === false ? "manual" : "follow",
  };
  if (body !== undefined) fetchOpts.body = body;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 15000);
  fetchOpts.signal = controller.signal;

  const response = await fetch(url, fetchOpts);
  clearTimeout(timeout);

  const parsedBody = await parseResponse(response, config.responseFormat ?? "auto");
  const resHeaders: Record<string, string> = {};
  response.headers.forEach((val, key) => { resHeaders[key] = val; });

  return { status: response.status, statusText: response.statusText, headers: resHeaders, body: parsedBody };
}

async function executePaginated(config: CustomToolConfig, input: Record<string, any>): Promise<any> {
  const mode = config.pagination!.mode;
  const maxPages = config.pagination!.maxPages ?? 10;
  const allResults: any[] = [];
  let currentUrl = config.endpoint;
  let pageCount = 0;

  while (pageCount < maxPages) {
    const result = await singleRequest(config, currentUrl, input, pageCount);
    allResults.push(result.body);
    pageCount++;

    if (mode === "next_url") {
      const nextUrl = getNestedPath(result.body, config.pagination!.nextUrlPath);
      if (!nextUrl || typeof nextUrl !== "string") break;
      currentUrl = nextUrl;
    } else if (mode === "offset") {
      // singleRequest already injects the offset param; just continue
      // Stop if response is empty array or null
      if (!result.body || (Array.isArray(result.body) && result.body.length === 0)) break;
    } else {
      break;
    }
  }

  const combined = allResults.length === 1 ? allResults[0] : allResults;
  const text = truncate(typeof combined === "string" ? combined : JSON.stringify(combined, null, 2));
  return { content: [{ type: "text" as const, text: `Fetched ${pageCount} page(s):\n\n${text}` }] };
}

function formatResult(
  result: { status: number; statusText: string; headers: Record<string, string>; body: any },
  config: CustomToolConfig
): any {
  let text: string;

  if (config.fullResponse) {
    const out = {
      status: result.status,
      statusText: result.statusText,
      headers: result.headers,
      body: result.body,
    };
    text = truncate(JSON.stringify(out, null, 2));
  } else {
    const raw = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
    text = `HTTP ${result.status} ${result.statusText}\n\n${truncate(raw)}`;
  }

  return { content: [{ type: "text" as const, text }] };
}
