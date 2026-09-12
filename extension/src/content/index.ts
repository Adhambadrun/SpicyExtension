import { BEGIN_INSPECTION, isMessage } from '../core/messages';
import type { InspectorReply } from '../core/messages';
import { sourcePath } from '../core/policy';
import { openInspector } from './inspector';

// Dormant until the extension's own UI explicitly requests inspection. No page scrape on load.
chrome.runtime.onMessage.addListener((message: unknown, sender, respond: (reply: InspectorReply) => void) => {
  if (!isMessage(message, BEGIN_INSPECTION) || sender.id !== chrome.runtime.id || sender.tab || window.top !== window) return false;
  if (!sourcePath(location.href)) {
    respond({ ok: false, message: 'Open Basis search results first. The inspector does not run on login or account pages.' });
    return false;
  }
  try {
    openInspector();
    respond({ ok: true });
  } catch {
    respond({ ok: false, message: 'The inspector could not start. Reload the Basis tab and retry.' });
  }
  return false;
});
