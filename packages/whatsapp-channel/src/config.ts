import type { ChannelConfig, ChannelLocale, WhatsappMode } from "./types.js";

const DEFAULT_GRAPH = "https://graph.facebook.com/v21.0";
const DEFAULT_CURSOR = "https://api.cursor.com";
const DEFAULT_REPO = "https://github.com/tobievii/constrAI";

function csv(value: string | undefined): string[] {
  if (value === undefined || value.trim().length === 0) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function locale(value: string | undefined): ChannelLocale {
  return value === "af" ? "af" : "en";
}

function port(value: string | undefined): number {
  if (value === undefined || value.length === 0) return 8787;
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new TypeError(`WHATSAPP_PORT must be an integer 1-65535, got ${value}`);
  }
  return n;
}

function flag(value: string | undefined): boolean {
  if (value === undefined) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function mode(env: NodeJS.Dict<string>): WhatsappMode {
  if (env.WHATSAPP_MODE === "cloud") return "cloud";
  if (env.WHATSAPP_MODE === "web") return "web";
  if ((env.WHATSAPP_TOKEN ?? "").length > 0) return "cloud";
  return "web";
}

/**
 * Read channel configuration from the process environment.
 * Missing secrets are empty strings so status tools can report them;
 * send/launch paths refuse to run until they are set.
 */
export function loadConfig(env: NodeJS.Dict<string>): ChannelConfig {
  return {
    whatsappMode: mode(env),
    whatsappToken: env.WHATSAPP_TOKEN ?? "",
    whatsappPhoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    whatsappAppSecret: env.WHATSAPP_APP_SECRET ?? "",
    whatsappVerifyToken: env.WHATSAPP_VERIFY_TOKEN ?? "",
    whatsappDisplayNumber: env.WHATSAPP_DISPLAY_NUMBER ?? "",
    whatsappAuthDir: env.WHATSAPP_AUTH_DIR ?? "inbox/whatsapp-auth",
    whatsappGroupSubject: env.WHATSAPP_GROUP_SUBJECT ?? "SiteOS Cursor",
    whatsappGroupJid: env.WHATSAPP_GROUP_JID ?? "",
    allowedSenders: csv(env.WHATSAPP_ALLOWED_SENDERS),
    allowAllSenders: flag(env.WHATSAPP_ALLOW_ALL_SENDERS),
    skipSignature: flag(env.WHATSAPP_SKIP_SIGNATURE),
    cursorApiKey: env.CURSOR_API_KEY ?? "",
    cursorRepoUrl: env.CURSOR_REPO_URL ?? DEFAULT_REPO,
    cursorStartingRef: env.CURSOR_STARTING_REF ?? "main",
    cursorAutoCreatePr: env.CURSOR_AUTO_CREATE_PR === "false" ? false : true,
    publicBaseUrl: (env.WHATSAPP_PUBLIC_URL ?? "").replace(/\/$/, ""),
    mcpAuthToken: env.WHATSAPP_MCP_TOKEN ?? "",
    locale: locale(env.WHATSAPP_LOCALE),
    graphApiBase: env.WHATSAPP_GRAPH_API_BASE ?? DEFAULT_GRAPH,
    cursorApiBase: env.CURSOR_API_BASE ?? DEFAULT_CURSOR,
    inboxDir: env.WHATSAPP_INBOX_DIR ?? "inbox/whatsapp",
    listenPort: port(env.WHATSAPP_PORT),
  };
}

export function configIssues(config: ChannelConfig): string[] {
  const issues: string[] = [];
  if (config.whatsappMode === "cloud") {
    if (config.whatsappToken.length === 0) issues.push("WHATSAPP_TOKEN is not set");
    if (config.whatsappPhoneNumberId.length === 0) {
      issues.push("WHATSAPP_PHONE_NUMBER_ID is not set");
    }
    if (config.whatsappAppSecret.length === 0) {
      issues.push("WHATSAPP_APP_SECRET is not set");
    }
    if (config.whatsappVerifyToken.length === 0) {
      issues.push("WHATSAPP_VERIFY_TOKEN is not set");
    }
    if (!config.allowAllSenders && config.allowedSenders.length === 0) {
      issues.push("WHATSAPP_ALLOWED_SENDERS is empty (nobody can write to the channel)");
    }
  }
  if (config.cursorApiKey.length === 0) {
    issues.push("CURSOR_API_KEY is not set (updates are queued, not launched)");
  }
  if (config.mcpAuthToken.length === 0) {
    issues.push("WHATSAPP_MCP_TOKEN is not set (HTTP MCP is closed)");
  }
  return issues;
}
