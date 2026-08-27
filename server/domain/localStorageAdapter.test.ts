import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe("local storage adapter", () => {
  it("writes attachments outside the database and returns an app-owned file URL", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "workos-storage-"));
    temporaryDirectories.push(directory);
    vi.stubEnv("STORAGE_MODE", "local");
    vi.stubEnv("LOCAL_STORAGE_DIR", directory);
    vi.resetModules();

    const { storagePut, storageGetSignedUrl } = await import("../storage");
    const stored = await storagePut("records/letter.txt", "원문 보존", "text/plain");

    expect(stored.url).toMatch(/^\/files\/records\/letter_[a-f0-9]{8}\.txt$/);
    expect(await readFile(path.join(directory, stored.key), "utf8")).toBe("원문 보존");
    await expect(storageGetSignedUrl(stored.key)).resolves.toBe(stored.url);
  });
});
