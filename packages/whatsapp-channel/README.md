# WhatsApp channel for SiteOS / Cursor

Link **your** WhatsApp (same as WhatsApp Web) and a group named
`SiteOS Cursor`. People in that group send notes, documents, or `/update`
requests. The bridge stores them and, when `CURSOR_API_KEY` is set, launches a
[Cursor cloud agent](https://cursor.com/docs/cloud-agent/api/endpoints.md)
against `github.com/tobievii/constrAI`.

```
Your phone  (WhatsApp group “SiteOS Cursor”)
    │  notes, PDFs, photos, /update …
    ▼
pnpm whatsapp:serve   localhost:8787/pair
    ├─ inbox/whatsapp/     gitignored captured files
    └─ Cursor Cloud Agents API
           └─ PR on this repo
```

## Local: connect your WhatsApp (default)

No Meta Business account. The server talks to WhatsApp the same way WhatsApp
Web does: you scan a QR once, session stays in `inbox/whatsapp-auth/` (gitignored).

```bash
cp .env.example .env
# paste CURSOR_API_KEY from https://cursor.com/dashboard/api
pnpm install
pnpm whatsapp:serve
```

Open http://localhost:8787/pair

1. Phone: **WhatsApp → Linked devices → Link a device** → scan the QR.
2. Create a group named **SiteOS Cursor**. Add whoever should talk to Cursor.
3. In that group send `/help`.
4. `/update add an offline indicator to the site shell` starts a Cursor agent
   on this repo (needs `CURSOR_API_KEY`).

`/cursor`, `/agent` and `/fix` are aliases of `/update`. Plain text is stored
as a note. Documents and photos land in `inbox/whatsapp/` and are not committed.

Keep `pnpm whatsapp:serve` running while you use the channel. Scanning on a
throwaway cloud VM will die with that VM — run this on your laptop for a
lasting link.

This uses WhatsApp’s multi-device protocol (unofficial client). If you would
rather not link your personal account, use Cloud API mode below.

## Cursor Desktop MCP

`.cursor/mcp.json` starts the stdio server. After `.env` is filled, reload MCP.

- `whatsapp_channel_status` — connected?, QR?, inbox size
- `whatsapp_send_text`
- `whatsapp_list_inbox` / `whatsapp_get_inbox_item`
- `cursor_launch_from_inbox` — turn an inbox item into a cloud agent
- `cursor_agent_status` / `cursor_followup`

## Optional: Meta Cloud API

Set `WHATSAPP_MODE=cloud` and the Meta tokens (`WHATSAPP_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`).
Webhook: `POST /webhook/whatsapp`. Allowlist with `WHATSAPP_ALLOWED_SENDERS`.

## Security

- Inbound WhatsApp is untrusted. Agent prompts say so.
- Captured files stay in `inbox/` and are gitignored.
- Cloud mode: empty allowlist means nobody can write.
- Web mode: the named group is the channel; DMs still need the allowlist.
