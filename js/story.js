// Story mode (find the 7 suit parts, defeat Dreadcore) and Free Play mode.
const N = PERSONAL.name;

class StoryDirector {
  constructor(world) {
    const w = this.w = world;
    w.director = this;
    this.phase = 'intro'; this.suit = false; this.checkX = 140; this.warnT = 0;
    w.player = new Player(w, CHARS.qsuit, 140, 'kid');
    this.titan = new Ally(w, CHARS.titan, 232); this.titan.facing = -1; this.titan.offset = -62;
    this.zip = new Ally(w, CHARS.zip, 92); this.zip.offset = -32;
    w.allies.push(this.titan, this.zip);
    LEVEL.parts.forEach(pt => {
      if (pt.crate) w.addBreakable('bigcrate', pt.crate, pt.i);
      else w.spawnPickup(pt.i, pt.x, pt.y);
    });
    LEVEL.drones.forEach(x => w.enemies.push(new Drone(w, x)));
    w.barrier = { x: LEVEL.barrierX, w: 10, hp: 8, active: true, flash: 0 };
    w.fade = 1; w.fadeTo = 0;
    w.updateCamera(true);
    Sound.music('hero');
    w.runScript(this.introScript());
  }
  get found() { let n = 0; for (let i = 0; i < 7; i++) if ((this.w.player.parts >> i) & 1) n++; return n; }

  introScript() {
    const w = this.w;
    return [
      { wait: 0.9 },
      { say: 'titan', text: `${N}! Today is a very special day. You are turning ${PERSONAL.age}!` },
      { say: 'qumayl', text: `Hi Titan! Hi Zip!` },
      { say: 'titan', text: `The ${HEROES} built you a special Waras gift... your very own ROBOT BATTLE SUIT!` },
      { say: 'zip', text: `Woo-hoo! It's SO COOL! It even turns into a ${VEHICLE_NAMES[PERSONAL.suit.vehicle]}!` },
      () => { this.ss = new Skysnarl(w, w.camX + W + 50, 30); this.ss.goal = { x: 300, y: 100, speed: 3.5 }; w.flyer = this.ss; Sound.play('bigblast'); },
      { until: () => !this.ss.goal, max: 4 },
      () => { this.ss.facing = -1; },
      { say: 'skysnarl', text: `Hee hee hee! Looking for THIS, little human?` },
      { say: 'skysnarl', text: `Boss Dreadcore wants this suit! I'll scatter the pieces all over the city!` },
      () => {
        this.ss.goal = { x: 1000, y: -80, speed: 5 };
        w.burst(this.ss.x, this.ss.y - 10, 40, ['#ffe14d', '#ffffff', '#8fd8ff'], 3.5, 60, 0.05, 2);
        Sound.play('boom'); w.shake = 6;
      },
      { wait: 1.3 },
      () => { w.flyer = null; },
      { say: 'titan', text: `Skysnarl! ... Don't worry, ${N}. There are 7 pieces. Let's find them all!` },
      { say: 'titan', text: `Jump on the ${VILLAINS} drones to stop them. Zip will stay with you.` },
      { say: 'titan', text: `${HEROES}... GEAR UP!` },
      () => { this.phase = 'hunt'; this.zip.mode = 'follow'; w.showControls = 420; w.toast('FIND THE 7 SUIT PARTS!', 180); },
    ];
  }

  onPart(i) {
    const w = this.w, p = w.player;
    p.parts |= (1 << i);
    Sound.play('pickup');
    w.burst(p.x, p.y - 12, 24, ['#ffe14d', '#ffffff', PERSONAL.suit.c1], 3, 40);
    this.checkX = p.x;
    if (i === 6) { this.suitUp(); return; }
    w.toast(`${PART_LABELS[i]} FOUND!   ${this.found}/7`, 170);
    if (this.found === 6) this.flyerEvent();
    else Sound.play('beep');
  }

