import css from '../styles/capture-panel.css';
import terminalCss from '../styles/terminal.css';
import brandLogo from '../../assets/icon-128.png';
import brandHeader from '../../assets/header.png';
import { DISPOSE_EVENT, CAPTURE_ROOT_ID, byteLength, sourcePath } from '../core/policy';
import { captureElement, selectionProblem } from '../core/sanitize';
import { captureFilename, parseCapture, serializeCapture } from '../core/snapshot';
import type { Capture, CaptureKind } from '../core/snapshot';
import { button, clampPanel, element, enableDrag } from './dom';
import { AreaPicker } from './picker';

type Mode = 'ready' | 'picking' | 'review';
type Registry = { __spicyExtensionCapturePanel?: CapturePanel };
const registry = globalThis as typeof globalThis & Registry;

export function openCapturePanel(): void {
  const existing = registry.__spicyExtensionCapturePanel;
  if (existing?.host.isConnected) { existing.focus(); return; }
  window.dispatchEvent(new Event(DISPOSE_EVENT));
  const oldRoot = document.getElementById(CAPTURE_ROOT_ID);
  if (oldRoot?.getAttribute('data-spicy-owned') === '1') oldRoot.remove();
  registry.__spicyExtensionCapturePanel = new CapturePanel();
}

class CapturePanel {
  readonly host = element('div');
  private readonly lifecycle = new AbortController();
  private readonly panel = element('section', 'panel');
  private readonly overlay = element('div', 'selector');
  private readonly highlight = element('div', 'selection-outline');
  private readonly description = element('span', 'selection-description');
  private readonly status = element('p', 'notice');
  private readonly ready = element('div');
  private readonly picking = element('div');
  private readonly review = element('div', 'review-output');
  private readonly reviewInput = element('div');
  private readonly emptyOutput = element('p', 'empty-output');
  private readonly editor = element('textarea', 'editor');
  private readonly confirm = element('input');
  private readonly kind = element('select');
  private readonly statistics = element('p', 'statistics');
  private readonly selectButton: HTMLButtonElement;
  private readonly expandButton: HTMLButtonElement;
  private readonly copyButton: HTMLButtonElement;
  private readonly downloadButton: HTMLButtonElement;
  private readonly smallerButton: HTMLButtonElement;
  private readonly picker: AreaPicker;
  private readonly initialUrl = location.href; // Comparison only; never exported (query/hash may be private).
  private readonly previousFocus = document.activeElement;
  private readonly objectUrls = new Set<string>();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private mode: Mode = 'ready';
  private capture: Capture | null = null;
  private history: Element[] = [];
  private reviewedText: string | null = null;
  private disposed = false;

  constructor() {
    if (!sourcePath(location.href) || !document.body) throw new Error('A supported flight-results page is required.');
    this.host.id = CAPTURE_ROOT_ID;
    this.host.setAttribute('data-spicy-owned', '1');
    const shadow = this.host.attachShadow({ mode: 'open' });
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`${terminalCss}\n${css}`);
    shadow.adoptedStyleSheets = [sheet];
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', 'SpicyExtension local capture panel');
    this.panel.setAttribute('aria-modal', 'false');
    this.panel.tabIndex = -1;
    this.overlay.tabIndex = 0;
    this.overlay.setAttribute('role', 'application');
    this.overlay.setAttribute('aria-label', 'Choose a result area. Move the pointer, use arrow up or down to adjust, Enter to capture, Escape to cancel.');
    this.overlay.hidden = true;
    this.highlight.hidden = true;
    this.highlight.setAttribute('aria-hidden', 'true');

    const header = element('div', 'header');
    const drag = button('', () => undefined, 'drag-handle');
    drag.setAttribute('aria-label', 'Move panel. Drag or use arrow keys.');
    drag.title = 'Drag to move · arrow keys when focused';
    const titles = element('div');
    // The brand lockup is local packaged art, not interim typography. The adjacent logo already
    // carries the accessible name, so the wordmark itself is decorative to a screen reader.
    const wordmark = element('img', 'brand-header');
    wordmark.src = brandHeader; // Build-time data URL: no request, host grant or web-accessible resource.
    wordmark.alt = '';
    wordmark.width = 208;
    wordmark.height = 26;
    wordmark.draggable = false;
    titles.append(wordmark, element('div', 'overline', 'LOCAL CAPTURE · JSON'));
    const logo = element('img', 'brand-logo');
    logo.src = brandLogo; // Build-time data URL: no request, host grant or web-accessible resource.
    logo.alt = 'SpicyExtension logo';
    logo.width = 32;
    logo.height = 32;
    logo.draggable = false;
    drag.append(logo, titles);
    const close = button('×', () => this.dispose(), 'icon-button');
    close.setAttribute('aria-label', 'Close and clear capture');
    close.title = 'Close & clear capture';
    this.expandButton = button('Expand', () => this.setExpanded(!this.panel.classList.contains('expanded')), 'button secondary small-button');
    this.expandButton.setAttribute('aria-label', 'Expanded capture layout');
    this.expandButton.setAttribute('aria-pressed', 'false');
    this.expandButton.title = 'Use a two-column terminal layout';
    const headerActions = element('div', 'header-actions');
    headerActions.append(this.expandButton, close);
    header.append(drag, headerActions);
    enableDrag(drag, this.panel, this.lifecycle.signal);

