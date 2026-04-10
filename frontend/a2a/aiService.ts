import {
  GoogleGenerativeAI,
  GenerativeModel,
  GenerationConfig,
} from "@google/generative-ai";
import {
  PromptEngine,
  DavidPromptContext,
  AndrewPromptContext,
} from "./prompts";
import { Lawyer } from "../data/lawyerData";

export interface AIResponse {
  content: string;
  confidence: number;
  reasoning: string;
  metadata?: any;
}

export interface StreamingResponse {
  content: string;
  isComplete: boolean;
  stage: string;
  progress: number;
}

export interface DavidAIResult {
  analysis: {
    queryIntent: string;
    legalAreas: string[];
    urgencyAssessment: string;
    complexityLevel: string;
  };
  recommendations: {
    primaryMatch: {
      lawyerId: number;
      matchScore: number;
      reasoning: string;
    };
    alternativeMatches: Array<{
      lawyerId: number;
      matchScore: number;
      reasoning: string;
    }>;
  };
  confidence: number;
  reasoning: string;
}

export interface AndrewAIResult {
  content: string;
  lawyerCards: Array<{
    lawyer: Lawyer;
    matchScore: number;
    whyRecommended: string;
    isPrimary: boolean;
  }>;
  queryContext: {
    specializations: string[];
    confidence: number;
    reasoning: string;
  };
}

