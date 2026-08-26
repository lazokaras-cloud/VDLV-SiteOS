import { config as loadEnv } from "dotenv";

import { loadConfig } from "./config.js";
import { createChannelHttpServer } from "./http-app.js";
import { waMeLink } from "./phone.js";
import { createRuntime } from "./runtime.js";
import { handleInbound } from "./webhook.js";
import { WhatsappWebClient } from "./whatsapp-web.js";

loadEnv();
loadEnv({ path: "packages/whatsapp-channel/.env" });

const config = loadConfig(process.env);
const runtime = createRuntime(config);

if (config.whatsappMode === "web") {
  const web = new WhatsappWebClient(config);
  runtime.whatsapp = web;
  void web.start(async (inbound) => {
    const result = await handleInbound(inbound, runtime);
    if (result.handled && result.reply !== undefined) {
      await web.sendText(inbound.replyTo ?? inbound.from, result.reply);
    }
  });
}

const server = createChannelHttpServer(runtime);

server.listen(config.listenPort, () => {
  console.log(`WhatsApp channel listening on :${config.listenPort}`);
  if (config.whatsappMode === "web") {
    console.log(`Pair:    http://localhost:${String(config.listenPort)}/pair`);
  } else {
    console.log("Webhook: POST /webhook/whatsapp");
  }
  console.log("MCP:     POST /mcp");
  const link = waMeLink(config.whatsappDisplayNumber);
  if (link !== undefined) console.log(`Join:    ${link}`);
});
