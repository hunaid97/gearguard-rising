// High-res level scenery, rendered lazily in chunks (so phones don't need one giant canvas).
const CHUNK_W = 256;
const _chunks = new Map();
function getChunk(i) {
  let c = _chunks.get(i);
  if (c) { _chunks.delete(i); _chunks.set(i, c); return c; }  // LRU: move to end
  const [cv, g] = makeCanvas(CHUNK_W * S, (H - LEVEL_TOP) * S);
  drawLevelArea(g, i * CHUNK_W);
  _chunks.set(i, cv);
  if (_chunks.size > 7) _chunks.delete(_chunks.keys().next().value);
  return cv;
}
function drawLevel(ctx, cx, cy) {
  const i0 = Math.floor(cx / CHUNK_W), i1 = Math.floor((cx + W - 0.01) / CHUNK_W);
  for (let i = i0; i <= i1; i++) {
    if (i < 0 || i * CHUNK_W >= LEVEL_W) continue;
    ctx.drawImage(getChunk(i), 0, Math.round((cy - LEVEL_TOP) * S), CHUNK_W * S, H * S, i * CHUNK_W - cx, 0, CHUNK_W, H);
  }
}
const X = v => Math.round(v * S);

const SHOPS = [
  [360, 100, 78, '#e8c39e', 'PIZZA', '#e03030'], [470, 108, 92, '#a8d0c0', 'TOYS', '#2f6fff'],
  [585, 100, 70, '#f0b8c8', 'ICE CREAM', '#ff5fb4'], [870, 120, 84, '#c7b8e8', 'COMICS', '#9b59ff'],
  [1525, 80, 74, '#d8d0a8', 'GARAGE', '#ff7a1a'], [1610, 85, 88, '#b8d8e8', 'BAKERY', '#2ecc71'],
];
const LAMPS = [380, 680, 1010, 1560, 1870, 2180, 2440, 2810, 2980];
const TREES = [1895, 2000, 2150, 1030, 3100];
const TOWERS = [[2280, 58, 22, '#6f8fb8'], [2340, 46, 8, '#8aa6c8'], [2800, 70, 30, '#5f7fa8'], [2890, 60, 12, '#7a9ac0']];

function drawLevelArea(g, x0) {
  const P = painter(g, -x0 * S, -LEVEL_TOP * S);
  const x1 = x0 + CHUNK_W;
  const vis = (a, b) => b > x0 - 4 && a < x1 + 4;
  if (vis(10, 345)) drawHQ(P);
  for (const t of TOWERS) if (vis(t[0], t[0] + t[1])) drawTower(P, ...t);
  if (vis(3140, LEVEL_W)) drawDreadZone(P, x0, x1);
  if (vis(1000, 1530)) drawConstruction(P);
  for (const s of SHOPS) if (vis(s[0], s[0] + s[1])) drawShop(P, ...s);
  for (const x of TREES) if (vis(x - 25, x + 25)) drawTree(P, x);
  if (vis(1900, 1960)) drawFountain(P, 1928);
  if (vis(2285, 2395)) drawBillboard(P, 2290, 96);
  drawGround(P, x0, x1);
  LEVEL.solids.forEach((s, i) => { if (vis(s.x - 12, s.x + s.w + 12)) drawBuildingHD(P, s, i); });
  LEVEL.girders.forEach(gd => { if (vis(gd.x - 2, gd.x + gd.w + 2)) drawGirderHD(P, gd); });
  for (const x of LAMPS) if (vis(x - 20, x + 20)) drawLamp(P, x);
}

