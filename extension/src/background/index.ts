import { OPEN_CAPTURE, isMessage } from '../core/messages';
import type { CaptureReply } from '../core/messages';
import { isExtensionPage } from '../core/policy';
import { openActiveCapture } from './capture';

chrome.runtime.onMessage.addListener((message: unknown, sender, respond: (reply: CaptureReply) => void) => {
  if (sender.id !== chrome.runtime.id || sender.tab || !isExtensionPage(sender.url, chrome.runtime.id, 'popup.html') ||
    !isMessage(message, OPEN_CAPTURE)) return false;
  void openActiveCapture({
    active: async () => (await chrome.tabs.query({ active: true, currentWindow: true }))[0],
    send: (id, value) => chrome.tabs.sendMessage(id, value),
  }).then(respond);
  return true;
});
