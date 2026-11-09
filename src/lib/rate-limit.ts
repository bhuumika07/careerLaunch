import { readDb, writeDb, RateLimitRecord } from "./db";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntil?: number;
  retryAfterSeconds?: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const db = readDb();
  const now = Date.now();

  const recordIndex = db.rateLimits.findIndex((r) => r.key === key);
  const record: RateLimitRecord | undefined = db.rateLimits[recordIndex];

  if (!record) {
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
    };
  }

  // Check if currently locked
  if (record.lockedUntil && record.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: record.lockedUntil,
      retryAfterSeconds,
    };
  }

  // Check if window has expired
  if (now - record.lastAttempt > WINDOW_MS) {
    // Reset window
    db.rateLimits.splice(recordIndex, 1);
    writeDb(db);
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
    };
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - record.attempts);
  return {
    allowed: remaining > 0,
    remainingAttempts: remaining,
  };
}

export function recordFailedAttempt(key: string): RateLimitResult {
  const db = readDb();
  const now = Date.now();

  const recordIndex = db.rateLimits.findIndex((r) => r.key === key);
  let record: RateLimitRecord;

  if (recordIndex >= 0) {
    record = db.rateLimits[recordIndex];
    if (now - record.lastAttempt > WINDOW_MS) {
      record.attempts = 1;
      record.lockedUntil = undefined;
    } else {
      record.attempts += 1;
      if (record.attempts >= MAX_ATTEMPTS) {
        record.lockedUntil = now + LOCKOUT_MS;
      }
    }
    record.lastAttempt = now;
    db.rateLimits[recordIndex] = record;
  } else {
    record = {
      key,
      attempts: 1,
      lastAttempt: now,
    };
    db.rateLimits.push(record);
  }

  writeDb(db);

  if (record.lockedUntil && record.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: record.lockedUntil,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - record.attempts),
  };
}

export function resetRateLimit(key: string): void {
  const db = readDb();
  db.rateLimits = db.rateLimits.filter((r) => r.key !== key);
  writeDb(db);
}
