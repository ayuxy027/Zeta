import { allLawyers, Lawyer } from "../data/lawyerData";
import { LegalPatternMatcher } from "./patternMatcher";
import { PromptEngine, DavidPromptContext } from "./prompts";
import { logger } from "../utils/logger";
import { DavidResult, DavidProgress } from "./types";

export type { DavidResult, DavidProgress };

export class DavidAgent {
  private onProgress?: (progress: DavidProgress) => void;
  private patternMatcher: LegalPatternMatcher;
  private modelSpec = {
    name: "David Legal Analysis Engine",
    version: "2.1.0",
    provider: "Google Gemini",
    model: "gemini-1.5-flash",
    capabilities: [
      "legal-analysis",
      "lawyer-matching",
      "specialization-detection",
    ],
    maxTokens: 8192,
    temperature: 0.3,
  };

  constructor(onProgress?: (progress: DavidProgress) => void) {
    this.onProgress = onProgress;
    this.patternMatcher = new LegalPatternMatcher();
    // David now uses backend API, no direct API keys needed
  }

  private updateProgress(
    stage: DavidProgress["stage"],
    message: string,
    progress: number,
  ) {
    if (this.onProgress) {
      this.onProgress({ stage, message, progress });
    }
  }

  // Removed old pattern matching methods - now using real AI analysis

  /**
   * Main method to process query and provide AI-powered legal solution
   */
  async processQuery(query: string): Promise<DavidResult> {
    try {
      // Input validation
      if (!query || typeof query !== "string" || query.trim().length === 0) {
        logger.warn("David Agent: Invalid query provided");
        this.updateProgress(
          "complete",
          "David completed with fallback analysis",
          100,
        );
        return this.fallbackAnalysis("General legal consultation");
      }

      this.updateProgress(
        "analyzing",
        "David is analyzing your legal needs...",
        20,
      );

      // Try AI-powered analysis first via backend
      try {
        logger.log("David Agent: Using AI API for legal analysis");
        this.updateProgress(
          "matching",
          "David is using AI to analyze your legal query...",
          40,
        );

        // Get initial pattern insights for context
        const patternInsights = this.patternMatcher.getPatternInsights(query);

        // Create David prompt context
        const promptContext: DavidPromptContext = {
          userQuery: query,
          lawyerDatabase: allLawyers,
          detectedSpecializations: patternInsights?.detectedPatterns || [
            "General Legal",
          ],
          urgency: this.assessUrgency(query),
          complexity: this.assessComplexity(query),
        };

        // Use direct AI API call like Andrew does
        const aiResult = await this.callDirectAI(promptContext);

        this.updateProgress(
          "ranking",
          "David is ranking the best AI matches...",
          80,
        );

        // Convert AI result to David result format
        const result = this.convertAIResultToDavidResult(aiResult, query);

        this.updateProgress(
          "complete",
          "David has completed AI-powered analysis!",
          100,
        );
        return result;
      } catch (aiError) {
        console.warn(
          "David Agent: AI API failed, falling back to pattern matching:",
          aiError,
        );
        // Continue to pattern matching fallback
      }

      // Fallback to pattern matching if AI service is not available or fails
      console.log("David Agent: Using pattern matching for legal analysis");
      this.updateProgress(
        "matching",
        "David is finding the best legal experts using pattern matching...",
        60,
      );
      const matchResults = this.patternMatcher.findMatchingLawyers(query);

      // Ensure we have valid results
      if (!matchResults || matchResults.length === 0) {
        console.warn("David Agent: No matches found, using fallback");
        this.updateProgress(
          "complete",
          "David completed with fallback analysis",
          100,
        );
        return this.fallbackAnalysis(query);
      }

      this.updateProgress(
        "ranking",
        "David is ranking the best matches...",
        80,
      );

      // Get pattern insights for context with error handling
      const insights = this.patternMatcher.getPatternInsights(query);

      // Validate insights
      const safeInsights = {
        detectedPatterns: insights?.detectedPatterns || ["General Legal"],
        confidence: Math.max(0, Math.min(100, insights?.confidence || 50)),
        reasoning: insights?.reasoning || "Pattern matching analysis",
      };

      // Create David result with matched lawyers (ensure at least 3)
      let matchedLawyers = matchResults
        .map((match) => match.lawyer)
        .filter((lawyer): lawyer is Lawyer => !!lawyer);

      // Supplement if less than 3
      if (matchedLawyers.length < 3) {
        const existingIds = new Set(matchedLawyers.map((l) => l.id));
        const extras = allLawyers
          .filter((l) => !existingIds.has(l.id))
          .sort((a, b) => b.rating - a.rating);
        for (const lawyer of extras) {
          if (matchedLawyers.length >= 3) break;
          matchedLawyers.push(lawyer);
        }
      }
      matchedLawyers = matchedLawyers.slice(0, 3);

      const result: DavidResult = {
        matchedLawyers,
        queryContext: {
          originalQuery: query,
          detectedSpecializations: safeInsights.detectedPatterns,
          confidence: safeInsights.confidence,
          reasoning: safeInsights.reasoning,
        },
        recommendations: {
          primaryMatch: matchedLawyers[0] || null,
          alternativeMatches: matchedLawyers.slice(1),
          whyThisMatch:
            matchResults[0]?.reasoning || "Pattern matching analysis",
        },
      };

      // Validate result structure
      if (!result.matchedLawyers || result.matchedLawyers.length === 0) {
        console.warn("David Agent: No valid lawyers in result, using fallback");
        return this.fallbackAnalysis(query);
      }

      this.updateProgress(
        "complete",
        "David has completed pattern matching analysis!",
        100,
      );

      return result;
    } catch (error) {
      console.error("David Agent Error:", error);
      this.updateProgress(
        "complete",
        "David completed with fallback analysis",
        100,
      );
      // Fallback to basic analysis if anything fails
      return this.fallbackAnalysis(query);
    }
  }

