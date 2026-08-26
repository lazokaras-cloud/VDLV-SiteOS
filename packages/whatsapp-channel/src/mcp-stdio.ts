import { config as loadEnv } from "dotenv";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./config.js";
import { createWhatsappMcpServer } from "./mcp-server.js";
import { createRuntime } from "./runtime.js";

loadEnv();
loadEnv({ path: "packages/whatsapp-channel/.env" });

const runtime = createRuntime(loadConfig(process.env));
const server = createWhatsappMcpServer(runtime);
const transport = new StdioServerTransport();
await server.connect(transport);
