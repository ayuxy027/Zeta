import { Lawyer } from "../data/lawyerData";

// David Agent Types
export interface DavidResult {
  matchedLawyers: Lawyer[];
  queryContext: {
    originalQuery: string;
    detectedSpecializations: string[];
    confidence: number;
    reasoning: string;
  };
  recommendations: {
    primaryMatch: Lawyer | null;
    alternativeMatches: Lawyer[];
    whyThisMatch: string;
  };
}

export interface DavidProgress {
  stage: "analyzing" | "matching" | "ranking" | "complete";
  message: string;
  progress: number;
}

// Andrew Agent Types
export interface LawyerCard {
  lawyer: Lawyer;
  matchScore: number;
  whyRecommended: string;
  isPrimary: boolean;
}

export interface AndrewMessage {
  id: string;
  type: "user" | "bot" | "system";
  content: string;
  timestamp: number;
  lawyerCards?: LawyerCard[];
  queryContext?: {
    specializations: string[];
    confidence: number;
    reasoning: string;
  };
}

export interface AndrewProgress {
  stage: "processing" | "formatting" | "presenting" | "complete";
  message: string;
  progress: number;
}
