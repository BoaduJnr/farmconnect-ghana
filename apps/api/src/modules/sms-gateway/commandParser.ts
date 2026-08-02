export interface ParsedCommand {
  command: string;
  args: string[];
}

/** Fixed command grammar for feature-phone users (FR-11) — deliberately not full app parity,
 * just the handful of actions someone without a smartphone needs: REG, MOMO, LIST, PRICE,
 * ORDERS, CONFIRM, HELP. */
export function parseCommand(rawText: string): ParsedCommand | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const [command, ...args] = trimmed.split(/\s+/);
  return { command: command.toUpperCase(), args };
}
