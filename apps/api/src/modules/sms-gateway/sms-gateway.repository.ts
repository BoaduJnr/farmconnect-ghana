import { prisma } from '../../lib/prisma.js';

export function logInbound(fromPhone: string, rawText: string, parsedCommand: string | null, responseText: string) {
  return prisma.smsInboundLog.create({
    data: { fromPhone, rawText, parsedCommand, responseText },
  });
}
