// Simple in-memory rate limiter for API routes
// For production, use Upstash Redis or Vercel KV for distributed rate limiting

const WINDOW_MS = 60 * 1000; // 1 minute

const MAX_REQUESTS = {
  default: 60, // 60 req/min default
  auth: 10, // 10 req/min for auth endpoints
  write: 30, // 30 req/min for write operations
};

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export function resetRateLimitStore() {
  store.clear();
}

function getKey(ip: string, route: string): string {
  return `${ip}:${route}`;
}

function cleanup() {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  });
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  ip: string,
  route: string,
  limitType: 'default' | 'auth' | 'write' = 'default'
): RateLimitResult {
  cleanup();

  const key = getKey(ip, route);
  const now = Date.now();
  const limit = MAX_REQUESTS[limitType];

  let entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    store.set(key, entry);
  }

  entry.count++;

  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

export function getClientIp(request: Request): string {
  // Try common proxy headers
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback - not reliable in production behind proxy
  return 'unknown';
}
