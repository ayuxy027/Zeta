import { jest } from "@jest/globals";

const upsertMock = jest.fn().mockResolvedValue(undefined);
const queryMock = jest.fn().mockResolvedValue({
  ids: [["slack_C04AB_1704856800"]],
  documents: [["We decided to go with AWS"]],
  metadatas: [[{ source_type: "slack", timestamp: "2024-01-10T10:00:00Z" }]],
  distances: [[0.13]],
});

jest.unstable_mockModule("chromadb", () => ({
  ChromaClient: jest.fn().mockImplementation(() => ({
    getOrCreateCollection: jest.fn().mockResolvedValue({
      upsert: upsertMock,
      query: queryMock,
    }),
  })),
  GoogleGenerativeAiEmbeddingFunction: jest.fn().mockImplementation(() => ({
    generate: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
  })),
}));

const { upsertChunk, queryChunks } = await import(
  "../../src/services/chromadb.service"
);
import type { PipelinePayload } from "../../src/pipeline/types";

const basePayload: PipelinePayload = {
  source_id: "slack_C04AB_1704856800",
  source_type: "slack",
  raw_text: "We decided to go with AWS over GCP",
  metadata: {
    author: "Sumeet",
    timestamp: "2024-01-10T10:00:00Z",
    channel: "C04ABCDEF",
  },
};

describe("upsertChunk", () => {
  beforeEach(() => {
    process.env.CHROMADB_URL = "http://localhost:8000";
    process.env.GOOGLE_AI_API_KEY = "test_google_key";
    upsertMock.mockReset().mockResolvedValue(undefined);
  });

  it("upserts document with correct source_id as ID", async () => {
    await upsertChunk(basePayload);

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const call = upsertMock.mock.calls[0]![0] as any;
    expect(call.ids).toEqual(["slack_C04AB_1704856800"]);
  });

  it("stores raw text as document", async () => {
    await upsertChunk(basePayload);

    const call = upsertMock.mock.calls[0]![0] as any;
    expect(call.documents).toEqual(["We decided to go with AWS over GCP"]);
  });

  it("stores metadata including source_type and timestamp", async () => {
    await upsertChunk(basePayload);

    const call = upsertMock.mock.calls[0]![0] as any;
    expect(call.metadatas[0].source_type).toBe("slack");
    expect(call.metadatas[0].timestamp).toBe("2024-01-10T10:00:00Z");
    expect(call.metadatas[0].source_id).toBe("slack_C04AB_1704856800");
  });

  it("includes optional metadata fields when present", async () => {
    await upsertChunk(basePayload);

    const call = upsertMock.mock.calls[0]![0] as any;
    expect(call.metadatas[0].channel).toBe("C04ABCDEF");
    expect(call.metadatas[0].author).toBe("Sumeet");
  });
});

describe("queryChunks", () => {
  beforeEach(() => {
    process.env.GOOGLE_AI_API_KEY = "test_google_key";
    queryMock.mockReset().mockResolvedValue({
      ids: [["slack_C04AB_1704856800"]],
      documents: [["We decided to go with AWS"]],
      metadatas: [
        [{ source_type: "slack", timestamp: "2024-01-10T10:00:00Z" }],
      ],
      distances: [[0.13]],
    });
  });

  it("returns chunks with source_ids and scores", async () => {
    const results = await queryChunks("Why did we choose AWS?", 5);

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
    expect(results[0].source_id).toBe("slack_C04AB_1704856800");
    expect(results[0].text).toBe("We decided to go with AWS");
    expect(results[0].score).toBeCloseTo(0.87, 1);
  });

  it("passes nResults to query", async () => {
    await queryChunks("test query", 10);

    const call = queryMock.mock.calls[0]![0] as any;
    expect(call.nResults).toBe(10);
  });
});
