import { Lawyer } from "../data/lawyerData";
import {
  DavidResult,
  AndrewMessage,
  AndrewProgress,
  LawyerCard,
} from "./types";
import { logger } from "../utils/logger";

export type { AndrewMessage, AndrewProgress, LawyerCard };

export class AndrewAgent {
  private onProgress?: (progress: AndrewProgress) => void;
  private modelSpec = {
    name: "Andrew Presentation Engine",
    version: "2.1.0",
    provider: "Google Gemini",
    model: "gemini-1.5-flash",
    capabilities: ["ui-formatting", "conversational-ai", "markdown-rendering"],
    maxTokens: 8192,
    temperature: 0.7,
  };

  constructor(onProgress?: (progress: AndrewProgress) => void) {
    this.onProgress = onProgress;
  }

  private updateProgress(
    stage: AndrewProgress["stage"],
    message: string,
    progress: number,
  ) {
    if (this.onProgress) {
      this.onProgress({ stage, message, progress });
    }
  }

  /**
   * Processes David's result and formats it for user presentation using Gemini AI
   */
  async processDavidResult(
    davidResult: DavidResult,
    userQuery: string,
  ): Promise<AndrewMessage> {
    try {
      this.updateProgress(
        "processing",
        "Andrew is receiving David's analysis...",
        20,
      );

      // Create AI prompt for presentation
      const aiPrompt = this.createAndrewPrompt(davidResult, userQuery);

      this.updateProgress(
        "formatting",
        "Andrew is crafting your personalized response...",
        60,
      );

      // Use backend API instead of direct Gemini API
      const { geminiApi } = await import("../services/api/geminiApi");
      const result = await geminiApi.generateContent({
        prompt: aiPrompt,
        systemPrompt:
          "You are Andrew, a professional legal assistant. Present the analysis in a clear, structured format.",
      });

      this.updateProgress(
        "presenting",
        "Andrew is finalizing your response...",
        90,
      );

      const aiResponse = result.content;

      // Create lawyer cards
      const lawyerCards = this.createLawyerCards(davidResult);

      const message: AndrewMessage = {
        id: this.generateId(),
        type: "bot",
        content: aiResponse,
        timestamp: Date.now(),
        lawyerCards,
        queryContext: {
          specializations: davidResult.queryContext.detectedSpecializations,
          confidence: davidResult.queryContext.confidence,
          reasoning: davidResult.queryContext.reasoning,
        },
      };

      this.updateProgress(
        "complete",
        "Andrew has completed your response!",
        100,
      );

      return message;
    } catch (error) {
      console.error("Andrew Agent Error:", error);
      // Fallback to basic presentation
      return this.fallbackPresentation(davidResult, userQuery);
    }
  }

  /**
   * Creates lawyer cards with match scores and recommendations (Top 3)
   * Always returns exactly 3 cards when possible
   */
  private createLawyerCards(davidResult: DavidResult): LawyerCard[] {
    const cards: LawyerCard[] = [];
    const addedIds = new Set<number>();

    // Primary match (Top 1 - Best Match)
    if (davidResult.recommendations.primaryMatch) {
      const lawyer = davidResult.recommendations.primaryMatch;
      addedIds.add(lawyer.id);
      cards.push({
        lawyer,
        matchScore: this.calculateMatchScore(lawyer, davidResult.queryContext),
        whyRecommended: this.generateWhyRecommended(
          lawyer,
          davidResult.queryContext,
        ),
        isPrimary: true,
      });
    }

    // Alternative matches
    for (const lawyer of davidResult.recommendations.alternativeMatches) {
      if (cards.length >= 3) break;
      if (addedIds.has(lawyer.id)) continue;
      addedIds.add(lawyer.id);
      cards.push({
        lawyer,
        matchScore: this.calculateMatchScore(lawyer, davidResult.queryContext),
        whyRecommended: this.generateWhyRecommended(
          lawyer,
          davidResult.queryContext,
        ),
        isPrimary: false,
      });
    }

    // Fill from matchedLawyers if we still don't have 3
    if (cards.length < 3 && davidResult.matchedLawyers) {
      for (const lawyer of davidResult.matchedLawyers) {
        if (cards.length >= 3) break;
        if (addedIds.has(lawyer.id)) continue;
        addedIds.add(lawyer.id);
        cards.push({
          lawyer,
          matchScore: this.calculateMatchScore(
            lawyer,
            davidResult.queryContext,
          ),
          whyRecommended: this.generateWhyRecommended(
            lawyer,
            davidResult.queryContext,
          ),
          isPrimary: cards.length === 0,
        });
      }
    }

    return cards;
  }

