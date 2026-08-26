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
    expect(parseCommand("/updateDemo add inbox notes panel")).toEqual({
      command: "updateDemo",
      rest: "add inbox notes panel",
    });
    expect(parseCommand("/demo show notes")).toEqual({
      command: "updateDemo",
      rest: "show notes",
    });
    expect(parseCommand("/updateApp build today screen")).toEqual({
      command: "updateApp",
      rest: "build today screen",
    });
    expect(parseCommand("/app offline indicator")).toEqual({
      command: "updateApp",
      rest: "offline indicator",
    });
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

describe("isUpdateCaption", () => {
  it("is true only for update commands", () => {
    expect(isUpdateCaption(undefined)).toBe(false);
    expect(isUpdateCaption("")).toBe(false);
    expect(isUpdateCaption("/update from this photo")).toBe(true);
    expect(isUpdateCaption("/updateDemo from this photo")).toBe(true);
    expect(isUpdateCaption("/updateApp from this photo")).toBe(true);
    expect(isUpdateCaption("just a caption")).toBe(false);
  });
});
