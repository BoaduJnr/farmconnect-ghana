import { describe, expect, it } from 'vitest';
import { parseCommand } from './commandParser.js';

describe('parseCommand', () => {
  it('returns null for empty or whitespace-only input', () => {
    expect(parseCommand('')).toBeNull();
    expect(parseCommand('   ')).toBeNull();
  });

  it('uppercases the command and splits args on whitespace', () => {
    expect(parseCommand('list maize 100 4.50 Kumasi')).toEqual({
      command: 'LIST',
      args: ['maize', '100', '4.50', 'Kumasi'],
    });
  });

  it('handles a command with no args', () => {
    expect(parseCommand('orders')).toEqual({ command: 'ORDERS', args: [] });
  });

  it('collapses repeated whitespace and trims surrounding spaces', () => {
    expect(parseCommand('  reg   Ama   Serwaa  ')).toEqual({
      command: 'REG',
      args: ['Ama', 'Serwaa'],
    });
  });

  it('preserves mixed-case args, only uppercasing the command word', () => {
    expect(parseCommand('momo mtn 0241234567')).toEqual({
      command: 'MOMO',
      args: ['mtn', '0241234567'],
    });
  });
});
