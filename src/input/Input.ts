const keys = new Set<string>();
let mouseDown = false;

window.addEventListener('keydown', (e) => keys.add(e.code));
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('mousedown', () => { mouseDown = true; });
window.addEventListener('mouseup', () => { mouseDown = false; });

export const Input = {
  isDown: (code: string) => keys.has(code),
  isAnyDown: (...codes: string[]) => codes.some((c) => keys.has(c)),
  isMouseDown: () => mouseDown,
};
