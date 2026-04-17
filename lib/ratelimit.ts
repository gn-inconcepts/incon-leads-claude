const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 3;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + WINDOW_MS;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: MAX_PER_WINDOW - 1, resetAt };
  }

  if (bucket.count >= MAX_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: MAX_PER_WINDOW - bucket.count,
    resetAt: bucket.resetAt,
  };
}

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets.entries()) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }, WINDOW_MS).unref?.();
}
