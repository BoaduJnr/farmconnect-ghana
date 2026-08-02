import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';
import type { WeatherSnapshot } from './weather.service.js';

const isConfigured = Boolean(env.GEMINI_API_KEY);
const ai = isConfigured ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY! }) : null;

// One model for both text advice and photo-based pest ID — keeps the integration simple for a
// capstone-scale app; Flash is fast, free-tier friendly, and vision-capable. Use the "-latest"
// alias rather than pinning a dated version: Google periodically retires dated model names for
// new API keys/projects (e.g. gemini-2.5-flash returned 404 "no longer available to new users"
// during testing), and the alias is Google's own forward-compatible pointer to a current model.
const MODEL = 'gemini-flash-latest';

export class GeminiNotConfiguredError extends Error {
  constructor() {
    super('The AI advisor is not configured yet — add GEMINI_API_KEY to .env');
    this.name = 'GeminiNotConfiguredError';
  }
}

const SYSTEM_CORE =
  "You are FarmConnect Ghana's agricultural advisor, helping Ghanaian smallholder farmers and " +
  'buyers. Give practical, concise, Ghana-specific advice on crops, pests, weather, and market ' +
  'timing. Respond in the same language the user writes in (English or Twi/Akan). When shown a ' +
  'photo, focus on visible symptoms and suggest locally available treatments; if the photo is ' +
  'unclear, say so and ask for a better angle or lighting. Keep responses short — 2 to 4 ' +
  'sentences unless the question genuinely needs more detail.';

function buildSystemInstruction(weather: WeatherSnapshot | null): string {
  if (!weather) return SYSTEM_CORE;
  return (
    `${SYSTEM_CORE}\n\nCurrent weather in ${weather.locationName}: ${weather.tempC}°C, ` +
    `${weather.description}, humidity ${weather.humidityPct}%, wind ${weather.windSpeedMs} m/s. ` +
    'Mention this only if it is relevant to what the user is asking.'
  );
}

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chat(params: {
  history: HistoryMessage[];
  message: string;
  weather: WeatherSnapshot | null;
}): Promise<string> {
  if (!ai) {
    throw new GeminiNotConfiguredError();
  }

  const contents = [
    ...params.history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: params.message }] },
  ];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: { systemInstruction: buildSystemInstruction(params.weather) },
  });

  return response.text ?? '';
}

export async function analyzePestPhoto(params: {
  imageBase64: string;
  mimeType: string;
  caption?: string;
  weather: WeatherSnapshot | null;
}): Promise<string> {
  if (!ai) {
    throw new GeminiNotConfiguredError();
  }

  const promptText =
    params.caption?.trim() ||
    'Identify any visible pest or disease on this crop and suggest a treatment appropriate for ' +
      'smallholder farming in Ghana.';

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [{ text: promptText }, { inlineData: { mimeType: params.mimeType, data: params.imageBase64 } }],
      },
    ],
    config: { systemInstruction: buildSystemInstruction(params.weather) },
  });

  return response.text ?? '';
}
