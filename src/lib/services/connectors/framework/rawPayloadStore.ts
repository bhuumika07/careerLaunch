// src/lib/services/connectors/framework/rawPayloadStore.ts
import { createHash } from "node:crypto";
import type { RawPayloadRecord } from "./types.ts";

/**
 * Isolated Raw Payload Storage Engine
 *
 * Stores raw response documents (JSON, HTML, XML) independently from normalized
 * Opportunity records, ensuring complete data provenance without bloating query indices.
 */
export class RawPayloadStore {
  private static instance: RawPayloadStore;
  private inMemoryStore = new Map<string, RawPayloadRecord>();

  private constructor() {}

  public static getInstance(): RawPayloadStore {
    if (!RawPayloadStore.instance) {
      RawPayloadStore.instance = new RawPayloadStore();
    }
    return RawPayloadStore.instance;
  }

  /**
   * Computes a deterministic SHA-256 hash of a payload string.
   */
  public computeHash(content: string): string {
    return createHash("sha256").update(content, "utf8").digest("hex");
  }

  /**
   * Stores a raw payload and returns its unique storage reference key.
   */
  public async save(params: {
    sourceId: string;
    payload: string | Record<string, any>;
    contentType?: string;
    externalId?: string | null;
  }): Promise<RawPayloadRecord> {
    const rawString =
      typeof params.payload === "string"
        ? params.payload
        : JSON.stringify(params.payload);

    const contentHash = this.computeHash(rawString);
    const shortHash = contentHash.substring(0, 12);
    const identifier = params.externalId
      ? params.externalId.replace(/[^a-zA-Z0-9_-]/g, "_")
      : Date.now().toString();

    const ref = `raw://${params.sourceId}/${identifier}_${shortHash}.json`;
    const fetchedAt = new Date().toISOString();

    const record: RawPayloadRecord = {
      ref,
      sourceId: params.sourceId,
      externalId: params.externalId || null,
      contentHash,
      payload: rawString,
      contentType: params.contentType || "application/json",
      fetchedAt,
    };

    this.inMemoryStore.set(ref, record);
    return record;
  }

  /**
   * Retrieves a raw payload record by reference key.
   */
  public async get(ref: string): Promise<RawPayloadRecord | null> {
    return this.inMemoryStore.get(ref) || null;
  }

  /**
   * Clears the in-memory payload store (useful for test isolation).
   */
  public clear(): void {
    this.inMemoryStore.clear();
  }

  /**
   * Count of currently stored raw payloads.
   */
  public count(): number {
    return this.inMemoryStore.size;
  }
}
