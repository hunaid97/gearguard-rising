// Scenes (title, play, character select, birthday) and the game loop.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W * S; canvas.height = H * S;

const Game = {
  scene: null, booted: false,
  go(name, arg) {
    Sound.stopSpeak(); Sound.engine(false);
    if (name === 'title') this.scene = new TitleScene();
    else if (name === 'story') this.scene = new PlayScene('story');
    else if (name === 'free') this.scene = new PlayScene('free', arg);
    else if (name === 'select') this.scene = new SelectScene();
    else if (name === 'factory') this.scene = new FactoryScene();
    else if (name === 'birthday') this.scene = new BirthdayScene();
  },
};

function drawRoad(ctx, scroll) {
  ctx.fillStyle = '#b4bcc7'; ctx.fillRect(0, 184, W, 5);
  ctx.fillStyle = '#dfe4ea'; ctx.fillRect(0, 184, W, 0.67);
  ctx.fillStyle = '#939ba7'; for (let x = -((scroll % 16) + 16) % 16; x < W; x += 16) ctx.fillRect(snap(x), 184.67, 0.67, 4.3);
  ctx.fillStyle = '#7d8590'; ctx.fillRect(0, 189, W, 1.34);
  ctx.fillStyle = '#3d4450'; ctx.fillRect(0, 190.3, W, 26);
  ctx.fillStyle = '#e8c547';
  for (let x = -((scroll % 28) + 28) % 28; x < W; x += 28) ctx.fillRect(snap(x), 199.3, 14, 1.67);
}

// ===================================================== TITLE
class TitleScene {
  constructor() {
    this.t = 0; this.sel = 0;
    this.state = Game.booted ? 'menu' : 'press';
    this.items = ['STORY MODE', 'FREE PLAY', 'ROBOT FACTORY'];
    if (Game.booted) Sound.music('title');
  }
  update() {
    this.t++;
    if (this.state === 'press') {
      if (Input.anyPressed()) { Game.booted = true; Sound.init(); Sound.music('title'); Sound.play('confirm'); this.state = 'menu'; }
      return;
    }
    const n = this.items.length;
    if (Input.pressed('up')) { this.sel = (this.sel + n - 1) % n; Sound.play('select'); }
    if (Input.pressed('down')) { this.sel = (this.sel + 1) % n; Sound.play('select'); }
    if (Input.pressed('cross') || Input.pressed('start')) {
      Sound.play('confirm');
      Game.go(['story', 'select', 'factory'][this.sel]);
    }
  }
  draw(ctx) {
    const t = this.t;
    drawSky(ctx, t * 0.5, 0, t, { zoneX: 300 });
    drawRoad(ctx, t * 0.5);
    drawVehicleAt(ctx, CHARS.skysnarl, (t * 1.6) % 900 - 150, 80 + Math.sin(t * 0.05) * 6, 1.1, false, Math.floor(t / 3) % 2);
    const hop = i => -Math.max(0, Math.sin(t * 0.07 + i * 1.3)) * 5;
    drawRobotAt(ctx, CHARS.zip, 104, 186 + hop(0), 1.5, false, { legs: hop(0) < -0.5 ? 'air' : 'idle' });
    drawRobotAt(ctx, CHARS.qsuit, 192, 186, 1.6, false, { legs: 'idle', shoot: t % 120 > 100, flex: t % 240 > 200 });
    drawRobotAt(ctx, CHARS.titan, 282, 186 + hop(2), 1.6, true, { legs: hop(2) < -0.5 ? 'air' : 'idle' });

    txt(ctx, PERSONAL.name, W / 2, 10, { size: 32, align: 'center', color: '#ffd21f', outline: '#14161c', thick: 2 });
    const bw = 150;
    panel(ctx, W / 2 - bw / 2, 48, bw, 15, '#c42020', '#ffe14d');
    txt(ctx, `${HEROES} RISING`, W / 2, 52, { align: 'center', color: '#ffffff' });
    const cols = ['#ff6b6b', '#ffd21f', '#4fe0a0', '#8fd8ff', '#ff8ad8'];
    txt(ctx, 'WARAS MUBARAK!', W / 2, 70, { align: 'center', color: cols[Math.floor(t / 10) % cols.length], outline: OL });

    if (this.state === 'press') {
      if (Math.floor(t / 30) % 2) txt(ctx, Touch.active ? 'TAP TO START' : 'PRESS START', W / 2, 98, { align: 'center', color: '#ffffff', outline: OL });
    } else {
      this.items.forEach((it, i) => {
        const y = 86 + i * 15, s = i === this.sel;
        if (s) { panel(ctx, W / 2 - 70, y - 4, 140, 15, 'rgba(12,14,28,0.85)', '#ffe14d'); }
        txt(ctx, it, W / 2, y, { align: 'center', color: s ? '#ffe14d' : '#ffffff', outline: OL });
      });
    }
    if (!Touch.active) {
      ctx.fillStyle = 'rgba(12,14,28,0.8)'; ctx.fillRect(0, 202, W, 14);
      txt(ctx, 'ARROWS', 34, 205, { color: '#c3c8d1', shadow: false });
      hintRow(ctx, [['cross', 'Z'], ['circle', 'X'], ['square', 'C'], ['triangle', 'V'], ['start', 'ENTER']], W / 2 + 40, 203, '#c3c8d1');
    }
  }
}

