import { jest } from "@jest/globals";

const runMock = jest.fn().mockResolvedValue({ records: [] });
const closeMock = jest.fn().mockResolvedValue(undefined);

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
      basic: jest.fn().mockReturnValue({ username: "neo4j", password: "pass" }),
    },
  },
}));

const { writeToGraph, closeNeo4j } = await import(
  "../../src/services/neo4j.service"
);
import type { PipelinePayload, ExtractedEntities } from "../../src/pipeline/types";

const basePayload: PipelinePayload = {
  source_id: "slack_C04AB_1704856800",
  source_type: "slack",
  raw_text: "We decided to go with AWS",
  metadata: {
    author: "Sumeet",
    timestamp: "2024-01-10T10:00:00Z",
    channel: "C04ABCDEF",
  },
};

const baseEntities: ExtractedEntities = {
  is_relevant: true,
  decisions: ["Use AWS for infrastructure"],
  people: ["Sumeet", "Priya"],
  reasons: ["30% cheaper at scale"],
  topics: ["infrastructure", "vendor"],
};

describe("writeToGraph", () => {
  beforeEach(() => {
    process.env.NEO4J_URI = "bolt://localhost:7687";
    process.env.NEO4J_USER = "neo4j";
    process.env.NEO4J_PASSWORD = "password";
    runMock.mockReset().mockResolvedValue({ records: [] });
    closeMock.mockReset().mockResolvedValue(undefined);
  });

  it("creates source node for slack messages", async () => {
    await writeToGraph(basePayload, baseEntities);

    const calls = runMock.mock.calls.map((c: any) => c[0] as string);
    const sourceCall = calls.find((q: string) => q.includes("SlackMessage"));
    expect(sourceCall).toBeDefined();
    expect(sourceCall).toContain("MERGE");
  });

  it("creates source node for gmail", async () => {
    const payload = { ...basePayload, source_type: "gmail" as const };
    await writeToGraph(payload, baseEntities);

    const calls = runMock.mock.calls.map((c: any) => c[0] as string);
    const sourceCall = calls.find((q: string) => q.includes("Email"));
    expect(sourceCall).toBeDefined();
  });

  it("creates source node for drive documents", async () => {
    const payload = { ...basePayload, source_type: "drive" as const };
    await writeToGraph(payload, baseEntities);

    const calls = runMock.mock.calls.map((c: any) => c[0] as string);
    const sourceCall = calls.find((q: string) => q.includes("Document"));
    expect(sourceCall).toBeDefined();
  });

  it("creates Decision nodes with SUPPORTS relationships", async () => {
    await writeToGraph(basePayload, baseEntities);

    const calls = runMock.mock.calls.map((c: any) => c[0] as string);
    const decisionCall = calls.find((q: string) => q.includes("Decision"));
    expect(decisionCall).toBeDefined();
    expect(decisionCall).toContain("SUPPORTS");
  });

  it("creates Person nodes with MADE relationships", async () => {
    await writeToGraph(basePayload, baseEntities);

    const calls = runMock.mock.calls.map((c: any) => c[0] as string);
    const personCall = calls.find((q: string) => q.includes("Person"));
    expect(personCall).toBeDefined();
    expect(personCall).toContain("MADE");
  });

  it("creates Reason nodes with HAS_REASON relationships", async () => {
    await writeToGraph(basePayload, baseEntities);

    const calls = runMock.mock.calls.map((c: any) => c[0] as string);
    const reasonCall = calls.find((q: string) => q.includes("Reason"));
    expect(reasonCall).toBeDefined();
    expect(reasonCall).toContain("HAS_REASON");
  });

  it("closes the session after writing", async () => {
    await writeToGraph(basePayload, baseEntities);
    expect(closeMock).toHaveBeenCalled();
  });

  it("handles empty decisions gracefully", async () => {
    const entities = { ...baseEntities, decisions: [] };
    await writeToGraph(basePayload, entities);

    const calls = runMock.mock.calls.map((c: any) => c[0] as string);
    const decisionCall = calls.find((q: string) => q.includes("Decision"));
    expect(decisionCall).toBeUndefined();
  });
});
