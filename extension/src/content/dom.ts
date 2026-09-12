export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function button(text: string, action: (event: MouseEvent) => void, className = 'button secondary'): HTMLButtonElement {
  const node = element('button', className, text);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}

export function clampPanel(panel: HTMLElement, x: number, y: number): void {
  const bounds = panel.getBoundingClientRect();
  panel.style.left = `${Math.max(8, Math.min(x, innerWidth - bounds.width - 8))}px`;
  panel.style.top = `${Math.max(8, Math.min(y, innerHeight - bounds.height - 8))}px`;
  panel.style.right = 'auto';
}

export function enableDrag(handle: HTMLButtonElement, panel: HTMLElement, signal: AbortSignal): void {
  let drag: { x: number; y: number; id: number } | null = null;
  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const bounds = panel.getBoundingClientRect();
    drag = { x: event.clientX - bounds.left, y: event.clientY - bounds.top, id: event.pointerId };
    handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  }, { signal });
  handle.addEventListener('pointermove', (event) => {
    if (drag?.id === event.pointerId) clampPanel(panel, event.clientX - drag.x, event.clientY - drag.y);
  }, { signal });
  handle.addEventListener('pointerup', () => { drag = null; }, { signal });
  handle.addEventListener('lostpointercapture', () => { drag = null; }, { signal });
  handle.addEventListener('keydown', (event) => {
    const shifts: Record<string, [number, number]> = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] };
    const shift = shifts[event.key];
    if (!shift) return;
    event.preventDefault();
    const box = panel.getBoundingClientRect();
    clampPanel(panel, box.left + shift[0], box.top + shift[1]);
  }, { signal });
  window.addEventListener('resize', () => {
    const box = panel.getBoundingClientRect();
    clampPanel(panel, box.left, box.top);
  }, { signal });
}