  /**
   * Calculates match score for a lawyer
   */
  private calculateMatchScore(lawyer: Lawyer, queryContext: any): number {
    let score = 0;

    // Specialization match
    if (queryContext.detectedSpecializations.includes(lawyer.specialization)) {
      score += 40;
    }

    // Experience bonus
    const experienceYears = parseInt(lawyer.experience.replace(/\D/g, ""));
    score += Math.min(experienceYears * 2, 30);

    // Rating bonus
    score += lawyer.rating * 5;

    // Cases won bonus
    if (lawyer.casesWon) {
      score += Math.min(lawyer.casesWon / 20, 20);
    }

    return Math.min(score, 100);
  }

  /**
   * Generates why this lawyer is recommended
   */
  private generateWhyRecommended(lawyer: Lawyer, queryContext: any): string {
    const reasons = [];

    if (queryContext.detectedSpecializations.includes(lawyer.specialization)) {
      reasons.push(`Expert in ${lawyer.specialization}`);
    }

    if (lawyer.rating >= 4.7) {
      reasons.push(`Highly rated (${lawyer.rating}/5)`);
    }

    if (lawyer.experience.includes("15+")) {
      reasons.push(`Extensive experience (${lawyer.experience})`);
    }

    if (lawyer.casesWon && lawyer.casesWon > 150) {
      reasons.push(`Strong track record (${lawyer.casesWon} cases won)`);
    }

    if (lawyer.achievements && lawyer.achievements.length > 0) {
      reasons.push(`Recognized expert (${lawyer.achievements[0]})`);
    }

    return reasons.join(" • ");
  }

  /**
   * Generates conversational response
   */
  private generateResponse(
    davidResult: DavidResult,
    userQuery: string,
    lawyerCards: LawyerCard[],
  ): string {
    const { queryContext, recommendations } = davidResult;

    let response = `I've analyzed your query about "${userQuery}" and found some excellent legal experts who can help you.\n\n`;

    // Add context about what was detected
    if (
      queryContext.detectedSpecializations &&
      queryContext.detectedSpecializations.length > 0
    ) {
      response += `**Legal Areas Identified:** ${queryContext.detectedSpecializations.join(", ")}\n\n`;
    }

    // Add confidence level
    if (queryContext.confidence >= 80) {
      response += `I'm highly confident these recommendations match your needs.\n\n`;
    } else if (queryContext.confidence >= 60) {
      response += `These recommendations should be a good fit for your situation.\n\n`;
    } else {
      response += `I've found some general legal experts who may be able to help.\n\n`;
    }

    // Add primary recommendation
    if (recommendations.primaryMatch) {
      response += `**Top Recommendation:** ${recommendations.primaryMatch.name}\n`;
      response += `- ${recommendations.primaryMatch.specialization} Expert\n`;
      response += `- ${recommendations.primaryMatch.experience} Experience\n`;
      response += `- ⭐ ${recommendations.primaryMatch.rating}/5 Rating\n`;
      response += `- ₹${recommendations.primaryMatch.price}/consultation\n\n`;
    }

    // Add alternative options
    if (recommendations.alternativeMatches.length > 0) {
      response += `**Alternative Options:**\n`;
      recommendations.alternativeMatches
        .slice(0, 3)
        .forEach((lawyer, index) => {
          response += `${index + 1}. ${lawyer.name} - ${lawyer.specialization} (${lawyer.rating}/5, ₹${lawyer.price})\n`;
        });
      response += `\n`;
    }

    // Add next steps
    response += `**Next Steps:**\n`;
    response += `• Review the lawyer profiles below\n`;
    response += `• Check their specializations and experience\n`;
    response += `• Consider their consultation rates\n`;
    response += `• Contact the lawyer that best fits your needs\n\n`;

    response += `*All lawyers are verified professionals with active bar memberships.*`;

    return response;
  }

  /**
   * Creates a system message for processing status
   */
  createSystemMessage(message: string): AndrewMessage {
    return {
      id: this.generateId(),
      type: "system",
      content: message,
      timestamp: Date.now(),
    };
  }

  /**
   * Creates an error message
   */
  createErrorMessage(error: string): AndrewMessage {
    return {
      id: this.generateId(),
      type: "bot",
      content: `I apologize, but I encountered an issue: ${error}\n\nPlease try rephrasing your legal question or contact support if the problem persists.`,
      timestamp: Date.now(),
    };
  }