  /**
   * Assess urgency level of the query
   */
  private assessUrgency(query: string): "low" | "medium" | "high" {
    const urgentKeywords = [
      "urgent",
      "emergency",
      "immediately",
      "asap",
      "crisis",
      "deadline",
      "court date",
      "hearing",
    ];
    const normalizedQuery = query.toLowerCase();

    for (const keyword of urgentKeywords) {
      if (normalizedQuery.includes(keyword)) {
        return "high";
      }
    }
    return "medium";
  }

  /**
   * Assess complexity level of the query
   */
  private assessComplexity(query: string): "simple" | "moderate" | "complex" {
    const complexKeywords = [
      "complex",
      "multiple",
      "several",
      "various",
      "complicated",
      "intricate",
      "detailed",
    ];
    const normalizedQuery = query.toLowerCase();

    for (const keyword of complexKeywords) {
      if (normalizedQuery.includes(keyword)) {
        return "complex";
      }
    }

    // Check query length as complexity indicator
    if (query.length > 200) {
      return "complex";
    } else if (query.length > 100) {
      return "moderate";
    }

    return "simple";
  }

  /**
   * Call AI API via backend
   */
  private async callDirectAI(promptContext: DavidPromptContext): Promise<any> {
    const prompt = PromptEngine.generateDavidPrompt(promptContext);

    // Use backend API instead of direct API
    const { geminiApi } = await import("../services/api/geminiApi");
    const result = await geminiApi.generateContent({
      prompt,
      systemPrompt:
        "You are David, a legal expert AI. Analyze the query and return a JSON response with matched lawyers and analysis.",
    });

    // Parse the JSON response from the AI
    try {
      return JSON.parse(result.content);
    } catch {
      // If not valid JSON, wrap the text response
      return { analysis: result.content, matchedLawyers: [] };
    }
  }

