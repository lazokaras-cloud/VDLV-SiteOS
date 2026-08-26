import { helpText, noteStored, updateLaunched } from "./messages.js";

describe("channel copy", () => {
  it("keeps command names in English in both locales", () => {
    expect(helpText("en", {})).toContain("/update");
    expect(helpText("af", { joinLink: "https://wa.me/27820000001" })).toContain("/update");
    expect(helpText("af", { joinLink: "https://wa.me/27820000001" })).toContain(
      "https://wa.me/27820000001",
    );
    expect(noteStored("af")).toContain("Note");
    expect(updateLaunched("en", "https://cursor.com/agents/bc-1")).toContain(
      "https://cursor.com/agents/bc-1",
    );
  });
});
