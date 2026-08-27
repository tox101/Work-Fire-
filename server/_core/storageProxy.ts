import type { Express } from "express";
import * as db from "../db";
import { ENV } from "./env";
import { sdk } from "./sdk";
import path from "node:path";

async function requireOwnedAttachment(req: Parameters<Express["get"]>[1] extends (req: infer Request, ...args: any[]) => unknown ? Request : never, res: any, key: string) {
  try {
    const user = await sdk.authenticateRequest(req as any);
    const attachment = await db.getAttachmentByStorageKey(user.id, key);
    if (!attachment) {
      res.status(404).send("File unavailable");
      return false;
    }
    return true;
  } catch {
    res.status(401).send("Authentication required");
    return false;
  }
}

export function registerStorageProxy(app: Express) {
  app.get("/files/*", async (req, res) => {
    if (ENV.storageMode !== "local") {
      res.status(404).send("Local storage is disabled");
      return;
    }
    const key = (req.params as Record<string, string>)[0];
    const storageRoot = path.resolve(ENV.localStorageDir);
    const filePath = path.resolve(storageRoot, key ?? "");
    if (!key || !filePath.startsWith(`${storageRoot}${path.sep}`)) {
      res.status(400).send("Invalid storage key");
      return;
    }
    if (!(await requireOwnedAttachment(req as any, res, key))) return;
    res.set("Cache-Control", "private, no-store");
    res.sendFile(filePath, error => {
      if (error && !res.headersSent) res.status((error as NodeJS.ErrnoException).code === "ENOENT" ? 404 : 500).send("File unavailable");
    });
  });

  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!(await requireOwnedAttachment(req as any, res, key))) return;

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
