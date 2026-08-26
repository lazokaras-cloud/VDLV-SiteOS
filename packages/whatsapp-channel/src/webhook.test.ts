import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CursorCloudClient, imageForCursorPrompt } from "./cursor-api.js";
import { loadConfig } from "./config.js";
import { listItems } from "./store.js";
import type { ChannelConfig, ParsedInbound } from "./types.js";
import { handleInbound } from "./webhook.js";
import { WhatsappCloudClient } from "./whatsapp-api.js";

function configFor(dir: string, extra: Record<string, string> = {}): ChannelConfig {
  return loadConfig({
    WHATSAPP_TOKEN: "wa-token",
    WHATSAPP_PHONE_NUMBER_ID: "123456",
    WHATSAPP_APP_SECRET: "secret",
    WHATSAPP_VERIFY_TOKEN: "verify",
    WHATSAPP_DISPLAY_NUMBER: "27820000001",
    WHATSAPP_ALLOWED_SENDERS: "27820000000",
    WHATSAPP_INBOX_DIR: dir,
    WHATSAPP_GRAPH_API_BASE: "https://graph.test/v21.0",
    CURSOR_API_BASE: "https://api.cursor.test",
    ...extra,
  });
}

function inbound(overrides: Partial<ParsedInbound> = {}): ParsedInbound {
  return {
    wamid: "wamid.1",
    from: "27820000000",
    timestamp: "0",
    text: "hello",
    ...overrides,
  };
}

interface Call {
  url: string;
  method: string;
  body?: unknown;
}

function clients(
  config: ChannelConfig,
  onCall?: (call: Call) => Response | undefined,
): {
  whatsapp: WhatsappCloudClient;
  cursor: CursorCloudClient;
  calls: Call[];
} {
  const calls: Call[] = [];
  const fetchImpl: typeof fetch = (async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? "GET";
    const call: Call = { url, method };
    if (typeof init?.body === "string") call.body = JSON.parse(init.body);
    calls.push(call);
    const override = onCall?.(call);
    if (override !== undefined) return override;
    if (url.includes("/messages")) {
      return new Response(JSON.stringify({ messages: [{ id: "wamid.out" }] }), {
        status: 200,
      });
    }
    if (url.includes("/v1/agents") && method === "POST" && !url.includes("/runs")) {
      return new Response(
        JSON.stringify({
          agent: { id: "bc-test", url: "https://cursor.com/agents/bc-test" },
          run: { id: "run-1" },
        }),
        { status: 200 },
      );
    }
    if (url.includes("/v1/agents/bc-test/runs/run-1")) {
      return new Response(
        JSON.stringify({
          id: "run-1",
          status: "FINISHED",
          result: "Opened a PR",
          git: { branches: [{ prUrl: "https://github.com/tobievii/constrAI/pull/1" }] },
        }),
        { status: 200 },
      );
    }
    if (url.includes("/v1/agents/bc-test") && method === "GET") {
      return new Response(
        JSON.stringify({
          id: "bc-test",
          url: "https://cursor.com/agents/bc-test",
          latestRunId: "run-1",
        }),
        { status: 200 },
      );
    }
    if (url.includes("/media-1") || url.endsWith("/media-1")) {
      return new Response(
        JSON.stringify({ url: "https://cdn.test/file", mime_type: "application/pdf" }),
        { status: 200 },
      );
    }
    if (url.includes("cdn.test")) {
      return new Response(new Uint8Array([37, 80, 68, 70]), { status: 200 });
    }
    return new Response("unexpected", { status: 500 });
  }) as typeof fetch;

  return {
    whatsapp: new WhatsappCloudClient(config, fetchImpl),
    cursor: new CursorCloudClient(config, fetchImpl),
    calls,
  };
}

