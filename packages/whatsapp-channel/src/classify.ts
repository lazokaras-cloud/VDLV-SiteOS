import type { ChannelCommand } from "./types.js";

const COMMANDS = new Set(["help", "status", "note", "update"]);

const UPDATE_ALIASES = new Set(["update", "cursor", "agent", "fix"]);

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
  if (COMMANDS.has(word)) {
    if (word === "help") return { command: "help", rest };
    if (word === "status") return { command: "status", rest };
    if (word === "note") return { command: "note", rest };
    return { command: "update", rest };
  }

  return { command: "plain", rest: trimmed };
}

export function isUpdateCaption(caption: string | undefined): boolean {
  if (caption === undefined || caption.trim().length === 0) return false;
  const parsed = parseCommand(caption);
  return parsed.command === "update";
}
