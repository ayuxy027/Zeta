import { DavidAgent } from "./david";
import { AndrewAgent } from "./andrew";
import {
  DavidResult,
  DavidProgress,
  AndrewMessage,
  AndrewProgress,
  LawyerCard,
} from "./types";

export interface ToolCall {
  id: string;
  agent: "david" | "andrew";
  toolName: string;
  input: any;
  output?: any;
  status: "pending" | "running" | "completed" | "failed";
  timestamp: number;
  duration?: number;
}

export interface AgentProgress {
  stage: "david" | "andrew" | "complete";
  davidProgress?: DavidProgress;
  andrewProgress?: AndrewProgress;
  message: string;
  progress: number;
  toolCalls?: ToolCall[];
}

export interface QueryResult {
  success: boolean;
  message?: AndrewMessage;
  error?: string;
  progress?: AgentProgress;
}

export class AgentOrchestrator {
  private davidAgent: DavidAgent;
  private andrewAgent: AndrewAgent;
  private onProgress?: (progress: AgentProgress) => void;
  private toolCalls: ToolCall[] = [];
  private static instance: AgentOrchestrator | null = null;

  constructor(onProgress?: (progress: AgentProgress) => void) {
    this.onProgress = onProgress;

    // Initialize AI-integrated agents with progress callbacks
    this.davidAgent = new DavidAgent((davidProgress) => {
      this.updateProgress(
        "david",
        davidProgress.message,
        davidProgress.progress,
        davidProgress,
      );
    });

    this.andrewAgent = new AndrewAgent((andrewProgress) => {
      this.updateProgress(
        "andrew",
        andrewProgress.message,
        andrewProgress.progress,
        undefined,
        andrewProgress,
      );
    });
  }

  // Singleton pattern to prevent multiple instances
  static getInstance(
    onProgress?: (progress: AgentProgress) => void,
  ): AgentOrchestrator {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator(onProgress);
    }
    return AgentOrchestrator.instance;
  }

  private updateProgress(
    stage: AgentProgress["stage"],
    message: string,
    progress: number,
    davidProgress?: DavidProgress,
    andrewProgress?: AndrewProgress,
  ) {
    if (this.onProgress) {
      this.onProgress({
        stage,
        message,
        progress,
        davidProgress,
        andrewProgress,
        toolCalls: [...this.toolCalls],
      });
    }
  }

  private addToolCall(
    agent: "david" | "andrew",
    toolName: string,
    input: any,
  ): string {
    const toolCall: ToolCall = {
      id: Math.random().toString(36).substr(2, 9),
      agent,
      toolName,
      input,
      status: "pending",
      timestamp: Date.now(),
    };
    this.toolCalls.push(toolCall);
    return toolCall.id;
  }

  private updateToolCall(
    id: string,
    status: ToolCall["status"],
    output?: any,
    duration?: number,
  ) {
    const toolCall = this.toolCalls.find((tc) => tc.id === id);
    if (toolCall) {
      toolCall.status = status;
      if (output) toolCall.output = output;
      if (duration) toolCall.duration = duration;
    }
  }

  /**
   * Main method to process user query through both agents
   */
  async processQuery(userQuery: string): Promise<QueryResult> {
    try {
      // Step 1: Validate query with Andrew
      const validation = this.andrewAgent.validateQuery(userQuery);

      if (!validation.isValid) {
        if (validation.reason === "off-topic") {
          return {
            success: true,
            message: this.andrewAgent.createOffTopicMessage(),
          };
        } else if (validation.reason === "too-short") {
          return {
            success: true,
            message: this.andrewAgent.createSystemMessage(
              "Please provide more details about your legal question.",
            ),
          };
        }
      }

      // Step 2: Process with David (Backend Agent)
      const davidToolCallId = this.addToolCall("david", "analyze_legal_query", {
        query: userQuery,
      });
      this.updateToolCall(davidToolCallId, "running");
      this.updateProgress("david", "Analyzing your legal needs...", 10);

      const davidResult: DavidResult =
        await this.davidAgent.processQuery(userQuery);

      this.updateToolCall(
        davidToolCallId,
        "completed",
        {
          matchedLawyers: davidResult.matchedLawyers.length,
          confidence: davidResult.queryContext.confidence,
        },
        Date.now() -
          this.toolCalls.find((tc) => tc.id === davidToolCallId)!.timestamp,
      );

      // Step 3: Process with Andrew (Frontend Agent)
      const andrewToolCallId = this.addToolCall("andrew", "format_response", {
        davidResult: davidResult.queryContext.reasoning,
        userQuery,
      });
      this.updateToolCall(andrewToolCallId, "running");
      this.updateProgress(
        "andrew",
        "Preparing your lawyer recommendations...",
        50,
      );

      const andrewMessage: AndrewMessage =
        await this.andrewAgent.processDavidResult(davidResult, userQuery);

      this.updateToolCall(
        andrewToolCallId,
        "completed",
        {
          responseLength: andrewMessage.content.length,
          lawyerCards: andrewMessage.lawyerCards?.length || 0,
        },
        Date.now() -
          this.toolCalls.find((tc) => tc.id === andrewToolCallId)!.timestamp,
      );

      // Step 4: Complete
      this.updateProgress("complete", "Analysis complete!", 100);

      return {
        success: true,
        message: andrewMessage,
      };
    } catch (error) {
      console.error("Agent Orchestrator Error:", error);

      const errorMessage = this.andrewAgent.createErrorMessage(
        error instanceof Error ? error.message : "Unknown error occurred",
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: errorMessage,
      };
    }
  }

  /**
   * Process document analysis query
   */
  async processDocumentQuery(
    documentName: string,
    userQuery: string,
  ): Promise<QueryResult> {
    try {
      // Enhanced query with document context
      const enhancedQuery = `Document: ${documentName}\n\nQuery: ${userQuery}`;

      return await this.processQuery(enhancedQuery);
    } catch (error) {
      console.error("Document Query Error:", error);

      const errorMessage = this.andrewAgent.createErrorMessage(
        "Failed to analyze document. Please try again.",
      );

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Document analysis failed",
        message: errorMessage,
      };
    }
  }

  /**
   * Get system status message
   */
  createSystemMessage(message: string): AndrewMessage {
    return this.andrewAgent.createSystemMessage(message);
  }

  /**
   * Get error message
   */
  createErrorMessage(error: string): AndrewMessage {
    return this.andrewAgent.createErrorMessage(error);
  }

  /**
   * Get off-topic message
   */
  createOffTopicMessage(): AndrewMessage {
    return this.andrewAgent.createOffTopicMessage();
  }
}

// Export singleton instance
export const agentOrchestrator = new AgentOrchestrator();

// Export types for use in components
export type {
  DavidResult,
  DavidProgress,
  AndrewMessage,
  AndrewProgress,
  LawyerCard,
} from "./types";
