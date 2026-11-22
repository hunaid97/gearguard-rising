// The Transformer Factory: build your own robot from parts, colours and a vehicle mode.
class FactoryScene {
  constructor() {
    this.cfg = randomBot();
    this.row = 1; this.t = 0; this.view = 'robot'; this.tfT = 0; this.built = 0; this.sparks = [];
    this.rows = [
      { label: 'NAME', key: 'name' },
      { label: 'HEAD', key: 'head', opts: PART_OPTIONS.head },
      { label: 'CHEST', key: 'torso', opts: PART_OPTIONS.torso },
      { label: 'ARMS', key: 'arms', opts: PART_OPTIONS.arms },
      { label: 'LEGS', key: 'legs', opts: PART_OPTIONS.legs },
      { label: 'EXTRA', key: 'extra', opts: PART_OPTIONS.extra },
      { label: 'COLOR 1', key: 'c1', opts: PALETTE, color: true },
      { label: 'COLOR 2', key: 'c2', opts: PALETTE, color: true },
      { label: 'EYES', key: 'c3', opts: EYE_PALETTE, color: true },
      { label: 'VEHICLE', key: 'vehicle', opts: PART_OPTIONS.vehicle },
    ];
    Sound.music('title');
  }
  spriteInfo(view) {
    const t = this.t;
    if (view === 'vehicle') return { spr: getVehicleSprite(this.cfg, Math.floor(t / 4) % 2), ax: VB.ax, ay: VB.ay, sc: 2.5 };
    const pose = { legs: this.built ? (Math.floor(t / 7) % 2 ? 'a' : 'b') : 'idle', shoot: !this.built && t % 150 > 130, flex: this.built > 0 && this.built % 40 < 20 };
    return { spr: getRobotSprite(this.cfg, pose), ax: RB.ax, ay: RB.ay, sc: 3 };
  }
  setView(v) { if (v === this.view) return; this.tfFrom = this.spriteInfo(this.view); this.view = v; this.tfT = TF_TIME; Sound.play('transform'); }
  spark(n = 12) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = Math.random() * 3;
      this.sparks.push({ x: 284, y: 130, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: 30, c: pick(['#ffe14d', '#ffffff', '#ff9a3c', '#8fd8ff']) });
    }
  }
  update() {
    this.t++;
    for (const s of this.sparks) { s.x += s.vx; s.y += s.vy; s.vy += 0.12; s.life--; }
    this.sparks = this.sparks.filter(s => s.life > 0);
    if (this.tfT > 0) this.tfT--;
    if (this.built > 0) {
      this.built++;
      if (this.built % 8 === 0) this.spark(6);
      if (this.built > 110) Game.go('free', this.cfg);
      return;
    }
    if (Input.pressed('start')) { Sound.play('back'); Game.go('title'); return; }
    const R = this.rows.length;
    if (Input.pressed('up')) { this.row = (this.row + R - 1) % R; Sound.play('select'); }
    if (Input.pressed('down')) { this.row = (this.row + 1) % R; Sound.play('select'); }
    const d = (Input.pressed('right') ? 1 : 0) - (Input.pressed('left') ? 1 : 0);
    if (d) {
      const r = this.rows[this.row];
      if (r.key === 'name') this.cfg.name = randomName();
      else {
        const i = r.opts.indexOf(this.cfg[r.key]);
        this.cfg[r.key] = r.opts[(i + d + r.opts.length) % r.opts.length];
        if (r.key === 'vehicle') this.setView('vehicle');
        else if (!r.color) this.setView('robot');
      }
      Sound.play('select'); this.spark(8);
    }
    if (Input.pressed('triangle')) { const n = this.cfg.name; this.cfg = randomBot(); this.cfg.name = n; this.spark(20); Sound.play('confirm'); }
    if (Input.pressed('circle')) { this.setView(this.view === 'robot' ? 'vehicle' : 'robot'); this.spark(14); }
    if (Input.pressed('cross')) {
      Roster.add({ ...this.cfg, scale: 1.1 });
      this.setView('robot'); this.built = 1; Sound.play('suit'); this.spark(30);
    }
  }
  draw(ctx) {
    const t = this.t;
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#1a1d26'); grd.addColorStop(1, '#2e3442');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#232835'; for (let x = 0; x < W; x += 32) ctx.fillRect(x, 0, 2, H);
    // gears
    for (const [gx, gy, r, sp] of [[350, 40, 18, 0.02], [372, 70, 11, -0.033], [200, 26, 12, 0.025]]) {
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(t * sp); ctx.fillStyle = '#3a4152';
      for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-3, -r - 3, 6, 6); }
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1d26'; ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // spotlight + pedestal
    ctx.fillStyle = 'rgba(255,240,180,0.07)';
    ctx.beginPath(); ctx.moveTo(268, 0); ctx.lineTo(300, 0); ctx.lineTo(350, 180); ctx.lineTo(218, 180); ctx.fill();
    ctx.fillStyle = OL; ctx.fillRect(223, 175, 122, 10);
    ctx.fillStyle = '#7b8390'; ctx.fillRect(224, 176, 120, 8);
    ctx.fillStyle = '#c3c8d1'; ctx.fillRect(224, 176, 120, 2);
    for (let x = 0; x < 120; x += 10) { ctx.fillStyle = '#5b616b'; ctx.fillRect(224 + ((x + t) % 120), 180, 4, 4); }
    // floor hazard stripes
    for (let x = -20; x < W; x += 16) { ctx.fillStyle = '#e0b020'; ctx.beginPath(); ctx.moveTo(x, 216); ctx.lineTo(x + 8, 216); ctx.lineTo(x + 16, 200); ctx.lineTo(x + 8, 200); ctx.fill(); }
    ctx.fillStyle = 'rgba(12,14,28,0.85)'; ctx.fillRect(0, 199, W, 17);

    // the robot
    const info = this.spriteInfo(this.view);
    if (this.tfT > 0 && this.tfFrom) drawTransformFx(ctx, this.tfFrom, info, 1 - this.tfT / TF_TIME, 284, 176, false, 60);
    else blit(ctx, info.spr, 284, 176 + (this.view === 'vehicle' ? 0 : Math.sin(t * 0.06)), info.ax, info.ay, info.sc, info.sc, false);
    for (const s of this.sparks) { ctx.fillStyle = s.c; ctx.fillRect(s.x, s.y, 1.34, 1.34); }

    // title
    txt(ctx, 'ROBOT FACTORY', 94, 8, { size: 8, align: 'center', color: '#ffe14d', outline: OL });

    // option list
    panel(ctx, 6, 22, 176, 172, 'rgba(12,14,28,0.92)', '#4a5266');
    this.rows.forEach((r, i) => {
      const y = 30 + i * 16, selRow = i === this.row;
      if (selRow) { ctx.fillStyle = '#2f3a5a'; ctx.fillRect(9, y - 3, 170, 14); ctx.fillStyle = '#ffe14d'; ctx.fillRect(9, y - 3, 2, 14); }
      txt(ctx, r.label, 15, y, { color: selRow ? '#ffffff' : '#8d95a6', shadow: false });
      const v = this.cfg[r.key];
      if (r.color) {
        ctx.fillStyle = OL; ctx.fillRect(139, y - 1, 24, 10);
        ctx.fillStyle = v; ctx.fillRect(140, y, 22, 8);
        if (selRow) { txt(ctx, '<', 128, y, { color: '#ffe14d' }); txt(ctx, '>', 166, y, { color: '#ffe14d' }); }
      } else {
        const label = r.key === 'name' ? v : r.key === 'vehicle' ? VEHICLE_NAMES[v] : PART_NAMES[v];
        if (selRow) {
          const w = textWidth(ctx, label);
          txt(ctx, '<', 166 - w - 10, y, { color: '#ffe14d' });
          txt(ctx, '>', 168, y, { color: '#ffe14d' });
        }
        txt(ctx, label, 164, y, { align: 'right', color: selRow ? '#ffe14d' : '#ffffff', shadow: false });
      }
    });
    txt(ctx, this.view === 'vehicle' ? VEHICLE_NAMES[this.cfg.vehicle] + ' MODE' : 'ROBOT MODE', 284, 190 - 2, { align: 'center', color: '#8fd8ff', size: 8, outline: OL });

    if (this.built) {
      const a = Math.min(1, this.built / 20);
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0, 0.6 - this.built / 30)})`; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = a;
      panel(ctx, 40, 82, W - 80, 40, 'rgba(12,14,28,0.95)', '#ffe14d');
      txt(ctx, `${this.cfg.name}`, W / 2, 90, { align: 'center', color: '#ffe14d', size: 8 });
      txt(ctx, 'IS READY FOR ACTION!', W / 2, 106, { align: 'center', color: '#ffffff' });
      ctx.globalAlpha = 1;
    } else {
      hintRow(ctx, [['cross', 'BUILD!'], ['circle', 'TRANSFORM'], ['triangle', 'RANDOM'], ['start', 'EXIT']], W / 2, 202);
    }
  }
}
