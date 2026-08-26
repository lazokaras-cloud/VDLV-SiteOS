import type { ChannelCommand } from "./types.js";

const COMMANDS = new Set(["help", "status", "note", "update", "updatedemo", "updateapp"]);

const UPDATE_ALIASES = new Set(["update", "cursor", "agent", "fix"]);
const UPDATE_DEMO_ALIASES = new Set(["updatedemo", "demo"]);
const UPDATE_APP_ALIASES = new Set(["updateapp", "app"]);

/**
 * Parse a WhatsApp body into an explicit channel command.
 *
 * Routing is deterministic. A language model does not decide whether to store
 * a note or launch a Cursor agent.
 */
export function parseCommand(text: string): ChannelCommand {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { command: "plain", rest: "" };
  }

  const stripped = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  const match = /^([A-Za-z]+)(?:\s+([\s\S]*))?$/.exec(stripped);
  if (match === null) {
    return { command: "plain", rest: trimmed };
  }

  const raw = match[1];
  if (raw === undefined) {
    return { command: "plain", rest: trimmed };
  }
  const word = raw.toLowerCase();
  const rest = (match[2] ?? "").trim();

  if (word === "h") {
    return { command: "help", rest };
  }
  if (UPDATE_ALIASES.has(word) && word !== "update") {
    return { command: "update", rest };
  }
  if (UPDATE_DEMO_ALIASES.has(word)) {
    return { command: "updateDemo", rest };
  }
  if (UPDATE_APP_ALIASES.has(word)) {
    return { command: "updateApp", rest };
  }
  if (COMMANDS.has(word)) {
    if (word === "help") return { command: "help", rest };
    if (word === "status") return { command: "status", rest };
    if (word === "note") return { command: "note", rest };
    if (word === "updatedemo") return { command: "updateDemo", rest };
    if (word === "updateapp") return { command: "updateApp", rest };
    return { command: "update", rest };
  }

  return { command: "plain", rest: trimmed };
}

export function isUpdateCaption(caption: string | undefined): boolean {
  if (caption === undefined || caption.trim().length === 0) return false;
  const parsed = parseCommand(caption);
  return (
    parsed.command === "update" ||
    parsed.command === "updateDemo" ||
    parsed.command === "updateApp"
  );
}