  flyerEvent() {
    const w = this.w;
    this.phase = 'event';
    w.runScript([
      { wait: 1.0 },
      () => {
        const p = w.player;
        let gx = p.x + 70;
        if (gx > LEVEL.barrierX - 40) gx = p.x - 70;
        this.ss = new Skysnarl(w, w.camX + W + 50, p.y - 130);
        this.ss.goal = { x: gx, y: Math.min(p.y - 70, GROUND - 80), speed: 4 };
        w.flyer = this.ss; Sound.play('bigblast');
      },
      { until: () => !this.ss.goal, max: 5 },
      () => { this.ss.facing = w.player.x > this.ss.x ? 1 : -1; w.player.facing = -this.ss.facing; },
      { say: 'skysnarl', text: `WHAT?! You found SIX pieces?` },
      { say: 'skysnarl', text: `But I still have the SPARK CORE! Without it, your suit is just a pile of bolts!` },
      () => {
        const p = w.player, o = this.titan;
        o.mode = 'script'; o.setForm('robot', false);
        o.x = clamp(p.x - 50 * Math.sign(this.ss.x - p.x || 1), 30, LEVEL.barrierX - 30);
        o.y = w.camY - 50; o.vy = 2; o.vx = 0;
      },
      { until: () => this.titan.onGround, max: 3 },
      () => { const o = this.titan; w.shake = 9; Sound.play('slam'); w.dust(o.x, o.y, 16); o.facing = this.ss.x > o.x ? 1 : -1; },
      { say: 'titan', text: `Skysnarl! Leave ${N} alone!` },
      () => {
        const o = this.titan, s = this.ss;
        o.shootT = 25;
        const sx = o.x + o.facing * 25, sy = o.y - 29, dx = s.x - sx, dy = (s.y - 15) - sy, d = Math.hypot(dx, dy);
        w.shots.push({ x: sx, y: sy, vx: dx / d * 7, vy: dy / d * 7, r: 3, dmg: 0, color: '#6ff3ff', team: 'fx', life: 120, target: s });
        Sound.play('bigblast');
      },
      { until: () => !w.shots.some(s => s.team === 'fx'), max: 2 },
      () => {
        const s = this.ss;
        s.flash = 25; w.explodeFx(s.x, s.y - 14);
        w.spawnPickup(6, s.x, s.y - 10, true);
      },
      { say: 'skysnarl', text: `OW OW OW! My shiny wings! Boss Dreadcore will hear about this!` },
      () => { this.ss.goal = { x: this.ss.x + 500, y: this.ss.y - 220, speed: 5 }; },
      { wait: 0.8 },
      () => { w.flyer = null; },
      { say: 'titan', text: `The SPARK CORE! Quick, ${N}, grab it!` },
      () => { this.titan.mode = 'follow'; this.phase = 'spark'; },
    ]);
  }

  suitUp() {
    const w = this.w, p = w.player;
    this.phase = 'suitup';
    w.runScript([
      () => { p.vx = 0; Sound.music(null); w.suitAnim = { t: 0 }; p.flying = true; p.vy = -0.6; Sound.play('charge'); },
      { wait: 0.6 },
      () => { p.vy = 0; Sound.play('charge'); },
      { wait: 1.2 },
      () => {
        w.suitAnim = null; w.flashT = 22; Sound.play('suit'); p.becomeSuit(); p.flying = false; w.shake = 10;
        w.burst(p.x, p.y - 15, 50, ['#ffffff', '#ffe14d', PERSONAL.suit.c1, '#8fd8ff'], 4, 60, 0.05, 2);
        this.suit = true; p.hearts = p.maxHearts;
      },
      { wait: 0.7 },
      () => { w.startCelebrate(300); Sound.music('win'); Sound.speak(`${N} is a robot hero!`, 'titan'); },
      { until: () => !w.celebrate, max: 7 },
      { say: 'qumayl', text: `WHOA! I'm a real ROBOT HERO!!` },
      { say: 'zip', text: `AWESOME! You look amazing!` },
      { say: 'titan', text: `Your suit is online, ${N}. Press CIRCLE to TRANSFORM, and SQUARE to BLAST!` },
      { say: 'titan', text: `Dreadcore is hiding behind his force field. Blast through it and stop him!` },
      () => {
        this.phase = 'toBoss'; Sound.music('hero'); this.titan.mode = 'follow'; w.showControls = 600;
        w.toast('TRANSFORM AND GEAR UP!', 160);
        [2450, 2700, 2950, 3060, 3130].forEach(x => { if (Math.abs(x - p.x) > 150) w.enemies.push(new Drone(w, x, w.surfaceBelow(x, -999) === GROUND ? GROUND : w.camY - 40)); });
      },
    ]);
  }

