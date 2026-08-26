/**
 * WhatsApp channel types.
 *
 * Inbound WhatsApp content is untrusted. It is stored and forwarded; it is
 * never treated as a domain fact, a contractual date, or a rand amount.
 */

export type ChannelLocale = "en" | "af";

export type InboxKind = "note" | "document" | "update";

export interface InboxMedia {
  filename: string;
  mimeType: string;
  /** Absolute path on the bridge host. Gitignored. Never commit this file. */
  path: string;
  sizeBytes: number;
}

export interface InboxCursorRef {
  agentId: string;
  url: string;
  runId?: string;
}

export interface InboxItem {
  id: string;
  kind: InboxKind;
  from: string;
  body: string;
  createdAt: string;
  profileName?: string;
  media?: InboxMedia;
  cursor?: InboxCursorRef;
}

export interface ParsedMedia {
  id: string;
  mimeType: string;
  filename?: string;
  caption?: string;
}

export interface ParsedInbound {
  wamid: string;
  from: string;
  timestamp: string;
  profileName?: string;
  text?: string;
  media?: ParsedMedia;
  /** JID or phone to reply to. Group messages reply in the group. */
  replyTo?: string;
  /** True when the message came from the named SiteOS Cursor group. */
  fromChannel?: boolean;
}

export type WhatsappMode = "web" | "cloud";

export interface ChannelStatus {
  mode: WhatsappMode;
  connected: boolean;
  qrAvailable: boolean;
  self?: string;
  groupJid?: string;
}

export interface DownloadedMedia {
  bytes: Uint8Array;
  filename: string;
  mimeType: string;
}

export interface WhatsappClient {
  sendText(to: string, text: string): Promise<{ id: string }>;
  downloadMedia(media: ParsedMedia): Promise<DownloadedMedia>;
  status(): ChannelStatus;
  pairingQrPng(): Buffer | undefined;
}

export type ChannelCommand =
  | { command: "help"; rest: string }
  | { command: "status"; rest: string }
  | { command: "note"; rest: string }
  | { command: "update"; rest: string }
  | { command: "plain"; rest: string };

export interface ChannelConfig {
  whatsappMode: WhatsappMode;
  whatsappToken: string;
  whatsappPhoneNumberId: string;
  whatsappAppSecret: string;
  whatsappVerifyToken: string;
  whatsappDisplayNumber: string;
  whatsappAuthDir: string;
  whatsappGroupSubject: string;
  whatsappGroupJid: string;
  allowedSenders: readonly string[];
  allowAllSenders: boolean;
  skipSignature: boolean;
  cursorApiKey: string;
  cursorRepoUrl: string;
  cursorStartingRef: string;
  cursorAutoCreatePr: boolean;
  publicBaseUrl: string;
  mcpAuthToken: string;
  locale: ChannelLocale;
  graphApiBase: string;
  cursorApiBase: string;
  inboxDir: string;
  listenPort: number;
}

export interface CursorImage {
  data: string;
  mimeType: string;
}

export interface CursorLaunchRequest {
  promptText: string;
  images: readonly CursorImage[];
  name: string;
  mcpUrl?: string;
  mcpAuthToken?: string;
}

export interface CursorLaunchResult {
  agentId: string;
  runId?: string;
  url: string;
}

export interface CursorAgentStatus {
  agentId: string;
  url: string;
  latestRunId?: string;
  runStatus?: string;
  result?: string;
  prUrl?: string;
  branch?: string;
}
