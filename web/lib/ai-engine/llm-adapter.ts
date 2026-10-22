/**
 * Dukaan AI — LLM adapter (client bridge).
 *
 * The assistant's brain has two tiers:
 *   1. This adapter — POSTs the conversation to the server route
 *      `/api/chat`, which calls Google Gemini with the shop's data summary
 *      as grounding context. Works only when the site is deployed on a
 *      Node host (Vercel) with GEMINI_API_KEY set — see PRODUCTION.md.
 *   2. The built-in intent engine (intents.ts + responder.ts) — fully
 *      offline, zero keys. Callers MUST treat any throw from queryLLM as
 *      "use the local engine" so the assistant never breaks.
 *
 * NO API KEY EVER LIVES IN CLIENT CODE. The key stays server-side in the
 * route handler's environment — this module only sends the conversation.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  /** Max tokens for the reply (advisory — the route enforces its own cap). */
  maxTokens?: number;
  /** Sampling temperature (advisory). */
  temperature?: number;
  /**
   * Plain-text summary of the user's own data (shop stock, sales…) that
   * the server passes to the model as grounding context.
   */
  context?: string;
}

/**
 * Send messages to the Gemini-backed chat route and return the reply text.
 * Throws on ANY failure (no route — e.g. static demo hosting, no key,
 * network error, empty reply); callers fall back to the local engine.
 */
export async function queryLLM(
  messages: ChatMessage[],
  options: LLMOptions = {}
): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, context: options.context ?? "" }),
  });
  if (!res.ok) {
    throw new Error(`LLM route unavailable (HTTP ${res.status})`);
  }
  const data = (await res.json()) as { text?: unknown };
  if (typeof data.text !== "string" || !data.text.trim()) {
    throw new Error("LLM returned an empty reply");
  }
  return data.text.trim();
}
