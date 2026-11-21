import { optionalEnv } from "./env";
import { ApiError } from "./errors";

export type ChatOptions = {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
};

type ChatResponse = {
  choices?: { message?: { content?: unknown } }[];
};

const DEFAULT_GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const MAX_ATTEMPTS = 5;
const MAX_RETRY_DELAY_MS = 65_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rateLimitDelayMs(response: Response): Promise<number> {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000) + 250;
    const date = Date.parse(retryAfter);
    if (!Number.isNaN(date)) return Math.max(0, date - Date.now()) + 250;
  }

  let text = "";
  try {
    text = await response.clone().text();
  } catch {
    return 3000;
  }
  const match = text.match(/try again in\s+([\d.]+)\s*(ms|s)/i);
  if (match) {
    const value = Number(match[1]);
    if (Number.isFinite(value)) {
      return value * (match[2].toLowerCase() === "ms" ? 1 : 1000) + 250;
    }
  }
  return 3000;
}

export type LlmConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

/**
 * Resolves the Groq (OpenAI-compatible) chat configuration. Groq is the only
 * supported chat provider; no OpenAI credentials are read.
 */
export function llmConfig(): LlmConfig | null {
  const apiKey = optionalEnv("GROQ_API_KEY");
  if (!apiKey) return null;

  return {
    apiKey,
    baseUrl: (optionalEnv("GROQ_BASE_URL") ?? DEFAULT_GROQ_BASE_URL).replace(/\/$/, ""),
    model:
      optionalEnv("GROQ_MODEL") ??
      optionalEnv("MODEL") ??
      DEFAULT_GROQ_MODEL,
  };
}

export function llmModelName(): string {
  return llmConfig()?.model ?? DEFAULT_GROQ_MODEL;
}

export function llmConfigured(): boolean {
  return llmConfig() !== null;
}

export async function generateChatCompletion(options: ChatOptions): Promise<string> {
  const config = llmConfig();
  if (!config) {
    throw new ApiError(
      503,
      "AI_NOT_CONFIGURED",
      "The AI provider is not configured. Add GROQ_API_KEY to enable this feature.",
    );
  }

  let useJsonMode = Boolean(options.json);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: options.system },
            { role: "user", content: options.user },
          ],
          max_tokens: Math.min(Math.max(options.maxTokens ?? 900, 100), 8192),
          temperature: Math.min(Math.max(options.temperature ?? 0.2, 0), 1),
          stream: false,
          ...(useJsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: AbortSignal.timeout(50_000),
      });
    } catch {
      if (attempt === MAX_ATTEMPTS - 1) {
        throw new ApiError(504, "AI_TIMEOUT", "The AI provider did not respond in time.");
      }
      continue;
    }

    if (!response.ok) {
      // Some Groq models reject JSON mode; retry once without it before failing.
      if ((response.status === 400 || response.status === 422) && useJsonMode) {
        useJsonMode = false;
        continue;
      }
      if (response.status === 429 && attempt < MAX_ATTEMPTS - 1) {
        const delay = await rateLimitDelayMs(response);
        await sleep(Math.min(delay, MAX_RETRY_DELAY_MS));
        continue;
      }
      if (response.status >= 500 && attempt < MAX_ATTEMPTS - 1) {
        await sleep(750 * (attempt + 1));
        continue;
      }
      throw new ApiError(502, "AI_PROVIDER_ERROR", "The AI provider rejected the request.");
    }

    const payload = (await response.json()) as ChatResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new ApiError(502, "AI_INVALID_RESPONSE", "The AI provider returned an empty response.");
    }
    return content.trim();
  }

  throw new ApiError(502, "AI_PROVIDER_ERROR", "The AI provider request failed.");
}

export function parseJsonResponse(content: string): unknown {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1] : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        // fall through
      }
    }
    throw new ApiError(502, "AI_INVALID_OUTPUT", "The AI provider returned malformed JSON.");
  }
}
