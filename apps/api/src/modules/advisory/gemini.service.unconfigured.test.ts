import { afterEach, describe, expect, it, vi } from 'vitest';

// Isolated from the .env-backed integration test: stubs GEMINI_API_KEY empty and re-imports the
// module fresh, so this keeps covering the "fail clearly, never fake a response" behavior
// regardless of whether a real key is present in the environment running the suite.
describe('gemini.service when GEMINI_API_KEY is not configured', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('throws GeminiNotConfiguredError from chat()', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.resetModules();
    const gemini = await import('./gemini.service.js');
    await expect(gemini.chat({ history: [], message: 'hi', weather: null })).rejects.toThrow(
      gemini.GeminiNotConfiguredError,
    );
  });

  it('throws GeminiNotConfiguredError from analyzePestPhoto()', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.resetModules();
    const gemini = await import('./gemini.service.js');
    await expect(
      gemini.analyzePestPhoto({ imageBase64: 'AA==', mimeType: 'image/jpeg', weather: null }),
    ).rejects.toThrow(gemini.GeminiNotConfiguredError);
  });
});
