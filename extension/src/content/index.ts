import { BEGIN_CAPTURE, isMessage } from '../core/messages';
import type { CaptureReply } from '../core/messages';
import { sourcePath } from '../core/policy';
import { openCapturePanel } from './capture-panel';

// Dormant until the extension's own UI explicitly requests capture. No page scrape on load.
chrome.runtime.onMessage.addListener((message: unknown, sender, respond: (reply: CaptureReply) => void) => {
  if (!isMessage(message, BEGIN_CAPTURE) || sender.id !== chrome.runtime.id || sender.tab || window.top !== window) return false;
  if (!sourcePath(location.href)) {
    respond({ ok: false, message: 'Open the flight search results first. The capture panel does not run on login or account pages.' });
    return false;
  }
  try {
    openCapturePanel();
    respond({ ok: true });
  } catch {
    respond({ ok: false, message: 'The capture panel could not start. Reload the site tab and retry.' });
  }
  return false;
});
