import OpenAI from "openai";
import type { AIMessage, AIResponse } from "./types";

// Grok model mapping for Smart, Normal, Fast tiers
export const GROK_MODELS = {
  smart: "grok-4-0709",              // Most capable, best quality
  normal: "grok-3-mini",             // Balanced speed and quality  
  fast: "grok-4-1-fast-reasoning",   // Fast reasoning model
} as const;

export type GrokModelTier = keyof typeof GROK_MODELS;

// Helper to get the actual model name from tier
export function getGrokModel(modelOrTier?: string): string {
  if (!modelOrTier) return GROK_MODELS.normal;
  if (modelOrTier in GROK_MODELS) {
    return GROK_MODELS[modelOrTier as GrokModelTier];
  }
  return modelOrTier; // Return as-is if it's already a model name
}

// Retry helper with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a rate limit error (403 or 429)
      const status = error?.status || error?.response?.status || error?.statusCode;
      const isRateLimit = status === 403 || status === 429;
      
      if (!isRateLimit || attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[Grok] Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error("Failed after retries");
}

// Grok uses OpenAI-compatible API with retry logic
export async function chatWithGrok(
  messages: AIMessage[],
  apiKey: string,
  model?: string
): Promise<AIResponse> {
  const actualModel = getGrokModel(model);
  
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.x.ai/v1",
  });

  try {
    const result = await retryWithBackoff(async () => {
      const response = await client.chat.completions.create({
        model: actualModel,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: 0.7,
        max_tokens: 4096,
      });

      return {
        content: response.choices[0]?.message?.content || "",
        tokens: response.usage?.total_tokens,
        model: response.model,
      };
    });
    
    return result;
  } catch (error: any) {
    throw error;
  }
}

export async function streamWithGrok(
  messages: AIMessage[],
  apiKey: string,
  model?: string
): Promise<ReadableStream> {
  const actualModel = getGrokModel(model);
  
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.x.ai/v1",
  });

  // For streaming, we need to handle retries differently
  // Try to create the stream with retry logic
  let response: any;
  let attempts = 0;
  const maxRetries = 3;
  
  while (attempts <= maxRetries) {
    try {
      response = await client.chat.completions.create({
        model: actualModel,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: 0.7,
        max_tokens: 16384,
        stream: true,
      });
      break; // Success, exit retry loop
    } catch (error: any) {
      const status = error?.status || error?.response?.status || error?.statusCode;
      const isRateLimit = status === 403 || status === 429;
      
      if (!isRateLimit || attempts === maxRetries) {
        throw error;
      }
      
      const delay = 1000 * Math.pow(2, attempts);
      console.log(`[Grok] Rate limit hit (stream), retrying in ${delay}ms (attempt ${attempts + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempts++;
    }
  }

  if (!response) {
    throw new Error("Failed to create stream after retries");
  }

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      } catch (error) {
        console.error("[Grok] Stream error:", error);
        controller.error(error);
      }
    },
  });
}