  /**
   * Create fallback AI result when parsing fails
   */
  private createFallbackAIResult(promptContext: DavidPromptContext): any {
    const patternInsights = this.patternMatcher.getPatternInsights(
      promptContext.userQuery,
    );
    const topLawyers = allLawyers.slice(0, 3);

    return {
      analysis: {
        queryIntent: "Legal consultation request",
        legalAreas: patternInsights?.detectedPatterns || ["General Legal"],
        urgencyAssessment: promptContext.urgency,
        complexityLevel: promptContext.complexity,
      },
      recommendations: {
        primaryMatch: {
          lawyerId: topLawyers[0]?.id || 1,
          matchScore: 85,
          reasoning: "AI analysis with pattern matching insights",
        },
        alternativeMatches: topLawyers.slice(1).map((lawyer) => ({
          lawyerId: lawyer.id,
          matchScore: 75,
          reasoning: `Strong match for ${lawyer.specialization}`,
        })),
      },
      confidence: 75,
      reasoning: `Based on your query about "${promptContext.userQuery}", I've identified relevant legal areas and found suitable lawyers who can help with your specific needs.`,
    };
  }

  /**
   * Convert AI service result to David result format
   * Always guarantees at least 3 lawyer recommendations
   */
  private convertAIResultToDavidResult(
    aiResult: any,
    query: string,
  ): DavidResult {
    try {
      // Find lawyers by ID from AI result
      const primaryLawyer = aiResult.recommendations?.primaryMatch
        ? allLawyers.find(
            (lawyer) =>
              lawyer.id === aiResult.recommendations.primaryMatch.lawyerId,
          ) || null
        : null;

      const alternativeLawyers =
        aiResult.recommendations?.alternativeMatches
          ?.map((match: any) =>
            allLawyers.find((lawyer) => lawyer.id === match.lawyerId),
          )
          .filter((lawyer: any) => lawyer) || [];

      let allMatchedLawyers = [primaryLawyer, ...alternativeLawyers].filter(
        (lawyer): lawyer is Lawyer => lawyer !== null && lawyer !== undefined,
      );

      // If AI didn't return enough matches, supplement with specialization-based or top-rated lawyers
      if (allMatchedLawyers.length < 3) {
        const detectedAreas = aiResult.analysis?.legalAreas || [];
        const existingIds = new Set(allMatchedLawyers.map((l) => l.id));

        // Try to find lawyers matching detected specializations
        const specMatches = allLawyers.filter(
          (l) =>
            !existingIds.has(l.id) &&
            detectedAreas.some(
              (area: string) =>
                l.specialization.toLowerCase().includes(area.toLowerCase()) ||
                area.toLowerCase().includes(l.specialization.toLowerCase()),
            ),
        );

        // Fill from specialization matches first, then top-rated
        const fillers =
          specMatches.length > 0
            ? specMatches
            : allLawyers
                .filter((l) => !existingIds.has(l.id))
                .sort((a, b) => b.rating - a.rating);

        for (const lawyer of fillers) {
          if (allMatchedLawyers.length >= 3) break;
          allMatchedLawyers.push(lawyer);
        }
      }

      // Ensure exactly 3 (trim if more)
      allMatchedLawyers = allMatchedLawyers.slice(0, 3);

      return {
        matchedLawyers: allMatchedLawyers,
        queryContext: {
          originalQuery: query,
          detectedSpecializations: aiResult.analysis?.legalAreas || [
            "General Legal",
          ],
          confidence: aiResult.confidence || 75,
          reasoning: aiResult.reasoning || "AI-powered legal analysis",
        },
        recommendations: {
          primaryMatch: allMatchedLawyers[0] || null,
          alternativeMatches: allMatchedLawyers.slice(1),
          whyThisMatch:
            aiResult.recommendations?.primaryMatch?.reasoning ||
            "AI-powered recommendation",
        },
      };
    } catch (error) {
      console.error("Error converting AI result:", error);
      return this.fallbackAnalysis(query);
    }
  }

