import { createHash } from "node:crypto";

export type QuestionOption = { key: string; text: string };

export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function questionContentHash(questionText: string, options: QuestionOption[]): string {
  const normalizedOptions = options
    .map((option) => `${normalizeText(option.key)}:${normalizeText(option.text)}`)
    .join("|");
  return createHash("sha256")
    .update(`${normalizeText(questionText)}::${normalizedOptions}`)
    .digest("hex");
}

export function questionTextHash(questionText: string): string {
  // Use the RegExp constructor so the Unicode property escapes do not depend on
  // the TypeScript compilation target of this file.
  const nonWordCharacters = new RegExp("[^\\p{L}\\p{N}\\s]", "gu");
  const normalized = normalizeText(questionText).replace(nonWordCharacters, "");
  return createHash("sha256").update(normalized).digest("hex");
}

export function optionKeys(options: QuestionOption[]): string[] {
  return options.map((option) => option.key);
}
