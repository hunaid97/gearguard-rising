// The city, physics and everything that moves in it.
const GROUND = 184, GRAV = 0.28, LEVEL_W = 3660, LEVEL_TOP = -220, TF_TIME = 34;

const LEVEL = {
  // buildings: you can stand on them, they block you from the side
  solids: [
    { x: 700, y: 148, w: 90 }, { x: 790, y: 112, w: 70 },
    { x: 1700, y: 150, w: 100 }, { x: 1800, y: 116, w: 80 },
    { x: 2150, y: 84, w: 110 },
    { x: 2450, y: 130, w: 120 }, { x: 2570, y: 96, w: 90 }, { x: 2660, y: 62, w: 130 },
    { x: 3000, y: 140, w: 80 },
  ],
  // girders: jump up through them, stand on top (down + jump to drop)
  girders: [
    { x: 540, y: 146, w: 90 },
    { x: 1040, y: 150, w: 60 }, { x: 1120, y: 118, w: 60 }, { x: 1200, y: 86, w: 60 }, { x: 1270, y: 54, w: 70 },
    { x: 1400, y: 150, w: 80 },
    { x: 2040, y: 150, w: 50 }, { x: 2090, y: 118, w: 50 },
    { x: 2395, y: 156, w: 45 },
  ],
  breakables: [
    ['cone', 420], ['crate', 460], ['car', 520], ['hydrant', 650], ['crate', 900], ['crate', 940], ['barrel', 980],
    ['barrel', 1000], ['crate', 1100], ['barrel', 1180], ['crate', 1240], ['cone', 1320], ['barrel', 1460],
    ['barrel', 1475], ['crate', 1520], ['car', 1640], ['crate', 2000], ['cone', 2100], ['car', 2320],
    ['crate', 2380], ['hydrant', 2425], ['barrel', 2830], ['barrel', 2845], ['crate', 2900], ['car', 2950],
    ['crate', 3120], ['crystal', 3220], ['crystal', 3250], ['crystal', 3300], ['crystal', 3620],
  ],
  parts: [
    { i: 0, x: 585, y: 128 },
    { i: 1, x: 825, y: 94 },
    { i: 2, x: 1305, y: 36 },
    { i: 3, x: 1560, y: 166 },
    { i: 4, crate: 1960 },
    { i: 5, x: 2205, y: 66 },
  ],
  drones: [1000, 1500, 1610, 2000, 2350, 2900, 3100],
  barrierX: 3180,
  arenaX: LEVEL_W - W,
};

const BREAK_TYPES = {
  crate: { w: 14, h: 14, hp: 1, colors: ['#b97a3d', '#8a5a2b', '#d9a066'] },
  bigcrate: { w: 20, h: 20, hp: 1, colors: ['#b97a3d', '#8a5a2b', '#d9a066'] },
  barrel: { w: 10, h: 14, hp: 1, colors: ['#d83a3a', '#8a1f1f', '#ffd21f'] },
  cone: { w: 8, h: 9, hp: 1, colors: ['#ff7a1a', '#ffffff'] },
  hydrant: { w: 8, h: 10, hp: 1, colors: ['#e03030', '#ff6060'] },
  car: { w: 28, h: 12, hp: 3, colors: ['#555b66', '#1d1f25', '#8fd8ff'] },
  crystal: { w: 8, h: 22, hp: 2, colors: ['#9b4dff', '#d9a8ff', '#7a2ad9'] },
};
const CAR_COLORS = ['#3fa7d6', '#e85d75', '#59cd90', '#fac05e', '#9b5de5', '#f15bb5'];

const boxOverlap = (a, b) =>
  a.x + a.w / 2 > b.x - b.w / 2 && a.x - a.w / 2 < b.x + b.w / 2 && a.y > b.y - b.h && a.y - a.h < b.y;

// ===================================================== BODY
class Body {
  constructor(world, cfg, x, y, form = 'robot') {
    Object.assign(this, {
      world, cfg, x, y, form, vx: 0, vy: 0, facing: 1, onGround: false, anim: 0, flash: 0, tfT: 0,
      shootT: 0, flying: false, hitWall: false, prevY: y, dead: false, invuln: 0, dropT: 0, justLanded: 0,
    });
    this.applyDims();
  }
  get sc() { return this.form === 'kid' ? 1 : (this.cfg.scale || 1); }
  stats() {
    if (this.form === 'kid') return STATS.kid;
    if (this.form === 'robot') return STATS.robot;
    return STATS[this.cfg.vehicle] || STATS.car;
  }
  applyDims() { const s = this.stats(); this.w = Math.round(s.w * this.sc); this.h = Math.round(s.h * this.sc); }
  spriteInfo() {
    const pose = this.pose();
    if (this.form === 'kid') return { spr: getKidSprite(this.parts || 0, pose), ax: KB.ax, ay: KB.ay, sc: 1 };
    if (this.form === 'robot') return { spr: getRobotSprite(this.cfg, pose), ax: RB.ax, ay: RB.ay, sc: this.sc };
    return { spr: getVehicleSprite(this.cfg, Math.floor(this.anim / 3) % 2), ax: VB.ax, ay: VB.ay, sc: this.sc };
  }
  setForm(to, fx = true) {
    if (this.form === to) return;
    const from = this.spriteInfo();
    this.form = to; this.applyDims();
    this.flying = to === 'vehicle' && !!FLYING[this.cfg.vehicle];
    if (fx) {
      this.tfT = TF_TIME; this.tfFrom = from;
      this.world.burst(this.x, this.y - this.h / 2, 18, ['#ffffff', '#ffe14d', '#8fd8ff'], 2.4, 26, 0.05, 1.34);
      if (this.world.onScreen(this.x)) Sound.play('transform');
    }
  }
  transform() {
    if (this.form === 'kid') return;
    const to = this.form === 'robot' ? 'vehicle' : 'robot';
    this.setForm(to);
    if (to === 'vehicle') { this.vx = this.facing * Math.max(Math.abs(this.vx), 1.5); if (this.flying) this.vy = Math.min(this.vy, 0); }
  }
  pose() {
    let legs = 'idle';
    if (!this.onGround) legs = 'air';
    else if (Math.abs(this.vx) > 0.3) legs = (Math.floor(this.anim / 7) % 2) ? 'a' : 'b';
    return { legs, shoot: this.shootT > 0 };
  }
  tick() {
    if (this.flash > 0) this.flash--;
    if (this.tfT > 0) this.tfT--;
    if (this.shootT > 0) this.shootT--;
    if (this.invuln > 0) this.invuln--;
    if (Math.abs(this.vx) > 0.3) this.anim += this.form === 'vehicle' ? Math.abs(this.vx) * 0.5 : 1;
  }
  draw(ctx, cx, cy) {
    if (this.invuln > 0 && Math.floor(this.invuln / 3) % 2) return;
    const x = this.x - cx, y = this.y - cy;
    if (x < -90 || x > W + 90) return;
    const info = this.spriteInfo();
    if (this.tfT > 0 && this.tfFrom) {
      if (this.tfT === Math.floor(TF_TIME / 2)) this.world.burst(this.x, this.y - this.h / 2, 12, ['#ffffff', '#8fd8ff'], 2.8, 20, 0, 1.34);
      drawTransformFx(ctx, this.tfFrom, info, 1 - this.tfT / TF_TIME, x, y, this.facing < 0, Math.max(this.h, 14));
      return;
    }
    blit(ctx, info.spr, x, y, info.ax, info.ay, info.sc, info.sc, this.facing < 0, this.flash > 0);
  }
}