describe("handleInbound", () => {
  const dir = mkdtempSync(join(tmpdir(), "wa-hook-"));

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("drops senders who are not on the allowlist", async () => {
    const config = configFor(dir);
    const { whatsapp, cursor } = clients(config);
    const result = await handleInbound(inbound({ from: "27829999999" }), {
      config,
      whatsapp,
      cursor,
    });
    expect(result.handled).toBe(false);
    expect(result.reason).toBe("sender-not-allowed");
  });

  it("answers /help with the join link", async () => {
    const config = configFor(join(dir, "help"));
    const { whatsapp, cursor } = clients(config);
    const result = await handleInbound(inbound({ text: "/help" }), {
      config,
      whatsapp,
      cursor,
    });
    expect(result.reply).toContain("/update");
    expect(result.reply).toContain("https://wa.me/27820000001");
  });

  it("stores a plain note without launching Cursor", async () => {
    const inbox = join(dir, "note");
    const config = configFor(inbox);
    const { whatsapp, cursor, calls } = clients(config);
    const result = await handleInbound(inbound({ text: "rain on grid 4" }), {
      config,
      whatsapp,
      cursor,
    });
    expect(result.reply).toMatch(/stored/i);
    expect(listItems(inbox)[0]?.kind).toBe("note");
    expect(calls.some((call) => call.url.includes("/v1/agents"))).toBe(false);
  });

  it("queues /update when there is no Cursor API key", async () => {
    const inbox = join(dir, "queued");
    const config = configFor(inbox, { CURSOR_API_KEY: "" });
    const { whatsapp, cursor } = clients(config);
    const result = await handleInbound(
      inbound({ text: "/update add an offline indicator" }),
      { config, whatsapp, cursor },
    );
    expect(result.reply).toMatch(/CURSOR_API_KEY/);
    expect(listItems(inbox)[0]?.kind).toBe("update");
    expect(listItems(inbox)[0]?.cursor).toBeUndefined();
  });

  it("launches a Cursor agent for /update when the key is set", async () => {
    const inbox = join(dir, "launch");
    const config = configFor(inbox, {
      CURSOR_API_KEY: "cur_test",
      WHATSAPP_PUBLIC_URL: "https://bridge.test",
      WHATSAPP_MCP_TOKEN: "mcp-secret",
    });
    const { whatsapp, cursor, calls } = clients(config);
    const result = await handleInbound(
      inbound({ wamid: "wamid.launch", text: "/update add an offline indicator" }),
      { config, whatsapp, cursor },
    );
    expect(result.reply).toContain("https://cursor.com/agents/bc-test");
    const launch = calls.find(
      (call) => call.method === "POST" && call.url === "https://api.cursor.test/v1/agents",
    );
    expect(launch?.body).toMatchObject({
      autoCreatePR: true,
      repos: [{ url: "https://github.com/tobievii/constrAI", startingRef: "main" }],
    });
    const body = launch?.body as {
      prompt: { text: string };
      mcpServers: { url: string }[];
    };
    expect(body.prompt.text).toContain("add an offline indicator");
    expect(body.prompt.text).toContain("untrusted");
    expect(body.mcpServers[0]?.url).toBe("https://bridge.test/mcp");
    expect(listItems(inbox)[0]?.cursor?.agentId).toBe("bc-test");
  });

  it("stores a document attachment", async () => {
    const inbox = join(dir, "doc");
    const config = configFor(inbox);
    const { whatsapp, cursor } = clients(config);
    const result = await handleInbound(
      inbound({
        wamid: "wamid.doc",
        text: "signed sheet",
        media: {
          id: "media-1",
          mimeType: "application/pdf",
          filename: "daywork.pdf",
        },
      }),
      { config, whatsapp, cursor },
    );
    expect(result.reply).toMatch(/Document received/);
    expect(listItems(inbox)[0]?.media?.filename).toBe("daywork.pdf");
    expect(listItems(inbox)[0]?.kind).toBe("document");
  });

  it("reports status from the last launched agent", async () => {
    const inbox = join(dir, "status");
    const config = configFor(inbox, { CURSOR_API_KEY: "cur_test" });
    const { whatsapp, cursor } = clients(config);
    await handleInbound(inbound({ wamid: "wamid.st", text: "/update do the thing" }), {
      config,
      whatsapp,
      cursor,
    });
    const result = await handleInbound(inbound({ wamid: "wamid.st2", text: "/status" }), {
      config,
      whatsapp,
      cursor,
    });
    expect(result.reply).toContain("FINISHED");
    expect(result.reply).toContain("https://github.com/tobievii/constrAI/pull/1");
  });

  it("asks for a body when /update is empty", async () => {
    const config = configFor(join(dir, "empty-update"));
    const { whatsapp, cursor } = clients(config);
    const result = await handleInbound(inbound({ text: "/update" }), {
      config,
      whatsapp,
      cursor,
    });
    expect(result.reply).toMatch(/Say what Cursor should do/);
  });
});

describe("imageForCursorPrompt", () => {
  it("accepts small jpeg and rejects pdf", () => {
    expect(imageForCursorPrompt("image/jpeg", new Uint8Array([1, 2, 3]))?.mimeType).toBe(
      "image/jpeg",
    );
    expect(imageForCursorPrompt("application/pdf", new Uint8Array([1, 2, 3]))).toBeUndefined();
    expect(imageForCursorPrompt("image/png", new Uint8Array(0))).toBeUndefined();
  });
});
