import { defaultMediaFilename } from "./whatsapp-parse.js";
import { normalizePhone } from "./phone.js";
import type {
  ChannelConfig,
  ChannelStatus,
  DownloadedMedia,
  ParsedMedia,
  WhatsappClient,
} from "./types.js";

export interface GraphMediaMeta {
  url: string;
  mimeType: string;
  fileSize?: number;
}

export class WhatsappCloudClient implements WhatsappClient {
  constructor(
    private readonly config: ChannelConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  status(): ChannelStatus {
    return {
      mode: "cloud",
      connected: this.config.whatsappToken.length > 0,
      qrAvailable: false,
    };
  }

  pairingQrPng(): Buffer | undefined {
    return undefined;
  }

  async sendText(to: string, text: string): Promise<{ id: string }> {
    if (this.config.whatsappToken.length === 0) {
      throw new Error("WHATSAPP_TOKEN is not set");
    }
    if (this.config.whatsappPhoneNumberId.length === 0) {
      throw new Error("WHATSAPP_PHONE_NUMBER_ID is not set");
    }
    const url = `${this.config.graphApiBase}/${this.config.whatsappPhoneNumberId}/messages`;
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.whatsappToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizePhone(to),
        type: "text",
        text: { body: text, preview_url: false },
      }),
    });
    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw new Error(`WhatsApp send failed (${response.status})`);
    }
    const id = messageIdFromSend(payload);
    if (id === undefined) throw new Error("WhatsApp send returned no message id");
    return { id };
  }

  async downloadMedia(media: ParsedMedia): Promise<DownloadedMedia> {
    const meta = await this.mediaMeta(media.id);
    const response = await this.fetchImpl(meta.url, {
      headers: { Authorization: `Bearer ${this.config.whatsappToken}` },
    });
    if (!response.ok) {
      throw new Error(`WhatsApp media download failed (${response.status})`);
    }
    const buffer = new Uint8Array(await response.arrayBuffer());
    return {
      bytes: buffer,
      filename: defaultMediaFilename(media),
      mimeType: media.mimeType || meta.mimeType,
    };
  }

  private async mediaMeta(mediaId: string): Promise<GraphMediaMeta> {
    const url = `${this.config.graphApiBase}/${mediaId}`;
    const response = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${this.config.whatsappToken}` },
    });
    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw new Error(`WhatsApp media meta failed (${response.status})`);
    }
    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof (payload as { url?: unknown }).url !== "string"
    ) {
      throw new Error("WhatsApp media meta missing url");
    }
    const record = payload as { url: string; mime_type?: string; file_size?: number };
    const meta: GraphMediaMeta = {
      url: record.url,
      mimeType: record.mime_type ?? "application/octet-stream",
    };
    if (typeof record.file_size === "number") meta.fileSize = record.file_size;
    return meta;
  }
}

function messageIdFromSend(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const messages = (payload as { messages?: unknown }).messages;
  if (!Array.isArray(messages) || messages.length === 0) return undefined;
  const first = messages[0];
  if (typeof first !== "object" || first === null) return undefined;
  const id = (first as { id?: unknown }).id;
  return typeof id === "string" ? id : undefined;
}
