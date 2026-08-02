import { randomUUID } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import { UPLOADS_DIR } from '../../lib/uploadsDir.js';
import * as advisoryRepository from './advisory.repository.js';
import * as geminiService from './gemini.service.js';
import * as weatherService from './weather.service.js';

const HISTORY_LIMIT = 20;

function serializeMessage(message: {
  id: string;
  role: string;
  content: string;
  imageUrl: string | null;
  createdAt: Date;
}) {
  return {
    id: message.id,
    role: message.role as 'user' | 'assistant',
    content: message.content,
    imageUrl: message.imageUrl,
    createdAt: message.createdAt,
  };
}

export async function getHistory(userId: string) {
  const rows = await advisoryRepository.listRecentMessages(userId, HISTORY_LIMIT);
  return rows.reverse().map(serializeMessage);
}

async function loadHistoryForPrompt(userId: string): Promise<geminiService.HistoryMessage[]> {
  const rows = await advisoryRepository.listRecentMessages(userId, HISTORY_LIMIT);
  return rows
    .reverse()
    .map((r) => ({ role: r.role as 'user' | 'assistant', content: r.content }));
}

export async function sendMessage(userId: string, text: string, lat?: number, lng?: number) {
  const history = await loadHistoryForPrompt(userId);
  const weather = lat !== undefined && lng !== undefined ? await weatherService.getWeather(lat, lng) : null;

  const userMessage = await advisoryRepository.createMessage(userId, 'user', text);
  const replyText = await geminiService.chat({ history, message: text, weather });
  const assistantMessage = await advisoryRepository.createMessage(userId, 'assistant', replyText);

  return {
    userMessage: serializeMessage(userMessage),
    assistantMessage: serializeMessage(assistantMessage),
  };
}

export async function sendPhoto(
  userId: string,
  imageBuffer: Buffer,
  caption?: string,
  lat?: number,
  lng?: number,
) {
  const weather = lat !== undefined && lng !== undefined ? await weatherService.getWeather(lat, lng) : null;

  // Saved copy for display in the chat history — same resize approach as listing photos.
  const filename = `${randomUUID()}.jpg`;
  await sharp(imageBuffer)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(path.join(UPLOADS_DIR, filename));
  const imageUrl = `/uploads/${filename}`;

  const userMessage = await advisoryRepository.createMessage(
    userId,
    'user',
    caption?.trim() || '📷 Photo',
    imageUrl,
  );

  // A smaller copy for the vision call — keeps image tokens down without losing the detail
  // needed to spot pest/disease symptoms.
  const visionBuffer = await sharp(imageBuffer)
    .rotate()
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const replyText = await geminiService.analyzePestPhoto({
    imageBase64: visionBuffer.toString('base64'),
    mimeType: 'image/jpeg',
    caption,
    weather,
  });
  const assistantMessage = await advisoryRepository.createMessage(userId, 'assistant', replyText);

  return {
    userMessage: serializeMessage(userMessage),
    assistantMessage: serializeMessage(assistantMessage),
  };
}