    const content = element('div', 'content');
    content.append(element('div', 'privacy', 'LOCAL ONLY · NO AUTOMATIC UPLOADS'));
    this.ready.append(element('h2', '', 'Capture one real flight result'), element('p', 'muted', 'Capture one visible result from your signed-in site tab.'));
    const steps = element('ol');
    for (const instruction of ['Open a result or expand its itinerary.', 'Select one area. Adjust Larger / Smaller.', 'Review the JSON and remove private data.']) steps.append(element('li', '', instruction));
    this.selectButton = button('Select a result area', () => this.startPicking(), 'button primary full');
    this.ready.append(steps, this.selectButton);

    this.picking.append(element('h2', '', 'Choose the flight-result area'), element('p', 'muted', 'Move over a card, then click to capture. The selection layer blocks clicks on the website’s controls. ↑ selects a larger area; ↓ returns to a smaller one.'));
    this.description.setAttribute('aria-live', 'polite');
    this.description.textContent = 'Move the pointer over a flight result. Esc cancels selection.';
    const pickerActions = element('div', 'actions');
    pickerActions.append(
      button('Larger ↑', () => this.picker.larger()),
      button('Smaller ↓', () => this.picker.smaller()),
      button('Cancel selection', () => this.cancelPicking(), 'button tertiary'),
    );
    this.picking.append(this.description, pickerActions);

