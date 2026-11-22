// All pixel art is drawn in code at 3x detail ("art pixels"), so robots can be built from parts.
// Game logic works in world units (384 x 216 screen); 1 world unit = S art pixels.
const W = 384, H = 216, S = 3;
const OL = '#14151c';
const GLASS = '#8fd8ff', GLASS_HI = '#e6fbff', METAL = '#c3c8d1', DARK = '#2c303a';
const FONT = '"Press Start 2P", monospace';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = a => a[Math.floor(Math.random() * a.length)];
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 >= 11 && n % 100 <= 13) ? 0 : (n % 10 < 4 ? n % 10 : 0)]);
const snap = v => Math.round(v * S) / S;

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}
const _shade = new Map();
function shade(hex, amt) {
  const key = hex + amt;
  let r0 = _shade.get(key);
  if (r0) return r0;
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  const h = v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  r0 = '#' + h(r) + h(g) + h(b);
  _shade.set(key, r0);
  return r0;
}
function mix(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = s => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ---------- pixel painter (art pixels) ----------
function painter(g, ox, oy) {
  const R = (x, y, w, h, c) => { if (w <= 0 || h <= 0) return; g.fillStyle = c; g.fillRect(Math.round(ox + x), Math.round(oy + y), Math.round(w), Math.round(h)); };
  const bevel = (x, y, w, h, c) => {
    R(x, y, w, h, c);
    if (w >= 5 && h >= 5) {
      R(x, y, w, 2, shade(c, 0.32)); R(x, y + 2, 2, h - 2, shade(c, 0.14));
      R(x + w - 2, y + 2, 2, h - 2, shade(c, -0.2)); R(x + 2, y + h - 2, w - 2, 2, shade(c, -0.32));
    }
  };
  const B = (x, y, w, h, c) => { R(x - 1, y - 1, w + 2, h + 2, OL); bevel(x, y, w, h, c); };
  const BB = list => { for (const r of list) R(r[0] - 1, r[1] - 1, r[2] + 2, r[3] + 2, OL); for (const r of list) bevel(r[0], r[1], r[2], r[3], r[4]); };
  const disc = (cx, cy, r, c) => { for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy))); R(cx - w, cy + dy, w * 2 + 1, 1, c); } };
  const scan = (pts, c, dx = 0, dy = 0) => {
    const ys = pts.map(p => p[1]);
    const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
    g.fillStyle = c;
    for (let y = y0; y < y1; y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]);
        if (xb > xa) g.fillRect(Math.round(ox + xa + dx), Math.round(oy + y + dy), xb - xa, 1);
      }
    }
  };
  const poly = (pts, c, outline = true) => {
    if (outline) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) scan(pts, OL, dx, dy);
    scan(pts, c);
  };
  return { R, B, BB, bevel, disc, poly, scan, g, ox, oy };
}
const mirror = pts => pts.map(([x, y]) => [-x, y]);

// add a thick outer outline around a whole sprite
function outlineSprite(c) {
  const [o, g] = makeCanvas(c.width, c.height);
  const [sil, sg] = makeCanvas(c.width, c.height);
  sg.drawImage(c, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = OL; sg.fillRect(0, 0, c.width, c.height);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) g.drawImage(sil, dx, dy);
  g.drawImage(c, 0, 0);
  return o;
}

// ===================================================== ROBOTS (front view, ~96 art px tall)
function drawRobotParts(g, cfg, pose, ox, oy) {
  const P = painter(g, ox, oy);
  Object.assign(P, { cfg, pose, c1: cfg.c1, c2: cfg.c2, c3: cfg.c3 });
  const walk = pose.legs === 'a' || pose.legs === 'b';
  const yo = (walk ? -2 : 0) + (cfg.legs === 'treads' ? 18 : 0);
  robotExtra(P, yo, 'back');
  robotLegs(P);
  robotTorso(P, yo);
  robotArm(P, -1, yo);
  robotArm(P, 1, yo);
  robotHead(P, yo);
  robotExtra(P, yo, 'front');
}

function robotLegs(P) {
  const { B, BB, R, disc, c1, c2, cfg, pose } = P;
  const t = cfg.legs;
  if (t === 'treads') {
    B(-24, -17, 48, 17, DARK);
    R(-22, -15, 44, 3, '#4a4f5c');
    const off = pose.legs === 'a' ? 2 : 0;
    for (let i = 0; i < 5; i++) { disc(-18 + i * 9, -7, 4, '#6b717d'); disc(-18 + i * 9, -7, 1, DARK); }
    for (let i = 0; i < 12; i++) R(-23 + ((i * 4 + off) % 46), -2, 2, 2, '#15171c');
    B(-11, -27, 22, 11, c2);
    return;
  }
  const heavy = t === 'heavy', thin = t === 'thruster';
  const sw = heavy ? 14 : thin ? 9 : 12, tw = heavy ? 12 : thin ? 8 : 10;
  for (const s of [-1, 1]) {
    let lift = 0;
    if (pose.legs === 'a' && s < 0) lift = 5;
    if (pose.legs === 'b' && s > 0) lift = 5;
    if (pose.legs === 'air') lift = s < 0 ? 8 : 3;
    const cx = s * (heavy ? 11 : 10);
    B(cx - tw / 2, -47, tw, 15, c2);
    B(cx - sw / 2, -32, sw, 26 - lift, c1);
    R(cx - sw / 2 + 3, -23, sw - 6, 2, shade(c1, -0.35)); R(cx - sw / 2 + 3, -19, sw - 6, 2, shade(c1, -0.35));
    B(cx - sw / 2 - 1, -35, sw + 2, 7, shade(c1, 0.12));
    if (heavy) B(cx - sw / 2 - 2, -14 - lift, sw + 4, 6, c2);
    if (thin) {
      const fy = -7 - lift;
      BB([[cx - 6, fy, 12, 6, DARK]]);
      if (pose.legs === 'air') { R(cx - 4, fy + 7, 8, 3, '#ffd040'); R(cx - 2, fy + 10, 4, 3, '#ff7a20'); }
    } else {
      const fw = heavy ? 20 : 16;
      B(cx - fw / 2 + s, -7 - lift, fw, 7, DARK);
      R(cx - fw / 2 + s, -7 - lift, fw, 2, '#4a4f5c');
    }
    if (t === 'wheels') { const wx = cx + s * (sw / 2 + 4); disc(wx, -17 - lift, 7, OL); disc(wx, -17 - lift, 6, '#1d1f25'); disc(wx, -17 - lift, 3, '#9aa0aa'); disc(wx, -17 - lift, 1, DARK); }
  }
}

function drawCockpitFace(P, cx, cy) {
  const { R, g, ox, oy } = P;
  if (PHOTO) {
    g.imageSmoothingEnabled = true;
    g.drawImage(PHOTO, Math.round(ox + cx - 8), Math.round(oy + cy - 8), 16, 16);
    g.imageSmoothingEnabled = false;
    g.fillStyle = 'rgba(143,216,255,0.15)'; g.fillRect(Math.round(ox + cx - 8), Math.round(oy + cy - 8), 16, 16);
  } else {
    const k = PERSONAL.kid;
    R(cx - 6, cy - 6, 12, 12, k.skin); R(cx - 7, cy - 8, 14, 5, k.hair);
    R(cx - 3, cy - 1, 2, 2, '#24160f'); R(cx + 2, cy - 1, 2, 2, '#24160f'); R(cx - 2, cy + 3, 5, 1, '#5a1f1a');
  }
}