  /**
   * Create AI prompt that actually solves the user's legal query
   */
  private createSolutionPrompt(query: string): string {
    return `You are David, an expert Legal AI specializing in Indian law. Your task is to provide a direct, actionable solution to the user's legal question.

USER'S LEGAL QUESTION: "${query}"

TASK: Provide a comprehensive legal solution in 3-4 lines that directly addresses their question.

REQUIREMENTS:
1. Give a direct answer to their legal question
2. Provide practical next steps they can take
3. Mention relevant legal provisions or procedures
4. Keep it concise but informative (3-4 lines maximum)
5. Focus on actionable advice, not just lawyer matching

RESPONSE FORMAT:
Provide your legal solution directly, then suggest the type of lawyer they might need if further assistance is required.

Example format:
"Based on your situation, [direct legal solution]. You should [specific action]. This falls under [legal area]. For detailed assistance, consider consulting a [specialization] lawyer."

Now provide a direct legal solution to: "${query}"`;
  }

  /**
   * Parse AI solution response and create DavidResult
   */
  private parseSolutionResponse(
    aiResponse: string,
    query: string,
  ): DavidResult {
    try {
      // Extract the legal solution from AI response
      const solution = aiResponse.trim();

      // Try to extract lawyer specialization from the response
      const specializationMatch = solution.match(
        /(?:consulting|consult|assistance|help).*?([A-Z][a-z]+ [Ll]aw|[A-Z][a-z]+ [Ll]awyer)/i,
      );
      const detectedSpecialization = specializationMatch
        ? specializationMatch[1]
        : "General Legal";

      // Find relevant lawyers based on detected specialization
      const relevantLawyers = allLawyers.filter(
        (lawyer) =>
          lawyer.specialization
            .toLowerCase()
            .includes(detectedSpecialization.toLowerCase()) ||
          detectedSpecialization
            .toLowerCase()
            .includes(lawyer.specialization.toLowerCase()),
      );

      // If no specific match, get top-rated lawyers
      const topLawyers =
        relevantLawyers.length > 0 ? relevantLawyers : allLawyers.slice(0, 3);

      return {
        matchedLawyers: topLawyers,
        queryContext: {
          originalQuery: query,
          detectedSpecializations: [detectedSpecialization],
          confidence: 85,
          reasoning: solution,
        },
        recommendations: {
          primaryMatch: topLawyers[0] || null,
          alternativeMatches: topLawyers.slice(1, 3),
          whyThisMatch: `AI solution: ${solution.substring(0, 100)}...`,
        },
      };
    } catch (error) {
      console.error("Error parsing AI solution response:", error);
      return this.fallbackAnalysis(query);
    }
  }

  /**
   * Fallback analysis when AI fails - provide basic legal guidance
   */
  private fallbackAnalysis(query: string): DavidResult {
    try {
      // Provide a basic legal response when AI fails
      const safeQuery = query || "legal consultation";
      const basicSolution = `I understand you're seeking legal guidance regarding "${safeQuery}". For the most accurate legal advice, I recommend consulting with a qualified lawyer who can review your specific situation and provide personalized guidance.`;

      // Get top-rated lawyers as fallback with error handling
      const topLawyers = allLawyers
        .filter((lawyer) => lawyer && lawyer.name && lawyer.specialization)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 3);

      // Ensure we have at least some lawyers
      if (topLawyers.length === 0) {
        console.error("David Agent: No lawyers available in fallback");
        return {
          matchedLawyers: [],
          queryContext: {
            originalQuery: safeQuery,
            detectedSpecializations: ["General Legal"],
            confidence: 30,
            reasoning: "Unable to find suitable legal experts at this time",
          },
          recommendations: {
            primaryMatch: null,
            alternativeMatches: [],
            whyThisMatch: "No lawyers available",
          },
        };
      }

      return {
        matchedLawyers: topLawyers,
        queryContext: {
          originalQuery: safeQuery,
          detectedSpecializations: ["General Legal"],
          confidence: 60,
          reasoning: basicSolution,
        },
        recommendations: {
          primaryMatch: topLawyers[0] || null,
          alternativeMatches: topLawyers.slice(1, 3),
          whyThisMatch: "Recommended for general legal consultation",
        },
      };
    } catch (error) {
      console.error("David Agent: Critical error in fallback analysis:", error);
      // Ultimate fallback
      return {
        matchedLawyers: [],
        queryContext: {
          originalQuery: query || "legal consultation",
          detectedSpecializations: ["General Legal"],
          confidence: 20,
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
}
