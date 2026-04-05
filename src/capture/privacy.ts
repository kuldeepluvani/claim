function matchesGlob(filePath: string, pattern: string): boolean {
  const regex = new RegExp(
    "^" +
      pattern
        .replace(/\./g, "\\.")
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".") +
      "$"
  );
  return regex.test(filePath) || regex.test(filePath.split("/").pop() || "");
}

export function isPrivate(
  filePath: string | null,
  content: string | null,
  patterns: string[]
): boolean {
  if (content && /<private>[\s\S]*?<\/private>/i.test(content)) return true;

  if (filePath) {
    const filename = filePath.split("/").pop() || filePath;
    for (const pattern of patterns) {
      if (matchesGlob(filename, pattern) || matchesGlob(filePath, pattern))
        return true;
    }
  }

  return false;
}
