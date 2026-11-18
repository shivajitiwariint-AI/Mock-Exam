import { maxUploadBytes } from "./env";
import { ApiError } from "./errors";
import {
  extractDocumentText,
  getExtension,
  isSupportedExtension,
  type SupportedExtension,
} from "./extraction";

export const MAX_STORED_TEXT = 30_000;

export async function readUploadedDocument(
  file: File,
  label: string,
  maxChars = MAX_STORED_TEXT,
): Promise<{ extension: SupportedExtension; buffer: Buffer; text: string }> {
  const limit = maxUploadBytes();
  if (file.size === 0) {
    throw new ApiError(400, "EMPTY_FILE", `The ${label} file is empty.`);
  }
  if (file.size > limit) {
    throw new ApiError(
      413,
      "FILE_TOO_LARGE",
      `The ${label} file exceeds the ${Math.round(limit / (1024 * 1024))}MB upload limit.`,
    );
  }

  const extension = getExtension(file.name);
  if (!isSupportedExtension(extension)) {
    throw new ApiError(
      422,
      "UNSUPPORTED_FILE",
      `The ${label} file must be a PDF, DOCX, or TXT file.`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extracted = await extractDocumentText(buffer, extension);
  return { extension, buffer, text: extracted.text.slice(0, maxChars) };
}
