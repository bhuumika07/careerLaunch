// src/lib/utils/storage.ts

/**
 * Simple storage abstraction supporting local filesystem (dev) and placeholder S3 for production.
 * All functions return promises for async usage.
 */
import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import { join, resolve } from "path";

const STORAGE_BACKEND = process.env.STORAGE_BACKEND ?? "local"; // "local" or "s3"
const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR ?? "uploads";

// Ensure the local upload directory exists at runtime
async function ensureLocalDir() {
  const dir = resolve(process.cwd(), LOCAL_UPLOAD_DIR);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Generate a random storage key (hex string) */
export function generateStorageKey(): string {
  return randomBytes(16).toString("hex");
}

/** Store a file buffer and return the generated storage key */
export async function storeFile(buffer: Buffer, originalFileName: string, mimeType: string): Promise<string> {
  const storageKey = generateStorageKey();
  if (STORAGE_BACKEND === "local") {
    const dir = await ensureLocalDir();
    const ext = originalFileName.split(".").pop();
    const filePath = join(dir, `${storageKey}.${ext}`);
    await fs.writeFile(filePath, buffer);
    return storageKey;
  }
  // Placeholder for S3 implementation – throw clear error for now
  throw new Error("S3 storage backend not implemented yet");
}

/** Delete a stored file given its storage key */
export async function deleteFile(storageKey: string, originalFileName: string): Promise<void> {
  if (STORAGE_BACKEND === "local") {
    const dir = await ensureLocalDir();
    const ext = originalFileName.split(".").pop();
    const filePath = join(dir, `${storageKey}.${ext}`);
    await fs.unlink(filePath).catch(() => {});
    return;
  }
  throw new Error("S3 storage backend not implemented yet");
}

/** Generate a signed URL for downloading a file. For local storage we simply return a path that will be served by an API route. */
export async function getSignedUrl(storageKey: string, originalFileName: string, ttlSeconds: number = Number(process.env.SIGNED_URL_TTL ?? "300")) {
  if (STORAGE_BACKEND === "local") {
    // The API route will validate ownership and then serve the file directly.
    // We return a URL that the client can request.
    const url = new URL(`/api/resume-versions/${storageKey}/download`, "http://localhost");
    url.searchParams.set("filename", originalFileName);
    url.searchParams.set("expires", String(Date.now() + ttlSeconds * 1000));
    return url.toString();
  }
  throw new Error("S3 storage backend not implemented yet");
}
