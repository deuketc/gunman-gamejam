const keys = new Set<string>();
const justPressed = new Set<string>();
let mouseDown = false;

window.addEventListener('keydown', (e) => {
  if (!keys.has(e.code)) justPressed.add(e.code);
  keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('mousedown', () => { mouseDown = true; });
window.addEventListener('mouseup', () => { mouseDown = false; });

export const Input = {
  isDown:           (code: string)       => keys.has(code),
  isAnyDown:        (...codes: string[]) => codes.some((c) => keys.has(c)),
  isAnyJustPressed: (...codes: string[]) => codes.some((c) => justPressed.has(c)),
  isMouseDown:      ()                   => mouseDown,
  isJustPressed:    (code: string)       => justPressed.has(code),
  flush:            ()                   => justPressed.clear(),
};
