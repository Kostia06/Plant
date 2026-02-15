interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

interface LimitConfig {
  maxRequests: number;
  windowMs: number;
}

const LIMITS: Record<string, LimitConfig> = {
  global: { maxRequests: 30, windowMs: 60_000 },
  analysis: { maxRequests: 10, windowMs: 3_600_000 },
  "teaser-answer": { maxRequests: 3, windowMs: 86_400_000 },
};

const timestamps = new Map<string, number[]>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 300_000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const maxWindow = Math.max(...Object.values(LIMITS).map((l) => l.windowMs));

  for (const [key, times] of timestamps) {
    const filtered = times.filter((t) => now - t < maxWindow);
    if (filtered.length === 0) {
      timestamps.delete(key);
    } else {
      timestamps.set(key, filtered);
    }
  }
}

function check(key: string, config: LimitConfig): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const existing = timestamps.get(key) ?? [];
  const inWindow = existing.filter((t) => t > windowStart);

  if (inWindow.length >= config.maxRequests) {
    const oldest = inWindow[0];
    const retryAfter = Math.ceil((oldest + config.windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }

  inWindow.push(now);
  timestamps.set(key, inWindow);
  return { allowed: true };
}

export function checkRateLimit(
  userId: string,
  endpoint: string,
): RateLimitResult {
  cleanup();

  const globalResult = check(`${userId}:global`, LIMITS.global);
  if (!globalResult.allowed) return globalResult;

  const endpointConfig = LIMITS[endpoint];
  if (endpointConfig) {
    return check(`${userId}:${endpoint}`, endpointConfig);
  }

  return { allowed: true };
}
