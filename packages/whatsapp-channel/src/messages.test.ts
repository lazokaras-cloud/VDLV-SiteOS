import {
  helpText,
  noteStored,
  updateLaunched,
  updateNeedBody,
} from "./messages.js";

describe("channel copy", () => {
  it("lists every command on one line each for WhatsApp", () => {
    const help = helpText("en", {});
    expect(help).toContain("/note");
    expect(help).toContain("/updateDemo");
    expect(help).toContain("/updateApp");
    expect(help).toContain("/update");
    expect(help).toContain("/status");
    expect(help).toContain("/help");
    expect(help).not.toContain("Cursor");
    expect(help.split("\n").length).toBeGreaterThanOrEqual(7);
  });

  it("uses SiteOS-Agent not Cursor in replies", () => {
    expect(noteStored("en")).toContain("SiteOS-Agent");
    expect(noteStored("en")).not.toContain("Cursor");
    expect(updateLaunched("en", "https://cursor.com/agents/bc-1")).toContain(
      "SiteOS-Agent",
    );
    expect(updateNeedBody("en")).toContain("ship");
  });

  it("keeps command names in English in Afrikaans help", () => {
    const help = helpText("af", { joinLink: "https://wa.me/27820000001" });
    expect(help).toContain("/updateDemo");
    expect(help).toContain("SiteOS-Agent");
    expect(help).toContain("https://wa.me/27820000001");
    expect(noteStored("af")).toContain("SiteOS-Agent");
  });
});
