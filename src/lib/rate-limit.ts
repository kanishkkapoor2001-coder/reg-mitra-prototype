// Request throttling for the public AI endpoints.
//
// Each assistant question costs several gateway calls (rerank, computation plan,
// answer, verification), so an unthrottled public endpoint is both a cost risk and
// an outage risk. This caps per-caller usage before any of that work starts.
//
// Storage is a per-instance in-memory map. Two honest limitations:
//
//  1. On serverless the counter is per warm instance, not global. A determined
//     attacker spreading requests across cold starts gets more than the nominal
//     limit. It reliably stops a tight loop or a careless script — the realistic
//     threat for a public research preview — but it is not a hard spend cap.
//  2. In `next dev` the module is hot-reloaded between requests, so the map
//     resets and the limit cannot be observed locally. The logic is covered by
//     rate-limit.test.ts instead; behaviour in production is the real thing.
//
// The upgrade, when there is real money or real users to protect, is a shared
// store — a Supabase table keyed by caller and window, or Upstash. That is a
// contained change: only checkRateLimit's body needs to become async.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 5_000;

export interface RateLimitRule {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets — surfaced to the caller as Retry-After. */
  retryAfterSeconds: number;
}

/**
 * Best-effort caller identity. Vercel sets x-forwarded-for; everything here is
 * spoofable, which is acceptable for abuse-dampening but not for authorisation.
 */
export function callerKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
  return `${scope}:${ip}`;
}

export function checkRateLimit(key: string, rule: RateLimitRule, now = Date.now()): RateLimitResult {
  // Opportunistic sweep so a long-lived instance cannot grow without bound.
  if (buckets.size > MAX_TRACKED_KEYS) {
    for (const [existingKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(existingKey);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return { allowed: true, remaining: rule.limit - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= rule.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, remaining: rule.limit - bucket.count, retryAfterSeconds: 0 };
}

/** Reset — used by tests. */
export function resetRateLimits() {
  buckets.clear();
}

/**
 * Two windows together: a burst cap that stops a tight loop within seconds, and
 * an hourly cap that bounds total spend from one caller.
 */
export const ASSISTANT_BURST: RateLimitRule = { limit: 5, windowMs: 60_000 };
export const ASSISTANT_HOURLY: RateLimitRule = { limit: 40, windowMs: 60 * 60_000 };
export const UPLOAD_HOURLY: RateLimitRule = { limit: 15, windowMs: 60 * 60_000 };