export class AIService {
  private genAI: GoogleGenerativeAI;
  private davidModel: GenerativeModel;
  private andrewModel: GenerativeModel;
  private streamingModel: GenerativeModel;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);

    // David - Legal Analysis Model
    this.davidModel = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    // Andrew - Presentation Model
    this.andrewModel = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
    });

    // Streaming Model
    this.streamingModel = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.5,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });
  }

  /**
   * David AI - Legal Analysis and Lawyer Matching
   */
  async davidAnalyze(context: DavidPromptContext): Promise<DavidAIResult> {
    try {
      const prompt = PromptEngine.generateDavidPrompt(context);

      const result = await this.davidModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback parsing
      return this.parseDavidResponse(text);
    } catch (error) {
      console.error("David AI Error:", error);
      throw new Error("Failed to analyze legal query");
    }
  }

  /**
   * Andrew AI - Presentation and User Communication
   */
  async andrewPresent(context: AndrewPromptContext): Promise<AndrewAIResult> {
    try {
      const prompt = PromptEngine.generateAndrewPrompt(context);

      const result = await this.andrewModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseAndrewResponse(text, context.davidResults);
    } catch (error) {
      console.error("Andrew AI Error:", error);
      throw new Error("Failed to present results");
    }
  }

  /**
   * Real-time streaming response
   */
  async *streamResponse(
    agent: "david" | "andrew",
    context: any,
  ): AsyncGenerator<StreamingResponse> {
    try {
      const prompt = PromptEngine.generateStreamingPrompt(agent, context);

      const result = await this.streamingModel.generateContentStream(prompt);

      let fullContent = "";
      let stage = "initializing";
      let progress = 0;

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullContent += chunkText;

        // Update stage based on content
        if (fullContent.includes("analyzing")) stage = "analyzing";
        else if (fullContent.includes("matching")) stage = "matching";
        else if (fullContent.includes("formatting")) stage = "formatting";
        else if (fullContent.includes("complete")) stage = "complete";

        progress = Math.min(progress + 5, 100);

        yield {
          content: fullContent,
          isComplete: false,
          stage,
          progress,
        };
      }

      yield {
        content: fullContent,
        isComplete: true,
        stage: "complete",
        progress: 100,
      };
    } catch (error) {
      console.error("Streaming Error:", error);
      throw new Error("Failed to stream response");
    }
  }

  /**
   * AI-to-AI Communication Protocol
   */
  async aiToAICommunication(
    davidContext: DavidPromptContext,
    andrewContext: AndrewPromptContext,
  ): Promise<{
    davidResult: DavidAIResult;
    andrewResult: AndrewAIResult;
  }> {
    try {
      // Step 1: David analyzes
      const davidResult = await this.davidAnalyze(davidContext);

      // Step 2: Prepare Andrew's context with David's results
      const updatedAndrewContext: AndrewPromptContext = {
        ...andrewContext,
        davidResults: {
          matchedLawyers: this.getLawyersByIds(
            davidResult.recommendations,
            davidContext.lawyerDatabase,
          ),
          reasoning: davidResult.reasoning,
          confidence: davidResult.confidence,
        },
      };

      // Step 3: Andrew presents
      const andrewResult = await this.andrewPresent(updatedAndrewContext);

      return { davidResult, andrewResult };
    } catch (error) {
      console.error("AI-to-AI Communication Error:", error);
      throw new Error("Failed AI-to-AI communication");
    }
  }

  /**
   * Validate user query quality
   */
  async validateQuery(query: string): Promise<{
    isLegalQuery: boolean;
    relevanceScore: number;
    clarityScore: number;
    actionabilityScore: number;
    urgency: string;
    complexity: string;
    suggestions: string[];
    confidence: number;
  }> {
    try {
      const prompt = PromptEngine.generateValidationPrompt(query);

      const result = await this.davidModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback validation
      return {
        isLegalQuery: this.isLegalQuery(query),
        relevanceScore: 75,
        clarityScore: 80,
        actionabilityScore: 70,
        urgency: "medium",
        complexity: "moderate",
        suggestions: ["Provide more specific details about your legal issue"],
        confidence: 60,
      };
    } catch (error) {
      console.error("Query Validation Error:", error);
      return {
        isLegalQuery: true,
        relevanceScore: 50,
        clarityScore: 50,
        actionabilityScore: 50,
        urgency: "low",
        complexity: "simple",
        suggestions: ["Please provide more details"],
        confidence: 30,
      };
    }
  }

  /**
   * Generate follow-up response
   */
  async generateFollowUp(
    agent: "david" | "andrew",
    previousContext: any,
    newQuery: string,
  ): Promise<string> {
    try {
      const prompt = PromptEngine.generateFollowUpPrompt(
        agent,
        previousContext,
        newQuery,
      );

      const result = await this.streamingModel.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Follow-up Error:", error);
      throw new Error("Failed to generate follow-up response");
    }
  }

  /**
   * Handle errors gracefully
   */
  async handleError(
    agent: "david" | "andrew",
    error: string,
    context: any,
  ): Promise<string> {
    try {
      const prompt = PromptEngine.generateErrorPrompt(agent, error, context);

      const result = await this.streamingModel.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Error Handling Error:", error);
      return "I apologize, but I encountered an issue processing your request. Please try again or contact support if the problem persists.";
    }
  }

  // Helper methods
  private parseDavidResponse(text: string): DavidAIResult {
    // Fallback parsing logic
    return {
      analysis: {
        queryIntent: "Legal consultation request",
        legalAreas: ["General Legal"],
        urgencyAssessment: "Medium",
        complexityLevel: "Moderate",
      },
      recommendations: {
        primaryMatch: {
          lawyerId: 1,
          matchScore: 85,
          reasoning: "Best match based on query analysis",
        },
        alternativeMatches: [],
      },
      confidence: 75,
      reasoning: "Analysis completed with standard matching criteria",
    };
  }

  private parseAndrewResponse(text: string, davidResults: any): AndrewAIResult {
    return {
      content: text,
      lawyerCards: [],
      queryContext: {
        specializations: davidResults.matchedLawyers.map(
          (l: any) => l.specialization,
        ),
        confidence: davidResults.confidence,
        reasoning: davidResults.reasoning,
      },
    };
  }

  private getLawyersByIds(
    recommendations: any,
    lawyerDatabase: Lawyer[],
  ): Lawyer[] {
    const lawyerIds = [
      recommendations.primaryMatch?.lawyerId,
      ...(recommendations.alternativeMatches?.map((alt: any) => alt.lawyerId) ||
        []),
    ].filter(Boolean);

    return lawyerDatabase.filter((lawyer) => lawyerIds.includes(lawyer.id));
  }

  private isLegalQuery(query: string): boolean {
    const legalKeywords = [
      "legal",
      "lawyer",
      "attorney",
      "law",
      "court",
      "legal advice",
      "consultation",
      "dispute",
      "contract",
      "agreement",
      "rights",
      "liability",
      "damages",
      "criminal",
      "civil",
      "family",
      "divorce",
      "employment",
      "business",
      "property",
      "tax",
      "intellectual",
      "patent",
      "trademark",
    ];

    const lowerQuery = query.toLowerCase();
    return legalKeywords.some((keyword) => lowerQuery.includes(keyword));
  }
}