function robotTorso(P, yo) {
  const { B, BB, R, disc, poly, c1, c2, c3, cfg } = P;
  B(-15, -52 + yo, 30, 9, DARK); R(-5, -51 + yo, 10, 6, METAL); R(-3, -50 + yo, 6, 4, '#8d939e');
  const y = -78 + yo;
  switch (cfg.torso) {
    case 'grille':
      BB([[-21, y, 42, 27, c1]]);
      B(-19, y + 2, 17, 9, shade(c1, 0.1)); B(2, y + 2, 17, 9, shade(c1, 0.1));
      B(-11, y + 13, 22, 11, METAL);
      for (let i = 0; i < 4; i++) R(-9, y + 15 + i * 2, 18, 1, '#6b717d');
      R(-19, y + 15, 6, 4, '#fff6a0'); R(13, y + 15, 6, 4, '#fff6a0');
      R(-2, y + 4, 4, 4, c3);
      break;
    case 'racer':
      BB([[-21, y, 42, 27, c1]]);
      B(-16, y + 2, 32, 10, GLASS); R(-14, y + 3, 10, 2, GLASS_HI); R(5, y + 3, 3, 8, '#c9f0ff');
      R(-6, y + 13, 4, 14, c2); R(2, y + 13, 4, 14, c2);
      disc(-15, y + 19, 3, OL); disc(-15, y + 19, 2, '#fff6a0'); disc(15, y + 19, 3, OL); disc(15, y + 19, 2, '#fff6a0');
      break;
    case 'jet':
      poly([[-25, y], [25, y], [17, y + 27], [-17, y + 27]], c1);
      R(-23, y + 2, 46, 2, shade(c1, 0.3));
      B(-22, y + 3, 6, 10, DARK); B(16, y + 3, 6, 10, DARK);
      B(-6, y + 3, 12, 15, GLASS); R(-5, y + 4, 3, 6, GLASS_HI);
      R(-17, y + 21, 34, 3, c2);
      break;
    case 'tank':
      BB([[-24, y, 48, 27, c2]]);
      B(-21, y + 3, 19, 13, c1); B(2, y + 3, 19, 13, c1);
      B(-5, y + 18, 10, 7, c3); R(-3, y + 19, 4, 2, '#ffffff');
      for (const x of [-20, -12, 10, 18]) R(x, y + 20, 2, 2, shade(c2, 0.4));
      break;
    case 'armor':
      BB([[-21, y, 42, 27, c1]]);
      B(-13, y + 3, 26, 11, c2);
      disc(0, y + 20, 5, OL); disc(0, y + 20, 4, c3); disc(-1, y + 19, 1, '#ffffff');
      break;
    case 'cockpit':
    default:
      BB([[-21, y, 42, 27, c1]]);
      B(-14, y + 2, 28, 21, DARK);
      R(-12, y + 4, 24, 17, GLASS);
      drawCockpitFace(P, 0, y + 12);
      R(6, y + 5, 2, 8, GLASS_HI); R(9, y + 5, 1, 5, GLASS_HI);
      disc(0, y + 25, 2, c3);
      R(-21, y + 24, 9, 2, c2); R(12, y + 24, 9, 2, c2);
      break;
  }
}

function robotArm(P, s, yo) {
  const { B, R, c1, c2, c3, cfg, pose } = P;
  const t = cfg.arms, y = -78 + yo;
  const thin = t === 'thin', ham = t === 'hammer', front = s > 0;
  const aw = thin ? 7 : 9;
  if (front && pose.shoot) {
    B(21, y - 3, 14, 12, c1);
    B(30, y + 5, 12, 9, c2);
    B(41, y + 4, 14, 11, c1);
    if (t === 'claw') { B(55, y + 3, 6, 3, c3); B(55, y + 12, 6, 3, c3); }
    else if (ham) B(54, y + 2, 10, 14, DARK);
    else { B(54, y + 6, 9, 7, DARK); R(61, y + 7, 2, 5, c3); }
    return;
  }
  const ax = s < 0 ? -31 : 22;
  if (pose.flex) {
    B(ax, y - 14, aw, 14, c2);
    B(ax - 1, y - 28, aw + 2, 15, c1);
    if (ham) B(ax - 3, y - 39, aw + 6, 11, DARK); else B(ax, y - 36, aw, 8, DARK);
    B(s < 0 ? -35 : 21, y - 3, 14, 12, c1);
    return;
  }
  let sw = 0;
  if (pose.legs === 'a') sw = s * 2;
  if (pose.legs === 'b') sw = -s * 2;
  if (pose.legs === 'air') sw = -2;
  const ay = y + 9 + sw;
  B(ax, ay, aw, 10, c2);
  B(ax - 1, ay + 10, aw + 2, 13, c1);
  const hy = ay + 23;
  if (t === 'claw') { B(ax - 1, hy, 3, 7, c3); B(ax + aw - 2, hy, 3, 7, c3); }
  else if (ham) B(ax - 3, hy, aw + 6, 11, DARK);
  else if (t === 'blaster' && front) { B(ax - 1, hy, aw + 2, 9, DARK); R(ax + 1, hy + 7, aw - 2, 2, c3); }
  else { B(ax, hy, aw, 7, DARK); R(ax + 1, hy + 4, aw - 2, 1, '#4a4f5c'); }
  if (thin) R(s < 0 ? ax - 3 : ax + aw + 1, ay + 12, 2, 8, c3);
  B(s < 0 ? -35 : 21, y - 3, 14, 12, c1);
}

