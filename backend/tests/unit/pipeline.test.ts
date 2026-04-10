import { jest } from "@jest/globals";

const extractMock = jest.fn();
const upsertMock = jest.fn().mockResolvedValue(undefined);
const writeGraphMock = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule("../../src/services/extractor.service", () => ({
  extractEntities: extractMock,
}));

jest.unstable_mockModule("../../src/services/chromadb.service", () => ({
  upsertChunk: upsertMock,
}));

jest.unstable_mockModule("../../src/services/neo4j.service", () => ({
  writeToGraph: writeGraphMock,
}));

const { runPipeline } = await import("../../src/pipeline/pipeline");
import type { PipelinePayload } from "../../src/pipeline/types";

const payload: PipelinePayload = {
  source_id: "slack_C04AB_1704856800",
  source_type: "slack",
  raw_text: "We decided to go with AWS over GCP — 30% cheaper",
  metadata: {
    author: "Sumeet",
    timestamp: "2024-01-10T10:00:00Z",
    channel: "C04ABCDEF",
  },
};

describe("runPipeline", () => {
  beforeEach(() => {
    extractMock.mockReset();
    upsertMock.mockReset().mockResolvedValue(undefined);
    writeGraphMock.mockReset().mockResolvedValue(undefined);
  });

  it("calls extractor → chromadb → neo4j when relevant", async () => {
    extractMock.mockResolvedValue({
      is_relevant: true,
      decisions: ["Use AWS"],
      people: ["Sumeet"],
      reasons: ["Cheaper"],
      topics: ["infra"],
    });

    const result = await runPipeline(payload);

    expect(extractMock).toHaveBeenCalledWith(payload.raw_text);
    expect(upsertMock).toHaveBeenCalledWith(payload);
    expect(writeGraphMock).toHaveBeenCalledWith(
      payload,
      expect.objectContaining({ is_relevant: true }),
    );
    expect(result.skipped).toBe(false);
  });

  it("skips chromadb and neo4j when not relevant", async () => {
    extractMock.mockResolvedValue({
      is_relevant: false,
      decisions: [],
      people: [],
      reasons: [],
      topics: [],
    });

    const result = await runPipeline(payload);

    expect(extractMock).toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
    expect(writeGraphMock).not.toHaveBeenCalled();
    expect(result.skipped).toBe(true);
  });

  it("returns extracted entities when relevant", async () => {
    const entities = {
      is_relevant: true,
      decisions: ["Use AWS"],
      people: ["Sumeet"],
      reasons: ["Cheaper"],
      topics: ["infra"],
    };
    extractMock.mockResolvedValue(entities);

    const result = await runPipeline(payload);

    expect(result.entities).toEqual(entities);
  });

  it("handles extractor errors gracefully", async () => {
    extractMock.mockRejectedValue(new Error("LLM down"));

    const result = await runPipeline(payload);

    expect(result.skipped).toBe(true);
    expect(result.error).toBeDefined();
  });

  it("continues with chromadb even if neo4j fails", async () => {
    extractMock.mockResolvedValue({
      is_relevant: true,
      decisions: ["Use AWS"],
      people: [],
      reasons: [],
      topics: [],
    });
    writeGraphMock.mockRejectedValue(new Error("Neo4j down"));

    const result = await runPipeline(payload);

    expect(upsertMock).toHaveBeenCalled();
    expect(result.skipped).toBe(false);
    expect(result.error).toContain("Neo4j");
  });
});
