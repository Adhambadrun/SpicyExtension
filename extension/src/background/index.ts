import { OPEN_INSPECTOR, isMessage } from '../core/messages';
import type { InspectorReply } from '../core/messages';
import { isExtensionPage } from '../core/policy';
import { openActiveInspector } from './inspection';

chrome.runtime.onMessage.addListener((message: unknown, sender, respond: (reply: InspectorReply) => void) => {
  if (sender.id !== chrome.runtime.id || sender.tab || !isExtensionPage(sender.url, chrome.runtime.id, 'popup.html') ||
    !isMessage(message, OPEN_INSPECTOR)) return false;
  void openActiveInspector({
    active: async () => (await chrome.tabs.query({ active: true, currentWindow: true }))[0],
    send: (id, value) => chrome.tabs.sendMessage(id, value),
  }).then(respond);
  return true;
});
