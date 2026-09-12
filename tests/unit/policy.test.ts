import { describe, expect, it } from 'vitest';
import { byteLength, isExtensionPage, sourcePath } from '../../extension/src/core/policy';

describe('exact source boundary', () => {
  it.each([
    ['https://agentsearch.vercel.app/flights', '/flights'],
    ['https://agentsearch.vercel.app/flights/?s=private-value#secret', '/flights'],
    ['https://agentsearch.vercel.app/search?s=anything', '/search'],
  ])('allows %s but returns only the route family', (url, path) => expect(sourcePath(url ?? '')).toBe(path));
  it.each([
    'https://bo.bcflights.com/leads/12345', 'https://agentsearch.vercel.app/auth/signin?next=/flights',
    'https://agentsearch.vercel.app/profile', 'https://agentsearch.vercel.app/flights-admin',
    'https://agentsearch.vercel.app/search/account', 'http://agentsearch.vercel.app/flights',
    'https://agentsearch.vercel.app.evil.invalid/flights', 'https://agentsearch.vercel.app:444/flights',
    'https://user:password@agentsearch.vercel.app/flights', 'https://evil.invalid/#https://agentsearch.vercel.app/flights',
    'https://agentsearch.vercel.app/%66lights', '/flights', 'javascript:alert(1)', '',
  ])('rejects %s', (url) => expect(sourcePath(url)).toBeNull());
  it('allows only the exact internal popup identity', () => {
    expect(isExtensionPage('chrome-extension://abc/popup.html', 'abc', 'popup.html')).toBe(true);
    expect(isExtensionPage('chrome-extension://abc/popup.html?forward=evil', 'abc', 'popup.html')).toBe(false);
    expect(isExtensionPage('chrome-extension://other/popup.html', 'abc', 'popup.html')).toBe(false);
    expect(isExtensionPage(undefined, 'abc', 'popup.html')).toBe(false);
  });
  it('counts UTF-8 bytes rather than UTF-16 code units', () => expect(byteLength('✈')).toBe(3));
});
