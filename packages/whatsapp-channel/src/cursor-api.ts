import type {
  ChannelConfig,
  CursorAgentStatus,
  CursorLaunchRequest,
  CursorLaunchResult,
} from "./types.js";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export function imageForCursorPrompt(
  mimeType: string,
  bytes: Uint8Array,
): { data: string; mimeType: string } | undefined {
  if (!IMAGE_TYPES.has(mimeType)) return undefined;
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) return undefined;
  return { data: Buffer.from(bytes).toString("base64"), mimeType };
}

export class CursorCloudClient {
  constructor(
    private readonly config: ChannelConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async launch(request: CursorLaunchRequest): Promise<CursorLaunchResult> {
    if (this.config.cursorApiKey.length === 0) {
      throw new Error("CURSOR_API_KEY is not set");
    }
    const body: Record<string, unknown> = {
      prompt: promptBody(request),
      name: request.name.slice(0, 100),
      repos: [
        {
          url: this.config.cursorRepoUrl,
          startingRef: this.config.cursorStartingRef,
        },
      ],
      autoCreatePR: this.config.cursorAutoCreatePr,
    };
    const mcp = mcpServers(request);
    if (mcp !== undefined) body.mcpServers = mcp;

    const payload = await this.request("POST", "/v1/agents", body);
    return parseLaunch(payload);
  }

  async getAgent(agentId: string): Promise<CursorAgentStatus> {
    const agent = await this.request("GET", `/v1/agents/${encodeURIComponent(agentId)}`);
    const status = parseAgent(agent);
    if (status.latestRunId !== undefined) {
      const run = await this.request(
        "GET",
        `/v1/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(status.latestRunId)}`,
      );
      mergeRun(status, run);
    }
    return status;
  }

  async followup(agentId: string, promptText: string): Promise<{ runId: string }> {
    const payload = await this.request(
      "POST",
      `/v1/agents/${encodeURIComponent(agentId)}/runs`,
      { prompt: { text: promptText } },
    );
    const run = asRecord(payload)?.run;
    const runId = asRecord(run)?.id;
    if (typeof runId !== "string") throw new Error("Cursor follow-up returned no run id");
    return { runId };
  }

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const headers = {
      Authorization: basicAuth(this.config.cursorApiKey),
      "Content-Type": "application/json",
    };
    const init: RequestInit = { method, headers };
    if (body !== undefined) init.body = JSON.stringify(body);
    const response = await this.fetchImpl(`${this.config.cursorApiBase}${path}`, init);
    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw new Error(`Cursor API ${method} ${path} failed (${response.status})`);
    }
    return payload;
  }
}

function basicAuth(apiKey: string): string {
  return `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
}

function promptBody(request: CursorLaunchRequest): Record<string, unknown> {
  const prompt: Record<string, unknown> = { text: request.promptText };
  if (request.images.length > 0) {
    prompt.images = request.images.map((image) => ({
      data: image.data,
      mimeType: image.mimeType,
    }));
  }
  return prompt;
}

function mcpServers(
  request: CursorLaunchRequest,
): Record<string, unknown>[] | undefined {
  if (request.mcpUrl === undefined || request.mcpAuthToken === undefined) {
    return undefined;
  }
  if (request.mcpUrl.length === 0 || request.mcpAuthToken.length === 0) {
    return undefined;
  }
  return [
    {
      name: "whatsapp-channel",
      type: "http",
      url: request.mcpUrl,
      headers: { Authorization: `Bearer ${request.mcpAuthToken}` },
    },
  ];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function parseLaunch(payload: unknown): CursorLaunchResult {
  const record = asRecord(payload);
  const agent = asRecord(record?.agent) ?? record;
  const id = agent?.id;
  if (typeof id !== "string") throw new Error("Cursor launch returned no agent id");
  const run = asRecord(record?.run);
  const result: CursorLaunchResult = {
    agentId: id,
    url:
      typeof agent?.url === "string"
        ? agent.url
        : `https://cursor.com/agents/${id}`,
  };
  if (typeof run?.id === "string") result.runId = run.id;
  return result;
}

function parseAgent(payload: unknown): CursorAgentStatus {
  const record = asRecord(payload);
  const id = record?.id;
  if (typeof id !== "string") throw new Error("Cursor agent missing id");
  const status: CursorAgentStatus = {
    agentId: id,
    url:
      typeof record?.url === "string"
        ? record.url
        : `https://cursor.com/agents/${id}`,
  };
  if (typeof record?.latestRunId === "string") status.latestRunId = record.latestRunId;
  return status;
}

function mergeRun(status: CursorAgentStatus, payload: unknown): void {
  const record = asRecord(payload);
  if (record === undefined) return;
  if (typeof record.status === "string") status.runStatus = record.status;
  if (typeof record.result === "string") status.result = record.result;
  const git = asRecord(record.git);
  const branches = git?.branches;
  if (!Array.isArray(branches) || branches.length === 0) return;
  const first = asRecord(branches[0]);
  if (typeof first?.prUrl === "string") status.prUrl = first.prUrl;
  if (typeof first?.branch === "string") status.branch = first.branch;
}
