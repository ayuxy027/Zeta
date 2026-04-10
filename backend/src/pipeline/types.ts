export interface PipelinePayload {
  source_id: string;
  source_type: "slack" | "gmail" | "drive" | "meeting";
  raw_text: string;
  metadata: {
    author?: string;
    timestamp: string;
    subject?: string;
    channel?: string;
    url?: string;
  };
}

export interface ExtractedEntities {
  is_relevant: boolean;
  decisions: string[];
  people: string[];
  reasons: string[];
  topics: string[];
}