  bossIntro() {
    const w = this.w;
    this.phase = 'bossintro';
    w.camMin = LEVEL.arenaX; w.camMax = LEVEL.arenaX; w.minX = LEVEL.arenaX;
    for (const a of w.allies) if (a.x < LEVEL.arenaX + 10) { a.setForm('robot', false); a.x = LEVEL.arenaX + 30 + Math.random() * 30; a.y = w.camY - 40; a.vy = 1; }
    this.boss = new Dreadcore(w, LEVEL.arenaX + 300, w.camY - 80);
    this.boss.facing = -1;
    w.boss = this.boss;
    Sound.music(null);
    w.runScript([
      { wait: 0.4 },
      { until: () => this.boss.onGround, max: 4 },
      () => { w.shake = 14; Sound.play('slam'); w.dust(this.boss.x, this.boss.y, 20); },
      { wait: 0.7 },
      { say: 'dreadcore', text: `So... the little human found a suit.` },
      { say: 'dreadcore', text: `I am DREADCORE! The ${VILLAINS} never lose!` },
      { say: 'qumayl', text: `I'm not a little human. I'm ${N}... and I'm a ROBOT HERO!` },
      { say: 'titan', text: `We are with you, ${N}. ${HEROES}, ATTACK!` },
      () => { this.boss.active = true; this.boss.state = 'walk'; this.boss.t = 60; this.phase = 'boss'; Sound.music('boss'); w.showControls = 300; },
    ]);
  }

  onBossDefeated(b) {
    const w = this.w;
    this.phase = 'victory';
    Sound.music(null);
    w.runScript([
      () => { w.shots = []; w.enemies.forEach(e => e.damage(99, e.x)); },
      () => w.explodeFx(b.x - 10, b.y - 25), { wait: 0.3 },
      () => w.explodeFx(b.x + 12, b.y - 35), { wait: 0.3 },
      () => w.explodeFx(b.x, b.y - 15), { wait: 0.8 },
      { say: 'dreadcore', text: `Impossible! Beaten by a ${PERSONAL.age}-year-old?!` },
      { say: 'dreadcore', text: `${VILLAINS}... RUN AWAY!` },
      () => { b.state = 'fly'; b.vy = -1; b.vx = 1; Sound.play('transform'); },
      { wait: 1.6 },
      () => { w.boss = null; w.fadeTo = 1; },
      { wait: 0.7 },
      () => {
        const p = w.player, mid = LEVEL.arenaX + W / 2;
        p.setForm('robot', false); p.x = mid; p.y = GROUND; p.vx = 0; p.vy = 0; p.facing = 1; p.invuln = 0;
        this.titan.setForm('robot', false); this.titan.mode = 'idle'; this.titan.x = mid + 46; this.titan.y = GROUND; this.titan.facing = -1;
        this.zip.setForm('robot', false); this.zip.mode = 'idle'; this.zip.x = mid - 40; this.zip.y = GROUND; this.zip.facing = 1;
        w.updateCamera(true); w.fadeTo = 0; Sound.music('win');
      },
      { wait: 0.9 },
      { say: 'titan', text: `${N}... you were brave, strong and kind today. You never gave up.` },
      { say: 'zip', text: `BEST! ROBOT HERO! EVER!` },
      { say: 'titan', text: `Waras Mubarak, ${N}! From now on, you are a TRUE ${HEROES} HERO.` },
      () => { w.fadeTo = 1; },
      { wait: 1.0 },
      () => { try { localStorage.setItem('qa_story_done', '1'); } catch (e) {} Game.go('birthday'); },
    ]);
  }

