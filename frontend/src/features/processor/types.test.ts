import { describe, expect, it } from 'vitest';
import { processOptionsSchema } from './types';

describe('processOptionsSchema', () => {
  it('accepts podcast defaults', () => {
    const parsed = processOptionsSchema.safeParse({
      apiBaseUrl: 'http://localhost:8080',
      targetLufs: -16,
      format: 'mp3',
      trimSilence: true
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects unsupported formats', () => {
    const parsed = processOptionsSchema.safeParse({
      apiBaseUrl: 'http://localhost:8080',
      targetLufs: -16,
      format: 'ogg',
      trimSilence: true
    });

    expect(parsed.success).toBe(false);
  });
});