function pixText(P, s, x, y, size, color, align = 'center') {
  const g = P.g;
  g.font = `${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'top';
  g.fillStyle = OL;
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [2, 2], [-2, 2], [2, -2], [-2, -2], [0, 4]]) g.fillText(s, P.ox + x + dx, P.oy + y + dy);
  g.fillStyle = color; g.fillText(s, P.ox + x, P.oy + y);
}
function hdWindow(P, x, y, w, h, frame, lit) {
  const { R } = P;
  R(x - 2, y - 2, w + 4, h + 4, frame);
  R(x, y, w, h, lit ? '#ffe9a6' : '#3a4a5e');
  if (lit) R(x, y, w, 3, '#fff6d0'); else { R(x + 2, y + 2, 3, h - 4, '#5c7590'); R(x + 6, y + 2, 2, Math.min(6, h - 4), '#5c7590'); }
  R(x, y + Math.floor(h / 2), w, 1, frame);
}

// ---------------------------------------------------------------- HQ
function drawHQ(P) {
  const { R, B, disc, poly, scan } = P;
  const r = rng(5);
  B(X(20), X(84), X(316), X(100), '#7d8796');
  for (let x = X(20); x < X(336); x += 66) R(x, X(90), 3, X(94), '#6d7684');
  R(X(20), X(84), X(316), 6, '#a9b3c1');
  for (const bx of [34, 226]) for (let x = bx; x < bx + 92; x += 16) for (let y = 96; y < 166; y += 22) hdWindow(P, X(x), X(y), 24, 33, '#5b6370', r() < 0.6);
  // tower + emblem (a gear with a star)
  B(X(126), X(40), X(88), X(46), '#8e98a8'); R(X(126), X(40), X(88), 6, '#b4bec9');
  const ex = X(170), ey = X(63);
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; disc(ex + Math.round(Math.cos(a) * 30), ey + Math.round(Math.sin(a) * 30), 9, OL); }
  disc(ex, ey, 31, OL);
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; disc(ex + Math.round(Math.cos(a) * 30), ey + Math.round(Math.sin(a) * 30), 8, '#d43a2a'); }
  disc(ex, ey, 30, '#d43a2a'); disc(ex - 6, ey - 8, 12, '#e8604a'); disc(ex, ey, 17, OL); disc(ex, ey, 16, '#8e98a8');
  const star = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 6 : 14; star.push([ex + Math.cos(a) * rr, ey + Math.sin(a) * rr]); }
  poly(star, '#ffd21f');
  pixText(P, `${HEROES} HQ`, X(170), X(103), 7 * S, '#ffe14d');
  // hangar door + hazard frame
  for (let x = X(122); x < X(218); x += 12) { R(x, X(114), 6, 18, '#ffd21f'); R(x + 6, X(114), 6, 18, OL); }
  B(X(128), X(120), X(84), X(64), '#3b414c');
  for (let y = X(124); y < X(184); y += 9) R(X(128), y, X(84), 2, '#4b525e');
  R(X(128), X(120), X(84), 4, '#59616e');
  // radar dish + flags
  R(X(60), X(60), 6, X(24), '#6d7684');
  poly([[X(46), X(46)], [X(76), X(46)], [X(70), X(56)], [X(52), X(56)]], '#d5dbe3'); R(X(60), X(38), 3, X(8), '#6d7684'); disc(X(61), X(37), 4, '#ff4d4d');
  for (const [fx, c] of [[300, '#2f6fff'], [318, '#ffd21f']]) {
    R(X(fx), X(54), 3, X(30), '#8d939e');
    poly([[X(fx) + 3, X(54)], [X(fx) + 36, X(58)], [X(fx) + 30, X(61)], [X(fx) + 36, X(64)], [X(fx) + 3, X(68)]], c);
  }
  // crosswalk
  for (let x = X(342); x < X(386); x += 15) R(x, X(GROUND) + 22, 8, 54, '#e8ecf2');
}

// ---------------------------------------------------------------- shops
function drawShop(P, wx, ww, hh, col, sign, awn) {
  const { R, B, disc } = P;
  const x = X(wx), w = X(ww), top = X(GROUND - hh), gy = X(GROUND);
  const r = rng(wx);
  B(x, top, w, gy - top, col);
  for (let yy = top + 12; yy < gy; yy += 9) R(x + 2, yy, w - 4, 1, shade(col, -0.06));
  R(x - 3, top - 3, w + 6, 7, shade(col, 0.3)); R(x - 3, top + 4, w + 6, 3, shade(col, -0.35));
  // upper windows
  const n = Math.max(2, Math.floor(w / 66));
  for (let k = 0; k < n; k++) { const wx2 = x + Math.round((k + 0.5) * w / n) - 10; for (let y = top + 18; y < gy - 130; y += 46) hdWindow(P, wx2, y, 21, 30, shade(col, -0.4), r() < 0.5); }
  // sign
  const sw = Math.min(w - 18, sign.length * 18 + 24);
  B(x + w / 2 - sw / 2, gy - 120, sw, 30, '#2a2d36');
  pixText(P, sign, x + w / 2, gy - 114, 18, '#ffe14d');
  // shop window with goodies
  const winW = w - 66;
  B(x + 12, gy - 72, winW, 58, '#9fd3f0');
  for (let k = 0; k < 4; k++) { const ix = x + 20 + k * Math.floor(winW / 4); R(ix, gy - 36 - Math.floor(r() * 12), 14, 24, pick(['#ff6b6b', '#ffd21f', '#4fe0a0', '#8f7bff', '#ff9a3c'])); }
  R(x + 16, gy - 68, 4, 48, '#d8f0ff'); R(x + 24, gy - 68, 2, 30, '#d8f0ff');
  R(x + 10, gy - 14, winW + 4, 4, shade(col, -0.35));
  // door
  B(x + w - 45, gy - 72, 30, 72, '#4a3a30'); R(x + w - 42, gy - 68, 24, 30, '#9fd3f0'); R(x + w - 22, gy - 34, 3, 3, '#ffd21f');
  // awning
  for (let k = 0; k * 12 < winW + 12; k++) { R(x + 6 + k * 12, gy - 90, 12, 15, k % 2 ? '#ffffff' : awn); disc(x + 12 + k * 12, gy - 75, 6, k % 2 ? '#ffffff' : awn); }
  R(x + 6, gy - 93, winW + 12, 3, OL);
}

// ---------------------------------------------------------------- construction site
function drawConstruction(P) {
  const { R, B, disc, poly } = P;
  // chain-link fence
  R(X(1000), X(150), X(520), 3, '#7b8390');
  for (let x = X(1000); x < X(1520); x += 90) R(x, X(150), 6, X(34), '#7b8390');
  for (let x = X(1000); x < X(1520); x += 9) for (let k = 0; k < X(34); k += 9) { R(x + (k % 18 ? 4 : 0), X(150) + k + 3, 2, 2, 'rgba(160,170,180,0.6)'); }
  // crane
  const mx = X(1462);
  for (let y = X(-34); y < X(GROUND); y += 24) {
    R(mx, y, 4, 24, '#e0b020'); R(mx + 20, y, 4, 24, '#e0b020');
    for (let k = 0; k < 20; k++) R(mx + 2 + k, y + k, 2, 2, '#c09010');
    R(mx, y, 24, 3, '#c09010');
  }
  for (let x = X(1170); x < X(1510); x += 24) {
    R(x, X(-34), 24, 4, '#e0b020'); R(x, X(-34) + 18, 24, 4, '#e0b020');
    for (let k = 0; k < 16; k++) R(x + k, X(-34) + 2 + k, 2, 2, '#c09010');
  }
  B(X(1492), X(-48), X(26), X(14), '#d0a010'); R(X(1496), X(-45), X(10), X(6), GLASS);
  B(X(1520), X(-36), X(14), X(10), '#6b717d');
  R(X(1240), X(-28), 2, X(52), '#333840'); B(X(1236), X(24), 14, 8, '#6b717d'); R(X(1240), X(26) + 8, 4, 8, '#6b717d');
  // signs, pipes, dirt mounds
  B(X(1062), X(132), X(46), X(20), '#ffd21f'); R(X(1066), X(184), 4, -X(32), '#6b717d');
  R(X(1070), X(152), 4, X(32), '#6b717d'); R(X(1100), X(152), 4, X(32), '#6b717d');
  pixText(P, 'DANGER!', X(1085), X(135), 15, '#e03030');
  pixText(P, 'ROBOTS AT WORK', X(1085), X(144), 9, OL);
  for (const [px, py] of [[1345, 178], [1357, 178], [1351, 168]]) { disc(X(px), X(py), 17, OL); disc(X(px), X(py), 16, '#5f86b8'); disc(X(px), X(py), 9, '#2a3a55'); }
  poly([[X(1380), X(184)], [X(1400), X(170)], [X(1420), X(172)], [X(1440), X(184)]], '#8a6a44');
}

// ---------------------------------------------------------------- park
function drawTree(P, wx) {
  const { R, B, disc } = P;
  const x = X(wx), gy = X(GROUND);
  B(x - 6, gy - 66, 12, 66, '#6b4423'); R(x - 4, gy - 66, 3, 66, '#8a5a33');
  for (const [dx, dy, rr] of [[0, -96, 30], [-24, -78, 22], [24, -80, 22], [-10, -110, 20], [14, -108, 18]]) disc(x + dx, gy + dy, rr + 2, OL);
  for (const [dx, dy, rr] of [[0, -96, 30], [-24, -78, 22], [24, -80, 22], [-10, -110, 20], [14, -108, 18]]) disc(x + dx, gy + dy, rr, '#2f8a2c');
  for (const [dx, dy, rr] of [[-6, -104, 16], [-26, -84, 11], [18, -88, 12], [-12, -116, 10]]) disc(x + dx, gy + dy, rr, '#47a83f');
  for (const [dx, dy] of [[-14, -110], [6, -100], [-30, -88], [20, -94]]) R(x + dx, gy + dy, 4, 3, '#7fdc6a');
}
function drawFountain(P, wx) {
  const { R, B, disc } = P;
  const x = X(wx), gy = X(GROUND);
  B(x - 45, gy - 24, 90, 24, '#c3c8d1'); R(x - 42, gy - 21, 84, 6, '#6fc3f0');
  B(x - 6, gy - 60, 12, 36, '#c3c8d1'); B(x - 21, gy - 63, 42, 6, '#c3c8d1');
  for (let k = 0; k < 14; k++) { const t = k / 13; R(x - 6 - t * 30, gy - 66 - Math.sin(t * Math.PI) * 18 + t * 40, 3, 3, '#bfe8ff'); R(x + 3 + t * 30, gy - 66 - Math.sin(t * Math.PI) * 18 + t * 40, 3, 3, '#bfe8ff'); }
  R(x - 2, gy - 84, 4, 20, '#bfe8ff'); disc(x, gy - 86, 4, '#e6fbff');
}

// ---------------------------------------------------------------- downtown
function drawTower(P, wx, ww, top, col) {
  const { R, B } = P;
  const x = X(wx), w = X(ww), y = X(top), gy = X(GROUND);
  B(x, y, w, gy - y, col);
  for (let xx = x + 6; xx < x + w - 6; xx += 15) R(xx, y + 6, 1, gy - y - 6, shade(col, -0.25));
  for (let yy = y + 12; yy < gy; yy += 15) R(x + 2, yy, w - 4, 1, shade(col, -0.25));
  for (let xx = x + 8; xx < x + w - 8; xx += 30) R(xx, y + 6, 4, gy - y - 6, shade(col, 0.25));
  R(x + w / 2 - 2, y - 36, 4, 36, '#8d939e'); R(x + w / 2 - 4, y - 40, 8, 4, '#ff4d4d');
  R(x - 3, y - 3, w + 6, 6, shade(col, 0.35));
}
function drawBillboard(P, wx, wy) {
  const { R, B } = P;
  const x = X(wx), y = X(wy), w = X(100), h = X(42), gy = X(GROUND);
  for (const px of [x + 30, x + w - 36]) { R(px - 1, y + h, 8, gy - y - h, OL); R(px, y + h, 6, gy - y - h, '#6b717d'); }
  R(x + 20, y + h + 30, w - 40, 4, '#6b717d');
  B(x - 6, y - 6, w + 12, h + 12, '#ffd21f');
  B(x, y, w, h, '#1f2533');
  for (let k = 0; k < 10; k++) R(x + 6 + k * 30, y - 12, 9, 6, k % 2 ? '#fff6a0' : '#ff9a3c');
  R(x + 9, y + 9, 108, 108, OL);
  if (PHOTO) P.g.drawImage(PHOTO, P.ox + x + 12, P.oy + y + 12, 102, 102);
  else { R(x + 12, y + 12, 102, 102, '#7fb2ff'); P.g.drawImage(getKidSprite(0, { legs: 'idle' }), KB.ax - 12, KB.ay - 62, 24, 26, P.ox + x + 15, P.oy + y + 12, 96, 104); }
  pixText(P, 'WARAS', x + 210, y + 18, 18, '#ffe14d');
  pixText(P, 'MUBARAK', x + 210, y + 48, 18, '#ffffff');
  pixText(P, PERSONAL.name + '!', x + 210, y + 80, 21, '#4fe0a0');
}

// ---------------------------------------------------------------- villain zone
function drawDreadZone(P, x0, x1) {
  const { R, B, disc, poly, scan } = P;
  const r = rng(77);
  for (let wx = 3150; wx < LEVEL_W; wx += 64) {
    const h = 70 + Math.floor(r() * 60), x = X(wx + 11), gy = X(GROUND);
    if (wx + 40 < x0 || wx - 20 > x1) continue;
    poly([[x - 36, gy], [x - 6, gy - X(h)], [x + 6, gy - X(h)], [x + 36, gy]], '#3b2350');
    scan([[x - 6, gy - X(h)], [x, gy - X(h)], [x - 6, gy], [x - 30, gy]], '#4e2f6a');
    for (let i = 18; i < h - 12; i += 16) R(x - 3, gy - X(i), 6, 9, '#c04dff');
    for (const [dx, dy] of [[-22, -30], [20, -46], [-12, -64]]) R(x + dx, gy + dy, 4, 4, '#ff4d6d');
  }
  // fortress with a glowing eye
  if (x1 > 3400) {
    B(X(3410), X(72), X(200), X(112), '#2a1a38');
    for (let k = 0; k < 10; k++) B(X(3410) + k * 60, X(64), 36, 24, '#2a1a38');
    disc(X(3510), X(108), 33, OL); disc(X(3510), X(108), 31, '#5a0f1f'); disc(X(3510), X(108), 18, '#ff3d3d'); disc(X(3510), X(108), 8, '#ffd0a0');
    poly([[X(3470), X(140)], [X(3550), X(140)], [X(3510), X(176)]], '#6b3a8a');
    poly([[X(3497), X(148)], [X(3523), X(148)], [X(3510), X(166)]], '#ff3d3d', false);
    for (const cx of [3440, 3580]) for (let y = X(80); y < X(170); y += 9) { R(X(cx), y, 6, 6, '#6b717d'); R(X(cx) + 1, y + 6, 4, 3, '#4a4f58'); }
  }
}

// ---------------------------------------------------------------- ground
const GROUND_ZONES = [[0, 1000, 'city'], [1000, 1520, 'dirt'], [1520, 1880, 'city'], [1880, 2160, 'grass'], [2160, 3150, 'city'], [3150, 99999, 'dread']];
function drawGround(P, x0, x1) {
  const { R, disc } = P;
  const gy = X(GROUND), bottom = X(H) + 6;
  const r = rng(Math.floor(x0) + 13);
  for (const [z0, z1, kind] of GROUND_ZONES) {
    const xs = Math.max(X(x0), X(z0)), xe = Math.min(X(x1), X(Math.min(z1, LEVEL_W)));
    if (xe <= xs) continue;
    const w = xe - xs, dread = kind === 'dread';
    // road
    R(xs, gy + 19, w, bottom - gy - 19, dread ? '#241a30' : '#3d4450');
    for (let k = 0; k < w / 6; k++) R(xs + Math.floor(r() * w), gy + 22 + Math.floor(r() * 70), 2, 2, dread ? '#30223f' : (r() < 0.5 ? '#4a5260' : '#343a45'));
    for (let x = Math.ceil(xs / 84) * 84; x < xe; x += 84) R(x, gy + 46, Math.min(42, xe - x), 5, dread ? '#9b59ff' : '#e8c547');
    R(xs, gy + 19, w, 3, dread ? '#1a1224' : '#2a2f38');
    // pavement
    if (kind === 'city') {
      R(xs, gy, w, 15, '#b4bcc7'); R(xs, gy, w, 2, '#dfe4ea');
      for (let x = Math.ceil(xs / 48) * 48; x < xe; x += 48) R(x, gy + 2, 2, 13, '#939ba7');
    } else if (kind === 'dirt') {
      R(xs, gy, w, 15, '#9a7448'); R(xs, gy, w, 3, '#c49a66');
      for (let k = 0; k < w / 10; k++) R(xs + Math.floor(r() * w), gy + 4 + Math.floor(r() * 9), 3, 2, '#7a5a36');
    } else if (kind === 'grass') {
      R(xs, gy, w, 15, '#4caf3f'); R(xs, gy, w, 3, '#7fdc6a');
      for (let x = xs; x < xe; x += 5) R(x, gy - 2 - Math.floor(r() * 3), 2, 4, '#5fc94f');
      for (let k = 0; k < w / 30; k++) { const fx = xs + Math.floor(r() * w); R(fx, gy - 3, 3, 3, pick(['#ff6b6b', '#ffd21f', '#ffffff', '#ff8ad8'])); }
    } else {
      R(xs, gy, w, 15, '#4a3560'); R(xs, gy, w, 2, '#8a5ab8');
      for (let x = Math.ceil(xs / 60) * 60; x < xe; x += 60) { R(x, gy, 2, 15, '#2a1d38'); R(x + 4, gy + 6, 3, 3, '#c04dff'); }
    }
    R(xs, gy + 15, w, 4, dread ? '#2a1d38' : '#7d8590');
  }
  for (const mx of [600, 1300, 2250, 2900]) if (mx > x0 - 10 && mx < x1 + 10) { disc(X(mx), gy + 64, 12, '#2a2f38'); disc(X(mx), gy + 64, 10, '#4a5260'); R(X(mx) - 8, gy + 63, 16, 2, '#2a2f38'); }
  for (const px of [3300, 3520]) if (px > x0 - 30 && px < x1 + 30) { disc(X(px), gy + 6, 12, '#3a8a2a'); R(X(px) - 30, gy + 2, 60, 9, '#6dff4a'); R(X(px) - 24, gy + 3, 48, 3, '#c8ffb0'); }
}

// ---------------------------------------------------------------- solid buildings, girders, lamps
const BUILD_COLS = ['#d9a066', '#7a8fa6', '#b5676a', '#6f9a80', '#8e7cc3', '#c9b458', '#5f87b0', '#c07a54', '#7c6a9e'];
const AWN_COLS = ['#e03030', '#2ecc71', '#2f6fff', '#ff7a1a'];
function drawBuildingHD(P, s, i) {
  const { R, B, disc, poly } = P;
  const base = BUILD_COLS[i % BUILD_COLS.length];
  const x = X(s.x), y = X(s.y), w = X(s.w), h = X(GROUND - s.y);
  const r = rng(100 + i);
  // roof props (behind parapet)
  if (w > 200) { B(x + 18, y - 18, 33, 16, '#9aa3ad'); R(x + 22, y - 14, 25, 2, '#6b717d'); R(x + 22, y - 9, 25, 2, '#6b717d'); }
  if (i % 3 === 0) { R(x + w - 30, y - 45, 3, 45, '#6b717d'); R(x + w - 33, y - 48, 9, 4, '#ff4d4d'); }
  if (w > 300) {
    const tx = x + Math.round(w / 2) + 20;
    R(tx - 18, y - 24, 3, 24, '#5b3a2a'); R(tx + 15, y - 24, 3, 24, '#5b3a2a');
    B(tx - 21, y - 54, 42, 30, '#8a5a3a'); for (let k = 0; k < 4; k++) R(tx - 21, y - 50 + k * 8, 42, 1, '#6b4423');
    poly([[tx - 24, y - 54], [tx, y - 68], [tx + 24, y - 54]], '#6b4423');
  }
  R(x - 2, y - 2, w + 4, h + 2, OL);
  R(x, y, w, h, base);
  for (let yy = y + 12; yy < y + h; yy += 9) R(x, yy, w, 1, shade(base, -0.07));
  R(x, y, 4, h, shade(base, 0.15)); R(x + w - 5, y, 5, h, shade(base, -0.2));
  // windows
  const ww = 15, wh = 21, gx = 12, gyy = 18;
  const n = Math.max(1, Math.floor((w - 18) / (ww + gx)));
  const sx = x + Math.round((w - (n * (ww + gx) - gx)) / 2);
  for (let wy = y + 21; wy + wh <= y + h - 56; wy += wh + gyy) for (let c = 0; c < n; c++) {
    const wx = sx + c * (ww + gx);
    hdWindow(P, wx, wy, ww, wh, shade(base, -0.4), r() < 0.45);
    R(wx - 3, wy + wh + 2, ww + 6, 2, shade(base, 0.25));
  }
  // door + awning
  const dx = x + Math.round(w / 2) - 15;
  R(dx - 2, y + h - 45, 34, 45, OL); R(dx, y + h - 43, 30, 43, '#3b2f2a');
  R(dx + 2, y + h - 41, 12, 20, '#5c7590'); R(dx + 16, y + h - 41, 12, 20, '#5c7590'); R(dx + 24, y + h - 20, 3, 3, '#ffd21f');
  const ac = AWN_COLS[i % AWN_COLS.length];
  for (let k = 0; k < 6; k++) { R(dx - 9 + k * 8, y + h - 56, 8, 9, k % 2 ? '#ffffff' : ac); disc(dx - 5 + k * 8, y + h - 47, 4, k % 2 ? '#ffffff' : ac); }
  // parapet
  R(x - 4, y - 3, w + 8, 9, OL); R(x - 3, y - 2, w + 6, 7, shade(base, 0.3)); R(x - 3, y - 2, w + 6, 2, shade(base, 0.5));
  R(x - 3, y + 5, w + 6, 3, shade(base, -0.35));
}
function drawGirderHD(P, gd) {
  const { R } = P;
  const x = X(gd.x), y = X(gd.y), w = X(gd.w), gy = X(GROUND);
  for (const px of [x + 9, x + w - 15]) { R(px - 1, y + 15, 8, gy - y - 15, OL); R(px, y + 15, 6, gy - y - 15, '#8a929e'); R(px, y + 15, 2, gy - y - 15, '#b4bcc7'); }
  for (let yy = y + 42; yy < gy - 10; yy += 42) R(x + 15, yy, w - 30, 3, '#6b717d');
  R(x - 2, y - 2, w + 4, 19, OL);
  R(x, y, w, 15, '#e07b22'); R(x, y, w, 3, '#ffb060'); R(x, y + 12, w, 3, '#9a4f12');
  for (let i = 0; i + 14 <= w; i += 14) for (let k = 0; k < 8; k++) { R(x + i + k, y + 4 + k, 2, 1, '#9a4f12'); R(x + i + 12 - k, y + 4 + k, 2, 1, '#9a4f12'); }
  for (let i = 6; i < w - 4; i += 18) { R(x + i, y + 1, 2, 1, '#ffe0b8'); R(x + i, y + 13, 2, 1, '#6a3205'); }
}
function drawLamp(P, wx) {
  const { R, scan } = P;
  const x = X(wx), top = X(136), gy = X(GROUND);
  scan([[x + 14, top + 12], [x + 25, top + 12], [x + 52, gy], [x - 12, gy]], 'rgba(255,240,160,0.09)');
  R(x - 3, top, 7, gy - top, OL); R(x - 2, top, 5, gy - top, '#5b616b'); R(x - 2, top, 2, gy - top, '#7b828d');
  R(x - 7, gy - 10, 15, 10, OL); R(x - 6, gy - 9, 13, 9, '#4a4f58');
  R(x - 3, top - 4, 24, 6, OL); R(x - 2, top - 3, 22, 4, '#5b616b');
  R(x + 11, top + 1, 17, 8, OL); R(x + 12, top + 2, 15, 6, '#3a3f48'); R(x + 13, top + 8, 13, 4, '#fff6a0');
}
