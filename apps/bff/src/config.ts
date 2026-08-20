export interface BffConfig {
  host: string;
  port: number;
  workServiceBaseUrl: string;
  requestTimeoutMs: number;
  retryMaxAttempts: number;
  retryBaseDelayMs: number;
  rateLimitCapacity: number;
  rateLimitRefillPerSecond: number;
  shutdownTimeoutMs: number;
}

function integerEnv(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  min: number,
  max: number
): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BffConfig {
  const rawBaseUrl = env.WORK_SERVICE_BASE_URL ?? 'http://127.0.0.1:8080';
  const workServiceBaseUrl = new URL(rawBaseUrl).toString().replace(/\/$/, '');

  return {
    host: env.HOST ?? '127.0.0.1',
    port: integerEnv(env, 'PORT', 3000, 1, 65535),
    workServiceBaseUrl,
    requestTimeoutMs: integerEnv(env, 'UPSTREAM_TIMEOUT_MS', 1500, 50, 30000),
    retryMaxAttempts: integerEnv(env, 'UPSTREAM_MAX_ATTEMPTS', 2, 1, 3),
    retryBaseDelayMs: integerEnv(env, 'UPSTREAM_RETRY_BASE_DELAY_MS', 25, 0, 1000),
    rateLimitCapacity: integerEnv(env, 'RATE_LIMIT_CAPACITY', 20, 1, 10000),
    rateLimitRefillPerSecond: integerEnv(env, 'RATE_LIMIT_REFILL_PER_SECOND', 10, 1, 10000),
    shutdownTimeoutMs: integerEnv(env, 'SHUTDOWN_TIMEOUT_MS', 5000, 100, 30000)
  };
}
