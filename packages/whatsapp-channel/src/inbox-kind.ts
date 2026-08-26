import type { ChannelCommand, InboxKind } from "./types.js";

export function isLaunchCommand(command: ChannelCommand["command"]): boolean {
  return (
    command === "update" ||
    command === "updateDemo" ||
    command === "updateApp"
  );
}

/**
 * Standalone documents and images are knowledge-base captures for agents to
 * interpret — not casual notes. /update on a caption still launches work.
 */
export function resolveInboxKind(command: ChannelCommand, hasMedia: boolean): InboxKind {
  if (isLaunchCommand(command.command)) {
    if (command.command === "updateDemo") return "updateDemo";
    if (command.command === "updateApp") return "updateApp";
    return "update";
  }
  if (hasMedia) {
    if (command.command === "note") return "note";
    return "knowledge";
  }
  return "note";
}

export function isKnowledgeKind(kind: InboxKind): boolean {
  return kind === "knowledge" || kind === "document";
}
