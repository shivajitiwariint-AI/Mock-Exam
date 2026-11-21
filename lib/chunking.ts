export type TextChunk = {
  index: number;
  content: string;
  charCount: number;
};

export type ChunkOptions = {
  maxChars?: number;
  overlapChars?: number;
};

const BOUNDARY_PATTERN = /[\n.!?;]\s/g;

/**
 * Splits text into overlapping chunks, preferring paragraph/sentence
 * boundaries while guaranteeing forward progress.
 */
export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const maxChars = Math.max(200, options.maxChars ?? 1200);
  const overlapChars = Math.max(0, Math.min(options.overlapChars ?? 150, maxChars - 100));

  const normalized = text
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();

  if (!normalized) return [];

  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < normalized.length) {
    const hardEnd = Math.min(start + maxChars, normalized.length);
    let end = hardEnd;

    if (hardEnd < normalized.length) {
      const minimumBoundary = start + Math.floor(maxChars * 0.6);
      let bestBoundary = -1;
      BOUNDARY_PATTERN.lastIndex = minimumBoundary;
      let match: RegExpExecArray | null;
      while ((match = BOUNDARY_PATTERN.exec(normalized)) !== null) {
        if (match.index >= hardEnd) break;
        bestBoundary = match.index + match[0].length;
      }
      if (bestBoundary > minimumBoundary) {
        end = bestBoundary;
      } else {
        const space = normalized.lastIndexOf(" ", hardEnd);
        if (space > minimumBoundary) end = space + 1;
      }
    }

    const content = normalized.slice(start, end).trim();
    if (content) {
      chunks.push({ index: chunks.length, content, charCount: content.length });
    }

    if (end >= normalized.length) break;
    start = Math.max(end - overlapChars, start + 1);
  }

  return chunks;
}
