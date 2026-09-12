import { CAPTURE_ROOT_ID } from '../core/policy';
import { selectionProblem } from '../core/sanitize';

interface PickerOptions {
  overlay: HTMLDivElement;
  highlight: HTMLDivElement;
  panel: HTMLElement;
  selected: (element: Element) => void;
  cancelled: () => void;
  describe: (description: string) => void;
}

/** A pointer-catching overlay prevents the selection click from activating page controls. */
export class AreaPicker {
  private abort: AbortController | null = null;
  private history: Element[] = [];
  private frame = 0;
  private point: { x: number; y: number } | null = null;
  constructor(private readonly options: PickerOptions) {}

  start(): void {
    this.stop();
    this.abort = new AbortController();
    const { signal } = this.abort;
    const { overlay, panel } = this.options;
    this.history = [];
    overlay.hidden = false;
    overlay.focus();
    overlay.addEventListener('pointermove', (event) => {
      this.point = { x: event.clientX, y: event.clientY };
      this.queuePoint();
    }, { signal });
    overlay.addEventListener('pointerdown', (event) => { event.preventDefault(); event.stopPropagation(); }, { signal });
    overlay.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (this.frame) { cancelAnimationFrame(this.frame); this.frame = 0; }
      const current = this.current();
      const rect = current?.getBoundingClientRect();
      if (!rect || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
        this.atPoint(event.clientX, event.clientY);
      }
      this.capture();
    }, { signal });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        this.options.cancelled();
        return;
      }
      if (event.composedPath().includes(panel)) return;
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Enter') {
        event.preventDefault(); event.stopPropagation();
        if (event.key === 'ArrowUp') this.larger();
        if (event.key === 'ArrowDown') this.smaller();
        if (event.key === 'Enter') this.capture();
      }
    }, { capture: true, signal });
    window.addEventListener('scroll', () => this.queuePoint(), { capture: true, passive: true, signal });
    window.addEventListener('resize', () => this.paint(), { signal });
  }

  private queuePoint(): void {
    if (this.frame || !this.point) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      if (this.point && this.abort) this.atPoint(this.point.x, this.point.y);
    });
  }

  private atPoint(x: number, y: number): void {
    let target = document.elementsFromPoint(x, y).find((node) => node.id !== CAPTURE_ROOT_ID &&
      !node.closest(`#${CAPTURE_ROOT_ID}`) && node.namespaceURI === 'http://www.w3.org/1999/xhtml');
    // Merely a visual hit area, not a guessed source/card schema. The agent sees and adjusts it.
    for (let i = 0; target && i < 10; i++) {
      const rect = target.getBoundingClientRect();
      if (rect.width >= 100 && rect.height >= 32) break;
      if (!target.parentElement || selectionProblem(target.parentElement)) break;
      target = target.parentElement;
    }
    if (!target) { this.history = []; this.paint(); return; }
    const problem = selectionProblem(target);
    if (problem) {
      this.history = [];
      this.options.highlight.hidden = true;
      this.options.describe(problem);
      return;
    }
    this.history = [target];
    this.paint();
  }

  private current(): Element | undefined { return this.history.at(-1); }

  larger(): void {
    const parent = this.current()?.parentElement;
    if (!parent) return;
    const problem = selectionProblem(parent);
    if (problem) { this.options.describe(problem); return; }
    this.history.push(parent);
    this.paint();
  }

  smaller(): void {
    if (this.history.length < 2) return;
    this.history.pop();
    this.paint();
  }

  private paint(): void {
    const target = this.current();
    if (!target?.isConnected) { this.options.highlight.hidden = true; return; }
    const rect = target.getBoundingClientRect();
    const { highlight } = this.options;
    highlight.style.left = `${rect.left}px`;
    highlight.style.top = `${rect.top}px`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;
    highlight.hidden = false;
    this.options.describe(`${target.localName} · ${Math.round(rect.width)} × ${Math.round(rect.height)} px. Click or press Enter to capture.`);
  }

  private capture(): void {
    const target = this.current();
    if (target) this.options.selected(target);
    else this.options.describe('Move over one flight card first. Use ↑ for a larger area, then Enter to capture.');
  }

  stop(): void {
    this.abort?.abort();
    this.abort = null;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.point = null;
    this.history = [];
    this.options.overlay.hidden = true;
    this.options.highlight.hidden = true;
  }
}
