import { DavidResult, DavidAgent } from "./david";
import { AndrewMessage, AndrewAgent } from "./andrew";

export interface StreamingChunk {
  content: string;
  stage: "david" | "andrew" | "complete";
  progress: number;
  isComplete: boolean;
  davidResult?: DavidResult;
  andrewMessage?: AndrewMessage;
}

export class StreamingService {
  private davidAgent: DavidAgent;
  private andrewAgent: AndrewAgent;
  private static instance: StreamingService | null = null;

  constructor() {
    // Initialize agents only once to prevent multiple initializations
    this.davidAgent = new DavidAgent((progress) => {
      // Progress updates handled by components
    });
    this.andrewAgent = new AndrewAgent((progress) => {
      // Progress updates handled by components
    });
  }

  // Singleton pattern to prevent multiple instances
  static getInstance(): StreamingService {
    if (!StreamingService.instance) {
      StreamingService.instance = new StreamingService();
    }
    return StreamingService.instance;
  }

  /**
   * Stream David's analysis with real-time updates
   */
  async *streamDavidAnalysis(query: string): AsyncGenerator<StreamingChunk> {
    try {
      // Input validation
      if (!query || typeof query !== "string" || query.trim().length === 0) {
        console.warn("StreamingService: Invalid query for David analysis");
        yield {
          content:
            "I need a valid legal question to analyze. Please provide more details about your legal issue.",
          stage: "david",
          progress: 100,
          isComplete: true,
        };
        return;
      }

      // Use the actual David agent to get real analysis
      const davidResult = await this.davidAgent.processQuery(query);

      // Validate David result
      if (!davidResult || !davidResult.queryContext) {
        console.warn("StreamingService: Invalid David result");
        yield {
          content:
            "I encountered an issue analyzing your query. Please try rephrasing your question.",
          stage: "david",
          progress: 100,
          isComplete: true,
        };
        return;
      }

      // Stream the reasoning content word by word
      const reasoning =
        davidResult.queryContext.reasoning ||
        "I have analyzed your legal question and found relevant information.";
      const words = reasoning.split(" ").filter((word) => word.length > 0);

      if (words.length === 0) {
        yield {
          content:
            "I have analyzed your legal question and found relevant information.",
          stage: "david",
          progress: 100,
          isComplete: true,
          davidResult,
        };
        return;
      }

      let currentContent = "";

      for (let i = 0; i < words.length; i++) {
        currentContent += (i > 0 ? " " : "") + words[i];
        const progress = Math.min(100, ((i + 1) / words.length) * 100);

        yield {
          content: currentContent,
          stage: "david",
          progress: Math.round(progress),
          isComplete: i === words.length - 1,
          davidResult: i === words.length - 1 ? davidResult : undefined,
        };

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error("Streaming David analysis error:", error);
      yield {
        content:
          "I apologize, but I encountered an error while analyzing your query. Please try again.",
        stage: "david",
        progress: 100,
        isComplete: true,
      };
    }
  }

  /**
   * Stream Andrew's presentation with real-time updates
   */
  async *streamAndrewPresentation(
    davidResult: DavidResult,
    userQuery: string,
  ): AsyncGenerator<StreamingChunk> {
    try {
      // Input validation
      if (!davidResult || !userQuery || typeof userQuery !== "string") {
        console.warn("StreamingService: Invalid input for Andrew presentation");
        yield {
          content:
            "I apologize, but I encountered an issue formatting your response. Please try again.",
          stage: "andrew",
          progress: 100,
          isComplete: true,
        };
        return;
      }

      // Use the actual Andrew agent to get real presentation with lawyer cards
      const andrewMessage = await this.andrewAgent.processDavidResult(
        davidResult,
        userQuery,
      );

      // Validate Andrew message
      if (!andrewMessage || !andrewMessage.content) {
        console.warn("StreamingService: Invalid Andrew message");
        yield {
          content:
            "I have analyzed your query and found some excellent legal experts who can help you.",
          stage: "andrew",
          progress: 100,
          isComplete: true,
          andrewMessage: {
            id: "fallback",
            type: "bot",
            content:
              "I have analyzed your query and found some excellent legal experts who can help you.",
            timestamp: Date.now(),
            lawyerCards: [],
          },
        };
        return;
      }

      // Ensure we have content to stream
      const contentToStream =
        andrewMessage.content ||
        "I have analyzed your query and found some excellent legal experts who can help you.";

      // Stream the message content word by word
      const words = contentToStream
        .split(" ")
        .filter((word) => word.length > 0);

      if (words.length === 0) {
        yield {
          content:
            "I have analyzed your query and found some excellent legal experts who can help you.",
          stage: "andrew",
          progress: 100,
          isComplete: true,
          andrewMessage,
        };
        return;
      }

      let currentContent = "";

      for (let i = 0; i < words.length; i++) {
        currentContent += (i > 0 ? " " : "") + words[i];
        const progress = Math.min(100, ((i + 1) / words.length) * 100);

        yield {
          content: currentContent,
          stage: "andrew",
          progress: Math.round(progress),
          isComplete: i === words.length - 1,
          andrewMessage: i === words.length - 1 ? andrewMessage : undefined,
        };

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
    } catch (error) {
      console.error("Streaming Andrew presentation error:", error);
      yield {
        content:
          "I apologize, but I encountered an error while formatting the response. Please try again.",
        stage: "andrew",
        progress: 100,
        isComplete: true,
      };
    }
  }
}
