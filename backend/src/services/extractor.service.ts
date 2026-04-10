import Groq from "groq-sdk";
import type { ExtractedEntities } from "../pipeline/types.js";

const EXTRACTION_PROMPT = `You are extracting structured data from a piece of organizational communication (Slack thread, email, document, or meeting transcript).

Text:
{text}

Return ONLY valid JSON — no markdown, no explanation:
{
  "is_relevant": true or false,
  "decisions": ["list of decisions made as clear statements"],
  "people": ["names of people involved"],
  "reasons": ["reasons or rationale mentioned"],
  "topics": ["e.g. vendor, infrastructure, auth, pricing"]
}

Rules:
- is_relevant = false if the text is noise (standup pings, greetings, off-topic, trivial)
- A decision = a clear choice: "we will use X", "decided to drop Y", "agreed on Z"
- Reasons = the WHY behind the decision
- People = anyone who contributed meaningfully to the discussion
- If no decision was made but there is useful context, still set is_relevant to true`;

const EMPTY_RESULT: ExtractedEntities = {
  is_relevant: false,
  decisions: [],
  people: [],
  reasons: [],
  topics: [],
};

let client: Groq | null = null;

function getClient(): Groq {
  if (!client) {
    client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return client;
}

export async function extractEntities(
  rawText: string,
): Promise<ExtractedEntities> {
  if (!rawText.trim()) {
    return EMPTY_RESULT;
  }

  try {
    const response = await getClient().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: EXTRACTION_PROMPT.replace("{text}", rawText),
        },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(text) as ExtractedEntities;

    return {
      is_relevant: Boolean(parsed.is_relevant),
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      people: Array.isArray(parsed.people) ? parsed.people : [],
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
    };
  } catch {
    console.error("[extractor] Failed to extract entities, returning empty");
    return EMPTY_RESULT;
  }
}
