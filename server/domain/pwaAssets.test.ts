import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("PWA assets", () => {
  it("declares standalone launch metadata and a same-origin static asset cache", async () => {
    const [manifestText, serviceWorker] = await Promise.all([
      readFile(new URL("../../client/public/manifest.webmanifest", import.meta.url), "utf8"),
      readFile(new URL("../../client/public/sw.js", import.meta.url), "utf8"),
    ]);
    const manifest = JSON.parse(manifestText);
    expect(manifest).toMatchObject({ name: "일정열정", start_url: "/", display: "standalone", theme_color: "#4f9d69" });
    expect(manifest.icons[0]).toMatchObject({ src: "/app-icon.svg", purpose: "any maskable" });
    expect(serviceWorker).toContain('request.method !== "GET"');
    expect(serviceWorker).toContain('request.mode === "navigate"');
    expect(serviceWorker).toContain('new URL(request.url).origin !== self.location.origin');
  });
});
