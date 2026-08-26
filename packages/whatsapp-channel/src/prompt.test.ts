import { agentDisplayName, buildLaunchPrompt, sanitizeInbound } from "./prompt.js";
import type { InboxItem } from "./types.js";

describe("sanitizeInbound", () => {
  it("strips control characters and caps length", () => {
    expect(sanitizeInbound("hello\u0000world")).toBe("helloworld");
    const long = "x".repeat(9000);
    const out = sanitizeInbound(long);
    expect(out.startsWith("x".repeat(8000))).toBe(true);
    expect(out.endsWith("…[truncated]")).toBe(true);
  });
});

describe("agentDisplayName", () => {
  it("stays within Cursor's 100-character name limit", () => {
    const name = agentDisplayName("y".repeat(200));
    expect(name.length).toBeLessThanOrEqual(100);
    expect(name.startsWith("WhatsApp:")).toBe(true);
  });
});

describe("buildLaunchPrompt", () => {
  it("frames the WhatsApp body as untrusted and points at AGENTS.md", () => {
    const item: InboxItem = {
      id: "wamid.1",
      kind: "update",
      from: "27820000000",
      body: "add an offline indicator",
      createdAt: "2026-08-26T12:00:00.000Z",
    };
    const prompt = buildLaunchPrompt(item, "https://github.com/tobievii/constrAI");
    expect(prompt).toContain("AGENTS.md");
    expect(prompt).toContain("untrusted");
    expect(prompt).toContain("add an offline indicator");
    expect(prompt).toContain("https://github.com/tobievii/constrAI");
    expect(prompt).not.toMatch(/\d{2} working days/);
  });
});
