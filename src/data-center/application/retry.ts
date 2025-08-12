export interface RetryOptions {
  retries: number;
  baseDelayMs: number;
  factor?: number;
  maxDelayMs?: number;
  jitter?: boolean;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
  onAttempt?: (attempt: number, err: unknown, delayMs: number) => void,
): Promise<T> {
  const {
    retries,
    baseDelayMs,
    factor = 2,
    maxDelayMs = Infinity,
    jitter = true,
  } = opts;

  let attempt = 0;
  // делаем retries попыток поверх первой (итого max attempts = retries + 1)
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries) throw err;
      const pureDelay =
        Math.min(baseDelayMs * Math.pow(factor, attempt), maxDelayMs) || 0;
      const delay = jitter
        ? Math.round(pureDelay * (0.5 + Math.random()))
        : pureDelay;
      onAttempt?.(attempt + 1, err, delay);
      await sleep(delay);
      attempt++;
    }
  }
}