// ===================================================== PLAY (story / free)
class PlayScene {
  constructor(mode, cfg) {
    this.mode = mode;
    this.world = new World(mode);
    if (mode === 'story') new StoryDirector(this.world);
    else new FreeDirector(this.world, cfg || CHARS.qsuit);
    this.paused = false; this.sel = 0;
  }
  menuItems() {
    const s = Sound.settings;
    const items = ['RESUME', `MUSIC: ${s.music ? 'ON' : 'OFF'}`, `VOICES: ${s.voice ? 'ON' : 'OFF'}`, `BUZZ: ${s.haptics ? 'ON' : 'OFF'}`];
    if (this.mode === 'free') items.push('CHANGE ROBOT');
    items.push('QUIT TO TITLE');
    return items;
  }
  update() {
    if (this.paused) {
      const items = this.menuItems(), n = items.length;
      if (Input.pressed('up')) { this.sel = (this.sel + n - 1) % n; Sound.play('select'); }
      if (Input.pressed('down')) { this.sel = (this.sel + 1) % n; Sound.play('select'); }
      if (Input.pressed('start') || Input.pressed('circle')) { this.paused = false; return; }
      if (Input.pressed('cross')) {
        const it = items[this.sel];
        Sound.play('confirm');
        if (it === 'RESUME') this.paused = false;
        else if (it.startsWith('MUSIC')) Sound.setMusic(!Sound.settings.music);
        else if (it.startsWith('VOICES')) Sound.setVoice(!Sound.settings.voice);
        else if (it.startsWith('BUZZ')) Sound.setHaptics(!Sound.settings.haptics);
        else if (it === 'CHANGE ROBOT') Game.go('select');
        else if (it === 'QUIT TO TITLE') Game.go('title');
      }
      return;
    }
    if (Input.pressed('start') && !this.world.dialog && !this.world.locked) { this.paused = true; this.sel = 0; Sound.play('select'); Sound.engine(false); return; }
    this.world.update();
  }
  draw(ctx) {
    this.world.draw(ctx);
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
      const items = this.menuItems();
      const h = 30 + items.length * 16;
      panel(ctx, W / 2 - 80, H / 2 - h / 2, 160, h, 'rgba(12,14,28,0.96)', '#ffe14d');
      txt(ctx, 'PAUSED', W / 2, H / 2 - h / 2 + 8, { align: 'center', color: '#ffe14d' });
      items.forEach((it, i) => {
        const y = H / 2 - h / 2 + 26 + i * 16, s = i === this.sel;
        txt(ctx, (s ? '> ' : '  ') + it, W / 2 - 64, y, { color: s ? '#ffe14d' : '#ffffff' });
      });
    }
  }
}

