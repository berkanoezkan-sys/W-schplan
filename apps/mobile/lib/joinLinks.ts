const JOIN_PATTERNS = [
  /^woeschplan:\/\/join\/([A-Za-z0-9_-]+)$/i,
  /^https?:\/\/(?:www\.)?woeschplan\.ch\/join\/([A-Za-z0-9_-]+)$/i,
  /^\/join\/([A-Za-z0-9_-]+)$/i,
];

export function parseJoinToken(raw: string): string | null {
  const trimmed = raw.trim();
  for (const pattern of JOIN_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }
  if (/^[A-Za-z0-9_-]{16,128}$/.test(trimmed)) return trimmed;
  return null;
}

export function isJoinLink(raw: string): boolean {
  return parseJoinToken(raw) !== null;
}