function robotHead(P, yo) {
  const { B, BB, R, disc, poly, c1, c2, c3, cfg } = P;
  const y = -97 + yo;
  switch (cfg.head) {
    case 'leader':
      BB([[-14, y + 4, 4, 12, c2], [10, y + 4, 4, 12, c2]]);
      poly([[-3, y - 7], [3, y - 7], [5, y + 2], [-5, y + 2]], c1);
      BB([[-10, y, 20, 19, c1]]);
      R(-8, y + 6, 16, 5, OL); R(-7, y + 7, 14, 3, c3); R(-7, y + 7, 4, 1, '#ffffff');
      B(-6, y + 12, 12, 6, METAL); R(-4, y + 14, 8, 1, '#8d939e'); R(-4, y + 16, 8, 1, '#8d939e');
      break;
    case 'scout':
      B(-2, y - 5, 4, 9, c2);
      disc(0, y + 10, 11, OL); disc(0, y + 10, 10, c1); disc(-3, y + 5, 3, shade(c1, 0.3));
      R(-7, y + 8, 14, 9, METAL); R(-6, y + 17, 12, 1, METAL);
      disc(-4, y + 12, 2, c3); disc(4, y + 12, 2, c3); R(-5, y + 11, 1, 1, '#ffffff'); R(3, y + 11, 1, 1, '#ffffff');
      R(-2, y + 16, 4, 1, '#7d838e');
      break;
    case 'seeker':
      poly([[-10, y + 8], [-17, y + 1], [-14, y + 14]], c2); poly(mirror([[-10, y + 8], [-17, y + 1], [-14, y + 14]]), c2);
      poly([[0, y - 7], [10, y + 5], [10, y + 19], [-10, y + 19], [-10, y + 5]], c1);
      B(-7, y + 8, 14, 10, METAL);
      R(-6, y + 10, 4, 2, c3); R(2, y + 10, 4, 2, c3); R(-6, y + 9, 2, 1, c3); R(4, y + 9, 2, 1, c3);
      R(-3, y + 15, 6, 1, DARK);
      break;
    case 'brute':
      poly([[-9, y + 3], [-6, y - 6], [-3, y + 3]], c2); poly([[-2, y + 3], [0, y - 8], [2, y + 3]], c2); poly([[3, y + 3], [6, y - 6], [9, y + 3]], c2);
      BB([[-12, y + 1, 24, 18, c1]]);
      R(-12, y + 1, 24, 5, shade(c1, -0.25));
      R(-9, y + 7, 18, 4, OL); R(-8, y + 8, 16, 2, c3); R(-8, y + 8, 3, 1, '#ffffff');
      B(-9, y + 13, 18, 5, c2);
      for (let i = 0; i < 6; i++) R(-7 + i * 3, y + 13, 1, 3, '#e8e8e8');
      break;
    case 'knight':
      B(-2, y - 7, 4, 9, c2);
      BB([[-10, y, 20, 19, c1]]);
      R(-8, y + 6, 16, 4, OL); R(-7, y + 7, 14, 2, c3);
      R(-2, y + 9, 4, 8, OL); R(-1, y + 9, 2, 7, c3);
      break;
    case 'horns':
      poly([[-8, y + 6], [-17, y - 1], [-15, y - 8], [-11, y + 1]], c2); poly(mirror([[-8, y + 6], [-17, y - 1], [-15, y - 8], [-11, y + 1]]), c2);
      BB([[-10, y + 1, 20, 18, c1]]);
      B(-7, y + 8, 14, 9, METAL);
      R(-5, y + 10, 3, 2, c3); R(2, y + 10, 3, 2, c3); R(-2, y + 14, 4, 1, DARK);
      break;
    case 'dome':
      R(-1, y - 8, 2, 8, METAL); disc(0, y - 9, 3, OL); disc(0, y - 9, 2, c3);
      disc(0, y + 9, 11, OL); disc(0, y + 9, 10, GLASS);
      disc(-4, y + 6, 2, c3); disc(4, y + 6, 2, c3);
      R(-6, y + 2, 2, 3, GLASS_HI);
      BB([[-11, y + 10, 22, 9, c1]]);
      R(-8, y + 13, 16, 1, shade(c1, -0.35));
      break;
    case 'hero':
    default:
      poly([[-10, y + 6], [-17, y - 3], [-15, y + 12], [-10, y + 14]], c2); poly(mirror([[-10, y + 6], [-17, y - 3], [-15, y + 12], [-10, y + 14]]), c2);
      poly([[0, y - 10], [2, y - 5], [7, y - 5], [3, y - 2], [5, y + 3], [0, y], [-5, y + 3], [-3, y - 2], [-7, y - 5], [-2, y - 5]], c3);
      BB([[-10, y, 20, 19, c1]]);
      R(-8, y + 6, 16, 5, OL); R(-7, y + 7, 14, 3, c3); R(-7, y + 7, 3, 1, '#ffffff');
      B(-5, y + 13, 10, 5, METAL);
      break;
  }
}

function robotExtra(P, yo, layer) {
  const { B, BB, R, disc, poly, scan, c1, c2, c3, cfg, pose } = P;
  const y = -78 + yo, air = pose.legs === 'air';
  if (layer === 'back') {
    switch (cfg.extra) {
      case 'wings': {
        const wing = [[-18, y + 2], [-55, y + 18], [-53, y + 27], [-18, y + 16]];
        const strip = [[-30, y + 8], [-51, y + 18], [-50, y + 21], [-30, y + 12]];
        poly(wing, c1); scan(strip, c2); R(-55, y + 18, 4, 6, c3);
        poly(mirror(wing), c1); scan(mirror(strip), c2); R(51, y + 18, 4, 6, c3);
        break;
      }
      case 'stacks':
        B(-30, y - 17, 6, 21, METAL); B(24, y - 17, 6, 21, METAL);
        R(-30, y - 17, 6, 2, DARK); R(24, y - 17, 6, 2, DARK);
        R(-30, y - 9, 6, 1, '#8d939e'); R(24, y - 9, 6, 1, '#8d939e');
        break;
      case 'doors':
        BB([[-41, y - 11, 12, 17, c1], [29, y - 11, 12, 17, c1]]);
        R(-39, y - 9, 8, 7, GLASS); R(31, y - 9, 8, 7, GLASS); R(-39, y - 9, 3, 1, GLASS_HI); R(31, y - 9, 3, 1, GLASS_HI);
        break;
      case 'jetpack':
        BB([[-27, y - 13, 9, 17, '#7a808a'], [18, y - 13, 9, 17, '#7a808a']]);
        R(-27, y - 13, 9, 3, c3); R(18, y - 13, 9, 3, c3);
        break;
    }
  } else {
    switch (cfg.extra) {
      case 'cannon':
        B(14, y - 5, 10, 6, c2); B(10, y - 13, 26, 8, DARK); B(36, y - 12, 9, 6, METAL); R(43, y - 11, 2, 4, c3);
        break;
      case 'spikes':
        for (const sx of [-1, 1]) for (const k of [0, 1]) { const bx = sx * (26 + k * 6); poly([[bx - 3, y - 2], [bx, y - 11 + k * 3], [bx + 3, y - 2]], c3); }
        break;
      case 'shield':
        B(-46, y + 12, 13, 26, c2); poly([[-39.5, y + 18], [-35, y + 25], [-39.5, y + 32], [-44, y + 25]], c3, false);
        break;
      case 'jetpack':
        if (air) { R(-26, y + 5, 7, 4, '#ffd040'); R(-24, y + 9, 3, 3, '#ff7a20'); R(19, y + 5, 7, 4, '#ffd040'); R(21, y + 9, 3, 3, '#ff7a20'); }
        break;
    }
  }
}

