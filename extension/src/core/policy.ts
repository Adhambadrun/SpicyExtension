export const SITE_ORIGIN = 'https://agentsearch.vercel.app';
export const CAPTURE_ROOT_ID = 'spicyextension-capture-root';
export const DISPOSE_EVENT = 'spicyextension-capture:dispose';
export const LIMITS = Object.freeze({ elements: 1_200, text: 40_000, html: 160_000, fileBytes: 260_000 });

export type SourcePath = '/flights' | '/search';

/** Deliberately excludes sign-in, arbitrary ports, lookalike hosts and other routes. */
export function sourcePath(input: string): SourcePath | null {
  try {
    const url = new URL(input);
    if (url.origin !== SITE_ORIGIN || url.username || url.password) return null;
    const path = url.pathname.replace(/\/$/, '');
    return path === '/flights' || path === '/search' ? path : null;
  } catch {
    return null;
  }
}

export function isExtensionPage(url: string | undefined, runtimeId: string, filename: string): boolean {
  return url === `chrome-extension://${runtimeId}/${filename}`;
}

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}
