import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { getItem, listItems, safeFilename, saveItem, writeMedia } from "./store.js";
import type { InboxItem } from "./types.js";

describe("inbox store", () => {
  const dir = mkdtempSync(join(tmpdir(), "wa-inbox-"));

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes items newest first and round-trips", () => {
    const first: InboxItem = {
      id: "wamid.1",
      kind: "note",
      from: "27820000000",
      body: "first",
      createdAt: "2026-08-26T10:00:00.000Z",
    };
    const second: InboxItem = {
      id: "wamid.2",
      kind: "document",
      from: "27820000000",
      body: "second",
      createdAt: "2026-08-26T11:00:00.000Z",
    };
    saveItem(dir, first);
    saveItem(dir, second);
    expect(listItems(dir, 10).map((item) => item.id)).toEqual(["wamid.2", "wamid.1"]);
    expect(getItem(dir, "wamid.1")?.body).toBe("first");
  });

  it("sanitises media filenames", () => {
    expect(safeFilename("../etc/passwd")).toBe("etc_passwd");
    expect(safeFilename("")).toBe("attachment.bin");
    const path = writeMedia(dir, "wamid.3", "daywork sheet.pdf", new Uint8Array([1, 2, 3]));
    expect(path.endsWith("daywork_sheet.pdf")).toBe(true);
  });
});
