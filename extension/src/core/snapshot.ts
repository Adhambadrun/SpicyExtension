import { BASIS_ORIGIN, LIMITS, byteLength, sourcePath } from './policy';
import type { SourcePath } from './policy';

export type CaptureKind = 'result-card' | 'itinerary-details';
export interface CaptureStats {
  elements: number;
  omittedElements: number;
  droppedAttributes: number;
  redactedTextNodes: number;
}
export interface Capture {
  format: 'bcf-basis-inspector';
  version: 1;
  source: { origin: typeof BASIS_ORIGIN; path: SourcePath };
  capturedAt: string;
  kind: CaptureKind;
  selection: { tag: string; html: string; text: string };
  stats: CaptureStats;
  warnings: string[];
}

export const REVIEW_WARNING = 'Names, booking references and other personal information may remain. Review and remove them before sharing.';

export function serializeCapture(capture: Capture): string {
  const text = JSON.stringify(capture, null, 2);
  if (byteLength(text) > LIMITS.fileBytes) throw new Error('This selection is too large. Select one smaller result area.');
  return text;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function onlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key)) && keys.every((key) => key in value);
}

/** Validate edited JSON; never evaluate or render exported HTML. No arbitrary metadata. */
export function parseCapture(text: string): Capture {
  if (byteLength(text) > LIMITS.fileBytes) throw new Error('The capture exceeds the size limit. Use a smaller area.');
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('The review text is not valid JSON. Undo the edit or select the result again.'); }
  if (!record(data) || !onlyKeys(data, ['format', 'version', 'source', 'capturedAt', 'kind', 'selection', 'stats', 'warnings']) ||
    data['format'] !== 'bcf-basis-inspector' || data['version'] !== 1 ||
    !record(data['source']) || !onlyKeys(data['source'], ['origin', 'path']) ||
    data['source']['origin'] !== BASIS_ORIGIN ||
    !['/flights', '/search'].includes(String(data['source']['path'])) ||
    sourcePath(`${BASIS_ORIGIN}${String(data['source']['path'])}`) !== data['source']['path'] ||
    typeof data['capturedAt'] !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(data['capturedAt']) ||
    !Number.isFinite(Date.parse(data['capturedAt'])) || new Date(data['capturedAt']).toISOString() !== data['capturedAt'] ||
    !['result-card', 'itinerary-details'].includes(String(data['kind'])) ||
    !record(data['selection']) || !onlyKeys(data['selection'], ['tag', 'html', 'text']) ||
    typeof data['selection']['tag'] !== 'string' || !/^[a-z][a-z0-9-]{0,60}$/.test(data['selection']['tag']) ||
    typeof data['selection']['html'] !== 'string' || data['selection']['html'].length > LIMITS.html ||
    typeof data['selection']['text'] !== 'string' || data['selection']['text'].length > LIMITS.text ||
    !record(data['stats']) || !onlyKeys(data['stats'], ['elements', 'omittedElements', 'droppedAttributes', 'redactedTextNodes']) ||
    !Object.values(data['stats']).every((n) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= 100_000) ||
    !Array.isArray(data['warnings']) || data['warnings'].length > 20 ||
    !data['warnings'].every((value: unknown) => typeof value === 'string' && value.length <= 500)) {
    throw new Error('Keep the capture structure intact. Edit only text that needs redaction, or select the result again.');
  }
  // All properties of this bounded, JSON-only object were checked above.
  return data as unknown as Capture;
}

export function captureFilename(capture: Capture): string {
  return `bcf-basis-${capture.kind}-${capture.capturedAt.replace(/[:.]/g, '-')}.json`;
}