// ===================================================== PLAYER
class Player extends Body {
  constructor(world, cfg, x, form) {
    super(world, cfg, x, GROUND, form);
    Object.assign(this, { hearts: 5, maxHearts: 5, parts: 0, shootCd: 0, coyote: 0, airJumps: 1, regenT: 0, honkCd: 0, slamming: false });
  }
  becomeSuit() { this.cfg = CHARS.qsuit; this.parts = 127; this.form = 'robot'; this.applyDims(); }
  update(inp) {
    const w = this.world, st = this.stats();
    const held = b => inp ? inp.held(b) : false, pressed = b => inp ? inp.pressed(b) : false;
    const dx = (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
    const jet = this.form === 'vehicle' && !!FLYING[this.cfg.vehicle];

    if (jet) {
      const dy = (held('down') ? 1 : 0) - (held('up') ? 1 : 0);
      this.vx += (dx * st.speed - this.vx) * 0.08;
      this.vy += (dy * st.speed * 0.8 - this.vy) * 0.12;
      if (dx) this.facing = dx;
      if (this.y - this.h < LEVEL_TOP + 10 && this.vy < 0) this.vy = 0;
    } else if (this.form === 'vehicle') {
      if (dx) { this.vx += dx * st.speed * 0.05; this.facing = dx; } else this.vx *= this.onGround ? 0.95 : 0.99;
      this.vx = clamp(this.vx, -st.speed, st.speed);
    } else {
      this.vx += (dx * st.speed - this.vx) * (this.onGround ? 0.3 : 0.18);
      if (dx) this.facing = dx;
    }
    if (Math.abs(this.vx) < 0.05) this.vx = 0;

    if (this.onGround) { this.coyote = 6; this.airJumps = 1; } else if (this.coyote > 0) this.coyote--;
    if (pressed('cross') && !jet) {
      if (held('down') && this.onGround && w.onGirder(this)) { this.dropT = 12; this.onGround = false; this.coyote = 0; }
      else if (this.coyote > 0 && st.jump) { this.vy = -st.jump; this.coyote = 0; Sound.play('jump'); }
      else if ((this.form === 'robot' || (this.form === 'vehicle' && this.cfg.vehicle === 'jetski')) && this.airJumps > 0) {
        this.airJumps--; this.vy = -st.jump * 0.88; Sound.play('djump');
        w.burst(this.x, this.y, 8, ['#ffffff', '#9ff3ff'], 1.5, 18);
      }
    }
    if (pressed('down') && this.form === 'robot' && !this.onGround && !this.slamming) { this.slamming = true; this.vy = 9; }

    if (this.shootCd > 0) this.shootCd--;
    if (this.honkCd > 0) this.honkCd--;
    if (held('square')) {
      if (this.form === 'robot' && this.shootCd <= 0) { this.shootCd = 13; this.shootT = 14; w.fire(this, 'player'); }
      else if (this.form === 'vehicle') {
        const v = this.cfg.vehicle;
        if ((v === 'jet' || v === 'tank' || v === 'heli') && this.shootCd <= 0) { this.shootCd = v === 'tank' ? 34 : v === 'heli' ? 9 : 12; w.fire(this, 'player', v); }
        else if (v !== 'jet' && v !== 'tank' && v !== 'heli' && pressed('square') && this.honkCd <= 0) { this.honkCd = 25; Sound.play('honk'); w.honk(this); }
      }
    }
    if (pressed('circle')) {
      if (this.form === 'kid') w.toast('Find all 7 suit parts to TRANSFORM!', 120);
      else { this.transform(); w.showControls = Math.max(w.showControls, 200); }
    }
    if (pressed('triangle')) w.talk(this);

    const stepBefore = Math.floor(this.anim / 7);
    w.moveBody(this);
    if (this.form === 'vehicle') {
      Sound.engine(true, Math.abs(this.vx) + Math.abs(this.vy) * 0.5, this.cfg.vehicle);
      if (this.cfg.vehicle === 'jetski' && Math.abs(this.vx) > 1 && w.frame % 2 === 0) w.particles.push({ x: this.x - this.facing * 12, y: this.y - 2, vx: -this.facing * (1 + Math.random() * 2), vy: -1.5 - Math.random() * 2, life: 26, max: 26, c: pick(['#bfe8ff', '#ffffff', '#6fc3f0']), s: 1.34, g: 0.15 });
      if (this.cfg.vehicle === 'heli' && w.frame % 4 === 0 && this.y > GROUND - 40) w.dust(this.x, GROUND, 2);
    }
    else Sound.engine(false);
    if (this.justLanded) {
      if (this.form === 'robot' && (this.slamming || this.justLanded > 8.5)) w.slam(this);
      else if (this.justLanded > 4) { Sound.play('land'); w.dust(this.x, this.y, 6); }
      this.slamming = false;
    }
    this.tick();
    if (this.onGround && this.form !== 'vehicle' && Math.abs(this.vx) > 0.6 && Math.floor(this.anim / 7) !== stepBefore) Sound.play('step');
    this.regenT++;
    if (this.regenT > 360 && this.hearts < this.maxHearts) { this.hearts++; this.regenT = 0; }
  }
}

// ===================================================== ALLIES (Titan, Zip)
class Ally extends Body {
  constructor(world, cfg, x) {
    super(world, cfg, x, GROUND, 'robot');
    this.mode = 'idle'; this.fireCd = 60 + Math.random() * 60; this.offset = -34;
  }
  update() {
    const w = this.world, p = w.player;
    if (this.mode === 'follow' && p) {
      if (Math.abs(p.x - this.x) > 330) {
        this.setForm('robot', false);
        this.x = clamp(p.x - p.facing * 40, w.minX + 10, w.maxX - 10); this.y = w.camY - 40; this.vy = 1; this.vx = 0;
      }
      const tx = p.x + this.offset * p.facing, dx = tx - this.x;
      if (this.onGround) {
        if (Math.abs(dx) > 120 && this.form === 'robot') this.setForm('vehicle');
        else if (Math.abs(dx) < 50 && this.form === 'vehicle') this.setForm('robot');
      }
      const sp = this.form === 'vehicle' ? 4.4 : 2.0;
      if (Math.abs(dx) > 14) { this.vx += (Math.sign(dx) * sp - this.vx) * 0.15; this.facing = Math.sign(dx); }
      else { this.vx *= 0.7; this.facing = p.x > this.x ? 1 : -1; }
      if (this.onGround && this.form === 'robot' && (this.hitWall || (p.y < this.y - 30 && Math.abs(p.x - this.x) < 70 && Math.random() < 0.03))) this.vy = -6.2;
      this.fireCd--;
      if (this.fireCd <= 0 && this.form === 'robot') {
        const t = w.nearestEnemy(this.x, this.y - 15, 170);
        if (t) { this.facing = t.x > this.x ? 1 : -1; this.shootT = 14; w.fire(this, 'ally', null, 5, t); this.fireCd = 80 + Math.random() * 60; }
        else this.fireCd = 15;
      }
    } else this.vx *= 0.8;
    w.moveBody(this);
    if (this.justLanded > 5) { w.dust(this.x, this.y, 6); }
    this.tick();
  }
}

// ===================================================== DREADBOT DRONE
class Drone extends Body {
  constructor(world, x, y = GROUND) {
    super(world, CHARS.drone, x, y, 'robot');
    this.hp = 2; this.home = x; this.dir = Math.random() < 0.5 ? -1 : 1; this.fireCd = 120 + Math.random() * 120; this.stun = 0;
  }
  update() {
    const w = this.world, p = w.player;
    if (this.stun > 0) { this.stun--; this.vx *= 0.9; }
    else {
      if (Math.abs(this.x - this.home) > 70) this.dir = Math.sign(this.home - this.x);
      if (this.hitWall) this.dir *= -1;
      this.vx = this.dir * 0.55; this.facing = this.dir;
      if (w.director.suit && p && Math.abs(p.x - this.x) < 180 && Math.abs(p.y - this.y) < 70) {
        this.fireCd--;
        if (this.fireCd <= 20) this.flash = this.fireCd % 6 < 3 ? 1 : 0;
        if (this.fireCd <= 0) { this.facing = p.x > this.x ? 1 : -1; this.shootT = 12; w.fire(this, 'enemy', null, 2.2); this.fireCd = 160 + Math.random() * 100; }
      }
    }
    w.moveBody(this);
    this.tick();
  }
  damage(n, fromX) {
    if (this.dead) return;
    this.hp -= n; this.flash = 6; this.stun = 20; this.vx = Math.sign(this.x - fromX || 1) * 2.5;
    const w = this.world;
    if (this.hp <= 0) {
      this.dead = true; this.removed = true; w.smashed++;
      w.burst(this.x, this.y - 12, 22, ['#9b59ff', '#5b3a8a', '#ff3366', '#ffe14d', '#c3c8d1'], 3, 40, 0.15, 2);
      w.addText(this.x, this.y - 34, pick(['ZAP!', 'BOOM!', 'POW!', 'KA-POW!']), '#ff7ad8');
      Sound.play('boom'); w.shake = Math.max(w.shake, 4);
    } else Sound.play('hit');
  }
}

// ===================================================== SKYSNARL (flying villain)
class Skysnarl extends Body {
  constructor(world, x, y) {
    super(world, CHARS.skysnarl, x, y, 'robot');
    this.flying = true; this.hp = 8; this.mode = 'script'; this.t = 0; this.bombCd = 150; this.goal = null;
  }
  vulnerable() { return this.mode === 'enemy'; }
  update() {
    const w = this.world, p = w.player;
    this.t++;
    if (this.goal) {
      const dx = this.goal.x - this.x, dy = this.goal.y - this.y, d = Math.hypot(dx, dy), sp = this.goal.speed || 3;
      if (d < sp + 1) { this.x = this.goal.x; this.y = this.goal.y; this.goal = null; this.vx = 0; this.vy = 0; }
      else { this.vx = dx / d * sp; this.vy = dy / d * sp; }
    } else if (this.mode === 'enemy') {
      const tx = p.x + Math.sin(this.t * 0.012) * 150;
      const ty = Math.min(GROUND - 95, p.y - 85) + Math.sin(this.t * 0.05) * 12;
      this.vx = clamp(this.vx + clamp((tx - this.x) * 0.01, -0.2, 0.2), -3.6, 3.6);
      this.vy += ((ty - this.y) * 0.03 - this.vy) * 0.1;
      if (--this.bombCd <= 0 && Math.abs(p.x - this.x) < 120) {
        w.shots.push({ x: this.x, y: this.y - 4, vx: this.vx * 0.3, vy: 0.5, grav: 0.12, r: 3, dmg: 1, color: '#ff5a20', team: 'enemy', kind: 'bomb', life: 300 });
        this.bombCd = 140 + Math.random() * 80;
      }
    } else if (this.mode === 'flee') {
      this.vx += this.fleeDir * 0.2; this.vy -= 0.06;
      if (this.y < w.camY - 120 || Math.abs(this.x - w.camX - W / 2) > 600) this.gone = true;
    } else { this.vx *= 0.9; this.vy = Math.sin(this.t * 0.06) * 0.3; }
    this.x += this.vx; this.y += this.vy;
    if (Math.abs(this.vx) > 0.3) this.facing = Math.sign(this.vx);
    const sp = Math.abs(this.vx);
    if (sp > 2.6 && this.form === 'robot') this.setForm('vehicle');
    else if (sp < 1.5 && this.form === 'vehicle') this.setForm('robot');
    this.flying = true; this.onGround = false;
    this.tick();
  }
  damage(n) {
    if (!this.vulnerable()) return;
    const w = this.world;
    this.hp -= n; this.flash = 5; Sound.play('hit');
    if (this.hp <= 0) {
      this.mode = 'flee'; this.fleeDir = this.x > w.player.x ? 1 : -1; w.smashed += 5;
      w.addText(this.x, this.y - 40, 'SKYSNARL FLEES!', '#d0b0ff');
      w.burst(this.x, this.y - 12, 30, ['#ffe14d', '#ff5a20', '#ffffff'], 3, 40);
      Sound.play('boom');
      if (w.director.onFlyerDefeated) w.director.onFlyerDefeated();
    }
  }
}

// ===================================================== DREADCORE (villain boss)
class Dreadcore extends Body {
  constructor(world, x, y) {
    super(world, CHARS.dreadcore, x, y, 'robot');
    this.maxHp = 30; this.hp = 30; this.state = 'intro'; this.t = 0; this.active = false; this.minX = LEVEL.arenaX;
  }
  vulnerable() { return this.active && this.state !== 'defeated' && this.state !== 'fly'; }
  update() {
    const w = this.world, p = w.player;
    if (this.state === 'fly') {
      this.vy -= 0.12; this.y += this.vy; this.x += this.vx;
      if (this.y < w.camY - 120) this.gone = true;
      this.onGround = false; this.tick(); return;
    }
    if (this.active && this.state !== 'defeated') {
      this.t--;
      const sc = this.sc;
      switch (this.state) {
        case 'walk':
          this.facing = p.x < this.x ? -1 : 1;
          if (Math.abs(p.x - this.x) > 50) this.vx = this.facing * 0.9; else this.vx *= 0.8;
          if (this.t <= 0) this.choose();
          break;
        case 'charge':
          this.vx = 0; this.shootT = 2;
          if (this.t % 4 === 0) w.burst(this.x + this.facing * 21 * sc, this.y - 23 * sc, 2, ['#ffd080', '#ffffff'], 1, 12, 0, 1.34);
          if (this.t <= 0) {
            this.shootT = 15;
            w.shots.push({ x: this.x + this.facing * 22 * sc, y: this.y - 23 * sc, vx: this.facing * 2.6, vy: 0, r: 6, dmg: 1, color: '#ff8a20', team: 'enemy', life: 220, big: true });
            Sound.play('bigblast'); this.state = 'walk'; this.t = 70;
          }
          break;
        case 'leap':
          if (this.onGround && this.t < 52) {
            this.state = 'walk'; this.t = 60; this.vx = 0;
            for (const d of [-1, 1]) w.shots.push({ x: this.x + d * 20, y: GROUND - 5, vx: d * 2.4, vy: 0, r: 5, dmg: 1, color: '#ff6a20', team: 'enemy', kind: 'wave', life: 150 });
            w.shake = 10; Sound.play('slam'); w.dust(this.x, this.y, 16);
          }
          break;
        case 'summon':
          this.vx = 0;
          if (this.t === 30) {
            for (const d of [-1, 1]) { const dr = new Drone(w, clamp(this.x + d * 120, LEVEL.arenaX + 20, LEVEL_W - 20), w.camY - 20); w.enemies.push(dr); }
            w.addText(this.x, this.y - 50, 'DREADBOTS, ATTACK!', '#b07bff');
          }
          if (this.t <= 0) { this.state = 'walk'; this.t = 60; }
          break;
      }
    } else this.vx *= 0.8;
    w.moveBody(this);
    if (this.justLanded > 6 && !this.active) { w.dust(this.x, this.y, 16); }
    this.tick();
  }
  choose() {
    const r = Math.random(), p = this.world.player;
    if (this.hp < this.maxHp * 0.6 && r < 0.22 && this.world.enemies.length < 3) { this.state = 'summon'; this.t = 50; }
    else if (r < 0.6) { this.state = 'charge'; this.t = 50; Sound.play('charge'); }
    else { this.state = 'leap'; this.t = 60; this.vy = -7; this.vx = clamp((p.x - this.x) / 50, -3, 3); Sound.play('jump'); }
  }
  damage(n) {
    if (!this.vulnerable()) return;
    this.hp -= n; this.flash = 5; Sound.play('hit');
    if (this.hp <= 0) { this.hp = 0; this.state = 'defeated'; this.vx = 0; this.world.director.onBossDefeated(this); }
  }
}

// ===================================================== WORLD
class World {
  constructor(mode) {
    Object.assign(this, {
      mode, frame: 0, breakables: [], enemies: [], allies: [], shots: [], particles: [], pickups: [], texts: [],
      boss: null, flyer: null, barrier: null, player: null, director: null,
      camX: 0, camY: 0, shake: 0, smashed: 0, dialog: null, script: null, toastMsg: null, locked: false,
      minX: 0, maxX: LEVEL_W, camMin: 0, camMax: LEVEL_W - W, flashT: 0, fade: 0, fadeTo: 0, showControls: 0, suitAnim: null,
    });
    this.solids = LEVEL.solids.map(s => ({ x: s.x, y: s.y, w: s.w, h: GROUND - s.y }));
    this.girders = LEVEL.girders.map(g => ({ ...g }));
    LEVEL.breakables.forEach(([t, x], i) => this.addBreakable(t, x, null, i));
  }
  addBreakable(t, x, part = null, i = 0) {
    const T = BREAK_TYPES[t];
    const b = { t, x, y: GROUND, w: T.w, h: T.h, hp: T.hp, maxHp: T.hp, dead: false, flash: 0, part, respawn: 0 };
    if (t === 'car') { b.color = CAR_COLORS[i % CAR_COLORS.length]; b.flip = i % 2 === 0; }
    this.breakables.push(b);
    return b;
  }

