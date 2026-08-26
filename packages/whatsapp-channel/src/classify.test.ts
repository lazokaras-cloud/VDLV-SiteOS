import { parseCommand, isUpdateCaption } from "./classify.js";

describe("parseCommand", () => {
  it("treats empty as plain", () => {
    expect(parseCommand("")).toEqual({ command: "plain", rest: "" });
    expect(parseCommand("   ")).toEqual({ command: "plain", rest: "" });
  });

  it("parses slash commands and aliases", () => {
    expect(parseCommand("/help")).toEqual({ command: "help", rest: "" });
    expect(parseCommand("/h")).toEqual({ command: "help", rest: "" });
    expect(parseCommand("status")).toEqual({ command: "status", rest: "" });
    expect(parseCommand("/note rain on grid 4")).toEqual({
      command: "note",
      rest: "rain on grid 4",
    });
    expect(parseCommand("/update add an offline indicator")).toEqual({
      command: "update",
      rest: "add an offline indicator",
    });
    expect(parseCommand("/cursor fix the shell")).toEqual({
      command: "update",
      rest: "fix the shell",
    });
    expect(parseCommand("/agent do it")).toEqual({ command: "update", rest: "do it" });
    expect(parseCommand("/fix the tab")).toEqual({ command: "update", rest: "the tab" });
  });

  it("keeps unmatched text as a plain note body", () => {
    expect(parseCommand("rain delay, no VO yet")).toEqual({
      command: "plain",
      rest: "rain delay, no VO yet",
    });
  });

  it("is case-insensitive for the command word", () => {
    expect(parseCommand("/NOTE hello")).toEqual({ command: "note", rest: "hello" });
    expect(parseCommand("/Update the shell")).toEqual({
      command: "update",
      rest: "the shell",
    });
  });
});

describe("updateDemo vs updateApp", () => {
  it("routes the demo command to its own kind", () => {
    expect(parseCommand("/updateDemo add a toggle")).toEqual({
      command: "updateDemo",
      rest: "add a toggle",
    });
    expect(parseCommand("/demo tweak the colours")).toEqual({
      command: "updateDemo",
      rest: "tweak the colours",
    });
  });

  it("routes the app command to the pull request path", () => {
    expect(parseCommand("/updateApp add a claim gate")).toEqual({
      command: "update",
      rest: "add a claim gate",
    });
    expect(parseCommand("/app add a claim gate")).toEqual({
      command: "update",
      rest: "add a claim gate",
    });
  });

  it("is case-insensitive, because nobody types camel case on a phone", () => {
    expect(parseCommand("/updatedemo x")).toEqual({ command: "updateDemo", rest: "x" });
    expect(parseCommand("/UPDATEDEMO x")).toEqual({ command: "updateDemo", rest: "x" });
    expect(parseCommand("/UpdateApp x")).toEqual({ command: "update", rest: "x" });
  });
});

describe("isUpdateCaption", () => {
  it("is true only for update commands", () => {
    expect(isUpdateCaption(undefined)).toBe(false);
    expect(isUpdateCaption("")).toBe(false);
    expect(isUpdateCaption("/update from this photo")).toBe(true);
    expect(isUpdateCaption("just a caption")).toBe(false);
  });
});