  onPlayerDown() {
    const w = this.w, p = w.player;
    w.runScript([
      () => { w.fadeTo = 1; },
      { wait: 0.6 },
      () => {
        const x = this.phase === 'boss' ? LEVEL.arenaX + 40 : this.checkX;
        p.x = x; p.y = w.surfaceBelow(x, -999); p.vx = 0; p.vy = 0;
        p.hearts = p.maxHearts; p.invuln = 150; p.slamming = false;
        if (p.form === 'vehicle') p.setForm('robot', false);
        w.updateCamera(true); w.fadeTo = 0;
      },
      { wait: 0.4 },
      this.suit ? { say: 'titan', text: `Get up, ${N}! A hero never gives up!` }
        : { say: 'zip', text: `Gotcha! Don't worry, let's try again!` },
    ]);
  }

  update() {
    const w = this.w, p = w.player;
    if (w.suitAnim) w.suitAnim.t++;
    if (this.warnT > 0) this.warnT--;
    if (this.phase === 'hunt' && w.barrier.active && p.x > w.barrier.x - 50 && this.warnT <= 0) {
      w.toast(`${VILLAINS} FORCE FIELD! Find your suit first.`, 170, '#e0a0ff'); this.warnT = 400;
    }
    if (this.phase === 'toBoss') {
      if (w.barrier.active && p.x > w.barrier.x - 90 && this.warnT <= 0) { w.toast('BLAST THE FORCE FIELD!', 150, '#e0a0ff'); this.warnT = 500; }
      if (!w.barrier.active && p.x > LEVEL.arenaX + 50 && !w.locked) this.bossIntro();
    }
  }

  objective() {
    const w = this.w;
    if (this.phase === 'hunt' || this.phase === 'spark') {
      const p = w.player;
      const targets = w.pickups.map(k => ({ x: k.x, y: k.y }))
        .concat(w.breakables.filter(b => !b.dead && b.part != null).map(b => ({ x: b.x, y: b.y - b.h })));
      let best = null, bd = Infinity;
      for (const t of targets) { const d = Math.abs(t.x - p.x) + Math.abs(t.y - p.y) * 0.5; if (d < bd) { bd = d; best = t; } }
      return best;
    }
    if (this.phase === 'toBoss') return w.barrier.active ? { x: w.barrier.x + 5, y: GROUND - 40 } : { x: LEVEL.arenaX + 80, y: GROUND - 30 };
    return null;
  }

  talk(a) {
    const w = this.w;
    if (a === this.titan) {
      const lines = this.suit
        ? [`Dreadcore is to the EAST, ${N}. Keep going!`, `Jump off something tall, then press DOWN for a SUPER SLAM!`, `I am proud of you, ${N}.`]
        : [`Follow the yellow arrow to find your suit parts.`, `Look for glowing lights. That is where the pieces are!`, `You can do it, ${N}!`];
      w.say('titan', pick(lines));
    } else {
      w.say('zip', pick([`This way! Follow the arrow!`, `Jump on them! Boing!`, `WARAS MUBARAK, ${N}!`, `You're my best friend!`, `I'm the fastest car in the city!`]));
    }
  }

  drawHUD(ctx) {
    const p = this.w.player;
    if (this.phase === 'boss' || this.phase === 'victory' || this.phase === 'bossintro') return;
    const x0 = W / 2 - 7 * 15 / 2;
    for (let i = 0; i < 7; i++) {
      const x = x0 + i * 15, has = (p.parts >> i) & 1;
      ctx.fillStyle = OL; roundRect(ctx, x - 1, 3, 15, 15, 2.5); ctx.fill();
      ctx.fillStyle = has ? '#1f2a44' : 'rgba(20,22,30,0.75)'; roundRect(ctx, x, 4, 13, 13, 2); ctx.fill();
      drawPartIcon(ctx, i, x + 1, 5, 11, !has);
    }
  }
}