    this.reviewInput.append(element('h2', '', 'Review before sharing'));
    const reviewMeta = element('div', 'review-meta');
    const kindLabel = element('label');
    kindLabel.append(element('span', 'label', 'Capture type'));
    this.kind.setAttribute('aria-label', 'Capture type');
    for (const [value, label] of [['result-card', 'Flight result card'], ['itinerary-details', 'Expanded itinerary details']]) {
      if (!value || !label) continue;
      const option = element('option', '', label);
      option.value = value;
      this.kind.append(option);
    }
    kindLabel.append(this.kind);
    this.kind.addEventListener('change', () => {
      if (!this.capture) return;
      // Preserve redactions when changing capture kind; require another review.
      try {
        const updated = parseCapture(this.editor.value);
        updated.kind = this.currentKind();
        this.editor.value = serializeCapture(updated);
        this.resetReview();
        this.notice('Capture type changed. Review again before exporting.');
      } catch { this.notice('Finish correcting the JSON before changing the capture type.', 'error'); }
    });
    const adjust = element('div', 'actions');
    this.smallerButton = button('Smaller area', () => this.resizeCapture(false), 'button secondary small-button');
    adjust.append(button('Larger area', () => this.resizeCapture(true), 'button secondary small-button'), this.smallerButton);
    reviewMeta.append(kindLabel, adjust);
    this.reviewInput.append(reviewMeta, this.statistics);
    const warning = element('div', 'warning');
    warning.append(element('strong', '', 'Automatic cleanup is not complete anonymization.'), document.createTextNode('Names, booking references or other private information may remain. Edit the JSON below to remove them. Do not add cookies, headers or credentials.'));
    this.editor.setAttribute('aria-label', 'Review and redact capture JSON');
    this.editor.spellcheck = false;
    this.editor.autocomplete = 'off';
    this.editor.setAttribute('autocapitalize', 'off');
    this.editor.addEventListener('input', () => this.resetReview());
    const reviewCheck = element('label', 'review-check');
    this.confirm.type = 'checkbox';
    this.confirm.addEventListener('change', (event) => {
      // Page scripts cannot provide review consent by dispatching a synthetic event.
      this.reviewedText = event.isTrusted && this.confirm.checked ? this.editor.value : null;
      if (!event.isTrusted) this.confirm.checked = false;
      this.updateExports();
    });
    reviewCheck.append(this.confirm, document.createTextNode('I reviewed this capture and removed personal information and credentials.'));
    this.copyButton = button('Copy JSON', (event) => { if (event.isTrusted) void this.copy(); });
    this.downloadButton = button('Download JSON', (event) => { if (event.isTrusted) this.download(); }, 'button primary');
    const exports = element('div', 'actions end');
    exports.append(this.copyButton, this.downloadButton);
    const more = element('div', 'actions');
    more.append(
      button('Select another area', () => this.startPicking(), 'button tertiary small-button'),
      button('Reset redactions', () => {
        if (!this.capture) return;
        this.editor.value = serializeCapture({ ...this.capture, kind: this.currentKind() });
        this.resetReview();
        this.notice('Original sanitized capture restored. Review it again before exporting.');
      }, 'button tertiary small-button'),
      button('Clear capture', () => this.clear(), 'button tertiary small-button'),
    );
    this.reviewInput.append(warning, more);
    this.review.append(this.editor, reviewCheck, exports);
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');
    const workspace = element('div', 'terminal-grid');
    const inputPane = element('section', 'terminal-pane input-pane');
    inputPane.setAttribute('aria-label', 'Capture input');
    inputPane.append(element('div', 'terminal-label', 'INPUT'), this.ready, this.picking, this.reviewInput);
    const outputPane = element('section', 'terminal-pane output-pane');
    outputPane.setAttribute('aria-label', 'Capture output');
    outputPane.append(element('div', 'terminal-label output-label', 'OUTPUT / JSON'), this.emptyOutput, this.review);
    workspace.append(inputPane, outputPane);
    content.append(workspace, this.status,
      element('p', 'caption', 'Not a flight-search engine. Captures stay in memory until you close this tool or navigate away. Export only after review; share the JSON yourself.'));
    this.panel.append(header, content);
    shadow.append(this.overlay, this.highlight, this.panel);
    document.body.append(this.host);
    this.picker = new AreaPicker({
      overlay: this.overlay, highlight: this.highlight, panel: this.panel,
      selected: (target) => this.read(target, false),
      cancelled: () => this.cancelPicking(),
      describe: (text) => { this.description.textContent = text; },
    });
    this.setMode('ready');
    this.resetReview();
    const { signal } = this.lifecycle;
    window.addEventListener(DISPOSE_EVENT, () => this.dispose(false), { signal });
    window.addEventListener('pagehide', () => this.dispose(false), { signal });
    const locationChanged = (): void => { if (location.href !== this.initialUrl) this.dispose(false); };
    window.addEventListener('popstate', locationChanged, { signal });
    window.addEventListener('hashchange', locationChanged, { signal });
    // Browser-level navigation events work for page-world pushState/replaceState too.
    (window as Window & { navigation?: EventTarget }).navigation?.addEventListener('currententrychange', locationChanged, { signal });
    this.focus();
  }

  private currentKind(): CaptureKind { return this.kind.value === 'itinerary-details' ? 'itinerary-details' : 'result-card'; }

  private setMode(mode: Mode): void {
    this.mode = mode;
    this.ready.hidden = mode !== 'ready';
    this.picking.hidden = mode !== 'picking';
    this.review.hidden = mode !== 'review';
    this.reviewInput.hidden = mode !== 'review';
    this.emptyOutput.hidden = mode === 'review';
    this.emptyOutput.textContent = mode === 'picking'
      ? 'Waiting for your selection.\nNothing is exported automatically.'
      : 'No result captured.\nSelect one area on the page to begin.';
    this.panel.classList.toggle('review', mode === 'review');
    const box = this.panel.getBoundingClientRect();
    clampPanel(this.panel, box.left, box.top);
  }

  private setExpanded(expanded: boolean): void {
    this.panel.classList.toggle('expanded', expanded);
    this.expandButton.textContent = expanded ? 'Compact' : 'Expand';
    this.expandButton.setAttribute('aria-pressed', String(expanded));
    this.expandButton.title = expanded ? 'Return to the compact floating panel' : 'Use a two-column terminal layout';
    const box = this.panel.getBoundingClientRect();
    clampPanel(this.panel, box.left, box.top);
  }

  focus(): void {
    if (this.disposed) return;
    (this.mode === 'ready' ? this.selectButton : this.panel).focus({ preventScroll: true });
  }

  private startPicking(): void {
    this.notice('');
    this.setMode('picking');
    this.description.textContent = 'Move the pointer over a flight result. Esc cancels selection.';
    this.picker.start();
  }

  private cancelPicking(): void {
    this.picker.stop();
    this.setMode(this.capture ? 'review' : 'ready');
    this.notice('Selection cancelled. No new area was captured.');
    this.focus();
  }

  private read(target: Element, resizing: boolean): boolean {
    if (this.disposed || location.href !== this.initialUrl) { this.dispose(false); return false; }
    try {
      const capture = captureElement(target, { url: location.href, kind: this.currentKind() });
      this.capture = capture;
      if (!resizing) this.history = [target];
      this.editor.value = serializeCapture(capture);
      this.picker.stop();
      this.setMode('review');
      this.resetReview();
      this.smallerButton.disabled = this.history.length < 2;
      this.statistics.textContent = `${capture.stats.elements} elements captured · ${capture.stats.omittedElements} subtrees omitted · ${capture.stats.droppedAttributes} attributes removed · ${(byteLength(this.editor.value) / 1024).toFixed(1)} KB`;
      this.notice('Captured locally. Check that the intended card/details are included and redact anything private.');
      this.editor.focus({ preventScroll: true });
      this.editor.setSelectionRange(0, 0);
      return true;
    } catch (error) {
      this.notice(error instanceof Error ? error.message : 'Unable to capture this area. Select a smaller flight result.', 'error');
      return false;
    }
  }

  private resizeCapture(larger: boolean): void {
    const current = this.history.at(-1);
    const target = larger ? current?.parentElement : this.history.at(-2);
    if (!target) return;
    const problem = selectionProblem(target);
    if (problem) { this.notice(problem, 'error'); return; }
    // Do not destroy a valid capture if the parent is too large or not readable.
    if (this.read(target, true)) {
      if (larger) this.history.push(target); else this.history.pop();
      this.smallerButton.disabled = this.history.length < 2;
    }
  }

  private resetReview(): void {
    this.reviewedText = null;
    this.confirm.checked = false;
    this.copyButton.disabled = true;
    this.downloadButton.disabled = true;
  }

  private updateExports(): void {
    const reviewed = this.confirm.checked && this.reviewedText === this.editor.value;
    let valid = false;
    if (reviewed) {
      try { parseCapture(this.editor.value); valid = true; this.notice('Review recorded. Download or copy only if you are ready to share this capture.'); }
      catch (error) { this.notice(error instanceof Error ? error.message : 'Check the JSON structure before exporting.', 'error'); }
    }
    this.copyButton.disabled = !reviewed || !valid;
    this.downloadButton.disabled = !reviewed || !valid;
  }

  private reviewedCapture(): Capture {
    if (this.disposed || location.href !== this.initialUrl || !this.confirm.checked || this.reviewedText !== this.editor.value) {
      throw new Error('Review the current capture before exporting.');
    }
    return parseCapture(this.editor.value);
  }

  private download(): void {
    try {
      const capture = this.reviewedCapture();
      const blob = new Blob([serializeCapture(capture)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      this.objectUrls.add(url);
      const link = element('a');
      link.href = url;
      link.download = captureFilename(capture);
      link.hidden = true;
      this.panel.append(link);
      link.click();
      link.remove();
      const timer = setTimeout(() => {
        URL.revokeObjectURL(url);
        this.objectUrls.delete(url);
        this.timers.delete(timer);
      }, 1500);
      this.timers.add(timer);
      this.notice('Download requested. Check Chrome’s downloads before sharing the file.', 'success');
    } catch {
      this.notice('Unable to download. Check the review and JSON, then retry or use Copy JSON.', 'error');
    }
  }

  private async copy(): Promise<void> {
    try {
      const capture = this.reviewedCapture();
      await navigator.clipboard.writeText(serializeCapture(capture));
      this.notice('Copied! Nothing was uploaded. Share only after your final review.', 'success');
    } catch {
      this.notice('Nothing was copied. Clipboard access may be blocked; use Download JSON after reviewing the capture.', 'error');
    }
  }

  private notice(text: string, type: 'error' | 'success' | '' = ''): void {
    if (this.disposed) return;
    this.status.textContent = text;
    this.status.className = `notice ${type}`;
  }

  private clear(): void {
    this.picker.stop();
    this.capture = null;
    this.editor.value = '';
    this.history = [];
    this.resetReview();
    this.setMode('ready');
    this.notice('Capture cleared from the panel. Previously downloaded files are not deleted.');
    this.focus();
  }

  dispose(restoreFocus = true): void {
    if (this.disposed) return;
    this.disposed = true;
    this.picker.stop();
    this.lifecycle.abort();
    for (const timer of this.timers) clearTimeout(timer);
    for (const url of this.objectUrls) URL.revokeObjectURL(url);
    this.timers.clear();
    this.objectUrls.clear();
    this.capture = null;
    this.history = [];
    this.reviewedText = null;
    this.editor.value = '';
    this.host.remove();
    if (registry.__spicyExtensionCapturePanel === this) delete registry.__spicyExtensionCapturePanel;
    if (restoreFocus && this.previousFocus instanceof HTMLElement && this.previousFocus.isConnected) this.previousFocus.focus({ preventScroll: true });
  }
}
