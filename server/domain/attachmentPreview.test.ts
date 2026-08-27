import { describe, expect, it } from "vitest";
import { getAttachmentPreviewKind, getAttachmentPreviewLabel } from "../../client/src/lib/attachmentPreview";

describe("attachment preview policy", () => {
  it("supports image MIME types and PDF documents", () => {
    expect(getAttachmentPreviewKind("image/png")).toBe("image");
    expect(getAttachmentPreviewKind(" IMAGE/JPEG ")).toBe("image");
    expect(getAttachmentPreviewKind("application/pdf")).toBe("pdf");
  });

  it("keeps unsupported files as original-download links only", () => {
    expect(getAttachmentPreviewKind("text/plain")).toBeNull();
    expect(getAttachmentPreviewKind("application/zip")).toBeNull();
    expect(getAttachmentPreviewLabel("review.png", "image")).toBe("review.png 이미지 미리보기");
  });
});
