import { jest } from "@jest/globals";

// Shared mock for chat.completions.create
const createMock = jest.fn();

jest.unstable_mockModule("groq-sdk", () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: createMock } },
  })),
}));

const { extractEntities } = await import(
  "../../src/services/extractor.service"
);
import type { ExtractedEntities } from "../../src/pipeline/types";

function mockLLMResponse(content: string) {
  createMock.mockResolvedValueOnce({
    choices: [{ message: { content } }],
  });
}

function mockLLMError(error: Error) {
  createMock.mockRejectedValueOnce(error);
}

describe("extractEntities", () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = "gsk_test-key";
    createMock.mockReset();
  });

  it("returns is_relevant=false for noise messages", async () => {
    mockLLMResponse(
      JSON.stringify({
        is_relevant: false,
        decisions: [],
        people: [],
        reasons: [],
        topics: [],
      }),
    );

    const result = await extractEntities("ok standup in 5 mins @here");

    expect(result.is_relevant).toBe(false);
    expect(result.decisions).toHaveLength(0);
  });

  it("extracts decisions from a clear decision thread", async () => {
    const extracted: ExtractedEntities = {
      is_relevant: true,
      decisions: ["Use AWS for primary infrastructure"],
      people: ["Sumeet", "Priya"],
      reasons: ["30% cheaper at scale for our compute workload"],
      topics: ["infrastructure", "vendor"],
    };

    mockLLMResponse(JSON.stringify(extracted));

    const result = await extractEntities(
      "After comparing AWS and GCP, we decided to go with AWS. Priya confirmed the pricing is 30% cheaper at scale.",
    );

    expect(result.is_relevant).toBe(true);
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0]).toContain("AWS");
    expect(result.people).toContain("Sumeet");
    expect(result.people).toContain("Priya");
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.topics).toContain("infrastructure");
  });

  it("handles malformed LLM response gracefully", async () => {
    mockLLMResponse("this is not valid json at all");

    const result = await extractEntities("some input");

    expect(result.is_relevant).toBe(false);
    expect(result.decisions).toEqual([]);
  });

  it("handles LLM API errors gracefully", async () => {
    mockLLMError(new Error("API rate limit"));

    const result = await extractEntities("some input");

    expect(result.is_relevant).toBe(false);
  });

  it("sends correct model and prompt to the LLM", async () => {
    mockLLMResponse(
      JSON.stringify({
        is_relevant: false,
        decisions: [],
        people: [],
        reasons: [],
        topics: [],
      }),
    );

    await extractEntities("test input text");

    expect(createMock).toHaveBeenCalledTimes(1);
    const call = createMock.mock.calls[0]![0] as any;
    expect(call.model).toMatch(/llama/i);
    expect(call.messages[0].content).toContain("test input text");
  });

  it("returns empty result for blank input without calling LLM", async () => {
    const result = await extractEntities("   ");

    expect(result.is_relevant).toBe(false);
    expect(createMock).not.toHaveBeenCalled();
  });
});
