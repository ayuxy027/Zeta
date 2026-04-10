import Groq from "groq-sdk";
import { config } from "../config/index.js";
import type {
  GroqRequest,
  GroqStreamRequest,
  AIResponse,
  AIMessage,
  FormInputs,
} from "../types/index.js";

class GroqService {
  private client: Groq | null = null;

  constructor() {
    if (config.groq.apiKey) {
      this.client = new Groq({
        apiKey: config.groq.apiKey,
        dangerouslyAllowBrowser: false,
      });
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async chat(request: GroqRequest): Promise<AIResponse> {
    if (!this.client) {
      throw new Error("Groq API not configured");
    }

    const chatCompletion = await this.client.chat.completions.create({
      messages: request.messages,
      model: request.model || config.groq.model,
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 0.9,
      stream: false,
    });

    return {
      content: chatCompletion.choices[0]?.message?.content || "",
      usage: chatCompletion.usage,
    };
  }

  async streamChat(
    request: GroqStreamRequest,
    onChunk: (chunk: string) => void,
  ): Promise<string> {
    if (!this.client) {
      throw new Error("Groq API not configured");
    }

    const stream = await this.client.chat.completions.create({
      messages: request.messages,
      model: request.model || config.groq.model,
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 0.9,
      stream: true,
    });

    let accumulatedResponse = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        accumulatedResponse += content;
        onChunk(content);
      }
    }

    return accumulatedResponse;
  }

  async generateDocument(params: FormInputs): Promise<string> {
    if (!this.client) {
      throw new Error("Groq API not configured");
    }

    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.getContextualPrompt(params);

    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const chatCompletion = await this.client.chat.completions.create({
      messages,
      model: config.groq.model,
      temperature: 0.7,
      max_tokens: 4096,
      top_p: 0.9,
      stream: false,
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content received from API");
    }

    return content;
  }

  async streamDocument(
    params: FormInputs,
    onChunk: (chunk: string, done: boolean) => void,
  ): Promise<string> {
    if (!this.client) {
      throw new Error("Groq API not configured");
    }

    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.getContextualPrompt(params);

    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const stream = await this.client.chat.completions.create({
      messages,
      model: config.groq.model,
      temperature: 0.7,
      max_tokens: 4096,
      top_p: 0.9,
      stream: true,
    });

    let accumulatedResponse = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      accumulatedResponse += content;
      onChunk(content, false);
    }

    onChunk("", true);
    return accumulatedResponse;
  }

  private getSystemPrompt(): string {
    return `You are an expert legal document drafting assistant specializing in Indian legal documents. Your task is to generate professional, legally sound documents that comply with Indian law.

Guidelines:
- Use formal legal language appropriate for Indian courts
- Include all necessary legal clauses and sections
- Ensure the document is properly structured with clear headings
- Include appropriate legal references where relevant
- Format the document professionally
- Include placeholders for variable information in [brackets]`;
  }

  private getContextualPrompt(params: FormInputs): string {
    let prompt = `Generate a ${params.documentType} with the following details:\n\n`;
    prompt += `Party A: ${params.partyA}\n`;
    prompt += `Party B: ${params.partyB}\n`;

    if (params.additionalDetails) {
      prompt += `\nAdditional Details:\n${params.additionalDetails}\n`;
    }

    if (params.state) {
      prompt += `\nState: ${params.state}\n`;
    }

    if (params.specificDetails) {
      prompt += `\nSpecific Requirements:\n${params.specificDetails}\n`;
    }

    prompt += `\nPlease generate a complete, professional ${params.documentType} that can be used in Indian courts.`;

    return prompt;
  }
}

export const groqService = new GroqService();
export default groqService;
