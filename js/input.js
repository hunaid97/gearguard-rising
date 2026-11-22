// Unified input: keyboard + any standard gamepad.
// A custom controller works if it shows up as a USB/BLE keyboard (arrows, Z X C V, Enter)
// or as a standard HID gamepad (PlayStation layout: 0=X 1=O 2=Square 3=Triangle 9=Start, 12-15 = d-pad).
const Input = (() => {
  const KEYMAP = {
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    cross: ['KeyZ', 'Space', 'KeyJ'],
    circle: ['KeyX', 'KeyK'],
    square: ['KeyC', 'KeyL'],
    triangle: ['KeyV', 'KeyI'],
    start: ['Enter', 'Escape', 'KeyP'],
  };
  const BTN = Object.keys(KEYMAP);
  const keys = new Set();
  const tapped = new Set(); // keys pressed since last update (so very quick taps are never missed)
  let cur = {}, prev = {};
  const virt = {}, vtap = new Set();   // on-screen touch buttons

  const wake = () => { try { Sound.init(); Sound.unlockSpeech(); } catch (e) {} };
  window.addEventListener('keydown', e => {
    if (!e.repeat) tapped.add(e.code);
    keys.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    wake();
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('pointerdown', wake);

  function update() {
    prev = cur;
    cur = {};
    for (const b of BTN) cur[b] = KEYMAP[b].some(k => keys.has(k) || tapped.has(k)) || !!virt[b] || vtap.has(b);
    tapped.clear(); vtap.clear();
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const bt = i => !!(p.buttons[i] && p.buttons[i].pressed);
      const ax = p.axes || [];
      if (bt(12) || ax[1] < -0.5) cur.up = true;
      if (bt(13) || ax[1] > 0.5) cur.down = true;
      if (bt(14) || ax[0] < -0.5) cur.left = true;
      if (bt(15) || ax[0] > 0.5) cur.right = true;
      if (bt(0)) cur.cross = true;
      if (bt(1)) cur.circle = true;
      if (bt(2)) cur.square = true;
      if (bt(3)) cur.triangle = true;
      if (bt(9) || bt(8)) cur.start = true;
    }
  }

  function setVirtual(b, on) { if (on && !virt[b]) vtap.add(b); virt[b] = on; }
  return {
    update, setVirtual, wake,
    held: b => !!cur[b],
    pressed: b => !!cur[b] && !prev[b],
    anyPressed: () => BTN.some(b => cur[b] && !prev[b]),
  };
})();
