import { describe, expect, it } from 'vitest';
import { BEGIN_CAPTURE, OPEN_CAPTURE, isMessage, isReply } from '../../extension/src/core/messages';

describe('bounded internal messages', () => {
  it('recognizes only the specified version and operation', () => {
    expect(isMessage({ type: BEGIN_CAPTURE, version: 1 }, BEGIN_CAPTURE)).toBe(true);
    expect(isMessage({ type: OPEN_CAPTURE, version: 1 }, BEGIN_CAPTURE)).toBe(false);
    expect(isMessage({ type: BEGIN_CAPTURE, version: 2 }, BEGIN_CAPTURE)).toBe(false);
  });
  it.each([null, [], 'begin', 1, {}, { type: BEGIN_CAPTURE, version: 1, url: 'https://evil.invalid' }])('rejects invalid/additional data: %j', (value) => expect(isMessage(value, BEGIN_CAPTURE)).toBe(false));
  it('rejects inherited protocol fields', () => {
    const inherited: unknown = Object.assign(Object.create({ type: BEGIN_CAPTURE, version: 1 }) as object, { a: 1, b: 2 });
    expect(isMessage(inherited, BEGIN_CAPTURE)).toBe(false);
  });
  it('distinguishes meaningful replies from missing/malformed replies', () => {
    expect(isReply({ ok: true })).toBe(true);
    expect(isReply({ ok: false, message: 'Reload the site tab.' })).toBe(true);
    expect(isReply({ ok: 'yes' })).toBe(false);
    expect(isReply({ ok: false, message: 23 })).toBe(false);
    expect(isReply(null)).toBe(false);
  });
});