  /**
   * Creates a message for off-topic queries
   */
  createOffTopicMessage(): AndrewMessage {
    return {
      id: this.generateId(),
      type: "bot",
      content: `I'm a legal assistant focused on helping you find the right lawyer for your legal needs. I can help you with questions about:\n\n• Legal consultations\n• Finding specialized lawyers\n• Understanding legal processes\n• Legal document analysis\n\nPlease ask me about your legal situation, and I'll connect you with the right legal expert.`,
      timestamp: Date.now(),
    };
  }

  /**
   * Validates if query is legal-focused
   */
  validateQuery(query: string): { isValid: boolean; reason?: string } {
    const lowerQuery = query.toLowerCase();

    // Check for legal keywords
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

    const hasLegalKeywords = legalKeywords.some((keyword) =>
      lowerQuery.includes(keyword),
    );

    // Check for off-topic content
    const offTopicKeywords = [
      "weather",
      "cooking",
      "sports",
      "entertainment",
      "gaming",
      "shopping",
      "travel",
      "food",
      "music",
      "movie",
      "book",
      "fashion",
      "beauty",
    ];

    const hasOffTopicKeywords = offTopicKeywords.some((keyword) =>
      lowerQuery.includes(keyword),
    );

    if (hasOffTopicKeywords && !hasLegalKeywords) {
      return { isValid: false, reason: "off-topic" };
    }

    if (!hasLegalKeywords && query.length < 10) {
      return { isValid: false, reason: "too-short" };
    }

    return { isValid: true };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Create AI prompt for Andrew's presentation of the legal solution
   */
  private createAndrewPrompt(
    davidResult: DavidResult,
    userQuery: string,
  ): string {
    return `You are Andrew, a Legal Communication AI. Present David's legal solution in a user-friendly way.

DAVID'S LEGAL SOLUTION:
${davidResult.queryContext.reasoning}

USER'S ORIGINAL QUESTION: "${userQuery}"

TASK: Present this legal solution in a warm, conversational manner.

PRESENTATION REQUIREMENTS:
1. Start with a friendly greeting
2. Present David's legal solution clearly
3. Explain what this means for the user
4. Suggest next steps they can take
5. Mention relevant lawyers if needed
6. Use markdown formatting
7. Keep it conversational and helpful
8. Be encouraging and supportive

RESPONSE FORMAT:
- Use **bold** for emphasis
- Use bullet points for lists
- Use ## for headings
- Keep tone professional but friendly
- Provide clear next steps

Generate a warm, helpful response that presents the legal solution clearly and guides the user on their next steps.`;
  }

  /**
   * Fallback presentation when AI fails
   */
  private fallbackPresentation(
    davidResult: DavidResult,
    userQuery: string,
  ): AndrewMessage {
    try {
      const lawyerCards = this.createLawyerCards(davidResult);
      const response = this.generateResponse(
        davidResult,
        userQuery,
        lawyerCards,
      );

      return {
        id: this.generateId(),
        type: "bot",
        content: response,
        timestamp: Date.now(),
        lawyerCards: lawyerCards || [],
        queryContext: {
          specializations: davidResult?.queryContext
            ?.detectedSpecializations || ["General Legal"],
          confidence: davidResult?.queryContext?.confidence || 50,
          reasoning:
            davidResult?.queryContext?.reasoning || "AI-powered analysis",
        },
      };
    } catch (error) {
      console.error("Andrew Agent: Error in fallback presentation:", error);
      return {
        id: this.generateId(),
        type: "bot",
        content: `I understand you're looking for legal assistance regarding "${userQuery}". I recommend consulting with a qualified lawyer who can provide personalized guidance for your specific situation.`,
        timestamp: Date.now(),
        lawyerCards: [],
        queryContext: {
          specializations: ["General Legal"],
          confidence: 30,
          reasoning: "Fallback response due to system limitations",
        },
      };
    }
  }

  /**
   * Get empty David result for error cases
   */
  private getEmptyDavidResult(): DavidResult {
    return {
      matchedLawyers: [],
      queryContext: {
        originalQuery: "legal consultation",
        detectedSpecializations: ["General Legal"],
        confidence: 30,
        reasoning: "System temporarily unavailable",
      },
      recommendations: {
        primaryMatch: null,
        alternativeMatches: [],
        whyThisMatch: "Please try again later",
      },
    };
  }
}
