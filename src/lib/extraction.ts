import path from "node:path";
import { ApiError } from "./errors";

export const SUPPORTED_DOCUMENT_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
} as const;

export type SupportedExtension = keyof typeof SUPPORTED_DOCUMENT_TYPES;

const MAX_EXTRACTED_CHARS = 2_000_000;

export function getExtension(filename: string): string {
  return path.extname(filename).replace(".", "").toLowerCase();
}

export function isSupportedExtension(extension: string): extension is SupportedExtension {
  return extension in SUPPORTED_DOCUMENT_TYPES;
}

export type ExtractedDocument = {
  text: string;
  pageCount?: number;
};

export function sanitizeExtractedText(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, MAX_EXTRACTED_CHARS);
}

function verifyMagicBytes(buffer: Buffer, extension: SupportedExtension): void {
  if (extension === "pdf" && buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new ApiError(422, "INVALID_FILE", "The uploaded file is not a valid PDF.");
  }
  if (extension === "docx" && buffer.subarray(0, 2).toString("hex") !== "504b") {
    throw new ApiError(422, "INVALID_FILE", "The uploaded file is not a valid DOCX file.");
  }
}

export async function extractDocumentText(
  buffer: Buffer,
  extension: SupportedExtension,
): Promise<ExtractedDocument> {
  verifyMagicBytes(buffer, extension);

  let text = "";
  let pageCount: number | undefined;

  try {
    if (extension === "txt") {
      if (buffer.includes(0)) {
        throw new ApiError(422, "INVALID_FILE", "The uploaded text file contains binary data.");
      }
      text = buffer.toString("utf8");
    } else if (extension === "pdf") {
      const pdfParse = (await import("pdf-parse")).default;
      const parsed = await pdfParse(buffer);
      text = parsed.text;
      pageCount = parsed.numpages;
    } else {
      const mammoth = await import("mammoth");
      const parsed = await mammoth.extractRawText({ buffer });
      text = parsed.value;
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(422, "EXTRACTION_FAILED", "The document text could not be extracted.");
  }

  const sanitized = sanitizeExtractedText(text);
  if (!sanitized) {
    throw new ApiError(422, "EMPTY_DOCUMENT", "No readable text was found in the document.");
  }

  return { text: sanitized, pageCount };
}
