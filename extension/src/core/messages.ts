export const OPEN_CAPTURE = 'SPICY_CAPTURE_OPEN';
export const BEGIN_CAPTURE = 'SPICY_CAPTURE_BEGIN';
export type CaptureMessage = { type: typeof OPEN_CAPTURE | typeof BEGIN_CAPTURE; version: 1 };
export type CaptureReply = { ok: true } | { ok: false; message: string };

export function isMessage(value: unknown, type: CaptureMessage['type']): value is CaptureMessage {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const object = value as Record<string, unknown>;
  return Object.keys(object).length === 2 && Object.hasOwn(object, 'type') && Object.hasOwn(object, 'version') && object['type'] === type && object['version'] === 1;
}

export function isReply(value: unknown): value is CaptureReply {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const object = value as Record<string, unknown>;
  return object['ok'] === true || (object['ok'] === false && typeof object['message'] === 'string');
}
