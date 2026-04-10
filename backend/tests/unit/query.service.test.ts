import { jest } from "@jest/globals";

const queryChunksMock = jest.fn();
const runMock = jest.fn();
const closeMock = jest.fn().mockResolvedValue(undefined);
const createMock = jest.fn();

jest.unstable_mockModule("../../src/services/chromadb.service", () => ({
  queryChunks: queryChunksMock,
}));

jest.unstable_mockModule("neo4j-driver", () => ({
  default: {
    driver: jest.fn().mockReturnValue({
      session: jest.fn().mockReturnValue({
        run: runMock,
        close: closeMock,
      }),
      close: closeMock,
    }),
    auth: {
      basic: jest.fn().mockReturnValue({}),
    },
  },
}));

jest.unstable_mockModule("groq-sdk", () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: createMock } },
  })),
}));

const { answerQuestion } = await import("../../src/services/query.service");

describe("answerQuestion", () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = "gsk_test";
    process.env.NEO4J_URI = "bolt://localhost:7687";
    process.env.NEO4J_USER = "neo4j";
    process.env.NEO4J_PASSWORD = "password";
    queryChunksMock.mockReset();
    runMock.mockReset();
    createMock.mockReset();
  });

  it("returns answer with sources from ChromaDB + Neo4j", async () => {
    queryChunksMock.mockResolvedValue([
      {
        source_id: "slack_C04AB_123",
        text: "We chose AWS — 30% cheaper",
        score: 0.92,
        metadata: { source_type: "slack", author: "Sumeet", timestamp: "2024-01-10" },
      },
    ]);

    runMock.mockResolvedValue({
      records: [
        {
          get: (key: string) => {
            const data: Record<string, unknown> = {
              decision: "Use AWS for infrastructure",
              reasons: ["30% cheaper at scale"],
              people: ["Sumeet"],
              topics: ["infrastructure"],
              first_seen: "2024-01-10",
            };
            return data[key] ?? null;
          },
        },
      ],
    });

    createMock.mockResolvedValue({
      choices: [
        {
          message: {
            content:
              "AWS was chosen because it is 30% cheaper at scale. (Source: Slack message from Sumeet on Jan 10)",
          },
        },
      ],
    });

    const result = await answerQuestion("Why did we choose AWS?");

    expect(result.answer).toContain("AWS");
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].source_id).toBe("slack_C04AB_123");
    expect(result.sources[0].score).toBeCloseTo(0.92);
  });

  it("returns empty answer when no chunks found", async () => {
    queryChunksMock.mockResolvedValue([]);

    const result = await answerQuestion("Random unrelated question?");

    expect(result.answer).toBeDefined();
    expect(result.sources).toHaveLength(0);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("sends graph context + chunks to the LLM", async () => {
    queryChunksMock.mockResolvedValue([
      {
        source_id: "gmail_abc",
        text: "Vendor review email content",
        score: 0.85,
        metadata: { source_type: "gmail" },
      },
    ]);

    runMock.mockResolvedValue({ records: [] });

    createMock.mockResolvedValue({
      choices: [{ message: { content: "Based on the email..." } }],
    });

    await answerQuestion("What about vendor review?");

    const call = createMock.mock.calls[0]![0] as any;
    expect(call.messages[0].content).toContain("Vendor review email content");
    expect(call.model).toMatch(/llama/i);
  });
});
