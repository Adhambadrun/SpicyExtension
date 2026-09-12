export const OPEN_INSPECTOR = 'BCF_INSPECTOR_OPEN';
export const BEGIN_INSPECTION = 'BCF_INSPECTOR_BEGIN';
export type InspectorMessage = { type: typeof OPEN_INSPECTOR | typeof BEGIN_INSPECTION; version: 1 };
export type InspectorReply = { ok: true } | { ok: false; message: string };

export function isMessage(value: unknown, type: InspectorMessage['type']): value is InspectorMessage {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const object = value as Record<string, unknown>;
  return Object.keys(object).length === 2 && Object.hasOwn(object, 'type') && Object.hasOwn(object, 'version') && object['type'] === type && object['version'] === 1;
}

export function isReply(value: unknown): value is InspectorReply {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const object = value as Record<string, unknown>;
  return object['ok'] === true || (object['ok'] === false && typeof object['message'] === 'string');
}
