// src/lib/services/enrichment/llmClient.ts
/**
 * Provider-agnostic LLM extraction client interface and mock adapters.
 */

export interface LlmCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmCompletionResponse {
  rawText: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

export interface LlmExtractionClient {
  generateCompletion(request: LlmCompletionRequest): Promise<LlmCompletionResponse>;
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
