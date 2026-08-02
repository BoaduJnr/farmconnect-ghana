const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 60 * 60 * 24,
};

/** Parses simple durations like "12h", "30d", "300s" (the same format used by JWT_*_EXPIRES_IN) into seconds. */
export function parseDurationToSeconds(input: string): number {
  const match = /^(\d+)([smhd])$/.exec(input.trim());
  if (!match) {
    throw new Error(`Unsupported duration format: "${input}" (expected e.g. "12h", "30d", "300s")`);
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_SECONDS[unit];
}
