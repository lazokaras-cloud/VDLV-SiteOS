import { parseCommand } from "./classify.js";
import { resolveInboxKind, isKnowledgeKind } from "./inbox-kind.js";
import type { ChannelCommand } from "./types.js";

describe("resolveInboxKind", () => {
  it("classifies standalone media as knowledge base", () => {
    expect(resolveInboxKind(parseCommand(""), true)).toBe("knowledge");
    expect(resolveInboxKind(parseCommand("site photo grid C4"), true)).toBe("knowledge");
    expect(resolveInboxKind(parseCommand("/update from this"), true)).toBe("update");
    expect(resolveInboxKind(parseCommand("/updateDemo tweak demo"), true)).toBe("updateDemo");
    expect(resolveInboxKind(parseCommand("/note see attached"), true)).toBe("note");
  });

  it("classifies text without media as notes", () => {
    expect(resolveInboxKind(parseCommand("rain on grid 4"), false)).toBe("note");
    expect(resolveInboxKind(parseCommand("/note rain"), false)).toBe("note");
  });

  it("recognises legacy document kind as knowledge", () => {
    expect(isKnowledgeKind("document")).toBe(true);
    expect(isKnowledgeKind("knowledge")).toBe(true);
    expect(isKnowledgeKind("note")).toBe(false);
  });
});
