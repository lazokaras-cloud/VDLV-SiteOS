import { configIssues, loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("applies defaults without inventing WhatsApp credentials", () => {
    const config = loadConfig({});
    expect(config.whatsappToken).toBe("");
    expect(config.cursorRepoUrl).toBe("https://github.com/tobievii/constrAI");
    expect(config.listenPort).toBe(8787);
    expect(config.locale).toBe("en");
    expect(config.cursorAutoCreatePr).toBe(true);
    expect(config.allowedSenders).toEqual([]);
  });

  it("parses allowlists, locale and port", () => {
    const config = loadConfig({
      WHATSAPP_ALLOWED_SENDERS: "+27820000000, 27821111111",
      WHATSAPP_LOCALE: "af",
      WHATSAPP_PORT: "9001",
      WHATSAPP_ALLOW_ALL_SENDERS: "true",
      CURSOR_AUTO_CREATE_PR: "false",
    });
    expect(config.allowedSenders).toEqual(["+27820000000", "27821111111"]);
    expect(config.locale).toBe("af");
    expect(config.listenPort).toBe(9001);
    expect(config.allowAllSenders).toBe(true);
    expect(config.cursorAutoCreatePr).toBe(false);
  });

  it("rejects a nonsense port", () => {
    expect(() => loadConfig({ WHATSAPP_PORT: "nope" })).toThrow(/WHATSAPP_PORT/);
  });
});

describe("configIssues", () => {
  it("lists missing secrets without printing them", () => {
    const issues = configIssues(loadConfig({}));
    expect(issues.some((issue) => issue.includes("WHATSAPP_TOKEN"))).toBe(true);
    expect(issues.some((issue) => issue.includes("CURSOR_API_KEY"))).toBe(true);
    expect(issues.join(" ")).not.toMatch(/EAA/);
  });
});
