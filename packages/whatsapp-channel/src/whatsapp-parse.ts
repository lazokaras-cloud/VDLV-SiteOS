import type { ParsedInbound, ParsedMedia } from "./types.js";

interface UnknownRecord {
  [key: string]: unknown;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseMedia(
  type: string,
  message: UnknownRecord,
): ParsedMedia | undefined {
  const blob = message[type];
  if (!isRecord(blob)) return undefined;
  const id = asString(blob.id);
  if (id === undefined) return undefined;
  const media: ParsedMedia = {
    id,
    mimeType: asString(blob.mime_type) ?? "application/octet-stream",
  };
  const filename = asString(blob.filename);
  if (filename !== undefined) media.filename = filename;
  const caption = asString(blob.caption);
  if (caption !== undefined) media.caption = caption;
  return media;
}

function parseMessage(
  message: UnknownRecord,
  profileName: string | undefined,
): ParsedInbound | undefined {
  const wamid = asString(message.id);
  const from = asString(message.from);
  const timestamp = asString(message.timestamp);
  if (wamid === undefined || from === undefined || timestamp === undefined) {
    return undefined;
  }

  const type = asString(message.type) ?? "unknown";
  const parsed: ParsedInbound = { wamid, from, timestamp };
  if (profileName !== undefined) parsed.profileName = profileName;

  if (type === "text" && isRecord(message.text)) {
    const body = asString(message.text.body);
    if (body !== undefined) parsed.text = body;
    return parsed;
  }

  if (
    type === "image" ||
    type === "document" ||
    type === "audio" ||
    type === "video" ||
    type === "sticker"
  ) {
    const media = parseMedia(type, message);
    if (media !== undefined) parsed.media = media;
    const caption = media?.caption;
    if (caption !== undefined) parsed.text = caption;
    return parsed;
  }

  if (type === "button" && isRecord(message.button)) {
    const text = asString(message.button.text);
    if (text !== undefined) parsed.text = text;
    return parsed;
  }

  if (
    type === "interactive" &&
    isRecord(message.interactive) &&
    isRecord(message.interactive.button_reply)
  ) {
    const text = asString(message.interactive.button_reply.title);
    if (text !== undefined) parsed.text = text;
    return parsed;
  }

  return parsed;
}

/**
 * Extract inbound user messages from a WhatsApp Cloud API webhook body.
 * Status callbacks (delivered, read) are ignored.
 */
export function parseWhatsappWebhook(body: unknown): ParsedInbound[] {
  if (!isRecord(body)) return [];
  const entry = body.entry;
  if (!Array.isArray(entry)) return [];

  const out: ParsedInbound[] = [];
  for (const item of entry) {
    if (!isRecord(item) || !Array.isArray(item.changes)) continue;
    for (const change of item.changes) {
      if (!isRecord(change) || !isRecord(change.value)) continue;
      const value = change.value;
      const messages = value.messages;
      if (!Array.isArray(messages)) continue;

      let profileName: string | undefined;
      if (Array.isArray(value.contacts)) {
        const first = value.contacts[0];
        if (isRecord(first) && isRecord(first.profile)) {
          profileName = asString(first.profile.name);
        }
      }

      for (const message of messages) {
        if (!isRecord(message)) continue;
        const parsed = parseMessage(message, profileName);
        if (parsed !== undefined) out.push(parsed);
      }
    }
  }
  return out;
}

export function unixToIso(timestamp: string): string {
  const n = Number(timestamp);
  if (!Number.isFinite(n) || n < 0) {
    throw new TypeError(`Not a Unix timestamp: ${timestamp}`);
  }
  return new Date(n * 1000).toISOString();
}

export function defaultMediaFilename(media: ParsedMedia): string {
  if (media.filename !== undefined && media.filename.length > 0) {
    return media.filename;
  }
  if (media.mimeType.startsWith("image/")) return "image.jpg";
  if (media.mimeType === "application/pdf") return "document.pdf";
  if (media.mimeType.startsWith("audio/")) return "audio.bin";
  if (media.mimeType.startsWith("video/")) return "video.bin";
  return "attachment.bin";
}