// ===================================================== CHARACTER SELECT
class SelectScene {
  constructor() {
    const qv = ['bike', 'jetski', 'heli', 'jet', 'truck', 'tank'].filter(v => v !== CHARS.qsuit.vehicle).map(v => ({ ...CHARS.qsuit, vehicle: v, name: `${PERSONAL.name} ${{ bike: 'BIKE', jetski: 'JETSKI', heli: 'HELI', jet: 'JET', truck: 'TRUCK', tank: 'TANK' }[v]}` }));
    this.list = [CHARS.qsuit, ...qv, CHARS.titan, CHARS.zip]
      .concat(Roster.load().map((c, i) => ({ ...c, custom: i })));
    this.list.push({ factory: true, name: 'NEW ROBOT' });
    this.sel = 0; this.t = 0; this.del = -1;
    Sound.music('title');
  }
  update() {
    this.t++;
    const n = this.list.length, C = 3;
    if (Input.pressed('left')) { this.sel = (this.sel + n - 1) % n; Sound.play('select'); this.del = -1; }
    if (Input.pressed('right')) { this.sel = (this.sel + 1) % n; Sound.play('select'); this.del = -1; }
    if (Input.pressed('up') && this.sel - C >= 0) { this.sel -= C; Sound.play('select'); this.del = -1; }
    if (Input.pressed('down') && this.sel + C < n) { this.sel += C; Sound.play('select'); this.del = -1; }
    if (Input.pressed('start')) { Sound.play('back'); Game.go('title'); return; }
    if (Input.pressed('triangle')) { Sound.play('confirm'); Game.go('factory'); return; }
    const it = this.list[this.sel];
    if (Input.pressed('square') && it.custom != null) {
      if (this.del === this.sel) { Roster.remove(it.custom); Sound.play('smash'); const s = this.sel; Game.go('select'); Game.scene.sel = Math.min(s, Game.scene.list.length - 1); return; }
      this.del = this.sel; Sound.play('hurt');
    }
    if (Input.pressed('cross')) {
      Sound.play('confirm');
      if (it.factory) Game.go('factory'); else Game.go('free', it);
    }
  }
  draw(ctx) {
    const t = this.t;
    drawSky(ctx, t * 0.3, 0, t, { zoneX: 300 });
    ctx.fillStyle = 'rgba(10,12,24,0.55)'; ctx.fillRect(0, 0, W, H);
    txt(ctx, 'CHOOSE YOUR ROBOT', W / 2, 8, { align: 'center', color: '#ffe14d', outline: OL });
    const C = 3, cw = 118, ch = 80, gx = Math.round((W - C * (cw + 6) + 6) / 2), gy = 24;
    const row = Math.floor(this.sel / C), top = Math.max(0, row - 1);
    this.list.forEach((c, i) => {
      const r = Math.floor(i / C) - top;
      if (r < 0 || r > 1) return;
      const x = gx + (i % C) * (cw + 6), y = gy + r * (ch + 6), s = i === this.sel;
      panel(ctx, x, y, cw, ch, s ? 'rgba(40,50,80,0.95)' : 'rgba(12,14,28,0.9)', s ? '#ffe14d' : '#4a5266');
      if (c.factory) {
        txt(ctx, '+', x + cw / 2, y + 16, { size: 24, align: 'center', color: '#ffe14d', outline: OL });
        txt(ctx, 'NEW ROBOT', x + cw / 2, y + ch - 14, { align: 'center', color: '#ffffff' });
        return;
      }
      const pose = s ? { legs: Math.floor(t / 8) % 2 ? 'a' : 'b' } : { legs: 'idle' };
      ctx.save(); ctx.beginPath(); ctx.rect(x + 2, y + 2, cw - 4, ch - 4); ctx.clip();
      drawRobotAt(ctx, c, x + cw / 2, y + ch - 17, 1.5, false, pose);
      ctx.restore();
      txt(ctx, c.name, x + cw / 2, y + ch - 13, { align: 'center', color: s ? '#ffe14d' : '#ffffff' });
      if (this.del === i) txt(ctx, 'SQUARE AGAIN = DELETE', x + cw / 2, y + 6, { align: 'center', color: '#ff6b6b', size: 8 });
    });
    ctx.fillStyle = 'rgba(12,14,28,0.85)'; ctx.fillRect(0, 199, W, 17);
    hintRow(ctx, [['cross', 'PLAY'], ['triangle', 'BUILD NEW'], ['square', 'DELETE'], ['start', 'BACK']], W / 2, 202);
  }
}

