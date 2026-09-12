import { BEGIN_CAPTURE, isReply } from '../core/messages';
import type { CaptureReply } from '../core/messages';
import { sourcePath } from '../core/policy';

export interface CaptureTabs {
  active: () => Promise<{ id?: number | undefined; url?: string | undefined } | undefined>;
  send: (tabId: number, message: { type: typeof BEGIN_CAPTURE; version: 1 }) => Promise<unknown>;
}

export async function openActiveCapture(tabs: CaptureTabs): Promise<CaptureReply> {
  try {
    const tab = await tabs.active();
    if (!tab || typeof tab.id !== 'number' || !tab.url || !sourcePath(tab.url)) {
      return { ok: false, message: 'Open a signed-in flight-results tab, then try again.' };
    }
    const reply = await tabs.send(tab.id, { type: BEGIN_CAPTURE, version: 1 });
    if (!isReply(reply)) return { ok: false, message: 'The page did not acknowledge the panel. Reload the site tab and retry.' };
    return reply;
  } catch {
    return { ok: false, message: 'Unable to open the capture panel. Reload the site tab after installing or reloading the extension, then retry.' };
  }
}
