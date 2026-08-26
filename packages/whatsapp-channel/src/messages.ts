import type { ChannelLocale } from "./types.js";

interface HelpVars {
  joinLink?: string;
}

export function helpText(locale: ChannelLocale, vars: HelpVars): string {
  const link = vars.joinLink;
  if (locale === "af") {
    const join =
      link === undefined ? "" : ` Deel hierdie link met die channel: ${link}`;
    return (
      "SiteOS WhatsApp channel.\n" +
      "/note … — stoor 'n note vir Cursor\n" +
      "/updateDemo … — verander die demo in src/ (commit na main, Vercel deploy)\n" +
      "/updateApp … — vra Cursor om die regte app te verander (maak 'n PR)\n" +
      "/update … — vra Cursor om die app te verander (maak 'n PR)\n" +
      "Stuur 'n document of foto — dit word in die inbox gestoor\n" +
      "/status — laaste Cursor run\n" +
      "/help — hierdie lys." +
      join
    );
  }
  const join = link === undefined ? "" : ` Share this link to join the channel: ${link}`;
  return (
    "SiteOS WhatsApp channel.\n" +
    "/note … — store a note for Cursor\n" +
    "/updateDemo … — change the demo in src/ (commit to main, Vercel deploys)\n" +
    "/updateApp … — ask Cursor to change the real app (opens a PR)\n" +
    "/update … — ask Cursor to change the app (opens a PR)\n" +
    "Send a document or photo — stored in the inbox\n" +
    "/status — last Cursor run\n" +
    "/help — this list." +
    join
  );
}

export function noteStored(locale: ChannelLocale): string {
  return locale === "af"
    ? "Note is gestoor. Cursor kan dit in die inbox sien."
    : "Note stored. Cursor can see it in the inbox.";
}

export function documentStored(locale: ChannelLocale): string {
  return locale === "af"
    ? "Document is ontvang en gestoor."
    : "Document received and stored.";
}

export function updateQueued(locale: ChannelLocale): string {
  return locale === "af"
    ? "Update is in die inbox. CURSOR_API_KEY is nog nie geset nie, so Cursor moet dit van die MCP af oopmaak."
    : "Update queued in the inbox. CURSOR_API_KEY is not set, so Cursor must pick it up from the MCP.";
}

export function updateNeedBody(locale: ChannelLocale): string {
  return locale === "af"
    ? "Sê wat Cursor moet doen. Voorbeeld: /update sit 'n language toggle op die Today screen."
    : "Say what Cursor should do. Example: /update add a language toggle on the Today screen.";
}

export function updateLaunched(locale: ChannelLocale, url: string): string {
  return locale === "af"
    ? `Cursor is besig. Maak die run hier oop: ${url}`
    : `Cursor is on it. Open the run: ${url}`;
}

export function updateFailed(locale: ChannelLocale): string {
  return locale === "af"
    ? "Cursor kon nie die run begin nie. Die request is in die inbox gestoor."
    : "Cursor could not start the run. The request is stored in the inbox.";
}

export function emptyMessage(locale: ChannelLocale): string {
  return locale === "af"
    ? "Niks in die message nie. Stuur /help."
    : "Nothing in that message. Send /help.";
}

export function noStatus(locale: ChannelLocale): string {
  return locale === "af"
    ? "Nog geen Cursor run van hierdie channel af nie."
    : "No Cursor run from this channel yet.";
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