  // ---------------- physics ----------------
  activeSolids() {
    if (this.barrier && this.barrier.active) return this.solids.concat([{ x: this.barrier.x, y: LEVEL_TOP, w: this.barrier.w, h: GROUND - LEVEL_TOP, barrier: true }]);
    return this.solids;
  }
  moveBody(b) {
    b.prevY = b.y; b.hitWall = false;
    const vx0 = b.vx;
    b.x += b.vx;
    for (const s of this.activeSolids()) {
      if (b.y - b.h < s.y + s.h && b.y > s.y + 0.5 && b.x + b.w / 2 > s.x && b.x - b.w / 2 < s.x + s.w) {
        if (b.x < s.x + s.w / 2) b.x = s.x - b.w / 2; else b.x = s.x + s.w + b.w / 2;
        b.hitWall = true;
        if (s.barrier && b === this.player && Math.abs(vx0) > 2.5) { this.hitBarrier(2); b.vx = -Math.sign(vx0) * 2; b.vy = -2; }
        else b.vx = 0;
      }
    }
    const minX = b.minX != null ? Math.max(b.minX, this.minX) : this.minX;
    if (b.x - b.w / 2 < minX) { b.x = minX + b.w / 2; b.vx = 0; b.hitWall = true; }
    if (b.x + b.w / 2 > this.maxX) { b.x = this.maxX - b.w / 2; b.vx = 0; b.hitWall = true; }

    if (!b.flying) b.vy = Math.min(b.vy + GRAV, 10);
    const py = b.y;
    b.y += b.vy;
    const was = b.onGround;
    b.onGround = false; b.justLanded = 0;
    if (b.vy >= 0) {
      let top = Infinity;
      if (b.y >= GROUND) top = GROUND;
      const l = b.x - b.w / 2, r = b.x + b.w / 2;
      for (const s of this.solids) if (r > s.x && l < s.x + s.w && py <= s.y + 0.5 && b.y >= s.y) top = Math.min(top, s.y);
      if (!(b.dropT > 0)) for (const g of this.girders) if (r > g.x && l < g.x + g.w && py <= g.y + 0.5 && b.y >= g.y) top = Math.min(top, g.y);
      if (top < Infinity) {
        const v = b.vy;
        b.y = top; b.vy = 0; b.onGround = true;
        if (!was) b.justLanded = v;
      }
    }
    if (b.y > GROUND) { b.y = GROUND; b.vy = 0; b.onGround = true; }
    if (b.dropT > 0) b.dropT--;
  }
  onGirder(b) { return this.girders.some(g => Math.abs(b.y - g.y) < 1 && b.x + b.w / 2 > g.x && b.x - b.w / 2 < g.x + g.w); }
  surfaceBelow(x, y) {
    let top = GROUND;
    for (const s of this.solids) if (x > s.x && x < s.x + s.w && s.y >= y) top = Math.min(top, s.y);
    for (const g of this.girders) if (x > g.x && x < g.x + g.w && g.y >= y) top = Math.min(top, g.y);
    return top;
  }
  pointInSolid(x, y) {
    if (y >= GROUND) return true;
    return this.solids.some(s => x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h);
  }
  onScreen(x) { return x > this.camX - 30 && x < this.camX + W + 30; }

