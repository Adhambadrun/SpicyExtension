import { OPEN_INSPECTOR, isReply } from '../core/messages';
import { sourcePath } from '../core/policy';

const open = document.querySelector<HTMLButtonElement>('#open');
const state = document.querySelector<HTMLElement>('#state');
const status = document.querySelector<HTMLElement>('#status');

async function update(): Promise<void> {
  if (!open || !state || !status) return;
  try {
    const tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    const path = tab?.url ? sourcePath(tab.url) : null;
    open.disabled = !path;
    state.textContent = path ? `BASIS · ${path}` : 'OPEN BASIS SEARCH RESULTS';
    state.classList.toggle('connected', Boolean(path));
    status.textContent = path ? 'Ready. Open the inspector to select one result.' : 'Sign in to Basis and open a results page, then reopen this popup.';
  } catch {
    open.disabled = true;
    status.textContent = 'The active tab could not be checked. Reopen this popup on a Basis search page.';
  }
}

open?.addEventListener('click', () => {
  if (!open || !status) return;
  open.disabled = true;
  status.textContent = 'Opening local inspector…';
  void chrome.runtime.sendMessage({ type: OPEN_INSPECTOR, version: 1 }).then((reply: unknown) => {
    if (isReply(reply) && reply.ok) { window.close(); return; }
    status.textContent = isReply(reply) && !reply.ok ? reply.message : 'No response from the inspector. Reload the Basis tab and retry.';
    open.disabled = false;
  }).catch(() => {
    status.textContent = 'Extension unavailable. Reload the extension and the Basis tab, then retry.';
    open.disabled = false;
  });
});

void update();
