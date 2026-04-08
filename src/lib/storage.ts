/**
 * Storage abstraction:
 * - Local dev: reads/writes JSON files in /data
 * - Vercel: reads/writes Upstash Redis
 */

import { Redis } from "@upstash/redis";
import fs from "fs";
import path from "path";

const isVercel = !!process.env.VERCEL;
const DATA_DIR = path.join(process.cwd(), "data");

let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

function sanitize(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, "");
}

export async function storageGet<T>(key: string): Promise<T | null> {
  const safe = sanitize(key);
  if (isVercel) {
    return await getRedis().get<T>(safe);
  }
  try {
    const file = path.join(DATA_DIR, `${safe}.json`);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {}
  return null;
}

export async function storageSet(key: string, data: unknown): Promise<void> {
  const safe = sanitize(key);
  if (isVercel) {
    await getRedis().set(safe, JSON.stringify(data));
    return;
  }
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, `${safe}.json`), JSON.stringify(data, null, 2));
}
