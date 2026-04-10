/**
 * Groq API Service - Frontend
 * Calls backend API instead of directly using Groq
 */

import { apiClient, type ApiResponse } from "./client";
import type { FormInputs } from "../../types/draft";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqChatRequest {
  messages: GroqMessage[];
  model?: string;
  userId?: string;
}

export interface GroqResponse {
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface DraftGenerationRequest {
  params: FormInputs;
  userId?: string;
}

/**
 * Chat with Groq
 */
export const chat = async (request: GroqChatRequest): Promise<GroqResponse> => {
  const response = await apiClient.post<ApiResponse<GroqResponse>>(
    "/api/groq/chat",
    request,
  );

  if (!response.success || !response.data) {
    throw new Error(response.error || "Failed to get Groq response");
  }

  return response.data;
};

/**
 * Stream chat with Groq
 */
export async function* streamChat(
  request: GroqChatRequest,
): AsyncGenerator<{ content: string }, void, unknown> {
  yield* apiClient.stream<{ content: string }>(
    "/api/groq/chat/stream",
    request,
  );
}

/**
 * Generate a legal document using Groq
 */
export const generateDocument = async (
  request: DraftGenerationRequest,
): Promise<string> => {
  const response = await apiClient.post<ApiResponse<{ content: string }>>(
    "/api/groq/draft/generate",
    request,
  );

  if (!response.success || !response.data) {
    throw new Error(response.error || "Failed to generate document");
  }

  return response.data.content;
};

/**
 * Stream document generation with Groq
 */
export async function* streamDocument(
  request: DraftGenerationRequest,
): AsyncGenerator<string, void, unknown> {
  const url = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/groq/draft/stream`;

  const fetchResponse = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!fetchResponse.ok) {
    throw new Error(`API Error: ${fetchResponse.status}`);
  }

  const reader = fetchResponse.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("data: ")) {
        const data = trimmed.slice(6);
        if (data === "[DONE]") return;

        try {
          const parsed = JSON.parse(data);
          if (parsed.content) {
            yield parsed.content as string;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
}

// Export as a service object
export const groqApi = {
  chat,
  streamChat,
  generateDocument,
  streamDocument,
};

export default groqApi;
