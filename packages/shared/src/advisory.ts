import { z } from 'zod';

export const sendAdvisoryMessageSchema = z.object({
  text: z.string().trim().min(1, 'Enter a question').max(2000),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});
export type SendAdvisoryMessageInput = z.infer<typeof sendAdvisoryMessageSchema>;

export const ChatRole = {
  USER: 'user',
  ASSISTANT: 'assistant',
} as const;
export type ChatRole = (typeof ChatRole)[keyof typeof ChatRole];