  // ---------------- combat & effects ----------------
  fire(b, team, kind, speed, target) {
    const sc = b.sc;
    let x, y, vx, vy = 0, r = 2, dmg = 1, color = b.cfg.c3;
    if (b.form === 'robot') { x = b.x + b.facing * 23 * sc; y = b.y - 22 * sc; vx = b.facing * (speed || 6); }
    else if (kind === 'tank') { x = b.x + b.facing * 22 * sc; y = b.y - 13 * sc; vx = b.facing * 5; r = 3; dmg = 3; color = '#ffd04d'; }
    else { x = b.x + b.facing * 16 * sc; y = b.y - (kind === 'heli' ? 7 : 5) * sc; vx = b.facing * 7; }
    if (team === 'enemy') color = '#ff4060';
    if (team === 'ally') color = '#ffe14d';
    if (target) { const dx = target.x - x, dy = (target.y - target.h / 2) - y, d = Math.hypot(dx, dy) || 1; const s = speed || 6; vx = dx / d * s; vy = dy / d * s; }
    this.shots.push({ x, y, vx, vy, r, dmg, color, team, life: 90 });
    if (this.onScreen(b.x)) Sound.play(kind === 'tank' ? 'bigblast' : 'blast');
    this.burst(x, y, 3, ['#ffffff', color], 1, 8, 0);
  }
  hitShot(b, s) {
    return s.x + s.r > b.x - b.w / 2 && s.x - s.r < b.x + b.w / 2 && s.y + s.r > b.y - b.h && s.y - s.r < b.y;
  }
  updateShots() {
    const p = this.player;
    for (const s of this.shots) {
      s.x += s.vx; s.y += s.vy; s.vy += s.grav || 0;
      if (--s.life <= 0 || Math.abs(s.x - this.camX - W / 2) > 420) { s.dead = true; continue; }
      if (s.team === 'fx') {
        if (s.target && this.hitShot(s.target, s)) s.dead = true;
        continue;
      }
      if (s.kind === 'wave') {
        if (this.pointInSolid(s.x, s.y)) s.dead = true;
        if (this.frame % 3 === 0) this.burst(s.x, GROUND - 2, 1, ['#c040ff', '#e0a0ff'], 1, 14, 0.05);
      } else if (this.pointInSolid(s.x, s.y)) {
        s.dead = true;
        if (s.kind === 'bomb') this.explode(s.x, s.y - 4, 26, 1, 'enemy');
        else this.burst(s.x, s.y, 4, ['#ffffff', s.color], 1.2, 10);
        continue;
      }
      if (s.team === 'player' || s.team === 'ally') {
        for (const e of this.enemies) if (!e.dead && this.hitShot(e, s)) { e.damage(s.dmg, s.x); s.dead = true; break; }
        if (!s.dead && this.boss && this.boss.vulnerable() && this.hitShot(this.boss, s)) { this.boss.damage(s.dmg); s.dead = true; }
        if (!s.dead && this.flyer && this.flyer.vulnerable() && this.hitShot(this.flyer, s)) { this.flyer.damage(s.dmg); s.dead = true; }
        if (!s.dead && s.team === 'player') {
          for (const b of this.breakables) if (!b.dead && this.hitShot(b, s)) { this.damageBreakable(b, s.dmg); s.dead = true; break; }
          if (!s.dead && this.barrier && this.barrier.active && s.x > this.barrier.x - 2 && s.x < this.barrier.x + this.barrier.w + 2) { this.hitBarrier(1); s.dead = true; }
        }
        if (s.dead) this.burst(s.x, s.y, 5, ['#ffffff', s.color], 1.5, 12);
      } else if (s.team === 'enemy' && p && this.hitShot(p, s)) {
        s.dead = true;
        if (s.kind === 'bomb') this.explode(s.x, s.y, 20, 1, 'enemy'); else this.hurtPlayer(s.dmg, s.x);
      }
    }
    this.shots = this.shots.filter(s => !s.dead);
  }
  damageBreakable(b, n) {
    if (b.dead) return;
    b.hp -= n; b.flash = 5;
    if (b.hp <= 0) this.breakIt(b); else Sound.play('hit');
  }
  breakIt(b) {
    b.dead = true; b.respawn = 900; this.smashed++;
    const T = BREAK_TYPES[b.t];
    this.burst(b.x, b.y - b.h / 2, 18, T.colors.concat(b.color ? [b.color] : []), 3, 38, 0.2, 3);
    Sound.play('smash'); this.shake = Math.max(this.shake, 3);
    this.addText(b.x, b.y - b.h - 6, pick(['SMASH!', 'CRASH!', 'BOOM!', 'POW!', 'WHAM!']));
    if (b.t === 'hydrant') b.water = 150;
    if (b.t === 'barrel') this.explode(b.x, b.y - 7, 42, 3, 'player');
    if (b.part != null) { this.spawnPickup(b.part, b.x, b.y - 14); b.part = null; }
  }
  hitBarrier(n) {
    const br = this.barrier;
    if (!br || !br.active) return;
    if (!this.director.suit) { this.burst(br.x, this.player.y - 15, 6, ['#c040ff', '#ffffff'], 1.5, 12); return; }
    br.hp -= n; br.flash = 6; Sound.play('hit');
    this.burst(br.x + 5, this.player.y - 15, 8, ['#c040ff', '#ffffff', '#e0a0ff'], 2, 16);
    if (br.hp <= 0) {
      br.active = false;
      for (let i = 0; i < 5; i++) this.burst(br.x + 5, GROUND - 20 - i * 30, 14, ['#c040ff', '#e0a0ff', '#ffffff'], 3.5, 40);
      Sound.play('boom'); this.shake = 12; this.toast('FORCE FIELD DESTROYED!', 150);
    }
  }
  explode(x, y, r, dmg, team) {
    this.burst(x, y, 26, ['#fff6a0', '#ffb030', '#ff5a20', '#555b66'], 3.5, 40, 0.05, 3);
    Sound.play('boom'); this.shake = Math.max(this.shake, 7);
    if (team !== 'enemy') {
      for (const b of this.breakables) if (!b.dead && dist(b.x, b.y - b.h / 2, x, y) < r + b.w / 2) this.damageBreakable(b, dmg);
      for (const e of this.enemies) if (!e.dead && dist(e.x, e.y - e.h / 2, x, y) < r + 8) e.damage(dmg, x);
      if (this.boss && this.boss.vulnerable() && dist(this.boss.x, this.boss.y - 20, x, y) < r + 15) this.boss.damage(2);
    } else if (this.player && dist(this.player.x, this.player.y - this.player.h / 2, x, y) < r + 4) this.hurtPlayer(1, x);
  }
  explodeFx(x, y) {
    this.burst(x, y, 26, ['#fff6a0', '#ffb030', '#ff5a20', '#555b66'], 3.5, 40, 0.05, 3);
    Sound.play('boom'); this.shake = Math.max(this.shake, 7);
  }
  slam(p) {
    Sound.play('slam'); this.shake = 11;
    for (let i = 0; i < 26; i++) {
      const d = i % 2 ? 1 : -1;
      this.particles.push({ x: p.x + d * 6, y: p.y - 2, vx: d * (1 + Math.random() * 4), vy: -Math.random() * 2.5, life: 30, max: 30, c: pick(['#ffffff', '#c3c8d1', '#8fd8ff', '#a5adb8']), s: 3, g: 0.12 });
    }
    this.addText(p.x, p.y - 44, 'SUPER SLAM!', '#8fd8ff');
    const r = 64;
    for (const b of this.breakables) if (!b.dead && Math.abs(b.x - p.x) < r && Math.abs(b.y - p.y) < 40) this.damageBreakable(b, 3);
    for (const e of this.enemies) if (!e.dead && Math.abs(e.x - p.x) < r && Math.abs(e.y - p.y) < 40) e.damage(3, p.x);
    if (this.boss && this.boss.vulnerable() && Math.abs(this.boss.x - p.x) < r + 10 && Math.abs(this.boss.y - p.y) < 40) this.boss.damage(3);
  }
  honk(p) {
    this.addText(p.x + p.facing * 20, p.y - 24, 'HONK!', '#ffe14d');
    for (const e of this.enemies) if (!e.dead && Math.abs(e.x - p.x) < 90 && Math.abs(e.y - p.y) < 50) { e.stun = 60; e.vx = Math.sign(e.x - p.x || 1) * 3; e.vy = -3; }
  }
  hurtPlayer(n, fromX) {
    const p = this.player;
    if (!p || p.invuln > 0 || this.locked) return;
    p.hearts -= n; p.invuln = 80; p.regenT = -200;
    p.vx = (p.x < fromX ? -1 : 1) * 3; if (!p.flying) p.vy = -3;
    Sound.play('hurt'); this.shake = Math.max(this.shake, 4);
    if (p.hearts <= 0) { p.hearts = 0; this.director.onPlayerDown(); }
  }
  nearestEnemy(x, y, r) {
    let best = null, bd = r;
    const cands = this.enemies.filter(e => !e.dead);
    if (this.boss && this.boss.vulnerable()) cands.push(this.boss);
    if (this.flyer && this.flyer.vulnerable()) cands.push(this.flyer);
    for (const e of cands) { const d = dist(x, y, e.x, e.y - e.h / 2); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  interact() {
    const p = this.player;
    const fast = p.form === 'vehicle' && Math.abs(p.vx) > 2.5;
    const stomping = top => p.vy > 0.5 && p.prevY <= top + 7;
    for (const b of this.breakables) {
      if (b.dead || !boxOverlap(p, b)) continue;
      if (fast) { this.damageBreakable(b, 3); p.vx *= 0.88; }
      else if (stomping(b.y - b.h)) { this.damageBreakable(b, 3); p.vy = -4.5; p.airJumps = 1; Sound.play('stomp'); }
    }
    for (const e of this.enemies) {
      if (e.dead || !boxOverlap(p, e)) continue;
      if (fast) { e.damage(3, p.x); p.vx *= 0.8; }
      else if (stomping(e.y - e.h)) { e.damage(p.form === 'kid' ? 2 : 3, p.x); p.vy = -4.8; p.airJumps = 1; Sound.play('stomp'); }
      else if (!e.stun) this.hurtPlayer(1, e.x);
    }
    const bs = this.boss;
    if (bs && bs.vulnerable() && boxOverlap(p, bs)) {
      if (fast) { bs.damage(2); p.vx = -Math.sign(p.vx) * 4; p.vy = -3; }
      else if (stomping(bs.y - bs.h)) { bs.damage(2); p.vy = -6; Sound.play('stomp'); }
      else this.hurtPlayer(1, bs.x);
    }
    for (const k of this.pickups) {
      if (k.dead || k.falling) continue;
      if (dist(p.x, p.y - p.h / 2, k.x, k.y) < 14 + p.w / 2) { k.dead = true; this.director.onPart(k.i); }
    }
  }
  spawnPickup(i, x, y, fall = false) { this.pickups.push({ i, x, y, falling: fall, vy: 0, t: 0, dead: false }); }
  burst(x, y, n, colors, speed = 2, life = 30, g = 0.1, size = 1.34) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = Math.random() * speed;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.3, life: life * (0.6 + Math.random() * 0.4), max: life, c: pick(colors), s: size, g });
    }
  }
  dust(x, y, n = 8) {
    for (let i = 0; i < n; i++) this.particles.push({ x: x + (Math.random() - 0.5) * 10, y: y - 1, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 1.2, life: 22, max: 22, c: pick(['#c9d0d9', '#a5adb8', '#ffffff']), s: 2, g: 0.03 });
  }
  addText(x, y, str, color = '#ffe14d') { this.texts.push({ x, y, str, color, life: 50 }); }
  toast(text, t = 120, color = '#ffe14d') { this.toastMsg = { text, t, color }; }
  talk(p) {
    let best = null;
    for (const a of this.allies) if (Math.abs(a.x - p.x) < 46 && Math.abs(a.y - p.y) < 50) best = a;
    if (best && this.director.talk) { best.facing = p.x > best.x ? 1 : -1; this.director.talk(best); }
  }

  // ---------------- dialogue & scripts ----------------
  say(who, text) {
    this.dialog = { who, text, shown: 0 };
    if (who === 'zip') Sound.play('beep');
    Sound.speak(text, who);
  }
  runScript(steps) { this.script = { steps, i: 0, t: 0, started: false }; this.locked = true; }
  updateScript() {
    const s = this.script;
    if (!s) return;
    while (s.i < s.steps.length) {
      const st = s.steps[s.i];
      if (typeof st === 'function') { s.i++; s.t = 0; st(); if (this.script !== s) return; continue; }
      if (st.say) {
        if (!s.started) { this.say(st.say, st.text); s.started = true; }
        if (this.dialog) return;
        s.started = false; s.i++; continue;
      }
      if (st.wait != null) { s.t += 1 / 60; if (s.t < st.wait) return; s.i++; s.t = 0; continue; }
      if (st.until) { s.t += 1 / 60; if (!st.until() && s.t < (st.max || 8)) return; s.i++; s.t = 0; continue; }
      s.i++;
    }
    this.script = null; this.locked = false;
  }
  updateDialog() {
    const d = this.dialog;
    const before = Math.floor(d.shown);
    d.shown = Math.min(d.text.length, d.shown + 1.3);
    const now = Math.floor(d.shown);
    if (now !== before && now % 3 === 0 && d.text[now - 1] && d.text[now - 1] !== ' ') Sound.blip(d.who);
    if (['cross', 'triangle', 'square', 'circle'].some(b => Input.pressed(b))) {
      if (d.shown < d.text.length) d.shown = d.text.length;
      else { this.dialog = null; Sound.play('select'); }
    }
  }

  // ---------------- main update ----------------
  update() {
    this.frame++;
    this.fade += clamp(this.fadeTo - this.fade, -0.05, 0.05);
    if (this.flashT > 0) this.flashT--;
    if (this.celebrate) this.updateCelebrate();
    if (this.dialog) { this.updateDialog(); this.updateParticles(); this.updateCamera(); return; }
    this.updateScript();
    if (this.dialog) return;
    const p = this.player;
    p.update(this.locked ? null : Input);
    for (const a of this.allies) a.update();
    for (const e of this.enemies) e.update();
    this.enemies = this.enemies.filter(e => !e.removed);
    if (this.boss) this.boss.update();
    if (this.flyer) this.flyer.update();
    this.updateShots();
    if (!this.locked) this.interact();
    this.updateBreakables();
    this.updatePickups();
    this.updateParticles();
    this.director.update();
    this.updateCamera();
    if (this.toastMsg && --this.toastMsg.t <= 0) this.toastMsg = null;
    if (this.showControls > 0) this.showControls--;
  }
  updateBreakables() {
    for (const b of this.breakables) {
      if (b.flash > 0) b.flash--;
      if (b.dead && b.water > 0) {
        b.water--;
        if (this.frame % 2 === 0) this.particles.push({ x: b.x, y: b.y - 8, vx: (Math.random() - 0.5) * 1.5, vy: -3.5 - Math.random() * 1.5, life: 40, max: 40, c: pick(['#8fd8ff', '#ffffff', '#4fb8ff']), s: 2, g: 0.15 });
      }
      if (b.dead && this.mode === 'free' && b.part == null && --b.respawn <= 0 && !this.onScreen(b.x)) {
        b.dead = false; b.hp = b.maxHp; b.water = 0;
      }
    }
  }
  updatePickups() {
    for (const k of this.pickups) {
      k.t++;
      if (k.falling) {
        k.vy = Math.min(k.vy + 0.2, 5); k.y += k.vy;
        const top = this.surfaceBelow(k.x, k.y - 20) - 10;
        if (k.y >= top) { k.y = top; k.falling = false; }
      }
      if (k.t % 12 === 0 && !k.dead) this.particles.push({ x: k.x + (Math.random() - 0.5) * 14, y: k.y + 4, vx: 0, vy: -0.6, life: 30, max: 30, c: '#ffe14d', s: 1, g: 0 });
    }
    this.pickups = this.pickups.filter(k => !k.dead);
  }
  updateParticles() {
    for (const q of this.particles) { q.x += q.vx; q.y += q.vy; q.vy += q.g; q.life--; }
    this.particles = this.particles.filter(q => q.life > 0);
    if (this.particles.length > 600) this.particles.splice(0, this.particles.length - 600);
    for (const t of this.texts) { t.y -= 0.5; t.life--; }
    this.texts = this.texts.filter(t => t.life > 0);
  }
  updateCamera(snap = false) {
    const p = this.player;
    if (!p) return;
    const tx = p.x - W / 2 + p.facing * 24 + p.vx * 6;
    const ty = Math.min(0, p.y - 140);
    if (snap) { this.camX = tx; this.camY = ty; }
    this.camX += (tx - this.camX) * 0.12;
    this.camY += (ty - this.camY) * 0.1;
    this.camX = clamp(this.camX, this.camMin, this.camMax);
    this.camY = clamp(this.camY, LEVEL_TOP, 0);
    if (this.shake > 0) { this.shake *= 0.86; if (this.shake < 0.4) this.shake = 0; }
  }

  // ---------------- celebration (when Qumayl becomes a robot) ----------------
  startCelebrate(dur = 290) {
    this.celebrate = { t: 0, dur, conf: [] };
    Sound.play('cheer');
    for (let i = 0; i < 90; i++) this.celebrate.conf.push({ x: W / 2, y: 120, vx: (Math.random() - 0.5) * 7, vy: -2 - Math.random() * 5, c: pick(['#ff6b6b', '#ffd21f', '#4fe0a0', '#8fd8ff', '#ff8ad8', '#ffffff']), r: Math.random() * 6 });
  }
  updateCelebrate() {
    const c = this.celebrate;
    c.t++;
    for (const p of c.conf) { p.x += p.vx; p.y += p.vy; p.vy += 0.09; p.vx *= 0.99; p.r += 0.2; }
    if (c.t % 40 === 0 && c.t < c.dur - 40) for (let i = 0; i < 30; i++) c.conf.push({ x: Math.random() * W, y: -5, vx: (Math.random() - 0.5) * 1.5, vy: Math.random() * 1.5, c: pick(['#ff6b6b', '#ffd21f', '#4fe0a0', '#8fd8ff', '#ff8ad8']), r: Math.random() * 6 });
    c.conf = c.conf.filter(p => p.y < H + 10);
    if (c.t >= c.dur) this.celebrate = null;
  }
  drawCelebrate(ctx) {
    const c = this.celebrate, t = c.t, cfg = this.player.cfg;
    const a = Math.min(1, t / 14) * Math.min(1, (c.dur - t) / 18);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(8,10,30,0.82)'; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = 132;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.008);
    for (let i = 0; i < 18; i++) {
      ctx.rotate(Math.PI * 2 / 18);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-16, -280); ctx.lineTo(16, -280); ctx.closePath();
      ctx.fillStyle = i % 2 ? 'rgba(255,220,90,0.16)' : 'rgba(120,200,255,0.12)'; ctx.fill();
    }
    ctx.restore();
    const gl = ctx.createRadialGradient(cx, cy, 4, cx, cy, 80);
    gl.addColorStop(0, 'rgba(255,255,230,0.55)'); gl.addColorStop(1, 'rgba(255,255,230,0)');
    ctx.fillStyle = gl; ctx.fillRect(cx - 80, cy - 80, 160, 160);
    const ease = q => 1 + 2.7 * Math.pow(q - 1, 3) + 1.7 * Math.pow(q - 1, 2);
    const pop = t < 20 ? Math.max(0.05, ease(t / 20)) : 1;
    const seq = Math.floor(t / 45) % 4;
    const pose = [{ legs: 'idle', flex: true }, { legs: 'idle', shoot: true }, { legs: 'air', flex: true }, { legs: 'b', flex: true }][seq];
    const hop = seq === 2 ? -Math.sin((t % 45) / 45 * Math.PI) * 16 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(cx, 190, 26, 4, 0, 0, Math.PI * 2); ctx.fill();
    drawRobotAt(ctx, cfg, cx, 190 + hop, 3 * pop, false, pose);
    if (t % 6 === 0) this.burst(this.camX + cx + (Math.random() - 0.5) * 120, this.camY + cy + (Math.random() - 0.5) * 100, 3, ['#ffffff', '#ffe14d'], 1, 20, 0, 1);
    for (const p of c.conf) { ctx.fillStyle = p.c; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillRect(-1, -1.5, 2, 3); ctx.restore(); }
    const head = 'SUIT ONLINE!', cols = ['#ff6b6b', '#ffd21f', '#4fe0a0', '#8fd8ff', '#ff8ad8'];
    const hw = textWidth(ctx, head, 16);
    let x = cx - hw / 2;
    for (let i = 0; i < head.length; i++) {
      txt(ctx, head[i], x, 14 + Math.sin(t * 0.15 + i * 0.6) * 3, { size: 16, color: cols[(i + Math.floor(t / 6)) % cols.length], outline: OL, thick: 1 });
      x += textWidth(ctx, head[i], 16);
    }
    if (t > 40) txt(ctx, `${PERSONAL.name} IS A ROBOT HERO!`, cx, 200, { align: 'center', color: '#ffe14d', outline: OL });
    ctx.restore();
  }

  // ---------------- drawing ----------------
  draw(ctx) {
    let cx = this.camX, cy = this.camY;
    if (this.shake > 0) { cx += (Math.random() * 2 - 1) * this.shake; cy += (Math.random() * 2 - 1) * this.shake * 0.6; }
    cx = snap(clamp(cx, 0, LEVEL_W - W)); cy = snap(clamp(cy, LEVEL_TOP, 0));
    this.cx = cx; this.cy = cy;
    drawSky(ctx, cx, cy, this.frame);
    drawLevel(ctx, cx, cy);

    if (this.barrier && this.barrier.active) this.drawBarrier(ctx, cx, cy);
    for (const b of this.breakables) if (!b.dead && b.x > cx - 40 && b.x < cx + W + 40) drawBreakable(ctx, b, b.x - cx, b.y - cy);
    for (const k of this.pickups) this.drawPickup(ctx, k, cx, cy);
    for (const a of this.allies) a.draw(ctx, cx, cy);
    for (const e of this.enemies) e.draw(ctx, cx, cy);
    if (this.boss) this.boss.draw(ctx, cx, cy);
    if (this.flyer) this.flyer.draw(ctx, cx, cy);
    if (this.suitAnim) this.drawSuitAnim(ctx, cx, cy);
    this.player.draw(ctx, cx, cy);

    for (const s of this.shots) {
      const x = s.x - cx, y = s.y - cy;
      if (x < -20 || x > W + 20) continue;
      ctx.save();
      if (s.kind === 'wave') {
        ctx.globalAlpha = 0.35; ctx.fillStyle = s.color; ctx.beginPath(); ctx.ellipse(x, y - 3, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = s.color; ctx.beginPath(); ctx.ellipse(x, y - 2, 5, 5, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#fff0c0'; ctx.fillRect(x - 1.5, y - 6, 3, 4);
      } else if (s.big) {
        ctx.globalAlpha = 0.35; ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      } else if (s.kind === 'bomb') {
        ctx.fillStyle = OL; ctx.beginPath(); ctx.arc(x, y, 3.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a4f58'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = (this.frame >> 2) % 2 ? '#ff5a20' : '#ffe14d'; ctx.fillRect(x - 0.5, y - 5, 1.2, 2);
      } else {
        const ang = Math.atan2(s.vy, s.vx);
        ctx.translate(x, y); ctx.rotate(ang);
        ctx.globalAlpha = 0.35; ctx.fillStyle = s.color; roundRect(ctx, -7, -3, 14, 6, 3); ctx.fill();
        ctx.globalAlpha = 1; roundRect(ctx, -5, -1.7, 10, 3.4, 1.7); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(-2, -0.7, 5, 1.4);
      }
      ctx.restore();
    }
    for (const q of this.particles) {
      ctx.globalAlpha = clamp(q.life / q.max * 1.5, 0, 1);
      ctx.fillStyle = q.c; ctx.fillRect(snap(q.x - cx), snap(q.y - cy), q.s, q.s);
    }
    ctx.globalAlpha = 1;
    for (const t of this.texts) txt(ctx, t.str, t.x - cx, t.y - cy, { align: 'center', color: t.color, outline: OL });

    if (this.flashT > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flashT / 22})`; ctx.fillRect(0, 0, W, H); }
    if (this.celebrate) { this.drawCelebrate(ctx); }
    else {
      this.drawHUD(ctx);
      if (this.dialog) this.drawDialog(ctx);
      if (this.toastMsg && !this.dialog) {
        const w = textWidth(ctx, this.toastMsg.text) + 16;
        panel(ctx, W / 2 - w / 2, 30, w, 16, 'rgba(12,14,28,0.9)', this.toastMsg.color);
        txt(ctx, this.toastMsg.text, W / 2, 34, { align: 'center', color: this.toastMsg.color });
      }
    }
    if (this.fade > 0.01) { ctx.fillStyle = `rgba(0,0,0,${this.fade})`; ctx.fillRect(0, 0, W, H); }
  }
  drawBarrier(ctx, cx, cy) {
    const b = this.barrier, x = b.x - cx;
    if (x < -20 || x > W + 20) return;
    const bottom = GROUND - cy;
    ctx.save();
    const grd = ctx.createLinearGradient(x - 6, 0, x + b.w + 6, 0);
    grd.addColorStop(0, 'rgba(192,64,255,0)'); grd.addColorStop(0.5, b.flash > 0 ? 'rgba(255,255,255,0.8)' : 'rgba(192,64,255,0.45)'); grd.addColorStop(1, 'rgba(192,64,255,0)');
    ctx.fillStyle = grd; ctx.fillRect(x - 6, 0, b.w + 12, bottom);
    for (let y = (this.frame * 1.5) % 12 - 12; y < bottom; y += 12) { ctx.fillStyle = 'rgba(240,190,255,0.6)'; ctx.fillRect(x, y, b.w, 1); }
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = 'rgba(255,230,255,0.85)'; ctx.lineWidth = 0.67; ctx.beginPath();
      let px = x + b.w / 2;
      ctx.moveTo(px, 0);
      for (let y = 0; y < bottom; y += 10) { px = x + b.w / 2 + Math.sin(y * 0.3 + this.frame * 0.3 + k * 2) * 4; ctx.lineTo(px, y); }
      ctx.stroke();
    }
    if (b.flash > 0) b.flash--;
    ctx.fillStyle = '#3b2350'; ctx.fillRect(x - 4, bottom - 10, b.w + 8, 10);
    ctx.fillStyle = '#c04dff'; ctx.fillRect(x - 4, bottom - 10, b.w + 8, 1.34);
    ctx.restore();
  }
  drawPickup(ctx, k, cx, cy) {
    const x = k.x - cx, y = k.y - cy + Math.sin(k.t * 0.08) * 2;
    if (x < -20 || x > W + 20) return;
    ctx.save();
    const grd = ctx.createLinearGradient(0, y - 80, 0, y + 10);
    grd.addColorStop(0, 'rgba(255,240,150,0)'); grd.addColorStop(1, 'rgba(255,240,150,0.35)');
    ctx.fillStyle = grd; ctx.fillRect(x - 7, y - 80, 14, 90);
    const g2 = ctx.createRadialGradient(x, y, 1, x, y, 14);
    g2.addColorStop(0, 'rgba(255,250,200,0.8)'); g2.addColorStop(1, 'rgba(255,250,200,0)');
    ctx.fillStyle = g2; ctx.fillRect(x - 14, y - 14, 28, 28);
    ctx.restore();
    drawPartIcon(ctx, k.i, x - 8, y - 8, 16);
  }
  drawSuitAnim(ctx, cx, cy) {
    const p = this.player, t = this.suitAnim.t;
    const r = Math.max(0, 40 - t * 0.38);
    for (let i = 0; i < 7; i++) {
      const a = t * 0.12 + i * Math.PI * 2 / 7;
      drawPartIcon(ctx, i, p.x - cx + Math.cos(a) * r - 5, p.y - 12 - cy + Math.sin(a) * r * 0.6 - 5, 10);
    }
    if (t % 3 === 0) this.burst(p.x, p.y - 10, 2, ['#ffe14d', '#8fd8ff', '#ffffff'], 2, 20, 0);
  }
  drawHUD(ctx) {
    const p = this.player, cx = this.cx, cy = this.cy;
    for (let i = 0; i < p.maxHearts; i++) drawHeart(ctx, 6 + i * 10, 6, i < p.hearts);
    txt(ctx, `SMASH ${this.smashed}`, W - 6, 6, { align: 'right', color: '#ffe14d', outline: OL });
    this.director.drawHUD(ctx);

    const o = !this.locked && !this.dialog && this.director.objective();
    if (o) this.drawArrow(ctx, o.x - cx, o.y - cy);

    if (!this.locked) for (const a of this.allies) {
      if (Math.abs(a.x - p.x) < 46 && Math.abs(a.y - p.y) < 50) btnGlyph(ctx, 'triangle', a.x - cx - 5.5, a.y - cy - a.h - 16 + Math.sin(this.frame * 0.15) * 2);
    }
    const bs = this.boss;
    if (bs && (bs.active || bs.state === 'defeated') && bs.state !== 'fly') {
      const bw = 160, bx = W / 2 - bw / 2, by = 22;
      txt(ctx, bs.cfg.name, W / 2, by - 1, { align: 'center', color: '#ff8a6a', outline: OL });
      ctx.fillStyle = OL; roundRect(ctx, bx - 1, by + 9, bw + 2, 7, 2); ctx.fill();
      ctx.fillStyle = '#3a1a1a'; ctx.fillRect(bx, by + 10, bw, 5);
      ctx.fillStyle = '#ff5a3a'; ctx.fillRect(bx, by + 10, bw * bs.hp / bs.maxHp, 5);
      ctx.fillStyle = '#ffc0a0'; ctx.fillRect(bx, by + 10, bw * bs.hp / bs.maxHp, 1.34);
    }
    if (this.showControls > 0 && !this.dialog && !this.locked && !(typeof Touch !== 'undefined' && Touch.active)) {
      let items;
      if (p.form === 'kid') items = [['dpad', 'MOVE'], ['cross', 'JUMP'], ['triangle', 'TALK']];
      else if (p.form === 'robot') items = [['cross', 'JUMP x2'], ['square', 'BLAST'], ['circle', 'TRANSFORM'], ['down', 'SLAM']];
      else if (FLYING[p.cfg.vehicle]) items = [['dpad', 'FLY'], ['square', 'FIRE'], ['circle', 'ROBOT']];
      else if (p.cfg.vehicle === 'jetski') items = [['cross', 'JUMP x2'], ['square', 'HONK'], ['circle', 'ROBOT']];
      else if (p.cfg.vehicle === 'tank') items = [['cross', 'JUMP'], ['square', 'FIRE'], ['circle', 'ROBOT']];
      else items = [['cross', 'JUMP'], ['square', 'HONK'], ['circle', 'ROBOT']];
      ctx.fillStyle = 'rgba(12,14,28,0.8)'; ctx.fillRect(0, H - 17, W, 17);
      hintRow(ctx, items, W / 2, H - 14);
    }
  }
  drawArrow(ctx, sx, sy) {
    const f = this.frame;
    const on = sx > 10 && sx < W - 10 && sy > 30 && sy < H - 10;
    const map = { '#': '#ffe14d' }, s = 2 / 3;
    if (on) {
      drawPattern(ctx, ['###########', '.#########.', '..#######..', '...#####...', '....###....', '.....#.....'], sx - 11 * s / 2, sy - 28 + Math.sin(f * 0.15) * 3, map, s);
    } else {
      const x = clamp(sx, 12, W - 12), y = clamp(sy, 36, H - 22), b = Math.sin(f * 0.2) * 2;
      const R = ['#.....', '###...', '#####.', '######', '#####.', '###...', '#.....'];
      if (sx >= W - 10) drawPattern(ctx, R, x - 6 + b, y - 5, map, 1.34);
      else if (sx <= 10) drawPattern(ctx, R.map(r => r.split('').reverse().join('')), x - 2 - b, y - 5, map, 1.34);
      else drawPattern(ctx, ['...#...', '..###..', '.#####.', '#######'], x - 5, y - 4 - b, map, 1.34);
    }
  }
  drawDialog(ctx) {
    const d = this.dialog, sp = SPEAKERS[d.who] || SPEAKERS.titan;
    const bx = 6, by = 146, bw = W - 12, bh = 64;
    panel(ctx, bx, by, bw, bh, 'rgba(10,12,24,0.95)', sp.color);
    drawPortrait(ctx, d.who, bx + 8, by + 8, 48);
    txt(ctx, sp.name, bx + 64, by + 8, { color: sp.color });
    const lines = wrapText(ctx, d.text, bw - 76);
    let left = Math.floor(d.shown);
    lines.forEach((ln, i) => {
      if (left <= 0) return;
      const part = ln.slice(0, left);
      left -= ln.length + 1;
      txt(ctx, part, bx + 64, by + 22 + i * 11, { color: '#ffffff' });
    });
    if (d.shown >= d.text.length && Math.floor(this.frame / 20) % 2) btnGlyph(ctx, 'cross', bx + bw - 16, by + bh - 15);
  }
}