// ===================================================== VEHICLES (side view, facing right)
function drawVehicleParts(g, cfg, frame, ox, oy) {
  const P = painter(g, ox, oy);
  const { B, BB, R, disc, poly, scan } = P;
  const c1 = cfg.c1, c2 = cfg.c2, c3 = cfg.c3;
  const wheel = (cx, r = 9) => {
    const cy = -r;
    disc(cx, cy, r + 1, OL); disc(cx, cy, r, '#1d1f25'); disc(cx, cy, Math.round(r * 0.55), METAL); disc(cx, cy, 2, '#6b717d');
    const a = frame ? Math.PI / 4 : 0, k = Math.round(r * 0.55) - 1;
    for (let i = 0; i < 4; i++) { const an = a + i * Math.PI / 2; R(cx + Math.round(Math.cos(an) * k) - 1, cy + Math.round(Math.sin(an) * k) - 1, 2, 2, '#6b717d'); }
  };
  switch (cfg.vehicle) {
    case 'truck':
      B(-50, -23, 96, 8, c2);
      R(-50, -27, 52, 4, '#4a4f5c');
      B(-4, -31, 14, 10, METAL); R(-4, -27, 14, 1, '#8d939e');
      BB([[8, -64, 38, 44, c1]]);
      B(2, -78, 5, 46, METAL); R(2, -78, 5, 2, DARK);
      scan([[25, -60], [44, -60], [44, -44], [25, -44]], GLASS); R(27, -58, 6, 2, GLASS_HI);
      B(12, -58, 9, 12, GLASS);
      B(42, -40, 6, 20, METAL); for (let i = 0; i < 5; i++) R(42, -38 + i * 4, 6, 1, '#6b717d');
      B(40, -20, 10, 6, METAL);
      R(20, -66, 14, 2, '#ffb030');
      R(44, -30, 4, 4, '#fff6a0');
      R(10, -40, 30, 2, c2);
      wheel(-38, 10); wheel(-17, 10); wheel(30, 10);
      break;
    case 'jet':
      poly([[-48, -16], [-42, -42], [-32, -42], [-28, -16]], c1);
      R(-42, -38, 9, 3, c2);
      poly([[-52, -22], [30, -24], [52, -15], [30, -8], [-52, -10]], c1);
      scan([[-50, -18], [38, -19], [42, -16], [-50, -15]], c2);
      poly([[6, -23], [14, -32], [30, -26], [28, -22]], GLASS); R(14, -29, 5, 2, GLASS_HI);
      poly([[-22, -12], [10, -12], [-14, 3], [-30, 3]], shade(c1, -0.25));
      B(-6, -21, 10, 6, DARK);
      B(-57, -21, 6, 10, DARK);
      R(-65, -19, 8, 6, frame ? '#ffb030' : '#ff6a20'); R(-69, -18, 4, 4, frame ? '#ff6a20' : '#ffd040');
      R(-10, -8, 2, 6, DARK); R(24, -8, 2, 6, DARK); disc(-9, -2, 2, '#1d1f25'); disc(25, -2, 2, '#1d1f25');
      R(48, -16, 2, 2, c3);
      break;
    case 'tank':
      B(-46, -17, 92, 17, DARK);
      for (let i = 0; i < 6; i++) { disc(-37 + i * 15, -8, 6, '#6b717d'); disc(-37 + i * 15, -8, 2, DARK); }
      for (let i = 0; i < 22; i++) R(-45 + ((i * 4 + (frame ? 2 : 0)) % 90), -2, 2, 2, '#15171c');
      R(-44, -16, 88, 2, '#4a4f5c');
      poly([[-44, -17], [-40, -31], [38, -31], [46, -17]], c1);
      R(-40, -30, 78, 2, shade(c1, 0.3));
      poly([[-20, -31], [-16, -45], [14, -45], [20, -31]], c2);
      B(18, -42, 42, 6, METAL); B(58, -43, 7, 8, DARK);
      B(-8, -49, 12, 4, DARK);
      R(-38, -27, 4, 3, c3); R(30, -27, 6, 2, c3);
      break;
    case 'car':
    default:
      poly([[-46, -28], [30, -28], [44, -23], [47, -11], [-47, -11]], c1);
      poly([[-22, -27], [-13, -41], [14, -41], [27, -27]], c1);
      scan([[-19, -28], [-12, -38], [-1, -38], [-1, -28]], GLASS); scan([[2, -28], [2, -38], [12, -38], [22, -28]], GLASS);
      R(-11, -37, 4, 1, GLASS_HI); R(4, -37, 4, 1, GLASS_HI);
      R(-45, -27, 74, 2, shade(c1, 0.3));
      R(-46, -21, 92, 3, c2);
      R(28, -27, 14, 2, c2);
      B(-49, -36, 11, 3, c2); R(-45, -33, 2, 5, DARK);
      R(-2, -26, 1, 13, shade(c1, -0.4)); R(-9, -23, 4, 1, shade(c1, -0.4));
      R(41, -20, 5, 3, '#fff6a0'); R(-47, -22, 3, 4, '#ff3030');
      R(-47, -13, 94, 2, DARK);
      wheel(-27); wheel(27);
      break;
  }
}

// ===================================================== KID (Qumayl himself, ~58 art px tall)
function drawKidParts(g, mask, pose, ox, oy) {
  const P = painter(g, ox, oy);
  const { R, B, BB, disc } = P;
  const k = PERSONAL.kid, s = PERSONAL.suit;
  const has = i => (mask >> i) & 1;
  const walk = pose.legs === 'a' || pose.legs === 'b';
  for (const side of [-1, 1]) {
    let lift = 0;
    if (pose.legs === 'a' && side < 0) lift = 4;
    if (pose.legs === 'b' && side > 0) lift = 4;
    if (pose.legs === 'air') lift = side < 0 ? 5 : 1;
    const x = side < 0 ? -7 : 1;
    const arm = has(side < 0 ? 4 : 5);
    B(x, -20, 6, 17 - lift, arm ? s.c1 : k.pants);
    if (arm) R(x, -13, 6, 2, s.c3);
    B(side < 0 ? x - 2 : x, -3 - lift, 8, 3, arm ? DARK : k.shoes);
  }
  const y = walk ? -1 : 0;
  for (const side of [-1, 1]) {
    let sw = 0;
    if (pose.legs === 'a') sw = side * 2;
    if (pose.legs === 'b') sw = -side * 2;
    if (pose.legs === 'air') sw = -3;
    const x = side < 0 ? -14 : 9;
    const arm = has(side < 0 ? 2 : 3);
    B(x, -37 + y + sw, 5, 6, arm ? s.c1 : k.shirt);
    B(x, -31 + y + sw, 5, 10, arm ? s.c1 : k.skin);
    if (arm) R(x, -26 + y + sw, 5, 2, s.c3);
  }
  B(-9, -37 + y, 18, 18, has(1) ? s.c1 : k.shirt);
  if (!has(1)) {
    R(-9, -22 + y, 18, 2, '#2a2b31');
    R(-9, -26 + y, 18, 2, '#d9dbe1');
    R(-4, -37 + y, 3, 3, '#ffffff'); R(2, -37 + y, 3, 3, '#ffffff');
    R(-2, -37 + y, 5, 2, k.tie); R(-1, -35 + y, 3, 11, k.tie);
    for (let i = 0; i < 4; i++) R(-1, -34 + y + i * 3, 3, 1, k.tieStripe);
  } else {
    R(-7, -35 + y, 14, 2, shade(s.c1, 0.35)); R(-9, -26 + y, 18, 2, s.c2);
  }
  if (has(6)) { disc(0, -30 + y, 3, OL); disc(0, -30 + y, 2, '#4fd8ff'); R(0, -31 + y, 1, 1, '#ffffff'); }
  const hy = -57 + y;
  B(-9, hy, 19, 19, k.skin);
  R(-10, hy + 9, 2, 4, shade(k.skin, -0.15));
  R(-10, hy - 2, 21, 7, k.hair); R(-10, hy + 5, 4, 6, k.hair);
  R(-6, hy + 5, 15, 2, k.hair); R(-4, hy + 7, 2, 1, k.hair); R(1, hy + 7, 3, 1, k.hair); R(6, hy + 7, 2, 1, k.hair);
  R(-6, hy - 1, 9, 1, shade(k.hair, 0.3)); R(-9, hy - 3, 17, 1, OL);
  R(-2, hy + 9, 3, 1, k.hair); R(5, hy + 9, 3, 1, k.hair);
  R(-2, hy + 11, 3, 3, '#24160f'); R(5, hy + 11, 3, 3, '#24160f'); R(-1, hy + 11, 1, 1, '#ffffff'); R(6, hy + 11, 1, 1, '#ffffff');
  R(2, hy + 13, 2, 2, shade(k.skin, -0.15));
  R(0, hy + 16, 7, 2, '#5a1f1a'); R(1, hy + 16, 5, 1, '#ffffff'); R(3, hy + 16, 1, 1, '#5a1f1a');
  if (has(0)) {
    BB([[-11, hy - 5, 23, 9, s.c1], [-11, hy + 4, 4, 11, s.c1]]);
    R(-1, hy - 8, 4, 3, s.c3); R(-8, hy + 2, 18, 1, s.c3);
  }
}

