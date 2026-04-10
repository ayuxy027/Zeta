export interface SlackEvent {
  type: string;
  event_id?: string;
  event?: SlackMessageEvent | SlackUrlVerificationEvent;
  challenge?: string;
}

export interface SlackUrlVerificationEvent {
  type: 'url_verification';
  challenge: string;
}

export interface SlackMessageEvent {
  type: 'message';
  channel: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
}

export interface SlackWebhookPayload {
  token: string;
  team_id: string;
  api_app_id: string;
  event: SlackMessageEvent;
  type: 'event_callback';
  event_id: string;
  event_time: number;
  authorizations: Array<{
    enterprise_id: string | null;
    team_id: string;
    user_id: string;
    is_bot: boolean;
  }>;
}

export interface ExtractedEntities {
  is_relevant: boolean;
  decisions: string[];
  people: string[];
  reasons: string[];
  topics: string[];
}
