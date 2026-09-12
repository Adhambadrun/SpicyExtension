import { describe, expect, it } from 'vitest';
import { captureFilename, parseCapture, serializeCapture } from '../../extension/src/core/snapshot';
import type { Capture } from '../../extension/src/core/snapshot';
import { LIMITS } from '../../extension/src/core/policy';

function capture(): Capture {
  return {
    format: 'bcf-basis-inspector', version: 1,
    source: { origin: 'https://agentsearch.vercel.app', path: '/flights' },
    capturedAt: '2026-09-12T10:30:00.000Z', kind: 'result-card',
    selection: { tag: 'article', html: '<article>AAA → BBB</article>', text: 'AAA → BBB' },
    stats: { elements: 1, omittedElements: 0, droppedAttributes: 0, redactedTextNodes: 0 }, warnings: [],
  };
}

describe('local export contract', () => {
  it('round-trips reviewed, redacted JSON without adding sensitive metadata', () => {
    const data = capture();
    data.selection.text = '[name removed]';
    expect(parseCapture(serializeCapture(data))).toEqual(data);
    expect(captureFilename(data)).toBe('bcf-basis-result-card-2026-09-12T10-30-00-000Z.json');
  });
  it('supports a separate expanded-details capture', () => {
    const data = capture(); data.kind = 'itinerary-details';
    expect(parseCapture(serializeCapture(data)).kind).toBe('itinerary-details');
  });
  it.each(['{bad JSON', 'null', '[]', '42', '"text"'])('rejects malformed root %s', (text) => expect(() => parseCapture(text)).toThrow());
  it.each([
    { format: 'flight-api-response' }, { version: 2 }, { kind: 'unknown' }, { cookies: 'PRIVATE' },
    { source: { origin: 'https://evil.invalid', path: '/flights' } },
    { source: { origin: 'https://agentsearch.vercel.app', path: '/flights?token=SECRET' } },
    { source: { origin: 'https://agentsearch.vercel.app', path: '/flights', query: 'PRIVATE' } },
    { capturedAt: '../../private' }, { capturedAt: '2026-02-30T10:00:00.000Z' },
    { selection: { tag: 'script bad', html: '', text: '' } },
    { selection: { tag: 'div', html: '', text: '', account: 'PRIVATE' } },
    { stats: { elements: -1, omittedElements: 0, droppedAttributes: 0, redactedTextNodes: 0 } },
    { warnings: [42] },
  ])('rejects unsafe/unexpected metadata %j', (change) => {
    expect(() => parseCapture(JSON.stringify({ ...capture(), ...change }))).toThrow();
  });
  it('rejects oversized files, including Unicode byte expansion', () => {
    expect(() => parseCapture(' '.repeat(LIMITS.fileBytes + 1))).toThrow('size limit');
    const data = capture(); data.selection.html = '✈'.repeat(100_000);
    expect(() => serializeCapture(data)).toThrow('too large');
  });
  it('rejects oversized structured fields after editing', () => {
    const data = capture(); data.selection.text = 'x'.repeat(LIMITS.text + 1);
    expect(() => parseCapture(JSON.stringify(data))).toThrow('structure');
  });
});
