import type { ChannelLocale } from "./types.js";

interface HelpVars {
  joinLink?: string;
}

/** Full command list for /help: one line per command so WhatsApp shows every entry. */
function helpLines(locale: ChannelLocale): readonly string[] {
  if (locale === "af") {
    return [
      "SiteOS channel: dit werk so:",
      "/note ...: stoor vir SiteOS-Agent",
      "/updateDemo ...: demo in src/ (commit main, Vercel deploy)",
      "/updateApp ...: regte app (PR)",
      "/update ...: dieselfde as /updateApp",
      "Doc of foto: knowledge base vir SiteOS-Agent",
      "/status: laaste agent run",
      "/help: hierdie lys",
    ];
  }
  return [
    "SiteOS channel: commands that actually ship:",
      "/note ...: stash for SiteOS-Agent",
      "/updateDemo ...: demo in src/ (commit to main, Vercel picks it up)",
      "/updateApp ...: real app change (opens a PR)",
      "/update ...: same as /updateApp",
      "Doc or photo: knowledge base for SiteOS-Agent",
    "/status: last SiteOS-Agent run",
    "/help: this list",
  ];
}

export function helpText(locale: ChannelLocale, vars: HelpVars): string {
  const lines = [...helpLines(locale)];
  const link = vars.joinLink;
  if (link !== undefined) {
    lines.push(
      locale === "af"
        ? `Join link: ${link}`
        : `Channel link: ${link}`,
    );
  }
  return lines.join("\n");
}

export function noteStored(locale: ChannelLocale): string {
  return locale === "af"
    ? "Genoteer. In die inbox: SiteOS-Agent sien dit daar."
    : "Noted. In the inbox: SiteOS-Agent can read it from there.";
}

export function knowledgeStored(locale: ChannelLocale): string {
  return locale === "af"
    ? "In die knowledge base. SiteOS-Agent kan dit lees en vir die stelsel interpreteer."
    : "In the knowledge base. SiteOS-Agent will read and interpret this for the system.";
}

/** @deprecated Legacy reply: use knowledgeStored */
export function documentStored(locale: ChannelLocale): string {
  return knowledgeStored(locale);
}

export function updateQueued(locale: ChannelLocale): string {
  return locale === "af"
    ? "In die inbox. Geen agent key nog: SiteOS-Agent moet dit van die MCP af vat."
    : "Queued in the inbox. No agent key yet: SiteOS-Agent picks this up from MCP when wired.";
}

export function updateNeedBody(locale: ChannelLocale): string {
  return locale === "af"
    ? "Sê wat moet ship. Voorbeeld: /update sit offline badge op Today."
    : "Say what should ship. Example: /update add offline badge on Today.";
}

export function updateLaunched(locale: ChannelLocale, url: string): string {
  return locale === "af"
    ? `SiteOS-Agent is aan. Run: ${url}`
    : `SiteOS-Agent is running. Track it: ${url}`;
}

export function updateFailed(locale: ChannelLocale): string {
  return locale === "af"
    ? "Kon SiteOS-Agent nie start nie. Request is in die inbox: ons vat dit van daar."
    : "Couldn't start SiteOS-Agent. Request is in the inbox: we'll pick it up from there.";
}

export function emptyMessage(locale: ChannelLocale): string {
  return locale === "af"
    ? "Lede message. /help vir commands."
    : "Empty message. /help for the command list.";
}

export function noStatus(locale: ChannelLocale): string {
  return locale === "af"
    ? "Nog geen SiteOS-Agent run van hierdie channel af."
    : "No SiteOS-Agent runs from this channel yet.";
}

export function statusLine(
  locale: ChannelLocale,
  input: { url: string; runStatus?: string; prUrl?: string },
): string {
  const status = input.runStatus ?? "unknown";
  const pr =
    input.prUrl === undefined
      ? ""
      : locale === "af"
        ? ` PR: ${input.prUrl}`
        : ` PR: ${input.prUrl}`;
  return locale === "af"
    ? `Laaste run: ${status}. ${input.url}${pr}`
    : `Last run: ${status}. ${input.url}${pr}`;
}
