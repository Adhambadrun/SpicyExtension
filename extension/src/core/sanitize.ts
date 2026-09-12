import { SITE_ORIGIN, CAPTURE_ROOT_ID, LIMITS, sourcePath } from './policy';
import { escapeAttribute, escapeText, redactText } from './redaction';
import { REVIEW_WARNING, serializeCapture } from './snapshot';
import type { Capture, CaptureKind } from './snapshot';

const OMIT = new Set(['form', 'script', 'style', 'link', 'meta', 'base', 'iframe', 'frame', 'frameset', 'object', 'embed', 'template', 'noscript', 'svg', 'canvas', 'audio', 'video', 'source', 'track', 'input', 'textarea', 'select', 'option', 'datalist']);
const SAFE_TAGS = new Set('div span article section header footer aside main ul ol li dl dt dd p pre code kbd samp small strong em b i u s del ins sup sub h1 h2 h3 h4 h5 h6 table thead tbody tfoot tr td th caption button a img abbr time br hr details summary label figure figcaption'.split(' '));
const BLOCKS = new Set('div article section header footer aside main ul ol li dl dt dd p pre h1 h2 h3 h4 h5 h6 table thead tbody tfoot tr caption br hr details summary figure figcaption'.split(' '));
const ATTRIBUTES = new Set(['class', 'role', 'aria-label', 'aria-description', 'aria-expanded', 'aria-selected', 'title', 'alt', 'datetime', 'data-testid', 'data-test', 'data-cy', 'data-qa']);
const VOID = new Set(['img', 'br', 'hr']);
const BROAD_ROOTS = new Set(['html', 'body', 'main', 'nav', 'form']);
const PRIVATE_ANCESTORS = '[contenteditable]:not([contenteditable="false"]), [data-private], [data-sensitive], [role="navigation"], [role="banner"], nav';

export function selectionProblem(element: Element): string | null {
  if (!element.isConnected || element.ownerDocument !== document) return 'This result changed or was removed. Select it again.';
  if (element.closest(`#${CAPTURE_ROOT_ID}`)) return 'Select a flight-result area outside the capture panel.';
  const tag = element.localName.toLowerCase();
  if (BROAD_ROOTS.has(tag) || element.id === '__next' || element.getAttribute('role') === 'main') return 'Select one result card or its details, not the whole page.';
  if (OMIT.has(tag) || element.closest(PRIVATE_ANCESTORS)) return 'Forms, account navigation and private areas cannot be captured.';
  for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
    if (hidden(ancestor)) return 'This area is hidden. Expand the visible itinerary, then select it again.';
  }
  return null;
}

function hidden(element: Element): boolean {
  if (element.hasAttribute('hidden') || element.hasAttribute('inert') || element.getAttribute('aria-hidden') === 'true') return true;
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  return style?.display === 'none' || style?.visibility === 'hidden' || style?.visibility === 'collapse' ||
    style?.opacity === '0' || style?.getPropertyValue('content-visibility') === 'hidden';
}

/** Read a bounded selected subtree only. Never read cookies, storage, form values or page globals. */
export function captureElement(element: Element, options: { url: string; kind: CaptureKind; now?: Date }): Capture {
  const path = sourcePath(options.url);
  if (!path) throw new Error('Open a signed-in flight search-results page first.');
  const problem = selectionProblem(element);
  if (problem) throw new Error(problem);
  const stats = { elements: 0, omittedElements: 0, droppedAttributes: 0, redactedTextNodes: 0 };
  const warnings = new Set([REVIEW_WARNING]);
  const html: string[] = [];
  const plain: string[] = [];
  let htmlSize = 0;
  let textSize = 0;
  let nodes = 0;

  function emit(value: string): void {
    htmlSize += value.length;
    if (htmlSize > LIMITS.html) throw new Error('This selection is too large. Select one smaller result area.');
    html.push(value);
  }

  function walk(node: Node, depth: number): void {
    nodes++;
    if (nodes > LIMITS.elements * 3 || depth > 60) throw new Error('This selection is too complex. Select one smaller result area.');
    if (node.nodeType === Node.TEXT_NODE) {
      const raw = node.nodeValue ?? '';
      const value = redactText(raw);
      if (raw !== value) stats.redactedTextNodes++;
      textSize += value.length;
      if (textSize > LIMITS.text) throw new Error('This selection contains too much text. Select a smaller area.');
      emit(escapeText(value));
      plain.push(value);
      return;
    }
    if (!(node instanceof Element)) return;
    stats.elements++;
    if (stats.elements > LIMITS.elements) throw new Error('This selection is too large. Select one smaller result area.');
    const originalTag = node.localName.toLowerCase();
    if (OMIT.has(originalTag) || node.matches(PRIVATE_ANCESTORS) || hidden(node) ||
      node.namespaceURI !== 'http://www.w3.org/1999/xhtml' || node.id === CAPTURE_ROOT_ID) {
      stats.omittedElements++;
      return;
    }
    const tag = SAFE_TAGS.has(originalTag) ? originalTag : 'div';
    emit(`<${tag}`);
    if (tag !== originalTag) {
      emit(` data-spicy-original-tag="${escapeAttribute(originalTag)}"`);
      warnings.add('Custom tags were represented as plain containers.');
    }
    for (const name of node.getAttributeNames()) {
      if (!ATTRIBUTES.has(name)) { stats.droppedAttributes++; continue; }
      const raw = node.getAttribute(name) ?? '';
      if (raw.length > 500) { stats.droppedAttributes++; continue; }
      const value = redactText(raw);
      if (value !== raw) stats.redactedTextNodes++;
      emit(` ${name}="${escapeAttribute(value)}"`);
    }
    emit('>');
    if (node.shadowRoot) warnings.add('Shadow-root content is not captured. Only the selected light-DOM structure is included.');
    if (BLOCKS.has(tag)) plain.push('\n');
    for (const child of node.childNodes) walk(child, depth + 1);
    if (BLOCKS.has(tag)) plain.push('\n');
    if (tag === 'td' || tag === 'th') plain.push('\t');
    if (!VOID.has(tag)) emit(`</${tag}>`);
  }

  walk(element, 0);
  const text = redactText(plain.join('').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim());
  if (!html.length || !text) throw new Error('No visible text was found. Select the card container, not an image, icon or hidden area.');
  if (text.length > LIMITS.text) throw new Error('This selection contains too much text. Select a smaller area.');
  if (stats.omittedElements) warnings.add('Hidden content, form controls and unsafe elements were omitted. Expand the itinerary before capturing its details.');
  const capture: Capture = {
    format: 'spicyextension-capture', version: 1,
    source: { origin: SITE_ORIGIN, path },
    capturedAt: (options.now ?? new Date()).toISOString(), kind: options.kind,
    selection: { tag: element.localName.toLowerCase(), html: html.join(''), text },
    stats, warnings: [...warnings],
  };
  serializeCapture(capture); // Enforce the final UTF-8 file budget; never silently truncate.
  return capture;
}
