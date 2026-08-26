import { CursorCloudClient } from "./cursor-api.js";
import type { ChannelConfig } from "./types.js";
import { WhatsappCloudClient } from "./whatsapp-api.js";

export function createRuntime(
  config: ChannelConfig,
  fetchImpl: typeof fetch = fetch,
) {
  return {
    config,
    whatsapp: new WhatsappCloudClient(config, fetchImpl),
    cursor: new CursorCloudClient(config, fetchImpl),
  };
}
