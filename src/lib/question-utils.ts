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
  const normalized = normalizeText(questionText).replace(/[^\p{L}\p{N}\s]/gu, "");
  return createHash("sha256").update(normalized).digest("hex");
}

export function optionKeys(options: QuestionOption[]): string[] {
  return options.map((option) => option.key);
}
