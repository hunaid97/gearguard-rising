// 8-bit style sprites (original designs): drawn on a chunky grid where 1 sprite pixel = 2 art pixels,
// with a bold black outline around every part and 4-tone shading.
const G = 2;
const RB = { w: 192, h: 180, ax: 96, ay: 168 };   // robot sprite box (art px)
const VB = { w: 228, h: 132, ax: 114, ay: 122 };  // vehicle sprite box
const KB = { w: 72, h: 72, ax: 36, ay: 69 };      // kid sprite box

function painter8(g, ox, oy) {
  const P = painter(g, ox, oy);
  const R = P.R;
  const bevel = (x, y, w, h, c) => {
    R(x, y, w, h, c);
    if (w >= 3 && h >= 3) {
      R(x, y, w, 1, shade(c, 0.4)); R(x, y + 1, 1, h - 1, shade(c, 0.18));
      R(x + w - 1, y + 1, 1, h - 1, shade(c, -0.25)); R(x + 1, y + h - 1, w - 1, 1, shade(c, -0.42));
    } else if (h >= 2) R(x, y, w, 1, shade(c, 0.3));
  };
  const B = (x, y, w, h, c) => { R(x - 1, y - 1, w + 2, h + 2, OL); bevel(x, y, w, h, c); };
  const BB = list => { for (const r of list) R(r[0] - 1, r[1] - 1, r[2] + 2, r[3] + 2, OL); for (const r of list) bevel(r[0], r[1], r[2], r[3], r[4]); };
  return Object.assign(P, { bevel, B, BB });
}
function outline4(c) {
  const [o, g] = makeCanvas(c.width, c.height);
  const [sil, sg] = makeCanvas(c.width, c.height);
  sg.drawImage(c, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = OL; sg.fillRect(0, 0, c.width, c.height);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(sil, dx, dy);
  g.drawImage(c, 0, 0);
  return o;
}
// draw at sprite resolution, outline, then scale up 2x into an art-px canvas
function chunky(box, draw) {
  const [sm, sg] = makeCanvas(box.w / G, box.h / G);
  draw(painter8(sg, box.ax / G, box.ay / G));
  const [big, bg] = makeCanvas(box.w, box.h);
  bg.drawImage(outline4(sm), 0, 0, box.w, box.h);
  return [big, bg];
}

// ===================================================== ROBOTS (~49 sprite px tall)
function drawRobot8(P, cfg, pose) {
  Object.assign(P, { cfg, pose, c1: cfg.c1, c2: cfg.c2, c3: cfg.c3 });
  const walk = pose.legs === 'a' || pose.legs === 'b';
  const yo = (walk ? -1 : 0) + (cfg.legs === 'treads' ? 11 : 0);
  extra8(P, yo, 'back');
  legs8(P);
  torso8(P, yo);
  arm8(P, -1, yo);
  arm8(P, 1, yo);
  head8(P, yo);
  extra8(P, yo, 'front');
}
function legs8(P) {
  const { B, R, disc, c1, c2, cfg, pose } = P;
  const t = cfg.legs;
  if (t === 'treads') {
    B(-13, -8, 26, 8, DARK); R(-12, -7, 24, 1, '#4a4f5c');
    for (let i = 0; i < 5; i++) { disc(-10 + i * 5, -4, 2, '#6b717d'); R(-10 + i * 5, -4, 1, 1, DARK); }
    B(-7, -13, 14, 5, c2);
    return;
  }
  const heavy = t === 'heavy', thin = t === 'thruster';
  const sw = heavy ? 8 : thin ? 5 : 7, fw = heavy ? 11 : 9;
  for (const s of [-1, 1]) {
    let lift = 0;
    if (pose.legs === 'a' && s < 0) lift = 2;
    if (pose.legs === 'b' && s > 0) lift = 2;
    if (pose.legs === 'air') lift = s < 0 ? 3 : 1;
    const cx = s * (heavy ? 6 : 5.5);
    const lx = Math.round(cx - sw / 2);
    B(Math.round(cx - 2.5), -22, 5, 7, c2);                       // thigh
    B(lx, -15, sw, 12 - lift, c1);                                 // shin
    R(lx + 2, -11, sw - 4, 1, shade(c1, -0.4)); R(lx + 2, -9, sw - 4, 1, shade(c1, -0.4));
    B(lx, -17, sw, 3, shade(c1, 0.15));                            // knee
    if (heavy) B(lx - 1, -7 - lift, sw + 2, 3, c2);
    if (thin) {
      B(lx - 1, -3 - lift, sw + 2, 3, DARK);
      if (pose.legs === 'air') { R(lx, -lift, sw, 2, '#ffd040'); R(lx + 1, 2 - lift, sw - 2, 1, '#ff7a20'); }
    } else B(Math.round(cx - fw / 2) + s, -3 - lift, fw, 3, DARK);
    if (t === 'wheels') { const wx = Math.round(cx + s * (sw / 2 + 2)); disc(wx, -8 - lift, 3, OL); disc(wx, -8 - lift, 2, '#1d1f25'); R(wx, -8 - lift, 1, 1, '#9aa0aa'); }
  }
}
function torso8(P, yo) {
  const { B, BB, R, disc, poly, scan, c1, c2, c3, cfg } = P;
  B(-8, -25 + yo, 16, 4, DARK); R(-2, -25 + yo, 4, 3, METAL);    // hips
  const T = -39 + yo;
  switch (cfg.torso) {
    case 'grille':
      B(-13, T, 26, 15, c1);
      B(-12, T + 1, 11, 6, shade(c1, 0.12)); B(1, T + 1, 11, 6, shade(c1, 0.12));
      B(-5, T + 9, 10, 5, METAL); R(-4, T + 10, 8, 1, '#6b717d'); R(-4, T + 12, 8, 1, '#6b717d');
      R(-12, T + 10, 3, 2, '#fff6a0'); R(9, T + 10, 3, 2, '#fff6a0');
      R(-1, T + 3, 2, 2, c3);
      break;
    case 'racer':
      B(-13, T, 26, 15, c1);
      B(-10, T + 1, 20, 6, GLASS); R(-9, T + 2, 5, 1, GLASS_HI); R(3, T + 2, 2, 4, '#c9f0ff');
      R(-4, T + 8, 2, 7, c2); R(2, T + 8, 2, 7, c2);
      R(-12, T + 10, 3, 2, '#fff6a0'); R(9, T + 10, 3, 2, '#fff6a0');
      break;
    case 'jet':
      poly([[-15, T], [15, T], [10, T + 15], [-10, T + 15]], c1);
      R(-14, T, 28, 1, shade(c1, 0.35));
      B(-14, T + 1, 4, 6, DARK); B(10, T + 1, 4, 6, DARK);
      B(-3, T + 1, 6, 9, GLASS); R(-2, T + 2, 1, 4, GLASS_HI);
      R(-9, T + 12, 18, 2, c2);
      break;
    case 'tank':
      B(-14, T, 28, 15, c2);
      B(-13, T + 1, 12, 7, c1); B(1, T + 1, 12, 7, c1);
      B(-2, T + 9, 4, 4, c3); R(-1, T + 10, 1, 1, '#ffffff');
      R(-11, T + 11, 1, 1, shade(c2, 0.45)); R(10, T + 11, 1, 1, shade(c2, 0.45));
      break;
    case 'armor':
      B(-13, T, 26, 15, c1);
      B(-8, T + 1, 16, 6, c2);
      disc(0, T + 10, 3, OL); disc(0, T + 10, 2, c3); R(-1, T + 9, 1, 1, '#ffffff');
      break;
    case 'cockpit':
    default:
      B(-13, T, 26, 15, c1);
      B(-8, T + 1, 16, 11, DARK);
      R(-7, T + 2, 14, 9, GLASS);
      if (!PHOTO) {
        const k = PERSONAL.kid;
        R(-3, T + 4, 6, 6, k.skin); R(-3, T + 3, 6, 2, k.hair);
        R(-2, T + 6, 1, 1, '#24160f'); R(1, T + 6, 1, 1, '#24160f'); R(-1, T + 8, 3, 1, '#5a1f1a');
      }
      R(4, T + 3, 1, 4, GLASS_HI);
      R(-1, T + 13, 2, 1, c3);
      R(-13, T + 12, 4, 2, c2); R(9, T + 12, 4, 2, c2);
      break;
  }
}
function arm8(P, s, yo) {
  const { B, R, c1, c2, c3, cfg, pose } = P;
  const t = cfg.arms, T = -39 + yo, front = s > 0;
  const thin = t === 'thin', ham = t === 'hammer';
  const pad = () => B(s < 0 ? -20 : 13, T - 1, 7, 8, c1);
  if (front && pose.shoot) {
    B(19, T + 3, 5, 4, METAL);
    B(24, T + 2, 7, 6, c1);
    if (t === 'claw') { B(31, T + 1, 3, 2, c3); B(31, T + 7, 3, 2, c3); }
    else if (ham) B(31, T + 1, 5, 8, DARK);
    else { B(31, T + 3, 4, 4, DARK); R(34, T + 4, 1, 2, c3); }
    pad();
    return;
  }
  const ax = s < 0 ? -18 : 14, aw = thin ? 3 : 4;
  if (pose.flex) {
    B(ax, T - 6, aw, 6, METAL);
    B(ax - 1, T - 13, aw + 2, 7, c1);
    if (ham) B(ax - 2, T - 18, aw + 4, 5, DARK); else B(ax, T - 17, aw, 4, DARK);
    pad();
    return;
  }
  let sw = 0;
  if (pose.legs === 'a') sw = s;
  if (pose.legs === 'b') sw = -s;
  if (pose.legs === 'air') sw = -1;
  const ay = T + 7 + sw;
  B(ax, ay, aw, 5, METAL);
  B(ax - 1, ay + 5, aw + 2, 7, c1);
  R(ax, ay + 7, aw, 1, shade(c1, -0.35));
  const hy = ay + 12;
  if (t === 'claw') { B(ax - 1, hy, 1, 4, c3); B(ax + aw, hy, 1, 4, c3); }
  else if (ham) B(ax - 2, hy, aw + 4, 5, DARK);
  else if (t === 'blaster' && front) { B(ax - 1, hy, aw + 2, 5, DARK); R(ax, hy + 4, aw, 1, c3); }
  else B(ax, hy, aw, 4, DARK);
  if (thin) R(s < 0 ? ax - 2 : ax + aw + 1, ay + 6, 1, 4, c3);
  pad();
}
function head8(P, yo) {
  const { B, BB, R, disc, poly, c1, c2, c3, cfg } = P;
  const y = -49 + yo;   // head top; neck at -39
  B(-2, y + 9, 4, 2, DARK);
  switch (cfg.head) {
    case 'leader':
      BB([[-8, y + 1, 2, 7, c2], [6, y + 1, 2, 7, c2]]);
      BB([[-5, y, 10, 10, c1], [-1, y - 2, 2, 2, c1]]);
      R(-4, y + 3, 8, 2, OL); R(-3, y + 3, 6, 1, c3); R(-3, y + 3, 1, 1, '#ffffff');
      B(-3, y + 6, 6, 3, METAL); R(-2, y + 7, 4, 1, '#8d939e');
      break;
    case 'scout':
      B(-1, y - 2, 2, 3, c2);
      BB([[-5, y + 1, 10, 9, c1]]); R(-5, y + 1, 1, 1, OL); R(4, y + 1, 1, 1, OL);
      R(-4, y + 4, 8, 5, METAL);
      R(-3, y + 5, 2, 2, c3); R(1, y + 5, 2, 2, c3); R(-3, y + 5, 1, 1, '#ffffff'); R(1, y + 5, 1, 1, '#ffffff');
      R(-1, y + 8, 2, 1, '#7d838e');
      break;
    case 'seeker':
      poly([[-5, y + 4], [-9, y], [-8, y + 7]], c2); poly([[5, y + 4], [9, y], [8, y + 7]], c2);
      poly([[0, y - 3], [5, y + 2], [5, y + 10], [-5, y + 10], [-5, y + 2]], c1);
      B(-3, y + 4, 6, 5, METAL);
      R(-3, y + 5, 2, 1, c3); R(1, y + 5, 2, 1, c3); R(-1, y + 8, 2, 1, DARK);
      break;
    case 'brute':
      poly([[-5, y + 1], [-3, y - 3], [-2, y + 1]], c2); poly([[-1, y + 1], [0, y - 4], [1, y + 1]], c2); poly([[2, y + 1], [3, y - 3], [5, y + 1]], c2);
      BB([[-6, y, 12, 10, c1]]);
      R(-6, y, 12, 2, shade(c1, -0.25));
      R(-4, y + 3, 8, 2, OL); R(-3, y + 3, 6, 1, c3);
      B(-4, y + 6, 8, 3, c2); R(-3, y + 6, 1, 2, '#e8e8e8'); R(-1, y + 6, 1, 2, '#e8e8e8'); R(1, y + 6, 1, 2, '#e8e8e8');
      break;
    case 'knight':
      B(-1, y - 3, 2, 4, c2);
      BB([[-5, y, 10, 10, c1]]);
      R(-4, y + 3, 8, 2, OL); R(-3, y + 3, 6, 1, c3); R(-1, y + 4, 2, 4, OL); R(-1, y + 5, 2, 2, c3);
      break;
    case 'horns':
      BB([[-8, y - 1, 2, 3, c2], [-7, y + 2, 2, 2, c2], [6, y - 1, 2, 3, c2], [5, y + 2, 2, 2, c2]]);
      BB([[-5, y + 1, 10, 9, c1]]);
      B(-3, y + 4, 6, 4, METAL); R(-3, y + 5, 1, 1, c3); R(2, y + 5, 1, 1, c3);
      break;
    case 'dome':
      R(0, y - 4, 1, 4, METAL); R(-1, y - 5, 3, 2, c3);
      disc(0, y + 4, 5, OL); disc(0, y + 4, 4, GLASS); R(-2, y + 3, 1, 1, c3); R(2, y + 3, 1, 1, c3); R(-3, y + 1, 1, 2, GLASS_HI);
      BB([[-6, y + 5, 12, 5, c1]]);
      break;
    case 'hero':
    default:
      BB([[-8, y + 1, 2, 6, c2], [6, y + 1, 2, 6, c2]]);
      BB([[-5, y, 10, 10, c1]]);
      BB([[-1, y - 3, 2, 3, c3], [-2, y - 2, 4, 1, c3]]);
      R(-4, y + 3, 8, 3, OL); R(-3, y + 3, 6, 2, c3); R(-3, y + 3, 1, 1, '#ffffff');
      B(-2, y + 7, 4, 2, METAL);
      break;
  }
}
function extra8(P, yo, layer) {
  const { B, BB, R, poly, scan, c1, c2, c3, cfg, pose } = P;
  const T = -39 + yo, air = pose.legs === 'air';
  if (layer === 'back') {
    switch (cfg.extra) {
      case 'wings': {
        const wing = [[-10, T + 1], [-28, T + 9], [-27, T + 14], [-10, T + 8]];
        poly(wing, c1); poly(mirror(wing), c1);
        scan([[-16, T + 4], [-26, T + 9], [-26, T + 11], [-16, T + 6]], c2); scan(mirror([[-16, T + 4], [-26, T + 9], [-26, T + 11], [-16, T + 6]]), c2);
        R(-28, T + 9, 2, 3, c3); R(26, T + 9, 2, 3, c3);
        break;
      }
      case 'stacks':
        B(-17, T - 8, 3, 10, METAL); B(14, T - 8, 3, 10, METAL); R(-17, T - 8, 3, 1, DARK); R(14, T - 8, 3, 1, DARK);
        break;
      case 'doors':
        BB([[-24, T - 5, 6, 9, c1], [18, T - 5, 6, 9, c1]]); R(-23, T - 4, 4, 3, GLASS); R(19, T - 4, 4, 3, GLASS);
        break;
      case 'jetpack':
        BB([[-14, T - 6, 4, 8, '#7a808a'], [10, T - 6, 4, 8, '#7a808a']]); R(-14, T - 6, 4, 1, c3); R(10, T - 6, 4, 1, c3);
        if (air) { R(-13, T + 3, 2, 3, '#ffd040'); R(11, T + 3, 2, 3, '#ffd040'); }
        break;
    }
  } else {
    switch (cfg.extra) {
      case 'cannon':
        B(7, T - 3, 5, 3, c2); B(6, T - 7, 13, 4, DARK); B(19, T - 6, 5, 2, METAL); R(23, T - 6, 1, 2, c3);
        break;
      case 'spikes':
        for (const s of [-1, 1]) { poly([[s * 15 - 2, T - 1], [s * 15, T - 6], [s * 15 + 2, T - 1]], c3); poly([[s * 18 - 1, T], [s * 18, T - 4], [s * 18 + 1, T]], c3); }
        break;
      case 'shield':
        B(-25, T + 6, 6, 13, c2); poly([[-22, T + 9], [-20, T + 12], [-22, T + 15], [-24, T + 12]], c3, false);
        break;
    }
  }
}

// ===================================================== VEHICLES (side view, facing right)
function drawVehicle8(P, cfg, frame) {
  const { B, BB, R, disc, poly, scan } = P;
  const c1 = cfg.c1, c2 = cfg.c2, c3 = cfg.c3;
  const wheel = (cx, r = 4, cy = -r) => {
    disc(cx, cy, r + 1, OL); disc(cx, cy, r, '#1d1f25'); disc(cx, cy, Math.max(1, r - 2), METAL);
    R(cx, cy, 1, 1, '#4a4f5c');
    if (frame) { R(cx - 1, cy - 1, 1, 1, '#6b717d'); R(cx + 1, cy + 1, 1, 1, '#6b717d'); } else { R(cx + 1, cy - 1, 1, 1, '#6b717d'); R(cx - 1, cy + 1, 1, 1, '#6b717d'); }
  };
  switch (cfg.vehicle) {
    case 'truck':
      B(-25, -12, 48, 4, c2); R(-25, -14, 26, 2, '#4a4f5c');
      B(-2, -16, 7, 5, METAL);
      BB([[4, -32, 19, 22, c1]]);
      B(1, -39, 2, 23, METAL);
      R(13, -30, 9, 8, GLASS); R(14, -29, 3, 1, GLASS_HI);
      B(6, -29, 5, 6, GLASS);
      B(21, -20, 3, 10, METAL); R(21, -18, 3, 1, '#6b717d'); R(21, -15, 3, 1, '#6b717d');
      B(20, -10, 5, 3, METAL); R(22, -15, 2, 2, '#fff6a0');
      R(5, -20, 16, 1, c2); R(10, -33, 7, 1, '#ffb030');
      wheel(-19, 5); wheel(-8, 5); wheel(15, 5);
      break;
    case 'jet':
      poly([[-24, -8], [-21, -21], [-16, -21], [-14, -8]], c1);
      poly([[-26, -11], [15, -12], [26, -8], [15, -4], [-26, -5]], c1);
      scan([[-25, -9], [19, -10], [21, -8], [-25, -7]], c2);
      poly([[3, -12], [7, -16], [15, -13], [14, -11]], GLASS); R(7, -14, 2, 1, GLASS_HI);
      poly([[-11, -6], [5, -6], [-7, 1], [-15, 1]], shade(c1, -0.25));
      B(-29, -11, 3, 5, DARK); R(-33, -10, 4, 3, frame ? '#ffb030' : '#ff6a20');
      R(-5, -4, 1, 3, DARK); R(12, -4, 1, 3, DARK); R(24, -8, 1, 1, c3);
      break;
    case 'tank':
      B(-23, -8, 46, 8, DARK);
      for (let i = 0; i < 6; i++) { disc(-18 + i * 7, -4, 2, '#6b717d'); }
      R(-22, -7, 44, 1, '#4a4f5c');
      poly([[-22, -8], [-20, -15], [19, -15], [23, -8]], c1);
      poly([[-10, -15], [-8, -22], [7, -22], [10, -15]], c2);
      B(9, -21, 21, 3, METAL); B(29, -22, 3, 5, DARK);
      R(-19, -13, 2, 1, c3);
      break;
    case 'bike':
      poly([[-13, -9], [-6, -15], [3, -12], [9, -15], [7, -9]], c1);           // frame
      B(-4, -10, 7, 4, DARK); R(-3, -9, 5, 1, '#4a4f5c');                      // engine
      BB([[-3, -16, 9, 4, c1]]); R(-2, -15, 7, 1, c2);                          // tank
      B(-11, -15, 8, 2, DARK);                                                   // seat
      poly([[7, -17], [13, -18], [14, -12], [9, -11]], c1); R(12, -16, 2, 2, '#fff6a0');
      R(8, -19, 4, 1, DARK); R(9, -20, 1, 2, DARK);
      R(9, -13, 1, 8, METAL); R(-14, -8, 7, 2, METAL); R(-15, -8, 1, 2, '#4a4f5c');
      wheel(-11, 5); wheel(12, 5);
      break;
    case 'jetski': {
      const sp = frame ? 1 : 0;
      for (const [x, y, r] of [[-22, -3, 3], [-26 - sp, -5, 2], [-19, -1, 2], [-28, -2 + sp, 2], [-15, 0, 2], [6, 0, 2], [-4, 0, 2], [14, -1, 1]]) { disc(x, y, r, '#bfe8ff'); disc(x, y - 1, Math.max(1, r - 1), '#ffffff'); }
      poly([[-20, -7], [14, -7], [22, -10], [20, -4], [-18, -3]], c1);
      R(-19, -5, 38, 1, c2);
      B(-15, -9, 20, 2, c2);
      B(-12, -12, 9, 3, DARK);
      R(3, -14, 2, 6, DARK); R(1, -15, 6, 1, DARK);
      B(8, -12, 4, 3, GLASS);
      R(20, -9, 1, 1, c3);
      break;
    }
    case 'heli':
      R(-1, -23, 2, 3, DARK);
      if (frame) R(-21, -24, 42, 1, DARK); else { R(-9, -24, 18, 1, DARK); R(-2, -25, 4, 3, '#4a4f5c'); }
      B(-25, -15, 18, 3, c1);
      poly([[-28, -21], [-24, -21], [-23, -12], [-27, -13]], c2);
      if (frame) R(-27, -24, 1, 7, DARK); else R(-30, -21, 7, 1, DARK);
      poly([[-8, -20], [7, -20], [13, -14], [11, -7], [-8, -7]], c1);
      poly([[5, -19], [12, -14], [10, -10], [5, -10]], GLASS); R(6, -17, 1, 2, GLASS_HI);
      R(-7, -12, 14, 1, c2); R(-6, -18, 4, 3, GLASS);
      R(-5, -6, 1, 4, METAL); R(6, -6, 1, 4, METAL); B(-9, -2, 21, 1, METAL);
      R(12, -11, 1, 1, c3);
      break;
    case 'car':
    default:
      poly([[-23, -14], [15, -14], [22, -11], [23, -5], [-23, -5]], c1);
      poly([[-11, -14], [-6, -20], [7, -20], [13, -14]], c1);
      scan([[-9, -14], [-5, -19], [-1, -19], [-1, -14]], GLASS); scan([[1, -14], [1, -19], [6, -19], [11, -14]], GLASS);
      R(-5, -18, 2, 1, GLASS_HI); R(2, -18, 2, 1, GLASS_HI);
      R(-22, -13, 37, 1, shade(c1, 0.35));
      R(-23, -10, 46, 2, c2); R(14, -13, 7, 1, c2);
      B(-24, -18, 5, 1, c2); R(-22, -17, 1, 3, DARK);
      R(0, -13, 1, 7, shade(c1, -0.45));
      R(21, -10, 2, 2, '#fff6a0'); R(-23, -11, 1, 2, '#ff3030');
      R(-23, -6, 46, 1, DARK);
      wheel(-13); wheel(13);
      break;
  }
}

// ===================================================== KID (Qumayl himself, ~29 sprite px tall)
function drawKid8(P, mask, pose) {
  const { R, B, BB } = P;
  const k = PERSONAL.kid, s = PERSONAL.suit;
  const has = i => (mask >> i) & 1;
  const walk = pose.legs === 'a' || pose.legs === 'b';
  for (const side of [-1, 1]) {
    let lift = 0;
    if (pose.legs === 'a' && side < 0) lift = 2;
    if (pose.legs === 'b' && side > 0) lift = 2;
    if (pose.legs === 'air') lift = side < 0 ? 2 : 0;
    const x = side < 0 ? -4 : 1, a = has(side < 0 ? 4 : 5);
    B(x, -10, 3, 8 - lift, a ? s.c1 : k.pants);
    if (a) R(x, -7, 3, 1, s.c3);
    B(side < 0 ? x - 1 : x, -2 - lift, 4, 2, a ? DARK : k.shoes);
  }
  const y = walk ? -1 : 0;
  for (const side of [-1, 1]) {
    let sw = 0;
    if (pose.legs === 'a') sw = side; if (pose.legs === 'b') sw = -side; if (pose.legs === 'air') sw = -2;
    const x = side < 0 ? -7 : 5, a = has(side < 0 ? 2 : 3);
    B(x, -18 + y + sw, 2, 3, a ? s.c1 : k.shirt);
    B(x, -15 + y + sw, 2, 4, a ? s.c1 : k.skin);
    if (a) R(x, -13 + y + sw, 2, 1, s.c3);
  }
  B(-5, -18 + y, 10, 8, has(1) ? s.c1 : k.shirt);
  if (!has(1)) {
    R(-5, -11 + y, 10, 1, '#2a2b31');
    R(-2, -18 + y, 1, 1, '#ffffff'); R(1, -18 + y, 1, 1, '#ffffff');
    R(-1, -18 + y, 2, 6, k.tie); R(-1, -16 + y, 2, 1, k.tieStripe); R(-1, -14 + y, 2, 1, k.tieStripe);
  } else { R(-4, -17 + y, 8, 1, shade(s.c1, 0.35)); R(-5, -13 + y, 10, 1, s.c2); }
  if (has(6)) { R(-1, -16 + y, 2, 2, '#4fd8ff'); R(-1, -16 + y, 1, 1, '#ffffff'); }
  const hy = -28 + y;
  B(-5, hy, 10, 10, k.skin);
  R(-6, hy + 4, 1, 3, shade(k.skin, -0.15));
  R(-5, hy - 1, 10, 3, k.hair); R(-5, hy + 2, 2, 3, k.hair); R(-3, hy + 2, 7, 1, k.hair); R(-1, hy + 3, 1, 1, k.hair); R(2, hy + 3, 1, 1, k.hair);
  R(-3, hy - 1, 4, 1, shade(k.hair, 0.3));
  R(-1, hy + 5, 1, 2, '#24160f'); R(3, hy + 5, 1, 2, '#24160f');
  R(0, hy + 8, 4, 1, '#5a1f1a'); R(1, hy + 8, 1, 1, '#ffffff'); R(3, hy + 8, 1, 1, '#ffffff');
  if (has(0)) { BB([[-6, hy - 2, 12, 4, s.c1], [-6, hy + 2, 2, 5, s.c1]]); R(-1, hy - 4, 2, 2, s.c3); R(-3, hy + 1, 8, 1, s.c3); }
}

// ===================================================== CACHED GETTERS
function getRobotSprite(cfg, pose) {
  const k = 'R' + robotKey(cfg) + poseKey(pose);
  let c = _spr.get(k);
  if (c) return c;
  const [big, bg] = chunky(RB, P => drawRobot8(P, cfg, pose));
  if (cfg.torso === 'cockpit' && PHOTO) {
    const walk = pose.legs === 'a' || pose.legs === 'b';
    const T = -39 + (walk ? -1 : 0) + (cfg.legs === 'treads' ? 11 : 0);
    bg.imageSmoothingEnabled = true;
    bg.drawImage(PHOTO, RB.ax - 8, RB.ay + (T + 2) * G + 1, 16, 16);
    bg.imageSmoothingEnabled = false;
    bg.fillStyle = 'rgba(143,216,255,0.15)'; bg.fillRect(RB.ax - 8, RB.ay + (T + 2) * G + 1, 16, 16);
    bg.fillStyle = GLASS_HI; bg.fillRect(RB.ax + 8, RB.ay + (T + 3) * G, 2, 8);
  }
  _spr.set(k, big);
  return big;
}
function getVehicleSprite(cfg, frame) {
  const k = 'V' + cfg.vehicle + cfg.c1 + cfg.c2 + cfg.c3 + frame;
  let c = _spr.get(k);
  if (!c) { c = chunky(VB, P => drawVehicle8(P, cfg, frame))[0]; _spr.set(k, c); }
  return c;
}
function getKidSprite(mask, pose) {
  const k = 'K' + mask + poseKey(pose);
  let c = _spr.get(k);
  if (!c) { c = chunky(KB, P => drawKid8(P, mask, pose))[0]; _spr.set(k, c); }
  return c;
}
