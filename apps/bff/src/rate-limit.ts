export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface Bucket {
  tokens: number;
  lastRefillMs: number;
  lastSeenMs: number;
}

export class TokenBucketRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private checks = 0;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    private readonly now: () => number = Date.now,
    private readonly maxBuckets = 10000,
    private readonly staleAfterMs = 10 * 60 * 1000
  ) {
    if (capacity <= 0) throw new Error('rate-limit capacity must be positive');
    if (refillPerSecond < 0) throw new Error('rate-limit refill rate must be non-negative');
    if (maxBuckets <= 0) throw new Error('rate-limit maxBuckets must be positive');
  }

  check(key: string): RateLimitDecision {
    const now = this.now();
    this.checks += 1;
    if ((this.checks & 1023) === 0) this.prune(now);

    let bucket = this.buckets.get(key);
    if (bucket === undefined) {
      if (this.buckets.size >= this.maxBuckets) this.evictOldest();
      bucket = { tokens: this.capacity, lastRefillMs: now, lastSeenMs: now };
      this.buckets.set(key, bucket);
    }

    const elapsedSeconds = Math.max(0, now - bucket.lastRefillMs) / 1000;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsedSeconds * this.refillPerSecond);
    bucket.lastRefillMs = now;
    bucket.lastSeenMs = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const retryAfterSeconds = this.refillPerSecond === 0
      ? 60
      : Math.max(1, Math.ceil((1 - bucket.tokens) / this.refillPerSecond));
    return { allowed: false, retryAfterSeconds };
  }

  private prune(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastSeenMs > this.staleAfterMs) this.buckets.delete(key);
    }
  }

  private evictOldest(): void {
    let oldestKey: string | undefined;
    let oldestSeen = Number.POSITIVE_INFINITY;
    for (const [key, bucket] of this.buckets) {
      if (bucket.lastSeenMs < oldestSeen) {
        oldestSeen = bucket.lastSeenMs;
        oldestKey = key;
      }
    }
    if (oldestKey !== undefined) this.buckets.delete(oldestKey);
  }
}
