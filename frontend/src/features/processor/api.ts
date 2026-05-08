import { ProcessAudioInput, ProcessAudioResult } from './types';

export async function processAudio({ file, options }: ProcessAudioInput): Promise<ProcessAudioResult> {
  const formData = new FormData();
  formData.set('file', file);
  formData.set('target_lufs', String(options.targetLufs));
  formData.set('format', options.format);
  formData.set('trim_silence', String(options.trimSilence));

  const endpoint = new URL('/api/process', normalizeBaseUrl(options.apiBaseUrl));
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(await responseMessage(response));
  }

  const blob = await response.blob();
  return {
    blob,
    url: URL.createObjectURL(blob),
    filename: filenameFromHeader(response.headers.get('Content-Disposition')) ?? fallbackFilename(file.name, options.format)
  };
}

function normalizeBaseUrl(value: string) {
  return value.endsWith('/') ? value : `${value}/`;
}

function filenameFromHeader(header: string | null) {
  if (!header) return null;
  const match = /filename="([^"]+)"/i.exec(header) ?? /filename=([^;]+)/i.exec(header);
  return match?.[1]?.trim() ?? null;
}

function fallbackFilename(name: string, format: string) {
  const base = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '-');
  return `${base || 'episode'}-postline.${format}`;
}

async function responseMessage(response: Response) {
  const contentType = response.headers.get('Content-Type') ?? '';
  if (contentType.includes('application/json')) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (body?.error) return body.error;
  }
  return `Request failed with HTTP ${response.status}`;
}

