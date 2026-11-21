import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { isProduction, optionalEnv } from "./env";
import { ApiError } from "./errors";

const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

type S3Config = {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

function getS3Config(): S3Config | null {
  const bucket = optionalEnv("S3_BUCKET");
  const accessKeyId = optionalEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = optionalEnv("S3_SECRET_ACCESS_KEY");
  if (!bucket || !accessKeyId || !secretAccessKey) return null;

  return {
    bucket,
    region: optionalEnv("S3_REGION") ?? "auto",
    endpoint: optionalEnv("S3_ENDPOINT"),
    accessKeyId,
    secretAccessKey,
    forcePathStyle: optionalEnv("S3_FORCE_PATH_STYLE") === "true",
  };
}

let client: S3Client | null = null;

function getClient(config: S3Config): S3Client {
  if (client) return client;
  client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return client;
}

function localPathForKey(key: string): string {
  const resolved = path.resolve(LOCAL_ROOT, key);
  if (!resolved.startsWith(LOCAL_ROOT + path.sep)) {
    throw new ApiError(400, "INVALID_STORAGE_KEY", "Invalid storage key.");
  }
  return resolved;
}

export function usesObjectStorage(): boolean {
  return getS3Config() !== null;
}

export async function putPrivateObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const config = getS3Config();
  if (config) {
    await getClient(config).send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentDisposition: "attachment",
      }),
    );
    return;
  }

  if (isProduction) {
    throw new ApiError(
      500,
      "STORAGE_NOT_CONFIGURED",
      "Private object storage is not configured.",
    );
  }

  const target = localPathForKey(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body);
}

export async function getPrivateObject(key: string): Promise<Buffer> {
  const config = getS3Config();
  if (config) {
    const response = await getClient(config).send(
      new GetObjectCommand({ Bucket: config.bucket, Key: key }),
    );
    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) {
      throw new ApiError(404, "FILE_NOT_FOUND", "Stored file could not be read.");
    }
    return Buffer.from(bytes);
  }

  if (isProduction) {
    throw new ApiError(
      500,
      "STORAGE_NOT_CONFIGURED",
      "Private object storage is not configured.",
    );
  }

  try {
    return await readFile(localPathForKey(key));
  } catch {
    throw new ApiError(404, "FILE_NOT_FOUND", "Stored file could not be read.");
  }
}

export async function deletePrivateObject(key: string): Promise<void> {
  const config = getS3Config();
  if (config) {
    await getClient(config).send(
      new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
    );
    return;
  }

  if (isProduction) return;

  try {
    await unlink(localPathForKey(key));
  } catch {
    // Missing files are already considered deleted.
  }
}

export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 300,
): Promise<string | null> {
  const config = getS3Config();
  if (!config) return null;
  return getSignedUrl(
    getClient(config),
    new GetObjectCommand({ Bucket: config.bucket, Key: key }),
    { expiresIn: Math.min(Math.max(expiresInSeconds, 30), 900) },
  );
}
