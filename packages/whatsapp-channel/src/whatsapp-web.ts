import makeWASocket, {
  Browsers,
  DisconnectReason,
  downloadMediaMessage,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import pino from "pino";
import QRCode from "qrcode";

import { defaultMediaFilename } from "./whatsapp-parse.js";
import {
  parseWebMessage,
  shouldProcessWebMessage,
  toWhatsappJid,
  type WebMessage,
} from "./whatsapp-web-parse.js";
import type {
  ChannelConfig,
  ChannelStatus,
  DownloadedMedia,
  ParsedInbound,
  ParsedMedia,
  WhatsappClient,
} from "./types.js";

type Socket = ReturnType<typeof makeWASocket>;

export class WhatsappWebClient implements WhatsappClient {
  private sock: Socket | undefined;
  private qrPng: Buffer | undefined;
  private connected = false;
  private self: string | undefined;
  private groupJid: string | undefined;
  private mediaMessages = new Map<string, unknown>();
  private groupSubjects = new Map<string, string>();
  private onInbound: ((msg: ParsedInbound) => Promise<void>) | undefined;
  private closed = false;
  /** Outbound message ids — never treat our own sends as inbound notes. */
  private readonly outboundIds = new Set<string>();
  private readonly handling = new Set<string>();

  constructor(private readonly config: ChannelConfig) {}

  status(): ChannelStatus {
    const status: ChannelStatus = {
      mode: "web",
      connected: this.connected,
      qrAvailable: this.qrPng !== undefined && !this.connected,
    };
    if (this.self !== undefined) status.self = this.self;
    if (this.groupJid !== undefined) status.groupJid = this.groupJid;
    return status;
  }

  pairingQrPng(): Buffer | undefined {
    return this.qrPng;
  }

  async start(onInbound: (msg: ParsedInbound) => Promise<void>): Promise<void> {
    this.onInbound = onInbound;
    await this.connect();
  }

  stop(): void {
    this.closed = true;
    this.sock?.end(undefined);
  }

  async sendText(to: string, text: string): Promise<{ id: string }> {
    const sock = this.sock;
    if (sock === undefined || !this.connected) {
      throw new Error("WhatsApp Web is not connected. Open /pair and scan the QR.");
    }
    const sent = await sock.sendMessage(toWhatsappJid(to), { text });
    const id = sent?.key.id ?? "sent";
    if (typeof id === "string" && id.length > 0) {
      this.outboundIds.add(id);
      this.trimOutboundIds();
    }
    return { id };
  }

  private trimOutboundIds(): void {
    if (this.outboundIds.size <= 500) return;
    const drop = this.outboundIds.size - 500;
    for (const id of this.outboundIds) {
      this.outboundIds.delete(id);
      if (--drop <= 0) break;
    }
  }

  async downloadMedia(media: ParsedMedia): Promise<DownloadedMedia> {
    const raw = this.mediaMessages.get(media.id);
    if (raw === undefined) {
      throw new Error("WhatsApp media is no longer in memory");
    }
    const buffer = (await downloadMediaMessage(
      raw as never,
      "buffer",
      {},
    )) as Buffer;
    return {
      bytes: new Uint8Array(buffer),
      filename: defaultMediaFilename(media),
      mimeType: media.mimeType,
    };
  }

  private async connect(): Promise<void> {
    if (this.closed) return;
    this.sock?.end(undefined);
    this.sock = undefined;
    const { state, saveCreds } = await useMultiFileAuthState(this.config.whatsappAuthDir);
    const sock = makeWASocket({
      auth: state,
      browser: Browsers.macOS("Chrome"),
      logger: pino({ level: "silent" }),
    });
    this.sock = sock;
    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("connection.update", (update) => {
      void this.onConnection(update);
    });
    sock.ev.on("messages.upsert", (upsert) => {
      void this.onMessages(upsert);
    });
  }

  private async onConnection(update: {
    connection?: string;
    lastDisconnect?: { error?: unknown };
    qr?: string;
  }): Promise<void> {
    if (update.qr !== undefined) {
      this.qrPng = await QRCode.toBuffer(update.qr, { type: "png", width: 480, margin: 2 });
      this.connected = false;
      console.log("WhatsApp: scan the QR at http://localhost:" + String(this.config.listenPort) + "/pair");
    }
    if (update.connection === "open") {
      this.connected = true;
      this.qrPng = undefined;
      const user = this.sock?.user;
      if (user?.id !== undefined) this.self = user.id;
      await this.resolveGroup();
      console.log("WhatsApp: connected.");
      if (this.groupJid !== undefined) {
        console.log(`WhatsApp: channel group ${this.config.whatsappGroupSubject} (${this.groupJid})`);
      } else {
        console.log(
          `WhatsApp: create a group named "${this.config.whatsappGroupSubject}" and send /help in it.`,
        );
      }
    }
    if (update.connection === "close") {
      this.connected = false;
      const status = disconnectStatus(update.lastDisconnect?.error);
      if (this.closed) return;
      if (status === DisconnectReason.loggedOut) {
        console.log("WhatsApp: logged out. Delete inbox/whatsapp-auth and scan again.");
        return;
      }
      await this.connect();
    }
  }

  private async resolveGroup(): Promise<void> {
    if (this.config.whatsappGroupJid.length > 0) {
      this.groupJid = this.config.whatsappGroupJid;
      return;
    }
    const sock = this.sock;
    if (sock === undefined) return;
    const groups = await sock.groupFetchAllParticipating();
    for (const [jid, meta] of Object.entries(groups)) {
      const subject = (meta as { subject?: string }).subject;
      if (typeof subject === "string") this.groupSubjects.set(jid, subject);
      if (subject === this.config.whatsappGroupSubject) this.groupJid = jid;
    }
  }

  private async onMessages(upsert: { type: string; messages: unknown[] }): Promise<void> {
    // "append" replays history on reconnect; handling it re-stores notes and spams replies.
    if (upsert.type !== "notify") return;
    for (const raw of upsert.messages) {
      const web = toWebMessage(raw);
      if (web === undefined) continue;
      if (this.outboundIds.has(web.id) || !shouldProcessWebMessage(web)) continue;
      if (this.handling.has(web.id)) continue;
      this.handling.add(web.id);
      if (web.media !== undefined) this.mediaMessages.set(web.id, raw);
      let subject = this.groupSubjects.get(web.remoteJid);
      if (subject === undefined && web.remoteJid.endsWith("@g.us") && this.sock !== undefined) {
        try {
          const meta = await this.sock.groupMetadata(web.remoteJid);
          subject = meta.subject;
          this.groupSubjects.set(web.remoteJid, subject);
          if (subject === this.config.whatsappGroupSubject) this.groupJid = web.remoteJid;
        } catch {
          subject = undefined;
        }
      }
      const parsed = parseWebMessage(web, subject, this.config);
      if (parsed === undefined) {
        this.handling.delete(web.id);
        continue;
      }
      if (this.onInbound !== undefined) {
        try {
          await this.onInbound(parsed);
        } catch (error) {
          console.error("inbound failed", error instanceof Error ? error.message : "unknown");
        } finally {
          this.handling.delete(web.id);
        }
      } else {
        this.handling.delete(web.id);
      }
    }
  }
}

function disconnectStatus(error: unknown): number | undefined {
  const record = error as { output?: { statusCode?: number } } | undefined;
  return record?.output?.statusCode;
}

function toWebMessage(raw: unknown): WebMessage | undefined {
  const msg = asRecord(raw);
  const key = asRecord(msg?.key);
  if (key === undefined) return undefined;
  const id = asString(key.id);
  const remoteJid = asString(key.remoteJid);
  if (id === undefined || remoteJid === undefined) return undefined;
  const inner = asRecord(msg?.message);
  if (inner === undefined) return undefined;

  const timestamp = unix(msg?.messageTimestamp);
  const web: WebMessage = {
    id,
    remoteJid,
    fromMe: key.fromMe === true,
    timestamp,
  };
  const participant = asString(key.participant);
  if (participant !== undefined) web.participant = participant;
  const pushName = asString(msg?.pushName);
  if (pushName !== undefined) web.pushName = pushName;
  const text = extractText(inner);
  if (text !== undefined) web.text = text;
  const media = extractMedia(id, inner);
  if (media !== undefined) web.media = media;
  return web;
}

function extractText(message: Record<string, unknown>): string | undefined {
  if (typeof message.conversation === "string") return message.conversation;
  const ext = asRecord(message.extendedTextMessage);
  if (typeof ext?.text === "string") return ext.text;
  const img = asRecord(message.imageMessage);
  if (typeof img?.caption === "string") return img.caption;
  const doc = asRecord(message.documentMessage);
  if (typeof doc?.caption === "string") return doc.caption;
  const vid = asRecord(message.videoMessage);
  if (typeof vid?.caption === "string") return vid.caption;
  return undefined;
}

function extractMedia(id: string, message: Record<string, unknown>): ParsedMedia | undefined {
  const image = asRecord(message.imageMessage);
  if (image !== undefined) {
    const media: ParsedMedia = {
      id,
      mimeType: asString(image.mimetype) ?? "image/jpeg",
    };
    const caption = asString(image.caption);
    if (caption !== undefined) media.caption = caption;
    return media;
  }
  const document = asRecord(message.documentMessage);
  if (document !== undefined) {
    const media: ParsedMedia = {
      id,
      mimeType: asString(document.mimetype) ?? "application/octet-stream",
    };
    const filename = asString(document.fileName);
    if (filename !== undefined) media.filename = filename;
    const caption = asString(document.caption);
    if (caption !== undefined) media.caption = caption;
    return media;
  }
  const video = asRecord(message.videoMessage);
  if (video !== undefined) {
    return { id, mimeType: asString(video.mimetype) ?? "video/mp4" };
  }
  const audio = asRecord(message.audioMessage);
  if (audio !== undefined) {
    return { id, mimeType: asString(audio.mimetype) ?? "audio/ogg" };
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function unix(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    const n = (value as { toNumber: () => number }).toNumber();
    if (Number.isFinite(n)) return n;
  }
  return 0;
}
