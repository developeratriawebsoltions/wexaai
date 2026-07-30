export function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return normalizeTags(parsed);
      }
      if (typeof parsed === "string") {
        return normalizeTags(parsed);
      }
    } catch {
      // fall through to basic string parsing
    }

    return trimmed
      .replace(/^\[|\]$/g, "")
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function serializeTags(value: unknown): string {
  return JSON.stringify(normalizeTags(value));
}
