import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

import type { InboxItem } from "./types.js";

function indexPath(inboxDir: string): string {
  return join(inboxDir, "index.json");
}

function itemPath(inboxDir: string, id: string): string {
  return join(inboxDir, "items", `${id}.json`);
}

function readIndex(inboxDir: string): string[] {
  const path = indexPath(inboxDir);
  if (!existsSync(path)) return [];
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((entry): entry is string => typeof entry === "string");
}

function writeIndex(inboxDir: string, ids: readonly string[]): void {
  mkdirSync(inboxDir, { recursive: true });
  writeFileSync(indexPath(inboxDir), `${JSON.stringify(ids, null, 2)}\n`, "utf8");
}

export function saveItem(inboxDir: string, item: InboxItem): InboxItem {
  const file = itemPath(inboxDir, item.id);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(item, null, 2)}\n`, "utf8");
  const ids = readIndex(inboxDir);
  if (!ids.includes(item.id)) {
    ids.unshift(item.id);
    writeIndex(inboxDir, ids);
  }
  return item;
}

export function hasItem(inboxDir: string, id: string): boolean {
  return existsSync(itemPath(inboxDir, id));
}

export function getItem(inboxDir: string, id: string): InboxItem | undefined {
  const file = itemPath(inboxDir, id);
  if (!existsSync(file)) return undefined;
  return JSON.parse(readFileSync(file, "utf8")) as InboxItem;
}

export function listItems(inboxDir: string, limit = 50): InboxItem[] {
  const ids = readIndex(inboxDir).slice(0, Math.max(0, limit));
  const items: InboxItem[] = [];
  for (const id of ids) {
    const item = getItem(inboxDir, id);
    if (item !== undefined) items.push(item);
  }
  return items;
}

export function latestUpdate(inboxDir: string): InboxItem | undefined {
  for (const item of listItems(inboxDir, 200)) {
    if (
      item.kind === "update" ||
      item.kind === "updateDemo" ||
      item.kind === "updateApp"
    ) {
      return item;
    }
  }
  return undefined;
}

export function mediaDir(inboxDir: string, id: string): string {
  return join(inboxDir, "media", id);
}

export function safeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^[._]+/, "");
  const clipped = base.slice(0, 120);
  return clipped.length > 0 ? clipped : "attachment.bin";
}

export function writeMedia(
  inboxDir: string,
  id: string,
  filename: string,
  bytes: Uint8Array,
): string {
  const dir = mediaDir(inboxDir, id);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, safeFilename(filename));
  writeFileSync(path, bytes);
  return path;
}

export function readMediaBytes(path: string): Uint8Array {
  return new Uint8Array(readFileSync(path));
}