// ===================================================== BIRTHDAY CELEBRATION
class BirthdayScene {
  constructor() {
    this.t = 0; this.rockets = []; this.parts = [];
    Sound.music('win');
  }
  update() {
    this.t++;
    const t = this.t;
    if (t === 50) Sound.speak(`Waras Mubarak ${PERSONAL.name}! ${PERSONAL.birthdayLines.join(' ')}`, 'titan');
    if (t % 35 === 0) this.rockets.push({ x: 30 + Math.random() * (W - 60), y: H, vy: -3.4 - Math.random(), ty: 20 + Math.random() * 70, c: pick(['#ff6b6b', '#ffd21f', '#4fe0a0', '#8fd8ff', '#ff8ad8', '#ffffff']) });
    for (const r of this.rockets) {
      r.y += r.vy;
      if (t % 2 === 0) this.parts.push({ x: r.x, y: r.y, vx: 0, vy: 0.5, life: 12, c: '#ffd9a0', g: 0 });
      if (r.y < r.ty) {
        r.dead = true; Sound.play('firework');
        for (let i = 0; i < 46; i++) { const a = i / 46 * Math.PI * 2, s = 1 + Math.random() * 1.8; this.parts.push({ x: r.x, y: r.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 55, c: r.c, g: 0.035 }); }
      }
    }
    this.rockets = this.rockets.filter(r => !r.dead);
    if (t % 3 === 0) this.parts.push({ x: Math.random() * W, y: -4, vx: (Math.random() - 0.5) * 0.6, vy: 0.6 + Math.random() * 0.6, life: 400, c: pick(['#ff6b6b', '#ffd21f', '#4fe0a0', '#8fd8ff', '#ff8ad8']), g: 0, confetti: true });
    for (const p of this.parts) { p.x += p.vx + (p.confetti ? Math.sin((t + p.y) * 0.05) * 0.3 : 0); p.y += p.vy; p.vy += p.g; p.life--; }
    this.parts = this.parts.filter(p => p.life > 0 && p.y < H + 5);
    if (t > 150 && (Input.pressed('start') || Input.pressed('cross'))) { Sound.play('confirm'); Game.go('title'); }
  }
  draw(ctx) {
    const t = this.t;
    drawSky(ctx, t * 0.3, 0, t, { night: true });
    drawRoad(ctx, 0);
    for (const p of this.parts) { ctx.globalAlpha = p.confetti ? 1 : clamp(p.life / 30, 0, 1); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.confetti ? 1.34 : 1.34, p.confetti ? 2 : 1.34); }
    ctx.globalAlpha = 1;
    const hop = i => Math.round(-Math.max(0, Math.sin(t * 0.09 + i * 1.7)) * 14);
    const cast = [[CHARS.zip, 104, 1.4, false], [CHARS.qsuit, 192, 1.5, false], [CHARS.titan, 282, 1.5, true]];
    cast.forEach(([c, x, s, f], i) => { const h = hop(i); drawRobotAt(ctx, c, x, 186 + h, s, f, { legs: h < 0 ? 'air' : 'idle', flex: h < -6 }); });

    const head = 'WARAS MUBARAK';
    const cols = ['#ff6b6b', '#ffd21f', '#4fe0a0', '#8fd8ff', '#ff8ad8', '#ffffff'];
    ctx.font = `16px ${FONT}`;
    const hw = ctx.measureText(head).width;
    let x = W / 2 - hw / 2;
    for (let i = 0; i < head.length; i++) {
      const ch = head[i];
      const y = 12 + Math.round(Math.sin(t * 0.1 + i * 0.5) * 3);
      txt(ctx, ch, x, y, { size: 16, color: cols[(i + Math.floor(t / 8)) % cols.length], outline: OL });
      ctx.font = `16px ${FONT}`;
      x += ctx.measureText(ch).width;
    }
    txt(ctx, PERSONAL.name + '!', W / 2, 36, { size: 32, align: 'center', color: '#ffd21f', outline: '#14161c', thick: 2 });
    txt(ctx, `YOU ARE ${PERSONAL.age}!`, W / 2, 74, { align: 'center', color: '#ffffff', outline: OL });
    PERSONAL.birthdayLines.forEach((ln, i) => {
      const a = clamp((t - 80 - i * 60) / 30, 0, 1);
      if (a <= 0) return;
      ctx.globalAlpha = a;
      txt(ctx, ln, W / 2, 94 + i * 13, { align: 'center', color: i === 1 ? '#ffe14d' : '#c3e6ff', outline: OL });
      ctx.globalAlpha = 1;
    });
    if (t > 150 && Math.floor(t / 30) % 2) txt(ctx, 'PRESS START', W - 8, H - 12, { align: 'right', color: '#ffffff', outline: OL });
  }
}

// ===================================================== BOOT + LOOP
Touch.layout();
addEventListener('keydown', e => {
  if (e.code === 'KeyF') {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    else document.exitFullscreen && document.exitFullscreen();
  }
});

let last = performance.now(), acc = 0;
const STEP = 1000 / 60;
function loop(now) {
  acc += Math.min(250, now - last); last = now;
  let n = 0;
  while (acc >= STEP && n < 5) { Input.update(); Game.scene.update(); acc -= STEP; n++; }
  if (n === 5) acc = 0;
  ctx.setTransform(S, 0, 0, S, 0, 0);
  ctx.imageSmoothingEnabled = false;
  Game.scene.draw(ctx);
  requestAnimationFrame(loop);
}
async function boot() {
  ctx.fillStyle = '#07080d'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  try { await Promise.race([document.fonts.load(`8px ${FONT}`), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  await loadPhoto(PERSONAL.photo, PERSONAL.photoCrop);
  Game.go('title');
  requestAnimationFrame(loop);
}
boot();