// ===================================================== SPRITE CACHE
const _spr = new Map();
const _white = new WeakMap(), _dark = new WeakMap(), _tiles = new WeakMap();
const robotKey = c => [c.head, c.torso, c.arms, c.legs, c.extra, c.c1, c.c2, c.c3].join('|');
const poseKey = p => (p.legs || 'idle') + (p.shoot ? 's' : '') + (p.flex ? 'f' : '');
const RB = { w: 192, h: 180, ax: 96, ay: 168 };   // robot sprite box (art px)
const VB = { w: 228, h: 132, ax: 114, ay: 122 };  // vehicle sprite box
const KB = { w: 72, h: 72, ax: 36, ay: 69 };      // kid sprite box
function getRobotSprite(cfg, pose) {
  const k = 'R' + robotKey(cfg) + poseKey(pose);
  let c = _spr.get(k);
  if (!c) { const [cv, g] = makeCanvas(RB.w, RB.h); drawRobotParts(g, cfg, pose, RB.ax, RB.ay); c = outlineSprite(cv); _spr.set(k, c); }
  return c;
}
function getVehicleSprite(cfg, frame) {
  const k = 'V' + cfg.vehicle + cfg.c1 + cfg.c2 + cfg.c3 + frame;
  let c = _spr.get(k);
  if (!c) { const [cv, g] = makeCanvas(VB.w, VB.h); drawVehicleParts(g, cfg, frame, VB.ax, VB.ay); c = outlineSprite(cv); _spr.set(k, c); }
  return c;
}
function getKidSprite(mask, pose) {
  const k = 'K' + mask + poseKey(pose);
  let c = _spr.get(k);
  if (!c) { const [cv, g] = makeCanvas(KB.w, KB.h); drawKidParts(g, mask, pose, KB.ax, KB.ay); c = outlineSprite(cv); _spr.set(k, c); }
  return c;
}
function tintOf(c, map, color) {
  let w = map.get(c);
  if (!w) {
    const [cv, g] = makeCanvas(c.width, c.height);
    g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    w = cv; map.set(c, w);
  }
  return w;
}
const whiteOf = c => tintOf(c, _white, '#ffffff');
const darkOf = c => tintOf(c, _dark, '#3a3f4b');

// draw sprite `spr` (art px) so that its anchor (ax, ay) lands on world point (x, y); sc = world size multiplier
function blit(ctx, spr, x, y, ax, ay, scx, scy, flip, white) {
  const img = white ? whiteOf(spr) : spr;
  const kx = scx / S, ky = (scy == null ? scx : scy) / S;
  x = snap(x); y = snap(y);
  const w = spr.width * kx, h = spr.height * ky, dx = x - ax * kx, dy = y - ay * ky;
  if (flip) { ctx.save(); ctx.translate(x * 2, 0); ctx.scale(-1, 1); ctx.drawImage(img, dx, dy, w, h); ctx.restore(); }
  else ctx.drawImage(img, dx, dy, w, h);
}
function drawRobotAt(ctx, cfg, x, y, scale, flip, pose) { blit(ctx, getRobotSprite(cfg, pose || { legs: 'idle' }), x, y, RB.ax, RB.ay, scale, scale, flip); }
function drawVehicleAt(ctx, cfg, x, y, scale, flip, frame) { blit(ctx, getVehicleSprite(cfg, frame || 0), x, y, VB.ax, VB.ay, scale, scale, flip); }

