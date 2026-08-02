/**
 * Vitest runs each test file in its own worker process, and several *.flow.test.ts files
 * generate throwaway phone numbers from Date.now(). Two files launched in the same
 * millisecond can otherwise mint the identical phone number and collide on the
 * User.phone unique constraint. Mixing in process.pid (unique per worker) fixes that
 * without needing every file to agree on non-overlapping numeric ranges.
 */
export function uniqueTestPhone(prefix: string): string {
  const pidPart = (process.pid % 1000).toString().padStart(3, '0');
  const timePart = Date.now().toString().slice(-3);
  return `${prefix}${pidPart}${timePart}`;
}