// ===================================================== FREE PLAY
class FreeDirector {
  constructor(world, cfg) {
    const w = this.w = world;
    w.director = this;
    this.suit = true; this.cfg = cfg;
    w.player = new Player(w, cfg, 200, 'robot');
    const friends = [CHARS.titan, CHARS.zip].filter(c => c.id !== cfg.id);
    friends.forEach((c, i) => { const a = new Ally(w, c, 140 - i * 50); a.mode = 'follow'; a.offset = -36 - i * 32; w.allies.push(a); });
    LEVEL.drones.forEach(x => w.enemies.push(new Drone(w, x)));
    w.boss = new Dreadcore(w, LEVEL.arenaX + 260, GROUND); w.boss.state = 'walk';
    this.bossT = 0; this.ssT = 900; this.flyT = 0;
    w.updateCamera(true);
    Sound.music('hero');
    w.showControls = 500;
    w.toast(`${cfg.name || 'HERO'}, GEAR UP!`, 150);
  }
  update() {
    const w = this.w, p = w.player;
    if (w.frame % 240 === 0 && w.enemies.length < 6) {
      for (const x of [w.camX + W + 30, w.camX - 30]) {
        if (x < 30 || x > LEVEL_W - 30) continue;
        w.enemies.push(new Drone(w, x, w.surfaceBelow(x, -999) === GROUND ? GROUND : w.camY - 40));
        break;
      }
    }
    const b = w.boss;
    if (b) {
      if (!b.active && b.state === 'walk' && Math.abs(p.x - b.x) < 230) {
        b.active = true; b.t = 40; w.toast('DREADCORE APPEARS!', 130, '#ff8a6a'); Sound.music('boss');
      }
      if (b.state === 'defeated' && --this.flyT <= 0) { b.state = 'fly'; b.vy = -1; b.vx = 1; Sound.play('transform'); }
      if (b.gone) { w.boss = null; this.bossT = 1800; }
    } else if (--this.bossT <= 0) {
      w.boss = new Dreadcore(w, LEVEL.arenaX + 260, w.camY - 80); w.boss.state = 'walk';
    }
    if (!w.flyer) {
      if (--this.ssT <= 0) {
        const s = new Skysnarl(w, w.camX + W + 40, w.camY + 30);
        s.mode = 'enemy'; w.flyer = s; w.toast('SKYSNARL IS ATTACKING!', 130, '#c9a0ff');
      }
    } else if (w.flyer.gone) { w.flyer = null; this.ssT = 1800; }
  }
  onBossDefeated(b) {
    const w = this.w;
    w.smashed += 10;
    w.explodeFx(b.x, b.y - 20);
    w.toast('DREADCORE DEFEATED!', 160, '#ffe14d');
    w.addText(b.x, b.y - 60, `${VILLAINS}, RUN AWAY!`, '#ff8a6a');
    this.flyT = 70;
    Sound.music('hero');
  }
  onFlyerDefeated() { this.w.toast('SKYSNARL FLEW AWAY!', 130); }
  onPlayerDown() {
    const w = this.w, p = w.player;
    p.hearts = p.maxHearts; p.invuln = 150;
    if (w.allies.some(a => a.cfg.id === 'zip')) w.say('zip', `Gotcha! Keep going, ${N}!`);
    else w.say('titan', `Get up, ${N}! A hero never gives up!`);
  }
  onPart() {}
  objective() { return null; }
  talk(a) {
    const w = this.w;
    if (a.cfg.id === 'titan') {
      w.say('titan', pick([
        `Great driving, ${N}!`, `Try jumping off the tallest building, then press DOWN to SLAM!`,
        `You make the ${HEROES} proud, ${N}.`, `Dreadcore is waiting in the east. Shall we go?`,
        `Want to race? Transform and GEAR UP!`, `Did you see the billboard? It's for YOU!`,
      ]));
    } else {
      w.say('zip', pick([
        `Race you to the end of the city!`, `High five!`, `Smash that crate!`,
        `You're my best friend!`, `Waras Mubarak, ${N}!`, `Cool robot!`,
      ]));
    }
  }
  drawHUD(ctx) {
    txt(ctx, this.cfg.name || '', W / 2, 6, { align: 'center', color: '#ffffff', outline: OL });
  }
}