// ---------- transform animation: the sprite breaks into pieces that swirl and rebuild ----------
function spriteTiles(spr) {
  let t = _tiles.get(spr);
  if (t) return t;
  t = [];
  const T = 24, d = spr.getContext('2d').getImageData(0, 0, spr.width, spr.height).data;
  for (let ty = 0; ty < spr.height; ty += T) for (let tx = 0; tx < spr.width; tx += T) {
    let any = false;
    for (let y = ty; y < Math.min(ty + T, spr.height) && !any; y += 2) for (let x = tx; x < Math.min(tx + T, spr.width); x += 2) if (d[(y * spr.width + x) * 4 + 3] > 0) { any = true; break; }
    if (any) t.push({ sx: tx, sy: ty, i: t.length });
  }
  _tiles.set(spr, t);
  return t;
}
function drawTiles(ctx, info, x, y, flip, q, phaseSeed) {
  const { spr, ax, ay, sc } = info, k = sc / S, T = 24;
  const tiles = spriteTiles(spr);
  const e = q * q * (3 - 2 * q);
  const midY = -ay * 0.45;
  for (const t of tiles) {
    const hx = t.sx + T / 2 - ax, hy = t.sy + T / 2 - ay;
    const h = Math.sin((t.i + 1) * 12.9898 + phaseSeed) * 43758.5453, r = h - Math.floor(h);
    const ox = (hx * 0.9 + (r - 0.5) * 60) * e, oy = ((hy - midY) * 0.7 - 30 * Math.sin(r * 6.28)) * e;
    const rot = (r - 0.5) * 4 * e;
    const px = x + (flip ? -1 : 1) * (hx + ox) * k, py = y + (hy + oy) * k;
    ctx.save(); ctx.translate(px, py); ctx.rotate(rot); if (flip) ctx.scale(-1, 1);
    const s = k * (1 - 0.25 * e);
    ctx.drawImage(spr, t.sx, t.sy, T, T, -T / 2 * s, -T / 2 * s, T * s, T * s);
    ctx.restore();
  }
}
function drawTransformFx(ctx, from, to, p, x, y, flip, heightW) {
  if (p < 0.5) drawTiles(ctx, from, x, y, flip, p / 0.5, 1.7);
  else drawTiles(ctx, to, x, y, flip, (1 - p) / 0.5, 4.3);
  const cy = y - heightW * 0.5, a = 1 - Math.abs(p - 0.5) * 2;
  ctx.save();
  ctx.globalAlpha = a * 0.9;
  const grd = ctx.createRadialGradient(x, cy, 0, x, cy, 26);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(160,230,255,0.6)'); grd.addColorStop(1, 'rgba(120,200,255,0)');
  ctx.fillStyle = grd; ctx.fillRect(x - 30, cy - 30, 60, 60);
  ctx.globalAlpha = 1 - p;
  ctx.strokeStyle = '#bff3ff'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(x, cy, 6 + p * 34, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// ===================================================== BREAKABLES
const BREAK_BOX = { w: 108, h: 90, ax: 54, ay: 87 };
function drawBreakableParts(g, t, color) {
  const P = painter(g, BREAK_BOX.ax, BREAK_BOX.ay);
  const { R, B, BB, disc, poly } = P;
  switch (t) {
    case 'crate': case 'bigcrate': {
      const s = t === 'crate' ? 42 : 60, hs = s / 2;
      B(-hs, -s, s, s, '#b97a3d');
      B(-hs + 3, -s + 3, s - 6, s - 6, '#c98a4a');
      for (let i = 0; i < s - 10; i += 1) R(-hs + 5 + i, -s + 5 + i, 4, 1, '#8a5a2b');
      R(-hs, -s + 4, s, 3, '#8a5a2b'); R(-hs, -7, s, 3, '#8a5a2b');
      for (const [px, py] of [[-hs + 3, -s + 3], [hs - 5, -s + 3], [-hs + 3, -5], [hs - 5, -5]]) R(px, py, 2, 2, '#6b717d');
      break;
    }
    case 'barrel':
      B(-15, -42, 30, 42, '#d83a3a');
      R(-15, -42, 30, 4, '#ff7a7a'); R(-11, -40, 22, 1, '#8a1f1f');
      R(-15, -32, 30, 3, '#8a1f1f'); R(-15, -11, 30, 3, '#8a1f1f');
      poly([[0, -27], [7, -15], [-7, -15]], '#ffd21f'); R(-1, -24, 2, 5, OL); R(-1, -18, 2, 2, OL);
      R(-12, -38, 3, 30, '#ff8a8a');
      break;
    case 'cone':
      poly([[-3, -27], [3, -27], [11, -3], [-11, -3]], '#ff7a1a');
      R(-6, -18, 12, 4, '#ffffff'); R(-8, -11, 16, 3, '#ffffff');
      B(-14, -3, 28, 3, DARK);
      break;
    case 'hydrant':
      B(-8, -26, 16, 23, '#e03030'); disc(0, -27, 8, OL); disc(0, -27, 7, '#ff5a5a'); R(-2, -36, 4, 4, '#e03030');
      B(-13, -20, 5, 6, '#e03030'); B(8, -20, 5, 6, '#e03030');
      B(-10, -4, 20, 4, '#8a1f1f'); R(-5, -24, 2, 18, '#ff8a8a');
      break;
    case 'crystal':
      poly([[-9, -60], [0, -72], [9, -60], [8, 0], [-8, 0]], '#9b4dff');
      poly([[9, -36], [15, -42], [19, -36], [18, 0], [10, 0]], '#7a2ad9');
      poly([[-9, -26], [-16, -32], [-19, -24], [-17, 0], [-9, 0]], '#7a2ad9');
      R(-4, -60, 3, 52, '#e0b8ff'); R(12, -34, 2, 24, '#c58bff');
      break;
  }
}
function getBreakSprite(b) {
  if (b.t === 'car') return null;
  const k = 'B' + b.t;
  let c = _spr.get(k);
  if (!c) { const [cv, g] = makeCanvas(BREAK_BOX.w, BREAK_BOX.h); drawBreakableParts(g, b.t); c = outlineSprite(cv); _spr.set(k, c); }
  return c;
}
function drawBreakable(ctx, b, x, y) {
  if (b.t === 'car') {
    blit(ctx, getVehicleSprite({ vehicle: 'car', c1: b.color, c2: '#ffffff', c3: '#ffffff' }, 0), x, y, VB.ax, VB.ay, 1, 1, b.flip, b.flash > 0);
  } else {
    blit(ctx, getBreakSprite(b), x, y, BREAK_BOX.ax, BREAK_BOX.ay, 1, 1, false, b.flash > 0);
    if (b.part != null) {
      const on = Math.floor(performance.now() / 220) % 2;
      txt(ctx, '?', x, y - b.h / 2 - 4, { align: 'center', color: on ? '#ffe14d' : '#ffffff', outline: OL, size: 8 });
    }
  }
}

// ===================================================== TEXT & UI (world units, rendered at 3x)
function txt(ctx, s, x, y, o = {}) {
  const size = o.size || 8;
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = 'top';
  x = snap(x); y = snap(y);
  if (o.outline) {
    ctx.fillStyle = o.outline;
    const t = o.thick || 2 / 3;
    for (const [dx, dy] of [[-t, 0], [t, 0], [0, -t], [0, t], [-t, -t], [t, t], [-t, t], [t, -t], [0, t * 1.6]]) ctx.fillText(s, x + dx, y + dy);
  } else if (o.shadow !== false) {
    ctx.fillStyle = o.shadowColor || '#000000';
    ctx.fillText(s, x + 2 / 3, y + 2 / 3);
  }
  ctx.fillStyle = o.color || '#ffffff';
  ctx.fillText(s, x, y);
}
function textWidth(ctx, s, size = 8) { ctx.font = `${size}px ${FONT}`; return ctx.measureText(s).width; }
function wrapText(ctx, s, maxW, size = 8) {
  ctx.font = `${size}px ${FONT}`;
  const words = s.split(' '), lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function panel(ctx, x, y, w, h, fill = 'rgba(12,14,28,0.92)', border = '#e8ecf2') {
  ctx.save();
  roundRect(ctx, x - 1, y - 1, w + 2, h + 2, 4); ctx.fillStyle = OL; ctx.fill();
  roundRect(ctx, x, y, w, h, 3.5); ctx.fillStyle = border; ctx.fill();
  roundRect(ctx, x + 1.34, y + 1.34, w - 2.68, h - 2.68, 2.5); ctx.fillStyle = fill; ctx.fill();
  ctx.restore();
}
// pixel patterns: rows of chars mapped to colours; s = world units per pattern pixel
function drawPattern(ctx, rows, x, y, map, s = 1, outline = true) {
  if (outline) {
    ctx.fillStyle = OL;
    const o = Math.max(1 / S, s / 2);
    for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
      if (rows[r][c] === '.') continue;
      ctx.fillRect(x + c * s - o, y + r * s - o, s + o * 2, s + o * 2);
    }
  }
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
    const ch = rows[r][c];
    if (ch === '.' || !map[ch]) continue;
    ctx.fillStyle = map[ch];
    ctx.fillRect(x + c * s, y + r * s, s, s);
  }
}
const HEART = ['..###...###..', '.#####.#####.', '###hh########', '##hh#########', '#############', '.###########.', '..#########..', '...#######...', '....#####....', '.....###.....', '......#......'];
function drawHeart(ctx, x, y, full) {
  drawPattern(ctx, HEART, x, y, full ? { '#': '#ff3b4f', 'h': '#ffb3bd' } : { '#': '#3a3f4b', 'h': '#4a505c' }, 2 / 3);
}
// PlayStation-style button glyphs
const BTN_COLORS = { cross: '#8fb8ff', circle: '#ff7070', square: '#ff8ad8', triangle: '#4fe0a0' };
function btnGlyph(ctx, b, x, y) {
  ctx.save();
  if (b === 'start') {
    roundRect(ctx, x, y + 1, 28, 9, 4); ctx.fillStyle = OL; ctx.fill();
    roundRect(ctx, x + 0.67, y + 1.67, 26.67, 7.67, 3.5); ctx.fillStyle = '#3a3f4b'; ctx.fill();
    ctx.font = `5px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#ffffff';
    ctx.fillText('START', x + 14, y + 3.4);
    ctx.restore();
    return 28;
  }
  const cx = x + 5.5, cy = y + 5.5;
  ctx.beginPath(); ctx.arc(cx, cy, 5.5, 0, Math.PI * 2); ctx.fillStyle = OL; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, 4.8, 0, Math.PI * 2); ctx.fillStyle = '#2b2f3a'; ctx.fill();
  ctx.strokeStyle = BTN_COLORS[b] || '#e8ecf2'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
  ctx.beginPath();
  if (b === 'cross') { ctx.moveTo(cx - 2.2, cy - 2.2); ctx.lineTo(cx + 2.2, cy + 2.2); ctx.moveTo(cx + 2.2, cy - 2.2); ctx.lineTo(cx - 2.2, cy + 2.2); ctx.stroke(); }
  else if (b === 'circle') { ctx.arc(cx, cy, 2.4, 0, Math.PI * 2); ctx.stroke(); }
  else if (b === 'square') { ctx.rect(cx - 2.2, cy - 2.2, 4.4, 4.4); ctx.stroke(); }
  else if (b === 'triangle') { ctx.moveTo(cx, cy - 2.6); ctx.lineTo(cx + 2.6, cy + 1.9); ctx.lineTo(cx - 2.6, cy + 1.9); ctx.closePath(); ctx.stroke(); }
  else if (b === 'dpad') { ctx.fillRect(cx - 1, cy - 3.4, 2, 6.8); ctx.fillRect(cx - 3.4, cy - 1, 6.8, 2); }
  else if (b === 'down') { ctx.moveTo(cx, cy - 3); ctx.lineTo(cx, cy + 2); ctx.moveTo(cx - 2.4, cy - 0.2); ctx.lineTo(cx, cy + 2.6); ctx.lineTo(cx + 2.4, cy - 0.2); ctx.stroke(); }
  ctx.restore();
  return 11;
}
function hintRow(ctx, items, cx, y, color = '#ffffff') {
  const parts = items.map(([b, label]) => ({ b, label, w: (b === 'start' ? 28 : 11) + 4 + textWidth(ctx, label) }));
  const total = parts.reduce((a, p) => a + p.w, 0) + (parts.length - 1) * 10;
  let x = Math.round(cx - total / 2);
  for (const p of parts) {
    const gw = btnGlyph(ctx, p.b, x, y);
    txt(ctx, p.label, x + gw + 4, y + 2, { color });
    x += p.w + 10;
  }
}

// ===================================================== SUIT PART ICONS (cut from Qumayl's actual suit)
const PART_CROPS = [[-18, -108, 36, 32], [-24, -80, 48, 32], [-38, -82, 20, 48], [18, -82, 20, 48], [-19, -49, 18, 49], [1, -49, 18, 49]];
function getPartIcon(i) {
  const k = 'P' + i + robotKey(CHARS.qsuit);
  let c = _spr.get(k);
  if (c) return c;
  const [cv, g] = makeCanvas(39, 39);
  if (i === 6) {
    const P = painter(g, 19, 19);
    P.poly([[0, -15], [11, 0], [0, 15], [-11, 0]], '#4fd8ff');
    P.scan([[0, -9], [6, 0], [0, 9], [-6, 0]], '#bff6ff');
    P.R(-2, -7, 2, 4, '#ffffff');
  } else {
    const spr = getRobotSprite(CHARS.qsuit, { legs: 'idle' });
    const [x, y, w, h] = PART_CROPS[i];
    const f = Math.min(37 / w, 37 / h);
    g.drawImage(spr, RB.ax + x, RB.ay + y, w, h, Math.round(19.5 - w * f / 2), Math.round(19.5 - h * f / 2), Math.round(w * f), Math.round(h * f));
  }
  _spr.set(k, cv);
  return cv;
}
// draw part icon so it fits a `size`-world-unit box at (x, y)
function drawPartIcon(ctx, i, x, y, size = 13, dim = false) {
  const ic = getPartIcon(i);
  ctx.save();
  if (dim) ctx.globalAlpha = 0.5;
  ctx.drawImage(dim ? darkOf(ic) : ic, x, y, size, size);
  ctx.restore();
}

// ===================================================== PORTRAITS
let PHOTO = null;
function loadPhoto(src, crop) {
  return new Promise(res => {
    if (!src) return res();
    const im = new Image();
    im.onload = () => {
      const [c, g] = makeCanvas(48, 48);
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      const cr = crop || { x: (im.width - Math.min(im.width, im.height)) / 2, y: 0, size: Math.min(im.width, im.height) };
      g.drawImage(im, cr.x, cr.y, cr.size, cr.size, 0, 0, 48, 48);
      PHOTO = c; res();
    };
    im.onerror = () => res();
    im.src = src;
  });
}
function drawPortrait(ctx, who, x, y, size = 48) {
  ctx.save();
  const sp = SPEAKERS[who] || SPEAKERS.titan;
  ctx.fillStyle = OL; ctx.fillRect(x - 1, y - 1, size + 2, size + 2);
  const grd = ctx.createLinearGradient(0, y, 0, y + size);
  grd.addColorStop(0, shade(sp.color, -0.15)); grd.addColorStop(1, shade(sp.color, -0.7));
  ctx.fillStyle = grd; ctx.fillRect(x, y, size, size);
  ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
  if (sp.kid) {
    if (PHOTO) ctx.drawImage(PHOTO, x, y, size, size);
    else {
      const k = getKidSprite(0, { legs: 'idle' });
      ctx.drawImage(k, KB.ax - 12, KB.ay - 60, 24, 24, x + size / 2 - 22, y + size / 2 - 20, 44, 44);
    }
  } else {
    const cfg = sp.cfg(), spr = getRobotSprite(cfg, { legs: 'idle' });
    ctx.drawImage(spr, RB.ax - 24, RB.ay - 112, 48, 44, x + size / 2 - 24, y + size / 2 - 20, 48, 44);
  }
  ctx.restore();
}

// ===================================================== SKY & DISTANT LAYERS
function buildSkyline(base, winColor, seed, minH, maxH) {
  const [c, g] = makeCanvas(640 * S, 150 * S);
  const P = painter(g, 0, 0), r = rng(seed);
  let x = 0;
  while (x < 640 * S) {
    const w = (18 + Math.floor(r() * 34)) * S, h = (minH + Math.floor(r() * (maxH - minH))) * S, top = 150 * S - h;
    const col = shade(base, (r() - 0.5) * 0.12);
    P.R(x, top, w, h, col);
    P.R(x, top, w, 3, shade(col, 0.12));
    if (r() < 0.35) { P.R(x + w / 2 - 2, top - 24, 4, 24, col); P.R(x + w / 2 - 3, top - 27, 6, 3, '#ff6b6b'); }
    if (r() < 0.3) { P.R(x + 6, top - 12, 18, 12, col); }
    for (let wx = x + 6; wx < x + w - 6; wx += 12) for (let wy = top + 9; wy < 150 * S - 6; wy += 15) if (r() < 0.4) P.R(wx, wy, 5, 6, winColor);
    x += w + 3 + Math.floor(r() * 9);
  }
  return c;
}
function buildHills() {
  const [c, g] = makeCanvas(640 * S, 90 * S);
  const P = painter(g, 0, 0);
  for (const [col, amp, f, base, ph] of [['#a9cfe6', 26, 0.011, 40, 0], ['#8ebfdc', 18, 0.017, 58, 2]]) {
    for (let x = 0; x < 640 * S; x += 3) {
      const t = x / S;
      const h = base + Math.sin(t * f * 6.283 / 1 + ph) * amp * 0.6 + Math.sin(t * f * 2.7 * 6.283 + ph * 2) * amp * 0.4;
      P.R(x, (90 - h) * S, 3, h * S, col);
    }
  }
  return c;
}
function buildCloud(seed) {
  const [c, g] = makeCanvas(46 * S, 18 * S);
  const P = painter(g, 0, 0), r = rng(seed);
  const blobs = [[12, 11, 7], [21, 8, 8], [31, 10, 7], [38, 12, 5], [6, 13, 5]].map(([x, y, rr]) => [x + r() * 2, y, rr]);
  for (const [x, y, rr] of blobs) P.disc(x * S, y * S, rr * S + 1, '#c9e2f2');
  for (const [x, y, rr] of blobs) P.disc(x * S, y * S - 2, rr * S, '#ffffff');
  P.R(4 * S, 14 * S, 38 * S, 3 * S, '#e4f1fa');
  return c;
}
let _far = null, _mid = null, _hills = null, _clouds = null;
function tileX(ctx, img, ox, y, wWorld) {
  let x = ((ox % wWorld) + wWorld) % wWorld - wWorld;
  const h = img.height / S;
  for (; x < W; x += wWorld) ctx.drawImage(img, snap(x), snap(y), wWorld, h);
}
// sky colours across the level: day city -> sunny site -> golden downtown -> evil zone
const SKY_KEYS = [
  [0, '#2f98e8', '#bfe8ff'], [1200, '#3aa6f2', '#dff4ff'], [2200, '#4a86d8', '#ffd9a8'], [2950, '#5a5fc0', '#ffb08a'], [3350, '#2a0f3f', '#a0407a'],
];
function skyColors(xw) {
  let a = SKY_KEYS[0], b = SKY_KEYS[SKY_KEYS.length - 1];
  for (let i = 0; i < SKY_KEYS.length - 1; i++) if (xw >= SKY_KEYS[i][0] && xw <= SKY_KEYS[i + 1][0]) { a = SKY_KEYS[i]; b = SKY_KEYS[i + 1]; break; }
  if (xw < SKY_KEYS[0][0]) b = a;
  const t = b === a ? 0 : clamp((xw - a[0]) / (b[0] - a[0]), 0, 1);
  return [mix(a[1], b[1], t), mix(a[2], b[2], t)];
}
function drawSky(ctx, camX, camY, frame, opts = {}) {
  if (!_far) {
    _hills = buildHills();
    _far = buildSkyline('#9cc3e0', '#d4ebfa', 11, 40, 100);
    _mid = buildSkyline('#6b8db3', '#ffe9a6', 23, 28, 80);
    _clouds = [buildCloud(1), buildCloud(2), buildCloud(3)];
  }
  const xw = opts.zoneX != null ? opts.zoneX : camX + W / 2;
  const [top, bot] = opts.night ? ['#0b0b2a', '#3a2360'] : skyColors(xw);
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, top); grd.addColorStop(1, bot);
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  const evil = clamp((xw - 3000) / 350, 0, 1);
  if (!opts.night) {
    // sun
    const sx = 300 - camX * 0.01, sy = 34 - camY * 0.05 + evil * 40;
    ctx.save(); ctx.globalAlpha = 1 - evil;
    const sg = ctx.createRadialGradient(sx, sy, 2, sx, sy, 34);
    sg.addColorStop(0, 'rgba(255,250,210,0.9)'); sg.addColorStop(0.3, 'rgba(255,240,170,0.35)'); sg.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = sg; ctx.fillRect(sx - 34, sy - 34, 68, 68);
    ctx.beginPath(); ctx.arc(sx, sy, 9, 0, Math.PI * 2); ctx.fillStyle = '#fff6c8'; ctx.fill();
    ctx.restore();
    if (evil > 0) { ctx.save(); ctx.globalAlpha = evil; ctx.beginPath(); ctx.arc(80, 40 - camY * 0.05, 12, 0, Math.PI * 2); ctx.fillStyle = '#ff5a8a'; ctx.fill(); ctx.restore(); }
    ctx.save(); ctx.globalAlpha = 1 - evil * 0.7;
    for (let i = 0; i < 7; i++) {
      const x = ((i * 97 + 30 - camX * 0.06 + frame * (0.05 + i * 0.01)) % (W + 80) + W + 80) % (W + 80) - 50;
      ctx.drawImage(_clouds[i % 3], snap(x), snap(10 + (i * 37) % 60 - camY * 0.1), 46, 18);
    }
    ctx.restore();
    // birds
    if (evil < 0.5) {
      ctx.fillStyle = '#2a3a55';
      for (let i = 0; i < 4; i++) {
        const bx = ((frame * 0.4 + i * 23 + 80) % (W + 120)) - 60, by = 50 + i * 5 + Math.sin(frame * 0.05 + i) * 3;
        const f = Math.floor(frame / 10 + i) % 2;
        ctx.fillRect(bx - 2, by + (f ? 0 : -1), 2, 0.67); ctx.fillRect(bx + 0.67, by + (f ? 0 : -1), 2, 0.67); ctx.fillRect(bx, by + 0.33, 0.67, 0.67);
      }
    }
  }
  tileX(ctx, _hills, -camX * 0.08, 96 - camY * 0.15, 640);
  tileX(ctx, _far, -camX * 0.16, 70 - camY * 0.25, 640);
  tileX(ctx, _mid, -camX * 0.35, 92 - camY * 0.45, 640);
  const warm = clamp((xw - 2000) / 500, 0, 1) * (1 - evil);
  if (warm > 0) { ctx.fillStyle = `rgba(255,150,80,${warm * 0.16})`; ctx.fillRect(0, 0, W, H); }
  if (evil > 0) { ctx.fillStyle = `rgba(50,10,80,${evil * 0.55})`; ctx.fillRect(0, 0, W, H); }
  if (opts.night) { ctx.fillStyle = 'rgba(8,8,36,0.55)'; ctx.fillRect(0, 0, W, H); }
}
