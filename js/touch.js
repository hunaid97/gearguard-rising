// The handheld console shell: wires up the d-pad, face buttons and START (touch or mouse),
// and sizes the shell so the screen and the controls never overlap.
const Touch = (() => {
  const isTouch = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0;
  const api = { active: isTouch, layout };
  if (isTouch) document.body.classList.add('touch');
  document.getElementById('shell-label').textContent = `${PERSONAL.name} · ROBOT HERO`;

  if (isTouch) {
    document.addEventListener('touchstart', () => {
      Input.wake();
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
      try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) {}
    }, { once: true, passive: true });
  }

  // ----- face buttons + START -----
  document.querySelectorAll('[data-b]').forEach(el => {
    const b = el.dataset.b;
    const on = e => {
      e.preventDefault(); el.setPointerCapture && el.setPointerCapture(e.pointerId);
      el.classList.add('on'); Input.setVirtual(b, true); Input.wake();
      Sound.click(); Sound.buzz('button');
    };
    const off = e => { e.preventDefault(); el.classList.remove('on'); Input.setVirtual(b, false); };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
  });

  // ----- d-pad: press or slide your thumb, 8 directions -----
  const pad = document.getElementById('dpad');
  let padId = null, last = '';
  const setDirs = (l, r, u, d) => {
    Input.setVirtual('left', l); Input.setVirtual('right', r); Input.setVirtual('up', u); Input.setVirtual('down', d);
    const key = '' + +l + +r + +u + +d;
    pad.classList.toggle('pl', l); pad.classList.toggle('pr', r); pad.classList.toggle('pu', u); pad.classList.toggle('pd', d);
    if (key !== last && key !== '0000') { Sound.click(); Sound.buzz('button'); }
    last = key;
  };
  const padMove = e => {
    const rc = pad.getBoundingClientRect();
    const dx = (e.clientX - rc.left - rc.width / 2) / (rc.width / 2), dy = (e.clientY - rc.top - rc.height / 2) / (rc.height / 2);
    if (Math.hypot(dx, dy) < 0.22) return setDirs(false, false, false, false);
    const a = Math.atan2(dy, dx) * 180 / Math.PI;
    setDirs(a > 112.5 || a < -112.5, a > -67.5 && a < 67.5, a < -22.5 && a > -157.5, a > 22.5 && a < 157.5);
  };
  pad.addEventListener('pointerdown', e => { e.preventDefault(); padId = e.pointerId; pad.setPointerCapture(e.pointerId); Input.wake(); padMove(e); });
  pad.addEventListener('pointermove', e => { if (e.pointerId === padId) padMove(e); });
  const padEnd = e => { if (e.pointerId !== padId) return; padId = null; setDirs(false, false, false, false); };
  pad.addEventListener('pointerup', padEnd);
  pad.addEventListener('pointercancel', padEnd);

  // tapping the screen itself = ✕ (advance dialogue, pick menu item, jump)
  const cv = document.getElementById('game');
  cv.addEventListener('pointerdown', e => { e.preventDefault(); Input.wake(); Input.setVirtual('cross', true); });
  const cvUp = () => Input.setVirtual('cross', false);
  cv.addEventListener('pointerup', cvUp); cv.addEventListener('pointercancel', cvUp);

  // ----- sizing: the whole console fits the window, screen stays 16:9 -----
  function layout() {
    const vv = window.visualViewport;
    const vw = vv ? vv.width : innerWidth, vh = vv ? vv.height : innerHeight;
    const con = document.getElementById('console');
    const margin = Math.round(Math.min(vw, vh) * 0.025);
    const availW = vw - margin * 2, availH = vh - margin * 2;
    // controls scale with screen height; "u" is one design unit (side panel = 100u wide)
    let u = Math.max(1, Math.min(availH / 130, availW / 520, 2.6));
    const side = 100 * u, gap = 5 * u, padX = 8 * u, padY = 7 * u, bez = Math.max(4, 6 * u), label = Math.max(9, 11 * u);
    let sw = availW - side * 2 - gap * 2 - padX * 2 - bez * 2;
    let sh = availH - padY * 2 - bez - label;
    if (sw / sh > 16 / 9) sw = sh * 16 / 9; else sh = sw * 9 / 16;
    con.style.setProperty('--u', u + 'px');
    con.style.setProperty('--side', side + 'px');
    con.style.setProperty('--bez', bez + 'px');
    con.style.setProperty('--label', label + 'px');
    cv.style.width = Math.floor(sw) + 'px';
    cv.style.height = Math.floor(sh) + 'px';
  }
  addEventListener('resize', layout);
  if (window.visualViewport) visualViewport.addEventListener('resize', layout);
  layout();
  return api;
})();
