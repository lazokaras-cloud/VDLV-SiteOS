import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadConfig } from "./config.js";
import { createWhatsappMcpServer } from "./mcp-server.js";
import { createRuntime } from "./runtime.js";

describe("createWhatsappMcpServer", () => {
  const dir = mkdtempSync(join(tmpdir(), "wa-mcp-"));

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("registers without throwing", () => {
    const config = loadConfig({
      WHATSAPP_INBOX_DIR: dir,
      WHATSAPP_DISPLAY_NUMBER: "27820000001",
    });
    const server = createWhatsappMcpServer(createRuntime(config));
    expect(server).toBeDefined();
    void server.close();
  });
});
