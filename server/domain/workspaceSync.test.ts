import { describe, expect, it } from "vitest";
import { shouldAnnounceWorkspaceSync, workspaceDataSignature } from "../../client/src/lib/workspaceSync";

describe("Workspace sync notice", () => {
  it("announces only when a previously cached Workspace value changed", () => {
    const before = workspaceDataSignature({ tasks: [{ id: 1, revision: 1 }] });
    expect(shouldAnnounceWorkspaceSync(before, workspaceDataSignature({ tasks: [{ id: 1, revision: 1 }] }))).toBe(false);
    expect(shouldAnnounceWorkspaceSync(before, workspaceDataSignature({ tasks: [{ id: 1, revision: 2 }] }))).toBe(true);
    expect(shouldAnnounceWorkspaceSync(null, workspaceDataSignature({ tasks: [] }))).toBe(false);
  });
});
