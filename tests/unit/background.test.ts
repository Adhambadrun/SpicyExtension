import { describe, expect, it, vi } from 'vitest';
import { openActiveInspector } from '../../extension/src/background/inspection';
import { BEGIN_INSPECTION } from '../../extension/src/core/messages';

describe('active-tab routing without cookie or storage access', () => {
  it('sends only the named operation to the active exact Basis tab', async () => {
    const send = vi.fn().mockResolvedValue({ ok: true });
    const result = await openActiveInspector({ active: async () => ({ id: 7, url: 'https://agentsearch.vercel.app/flights?s=PRIVATE_QUERY' }), send });
    expect(result).toEqual({ ok: true });
    expect(send).toHaveBeenCalledExactlyOnceWith(7, { type: BEGIN_INSPECTION, version: 1 });
  });
  it.each([undefined, { id: 1 }, { id: 1, url: 'https://bo.bcflights.com/leads/12345' }, { id: 1, url: 'https://agentsearch.vercel.app/auth/signin' }])('does not message an unsupported/missing tab', async (tab) => {
    const send = vi.fn();
    const result = await openActiveInspector({ active: async () => tab, send });
    expect(result.ok).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
  it('reports source-content absence after extension reload', async () => {
    const result = await openActiveInspector({ active: async () => ({ id: 1, url: 'https://agentsearch.vercel.app/search' }), send: async () => { throw new Error('Receiving end does not exist'); } });
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining('Reload') });
  });
  it('handles query failures without exposing raw errors', async () => {
    const result = await openActiveInspector({ active: async () => { throw new Error('PRIVATE_CONTEXT'); }, send: vi.fn() });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('PRIVATE_CONTEXT');
  });
  it('rejects an unacknowledged result, and preserves explicit source failure', async () => {
    const active = async () => ({ id: 7, url: 'https://agentsearch.vercel.app/flights' });
    expect((await openActiveInspector({ active, send: async () => ({ unknown: 'value' }) })).ok).toBe(false);
    expect(await openActiveInspector({ active, send: async () => ({ ok: false, message: 'Select another area.' }) })).toEqual({ ok: false, message: 'Select another area.' });
  });
});
