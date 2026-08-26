import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse, Server } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { StreamableHTTPServerTransportOptions } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { createWhatsappMcpServer } from "./mcp-server.js";
import { waMeLink } from "./phone.js";
import type { createRuntime } from "./runtime.js";
import { mcpAuthorized, verifyWhatsappSignature } from "./signature.js";
import type { ChannelConfig } from "./types.js";
import { handleInbound } from "./webhook.js";
import { parseWhatsappWebhook } from "./whatsapp-parse.js";

type Runtime = ReturnType<typeof createRuntime>;

function send(res: ServerResponse, status: number, body: string, contentType = "text/plain; charset=utf-8"): void {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

async function readRaw(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function pathOf(req: IncomingMessage): URL {
  return new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
}

function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0];
  return value;
}

function handleVerify(url: URL, cfg: ChannelConfig, res: ServerResponse): void {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === cfg.whatsappVerifyToken && challenge !== null) {
    send(res, 200, challenge);
    return;
  }
  send(res, 403, "forbidden");
}

export function createChannelHttpServer(runtime: Runtime): Server {
  const { config } = runtime;

  async function handleWhatsappPost(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const raw = await readRaw(req);
    const signature = header(req, "x-hub-signature-256");
    const ok =
      config.skipSignature ||
      verifyWhatsappSignature(raw.toString("utf8"), signature, config.whatsappAppSecret);
    if (!ok) {
      send(res, 401, "bad signature");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString("utf8"));
    } catch {
      send(res, 400, "invalid json");
      return;
    }

    const inbound = parseWhatsappWebhook(parsed);
    for (const message of inbound) {
      try {
        const result = await handleInbound(message, runtime);
        if (result.handled && result.reply !== undefined) {
          await runtime.whatsapp.sendText(message.replyTo ?? message.from, result.reply);
        }
      } catch (error) {
        console.error("inbound failed", error instanceof Error ? error.message : "unknown");
      }
    }

    send(res, 200, "ok");
  }

  async function handleMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (!mcpAuthorized(header(req, "authorization"), config.mcpAuthToken)) {
      send(res, 401, "unauthorized");
      return;
    }

    const server = createWhatsappMcpServer(runtime);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    } as unknown as StreamableHTTPServerTransportOptions);
    res.on("close", () => {
      void transport.close();
      void server.close();
    });

    if (req.method === "POST") {
      const raw = await readRaw(req);
      const parsedBody: unknown = raw.length === 0 ? {} : JSON.parse(raw.toString("utf8"));
      await server.connect(transport as never);
      await transport.handleRequest(req, res, parsedBody);
      return;
    }

    await server.connect(transport as never);
    await transport.handleRequest(req, res);
  }

  return createServer((req, res) => {
    void (async () => {
      const url = pathOf(req);
      if (req.method === "GET" && url.pathname === "/health") {
        const status = runtime.whatsapp.status();
        send(
          res,
          200,
          JSON.stringify({ ok: true, pair: "/pair", ...status }),
          "application/json",
        );
        return;
      }
      if (req.method === "GET" && url.pathname === "/pair") {
        send(res, 200, pairPage(runtime), "text/html; charset=utf-8");
        return;
      }
      if (req.method === "GET" && url.pathname === "/pair/qr.png") {
        const png = runtime.whatsapp.pairingQrPng();
        if (png === undefined) {
          send(res, 404, "no qr");
          return;
        }
        res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "no-store" });
        res.end(png);
        return;
      }
      if (req.method === "GET" && url.pathname === "/join") {
        const link = waMeLink(config.whatsappDisplayNumber);
        send(res, link === undefined ? 404 : 200, link ?? "WHATSAPP_DISPLAY_NUMBER is not set");
        return;
      }
      if (url.pathname === "/webhook/whatsapp" || url.pathname === "/webhook") {
        if (req.method === "GET") {
          handleVerify(url, config, res);
          return;
        }
        if (req.method === "POST") {
          await handleWhatsappPost(req, res);
          return;
        }
      }
      if (url.pathname === "/mcp" && (req.method === "POST" || req.method === "GET" || req.method === "DELETE")) {
        await handleMcp(req, res);
        return;
      }
      send(res, 404, "not found");
    })().catch((error: unknown) => {
      console.error(error);
      if (!res.headersSent) send(res, 500, "error");
    });
  });
}

function pairPage(runtime: Runtime): string {
  const status = runtime.whatsapp.status();
  const subject = runtime.config.whatsappGroupSubject;
  const qr = status.qrAvailable
    ? `<img alt="WhatsApp QR" src="/pair/qr.png" width="320" height="320" />`
    : status.connected
      ? `<p>Connected${status.self === undefined ? "" : ` as ${escapeHtml(status.self)}`}.</p>`
      : `<p>Waiting for WhatsApp… refresh this page.</p>`;
  const group =
    status.groupJid === undefined
      ? `<p>On your phone, create a group named <strong>${escapeHtml(subject)}</strong>, then send <code>/help</code> in it. That group is the channel.</p>`
      : `<p>Channel group is linked (<code>${escapeHtml(status.groupJid)}</code>). Send <code>/update …</code> there to wake SiteOS-Agent.</p>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="3" />
  <title>SiteOS WhatsApp pair</title>
  <style>
    body { font: 18px/1.4 system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; }
    code { background: #f1f1f1; padding: 0.1em 0.3em; }
  </style>
</head>
<body>
  <h1>Link your WhatsApp</h1>
  <p>WhatsApp → Linked devices → Link a device. Scan this QR. Same flow as WhatsApp Web.</p>
  ${qr}
  ${group}
  <p>Then: <code>/help</code>, <code>/note …</code>, documents, or <code>/update …</code> to ship something via SiteOS-Agent.</p>
</body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
