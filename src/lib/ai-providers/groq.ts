import type { AIMessage, AIResponse } from "./types";

// Groq Models
export const GROQ_MODELS = {
  kimi: "moonshotai/kimi-k2-instruct-0905",
  llama: "llama-3.3-70b-versatile",
  mixtral: "mixtral-8x7b-32768",
  // Compound models with built-in tools (web search, etc.)
  compound: "groq/compound",
  compoundMini: "groq/compound-mini",
} as const;

// Search result from Groq Compound web search
export interface GroqSearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

// Groq Compound response with search results
export interface GroqCompoundResponse extends AIResponse {
  searchResults?: GroqSearchResult[];
  reasoning?: string;
}

// Search settings for Groq Compound
export interface GroqSearchSettings {
  include_domains?: string[];
  exclude_domains?: string[];
  country?: string;
}

export async function chatWithGroq(
  messages: AIMessage[],
  apiKey: string,
  model: string = GROQ_MODELS.kimi
): Promise<AIResponse> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Groq] API Error:", error);
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  return {
    content: data.choices[0]?.message?.content || "",
    tokens: data.usage?.total_tokens,
    model: data.model,
  };
}

export async function streamWithGroq(
  messages: AIMessage[],
  apiKey: string,
  model: string = GROQ_MODELS.kimi
): Promise<ReadableStream> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.7,
      max_tokens: 16384,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Groq] Stream API Error:", error);
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim() !== "");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                controller.close();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content;
                if (content) {
                  controller.enqueue(new TextEncoder().encode(content));
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

/**
 * Groq Compound - Chat with built-in web search
 * Uses groq/compound or groq/compound-mini models
 * Automatically performs web search when needed and returns search results
 */
export async function chatWithGroqCompound(
  query: string,
  apiKey: string,
  options?: {
    model?: "groq/compound" | "groq/compound-mini";
    searchSettings?: GroqSearchSettings;
    systemPrompt?: string;
  }
): Promise<GroqCompoundResponse> {
  const model = options?.model || GROQ_MODELS.compound;
  
  const messages: { role: string; content: string }[] = [];
  
  if (options?.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  
  messages.push({ role: "user", content: query });

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 8192,
  };

  // Add search settings if provided
  if (options?.searchSettings) {
    body.search_settings = options.searchSettings;
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Groq Compound] API Error:", error);
    throw new Error(`Groq Compound API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const message = data.choices[0]?.message;

  // Extract search results from executed_tools
  let searchResults: GroqSearchResult[] = [];
  if (message?.executed_tools && Array.isArray(message.executed_tools)) {
    for (const tool of message.executed_tools) {
      if (tool.search_results?.results) {
        searchResults = tool.search_results.results.map((r: any) => ({
          title: r.title || "",
          url: r.url || "",
          content: r.content || "",
          score: r.score,
        }));
        break;
      }
    }
  }

  return {
    content: message?.content || "",
    tokens: data.usage?.total_tokens,
    model: data.model,
    searchResults,
    reasoning: message?.reasoning,
  };
}

/**
 * Search academic papers using Groq Compound
 * Filters to academic domains and returns structured results
 */
export async function searchAcademicWithGroq(
  query: string,
  apiKey: string,
  options?: {
    maxResults?: number;
    mini?: boolean;
  }
): Promise<GroqSearchResult[]> {
  const academicDomains = [
    "scholar.google.com",
    "pubmed.ncbi.nlm.nih.gov",
    "arxiv.org",
    "sciencedirect.com",
    "springer.com",
    "nature.com",
    "researchgate.net",
    "jstor.org",
    "ieee.org",
    "acm.org",
    "*.edu",
  ];

  const response = await chatWithGroqCompound(
    `Search for academic research papers about: ${query}. Find ${options?.maxResults || 10} relevant peer-reviewed papers, studies, or research articles. Provide detailed information about each paper including title, authors if available, and key findings.`,
    apiKey,
    {
      model: options?.mini ? "groq/compound-mini" : "groq/compound",
      searchSettings: {
        include_domains: academicDomains,
        exclude_domains: ["wikipedia.org"],
      },
      systemPrompt: "You are an academic research assistant. Search for and analyze peer-reviewed research papers, studies, and academic articles. Focus on finding high-quality, credible sources.",
    }
  );

  return response.searchResults || [];
}

/**
 * General web search using Groq Compound
 */
export async function searchWithGroqCompound(
  query: string,
  apiKey: string,
  options?: {
    includeDomains?: string[];
    excludeDomains?: string[];
    mini?: boolean;
  }
): Promise<GroqSearchResult[]> {
  const response = await chatWithGroqCompound(
    query,
    apiKey,
    {
      model: options?.mini ? "groq/compound-mini" : "groq/compound",
      searchSettings: {
        include_domains: options?.includeDomains,
        exclude_domains: options?.excludeDomains,
      },
    }
  );

  return response.searchResults || [];
}
