// src/lib/queue/redis.ts
import { Redis, type RedisOptions } from "ioredis";

export function getRedisConnectionOptions(): RedisOptions {
  if (process.env.REDIS_URL) {
    return {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
    };
  }

  return {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
  };
}

export function createRedisConnection(): Redis {
  const options = getRedisConnectionOptions();
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL, options);
  }
  return new Redis(options);
}

export function getRedisConnection(): Redis {
  return createRedisConnection();
}
