import { createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadConfig } from "./config.js";
import { createChannelHttpServer } from "./http-app.js";
import { createRuntime } from "./runtime.js";
import { listItems } from "./store.js";

function listen(server: ReturnType<typeof createChannelHttpServer>): Promise<string> {
  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      resolve(`http://127.0.0.1:${String(address.port)}`);
    });
    server.on("error", reject);
  });
}

describe("channel HTTP server", () => {
  const dir = mkdtempSync(join(tmpdir(), "wa-http-"));
  const config = loadConfig({
    WHATSAPP_TOKEN: "wa-token",
    WHATSAPP_PHONE_NUMBER_ID: "123456",
    WHATSAPP_APP_SECRET: "app-secret",
    WHATSAPP_VERIFY_TOKEN: "verify-me",
    WHATSAPP_DISPLAY_NUMBER: "27820000001",
    WHATSAPP_ALLOWED_SENDERS: "27820000000",
    WHATSAPP_INBOX_DIR: dir,
    WHATSAPP_MCP_TOKEN: "mcp-secret",
    WHATSAPP_GRAPH_API_BASE: "https://graph.test/v21.0",
  });

  const sent: { to: string; text: string }[] = [];
  const fetchImpl: typeof fetch = (async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("/messages") && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as { to: string; text: { body: string } };
      sent.push({ to: body.to, text: body.text.body });
      return new Response(JSON.stringify({ messages: [{ id: "wamid.out" }] }), { status: 200 });
    }
    return new Response("no", { status: 500 });
  }) as typeof fetch;

  const server = createChannelHttpServer(createRuntime(config, fetchImpl));
  let base = "";

  beforeAll(async () => {
    base = await listen(server);
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    rmSync(dir, { recursive: true, force: true });
  });

  it("serves health and the join link", async () => {
    const health = await fetch(`${base}/health`);
    expect(await health.json()).toMatchObject({ ok: true, pair: "/pair" });
    const join = await fetch(`${base}/join`);
    expect(await join.text()).toBe("https://wa.me/27820000001");
    const pair = await fetch(`${base}/pair`);
    expect(pair.headers.get("content-type")).toMatch(/html/);
    expect(await pair.text()).toContain("Link your WhatsApp");
  });

  it("answers Meta's webhook verification challenge", async () => {
    const url = `${base}/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=challenge-token`;
    const res = await fetch(url);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("challenge-token");
    const bad = await fetch(`${base}/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=x`);
    expect(bad.status).toBe(403);
  });

  it("rejects a webhook with a bad signature", async () => {
    const res = await fetch(`${base}/webhook/whatsapp`, {
      method: "POST",
      headers: { "x-hub-signature-256": "sha256=deadbeef" },
      body: "{}",
    });
    expect(res.status).toBe(401);
  });

  it("stores an allowlisted note and replies on WhatsApp", async () => {
    const body = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: "27820000000",
                    id: "wamid.http-note",
                    timestamp: "0",
                    type: "text",
                    text: { body: "rain on grid 4" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const signature = `sha256=${createHmac("sha256", "app-secret").update(body, "utf8").digest("hex")}`;
    const res = await fetch(`${base}/webhook/whatsapp`, {
      method: "POST",
      headers: { "x-hub-signature-256": signature, "content-type": "application/json" },
      body,
    });
    expect(res.status).toBe(200);
    expect(listItems(dir)[0]?.body).toBe("rain on grid 4");
    expect(sent[0]).toEqual({
      to: "27820000000",
      text: "Note stored. Cursor can see it in the inbox.",
    });
  });

  it("closes HTTP MCP without a bearer token", async () => {
    const res = await fetch(`${base}/mcp`, { method: "POST", body: "{}" });
    expect(res.status).toBe(401);
  });
});
