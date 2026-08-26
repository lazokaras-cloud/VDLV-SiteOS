import { config as loadEnv } from "dotenv";

import { loadConfig } from "./config.js";
import { createChannelHttpServer } from "./http-app.js";
import { waMeLink } from "./phone.js";
import { createRuntime } from "./runtime.js";

loadEnv();
loadEnv({ path: "packages/whatsapp-channel/.env" });

const config = loadConfig(process.env);
const server = createChannelHttpServer(createRuntime(config));

server.listen(config.listenPort, () => {
  console.log(`WhatsApp channel listening on :${config.listenPort}`);
  console.log("Webhook: POST /webhook/whatsapp");
  console.log("MCP:     POST /mcp");
  const link = waMeLink(config.whatsappDisplayNumber);
  if (link !== undefined) console.log(`Join:    ${link}`);
});
