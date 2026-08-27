export function workspaceDataSignature(value: unknown) {
  return JSON.stringify(value, (_key, item) => item instanceof Date ? item.toISOString() : item);
}

export function shouldAnnounceWorkspaceSync(before: string | null, after: string) {
  return Boolean(before && before !== after);
}
