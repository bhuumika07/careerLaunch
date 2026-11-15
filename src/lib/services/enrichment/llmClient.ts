// src/lib/services/enrichment/llmClient.ts
/**
 * Provider-agnostic LLM extraction client interface and adapters.
 */

export interface LLMPrompt {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMOutput {
  rawText: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

/**
 * Strict LLM Provider contract:
 * No provider-specific code outside this adapter.
 */
export interface LLMProvider {
  extract(prompt: LLMPrompt, schema?: any): Promise<LLMOutput>;
}

export type LlmCompletionRequest = LLMPrompt;
export type LlmCompletionResponse = LLMOutput;

export interface LlmExtractionClient extends LLMProvider {
  generateCompletion(request: LlmCompletionRequest): Promise<LlmCompletionResponse>;
}

export interface LLMConfig {
  modelName?: string;
  apiKey?: string;
  apiEndpoint?: string;
  timeoutMs?: number;
}

/**
 * Concrete LLM Provider implementation:
 * Model name comes strictly from config or environment variable.
 */
export class ConcreteLLMProvider implements LLMProvider, LlmExtractionClient {
  private config: Required<LLMConfig>;

  constructor(config: LLMConfig = {}) {
    this.config = {
      modelName: config.modelName || process.env.ENRICHMENT_MODEL_NAME || "gemini-2.5-flash",
      apiKey: config.apiKey || process.env.GEMINI_API_KEY || "",
      apiEndpoint: config.apiEndpoint || "https://generativelanguage.googleapis.com/v1beta",
      timeoutMs: config.timeoutMs ?? 30000,
    };
  }

  public getModelName(): string {
    return this.config.modelName;
  }

  async extract(prompt: LLMPrompt, schema?: any): Promise<LLMOutput> {
    const startTime = performance.now();

    // If API key is absent, throw descriptive error so CI fails cleanly with mock
    if (!this.config.apiKey) {
      throw new Error(
        `ConcreteLLMProvider requires an API key for live model "${this.config.modelName}". In CI/tests, use MockLlmExtractionClient.`
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(
        `${this.config.apiEndpoint}/models/${this.config.modelName}:generateContent?key=${this.config.apiKey}`,
        {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${prompt.systemPrompt}\n\n${prompt.userPrompt}` }],
              },
            ],
            generationConfig: {
              temperature: prompt.temperature ?? 0.1,
              maxOutputTokens: prompt.maxTokens ?? 4096,
              responseMimeType: schema ? "application/json" : "text/plain",
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`LLM provider HTTP error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      return {
        rawText,
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount || 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata?.totalTokenCount || 0,
        },
        latencyMs: Math.round(performance.now() - startTime),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateCompletion(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    return this.extract(request);
  }
}

/**
 * Mock LLM client for deterministic unit testing and offline development.
 */
export class MockLlmExtractionClient implements LlmExtractionClient {
  private cannedResponses: Map<string, string> = new Map();
  private defaultResponse: string;
  private failCount = 0;
  private failUntilAttempt = 0;
  private currentAttempts = 0;

  constructor(defaultResponse: string = "{}") {
    this.defaultResponse = defaultResponse;
  }

  setMockResponse(keySubstring: string, responseJson: string): void {
    this.cannedResponses.set(keySubstring.toLowerCase(), responseJson);
  }

  setDefaultResponse(responseJson: string): void {
    this.defaultResponse = responseJson;
  }

  simulateTransientFailures(failuresBeforeSuccess: number): void {
    this.failUntilAttempt = failuresBeforeSuccess;
    this.currentAttempts = 0;
  }

  async extract(prompt: LLMPrompt): Promise<LLMOutput> {
    return this.generateCompletion(prompt);
  }

  async generateCompletion(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const startTime = performance.now();
    this.currentAttempts++;

    if (this.currentAttempts <= this.failUntilAttempt) {
      const err: any = new Error("Mock LLM transient rate limit or network timeout");
      err.status = 429;
      throw err;
    }

    let responseText = this.defaultResponse;
    const userPromptLower = request.userPrompt.toLowerCase();

    for (const [key, canned] of this.cannedResponses.entries()) {
      if (userPromptLower.includes(key)) {
        responseText = canned;
        break;
      }
    }

    return {
      rawText: responseText,
      usage: {
        promptTokens: Math.round(request.userPrompt.length / 4),
        completionTokens: Math.round(responseText.length / 4),
        totalTokens: Math.round((request.userPrompt.length + responseText.length) / 4),
      },
      latencyMs: Math.round(performance.now() - startTime),
    };
  }
}

export interface GroqClientConfig {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

/**
 * Server-side Groq LLM Client (Phase 3 - Chunk 3.1)
 *
 * Strict Invariants:
 * 1. Called server-side only behind LLMProvider / LlmExtractionClient.
 * 2. GROQ_API_KEY is never exposed to client or browser.
 * 3. Formats requests with JSON object response mode and wraps provider errors cleanly.
 */
export class GroqExtractionClient implements LLMProvider, LlmExtractionClient {
  private apiKey: string;
  private model: string;
  private timeoutMs: number;
  private groqInstance: any = null;

  constructor(config: GroqClientConfig = {}) {
    this.apiKey = config.apiKey || process.env.GROQ_API_KEY || "";
    this.model = config.model || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    this.timeoutMs = config.timeoutMs ?? 30000;
  }

  public getModelName(): string {
    return this.model;
  }

  private async getGroqClient(): Promise<any> {
    if (!this.groqInstance) {
      if (!this.apiKey) {
        throw new Error(
          "GROQ_API_KEY is not configured server-side. In CI/tests, use MockLlmExtractionClient."
        );
      }
      try {
        const { default: Groq } = await import("groq-sdk");
        this.groqInstance = new Groq({ apiKey: this.apiKey });
      } catch (err: any) {
        throw new Error(`Failed to initialize groq-sdk: ${err.message || String(err)}`);
      }
    }
    return this.groqInstance;
  }

  async extract(prompt: LLMPrompt, schema?: any): Promise<LLMOutput> {
    return this.generateCompletion(prompt);
  }

  async generateCompletion(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const groq = await this.getGroqClient();
    const startTime = performance.now();

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: request.userPrompt },
        ],
        model: this.model,
        temperature: request.temperature ?? 0.1,
        max_tokens: request.maxTokens ?? 3000,
        response_format: { type: "json_object" },
      });

      const latencyMs = Math.round(performance.now() - startTime);
      const choice = completion.choices?.[0];
      const rawText = choice?.message?.content || "";

      return {
        rawText,
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
        latencyMs,
      };
    } catch (err: any) {
      throw new Error(
        `[GroqExtractionClient] Groq API call failed: ${err.message || String(err)}`
      );
    }
  }
}


