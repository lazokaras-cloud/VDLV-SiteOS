# WhatsApp channel for SiteOS / Cursor

A WhatsApp Business number that this repository can talk to. People in the
channel send notes, documents, or `/update` requests. The bridge stores them
and, when asked, launches a [Cursor cloud agent](https://cursor.com/docs/cloud-agent/api/endpoints.md)
against `github.com/tobievii/constrAI`.

WhatsApp **Channels** (the broadcast feature) are one-way. This is a two-way
**WhatsApp Cloud API** inbox: users message the business number, and that
number is the channel.

```
WhatsApp user
    │  notes, PDFs, photos, /update …
    ▼
packages/whatsapp-channel  (webhook + MCP)
    ├─ inbox/whatsapp/     gitignored captured files
    └─ Cursor Cloud Agents API
           └─ PR on this repo
```

Two processes:

| Command | What it is |
| --- | --- |
| `pnpm whatsapp:serve` | HTTP server. Meta posts inbound messages here. Also serves remote MCP at `/mcp`. |
| `pnpm whatsapp:mcp` | stdio MCP for Cursor Desktop on this repo. |

## 1. Meta WhatsApp Cloud API

1. Open [Meta for Developers](https://developers.facebook.com/apps/) and create an app.
2. Add the **WhatsApp** product. Use the test number, or attach a real business number.
3. Copy:
   - **Access token**
   - **Phone number ID**
   - **WhatsApp Business account ID** (not required by the bridge)
   - **App secret** (App settings → Basic)
4. Pick a verify token (any long random string you invent).
5. Copy `.env.example` to `.env` at the repo root and fill it in.
6. Put **your** mobile number in `WHATSAPP_ALLOWED_SENDERS` (E.164, comma-separated).
   Nobody else can write to the channel. Do not set `WHATSAPP_ALLOW_ALL_SENDERS`
   except on a throwaway test number.

## 2. Public webhook URL

Meta must be able to POST to the bridge.

```bash
pnpm whatsapp:serve
```

Expose it (cloudflared, ngrok, or a small VPS):

```bash
cloudflared tunnel --url http://localhost:8787
```

In the Meta app → WhatsApp → Configuration → Webhook:

- Callback URL: `https://<public-host>/webhook/whatsapp`
- Verify token: the same string as `WHATSAPP_VERIFY_TOKEN`
- Subscribe to the **messages** field

`GET /health` should return `{"ok":true}`.
`GET /join` returns the `wa.me` link once `WHATSAPP_DISPLAY_NUMBER` is set.

## 3. Cursor API key

1. Create a key at [Cursor Dashboard → API Keys](https://cursor.com/dashboard/api).
2. Set `CURSOR_API_KEY` in `.env`.
3. Leave `CURSOR_REPO_URL` as `https://github.com/tobievii/constrAI` unless this
   clone tracks another remote.

Without this key, `/update` still stores the request in the inbox; Cursor
Desktop can launch it through the MCP tool `cursor_launch_from_inbox`.

## 4. Cursor Desktop MCP

`.cursor/mcp.json` in this repo already points at the stdio server. Restart
Cursor (or reload MCP) after `.env` is filled. Tools:

- `whatsapp_channel_status` — config health, join link, inbox size
- `whatsapp_send_text` — reply on WhatsApp
- `whatsapp_list_inbox` / `whatsapp_get_inbox_item`
- `cursor_launch_from_inbox` — turn an inbox item into a cloud agent
- `cursor_agent_status` / `cursor_followup`

If `WHATSAPP_PUBLIC_URL` and `WHATSAPP_MCP_TOKEN` are set, launched cloud
agents also receive this MCP over HTTP so they can reply on WhatsApp themselves.

## 5. What users type

| Message | What happens |
| --- | --- |
| `/help` | Command list |
| `/note rain delay on grid 4` | Stored for Cursor. Not a claim, not a deadline. |
| a PDF or photo | Stored under `inbox/whatsapp/` (gitignored) |
| `/update add an offline indicator to the site shell` | Launches a Cursor agent on this repo |
| `/status` | Last launched run |

`/cursor`, `/agent` and `/fix` are aliases of `/update`.

Plain text without a slash is stored as a note. The bridge never computes a
working-day deadline or a rand amount from WhatsApp; it only forwards words
and files.

## 6. Share the channel

Send people `https://wa.me/<digits>` from `/join` or `whatsapp_channel_status`.
Only numbers on `WHATSAPP_ALLOWED_SENDERS` are accepted. Add a number, restart
the server.

## Security

- Inbound WhatsApp is untrusted. Agent prompts say so.
- Webhook bodies are checked with `X-Hub-Signature-256`.
- Captured files stay in `inbox/whatsapp/` and are gitignored. Do not commit them.
- Empty allowlist means nobody can write. That is intentional.
