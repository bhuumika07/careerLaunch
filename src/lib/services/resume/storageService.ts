// src/lib/services/resume/storageService.ts

/**
 * Thin wrapper around the generic storage utility. It isolates the resume
 * service from the low‑level file handling implementation and makes unit
 * testing easier (we can mock these functions).
 */
import { storeFile, deleteFile, getSignedUrl } from "../../../lib/utils/storage";

export async function storeResumeFile(buffer: Buffer, originalFileName: string, mimeType: string) {
  return await storeFile(buffer, originalFileName, mimeType);
}

export async function deleteResumeFile(storageKey: string, originalFileName: string) {
  return await deleteFile(storageKey, originalFileName);
}

export async function getResumeSignedUrl(storageKey: string, originalFileName: string, ttlSeconds?: number) {
  return await getSignedUrl(storageKey, originalFileName, ttlSeconds);
}
