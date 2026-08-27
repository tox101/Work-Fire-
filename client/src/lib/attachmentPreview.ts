export type AttachmentPreviewKind = "image" | "pdf" | null;

export function getAttachmentPreviewKind(mimeType: string): AttachmentPreviewKind {
  const normalizedMimeType = mimeType.trim().toLowerCase();
  if (normalizedMimeType.startsWith("image/")) return "image";
  if (normalizedMimeType === "application/pdf") return "pdf";
  return null;
}

export function getAttachmentPreviewLabel(fileName: string, kind: Exclude<AttachmentPreviewKind, null>) {
  return `${fileName} ${kind === "image" ? "이미지" : "PDF"} 미리보기`;
}
