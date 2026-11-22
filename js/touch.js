// On-screen controls for phones/tablets: d-pad on the left, PlayStation-style buttons on the right.
const Touch = (() => {
  const isTouch = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0;
  const api = { active: false };
  if (!isTouch) return api;
  api.active = true;
  document.body.classList.add('touch');

  const root = document.createElement('div');
  root.id = 'tc';
  root.innerHTML = `
    <div id="dpad"><div class="arr u"></div><div class="arr d"></div><div class="arr l"></div><div class="arr r"></div><div id="knob"></div></div>
    <div id="btns">
      <div class="b triangle" data-b="triangle"><span>△</span><i>TALK</i></div>
      <div class="b square" data-b="square"><span>□</span><i>BLAST</i></div>
      <div class="b circle" data-b="circle"><span>○</span><i>CHANGE</i></div>
      <div class="b cross" data-b="cross"><span>✕</span><i>JUMP</i></div>
    </div>
    <div id="pause" data-b="start">❚❚</div>
    <div id="rotate"><div>↻</div>Turn your phone sideways!</div>`;
  document.body.appendChild(root);

  const first = () => {
    Input.wake();
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
    try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) {}
  };
  document.addEventListener('touchstart', first, { once: true, passive: true });

  // ----- buttons -----
  root.querySelectorAll('[data-b]').forEach(el => {
    const b = el.dataset.b;
    const on = e => { e.preventDefault(); el.setPointerCapture && el.setPointerCapture(e.pointerId); el.classList.add('on'); Input.setVirtual(b, true); Input.wake(); if (navigator.vibrate) navigator.vibrate(8); };
    const off = e => { e.preventDefault(); el.classList.remove('on'); Input.setVirtual(b, false); };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
  });

  // ----- d-pad (drag your thumb in any direction, 8-way) -----
  const pad = document.getElementById('dpad'), knob = document.getElementById('knob');
  let padId = null;
  const setDirs = (l, r, u, d) => { Input.setVirtual('left', l); Input.setVirtual('right', r); Input.setVirtual('up', u); Input.setVirtual('down', d); };
  const padMove = e => {
    const rc = pad.getBoundingClientRect();
    const cx = rc.left + rc.width / 2, cy = rc.top + rc.height / 2;
    let dx = (e.clientX - cx) / (rc.width / 2), dy = (e.clientY - cy) / (rc.height / 2);
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    knob.style.transform = `translate(${dx * rc.width * 0.3}px, ${dy * rc.height * 0.3}px)`;
    const dead = 0.28;
    if (m < dead) return setDirs(false, false, false, false);
    const a = Math.atan2(dy, dx) * 180 / Math.PI;
    setDirs(a > 112.5 || a < -112.5, a > -67.5 && a < 67.5, a < -22.5 && a > -157.5, a > 22.5 && a < 157.5);
  };
  pad.addEventListener('pointerdown', e => { e.preventDefault(); padId = e.pointerId; pad.setPointerCapture(e.pointerId); pad.classList.add('on'); Input.wake(); padMove(e); });
  pad.addEventListener('pointermove', e => { if (e.pointerId === padId) padMove(e); });
  const padEnd = e => { if (e.pointerId !== padId) return; padId = null; pad.classList.remove('on'); knob.style.transform = ''; setDirs(false, false, false, false); };
  pad.addEventListener('pointerup', padEnd);
  pad.addEventListener('pointercancel', padEnd);

  // tapping the game screen itself = ✕ (advance dialogue, pick menu item, jump)
  const cv = document.getElementById('game');
  cv.addEventListener('pointerdown', e => { e.preventDefault(); Input.wake(); Input.setVirtual('cross', true); });
  const cvUp = () => Input.setVirtual('cross', false);
  cv.addEventListener('pointerup', cvUp); cv.addEventListener('pointercancel', cvUp);

  return api;
})();
