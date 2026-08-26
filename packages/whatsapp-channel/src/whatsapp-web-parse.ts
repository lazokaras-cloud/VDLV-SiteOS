import { normalizePhone } from "./phone.js";
import type { ParsedInbound, ParsedMedia } from "./types.js";

/**
 * Narrow WhatsApp Web message shape. Kept free of Baileys types so the
 * routing rules can be tested without opening a socket.
 */
export interface WebMessage {
  id: string;
  remoteJid: string;
  participant?: string;
  fromMe: boolean;
  timestamp: number;
  pushName?: string;
  text?: string;
  media?: ParsedMedia;
}

export function jidToPhone(jid: string): string {
  const user = jid.split("@")[0] ?? "";
  const beforeDevice = user.split(":")[0] ?? "";
  return normalizePhone(beforeDevice);
}

export function isGroupJid(jid: string): boolean {
  return jid.endsWith("@g.us");
}

export function isChannelGroup(
  remoteJid: string,
  groupSubject: string | undefined,
  groupJid: string,
  expectedSubject: string,
): boolean {
  if (groupJid.length > 0 && remoteJid === groupJid) return true;
  if (!isGroupJid(remoteJid)) return false;
  if (groupSubject === undefined) return false;
  return groupSubject.trim() === expectedSubject.trim();
}

export function toWhatsappJid(to: string): string {
  if (to.includes("@")) return to;
  return `${normalizePhone(to)}@s.whatsapp.net`;
}

/**
 * Whether an inbound WhatsApp Web message should be handled.
 *
 * Messages sent by this linked device (`fromMe` with no `participant`) are our
 * own replies. Processing them stores a note and sends another reply — a loop
 * that spams the group. The user's phone in the same group sets `participant`.
 */
export function shouldProcessWebMessage(message: WebMessage): boolean {
  if (message.fromMe && message.participant === undefined) return false;
  return true;
}

export function parseWebMessage(
  message: WebMessage,
  groupSubject: string | undefined,
  config: { whatsappGroupJid: string; whatsappGroupSubject: string },
): ParsedInbound | undefined {
  if (message.remoteJid === "status@broadcast") return undefined;
  if (message.remoteJid.endsWith("@broadcast")) return undefined;
  if (message.id.length === 0) return undefined;

  const group = isGroupJid(message.remoteJid);
  const senderJid = group ? (message.participant ?? message.remoteJid) : message.remoteJid;
  const from = jidToPhone(senderJid);
  const fromChannel = isChannelGroup(
    message.remoteJid,
    groupSubject,
    config.whatsappGroupJid,
    config.whatsappGroupSubject,
  );

  const parsed: ParsedInbound = {
    wamid: message.id,
    from: from.length > 0 ? from : senderJid,
    timestamp: String(message.timestamp),
    replyTo: group ? message.remoteJid : from.length > 0 ? from : senderJid,
  };
  if (message.pushName !== undefined) parsed.profileName = message.pushName;
  if (message.text !== undefined) parsed.text = message.text;
  if (message.media !== undefined) parsed.media = message.media;
  if (fromChannel) parsed.fromChannel = true;
  return parsed;
}
