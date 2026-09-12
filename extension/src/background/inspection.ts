import { BEGIN_INSPECTION, isReply } from '../core/messages';
import type { InspectorReply } from '../core/messages';
import { sourcePath } from '../core/policy';

export interface InspectionTabs {
  active: () => Promise<{ id?: number | undefined; url?: string | undefined } | undefined>;
  send: (tabId: number, message: { type: typeof BEGIN_INSPECTION; version: 1 }) => Promise<unknown>;
}

export async function openActiveInspector(tabs: InspectionTabs): Promise<InspectorReply> {
  try {
    const tab = await tabs.active();
    if (!tab || typeof tab.id !== 'number' || !tab.url || !sourcePath(tab.url)) {
      return { ok: false, message: 'Open a signed-in Basis flight-results tab, then click the inspector again.' };
    }
    const reply = await tabs.send(tab.id, { type: BEGIN_INSPECTION, version: 1 });
    if (!isReply(reply)) return { ok: false, message: 'The page did not acknowledge the inspector. Reload Basis and retry.' };
    return reply;
  } catch {
    return { ok: false, message: 'Unable to open the inspector. Reload the Basis tab after installing or reloading the extension, then retry.' };
  }
}
