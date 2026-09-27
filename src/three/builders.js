import * as THREE from 'three';
import { SCHOOL, SCHOOL_FLOORS, ARENA_S, ARENA_N, SITE, CAT } from '../data.js';

// ---------------------------------------------------------------- utilities
export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function textSprite(text, { px = 44, color = '#17364a', bg = 'rgba(255,255,255,0.92)', border = '#17364a', worldH = 5 } = {}) {
  const pad = 18;
  const c = document.createElement('canvas');
  let ctx = c.getContext('2d');
  ctx.font = `600 ${px}px "Hiragino Sans","Noto Sans JP","Yu Gothic",sans-serif`;
  const tw = ctx.measureText(text).width;
  c.width = Math.ceil(tw + pad * 2);
  c.height = Math.ceil(px * 1.6 + pad);
  ctx = c.getContext('2d');
  if (bg) { ctx.fillStyle = bg; roundRect(ctx, 1, 1, c.width - 2, c.height - 2, 14); ctx.fill(); }
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = 4; roundRect(ctx, 2, 2, c.width - 4, c.height - 4, 13); ctx.stroke(); }
  ctx.font = `600 ${px}px "Hiragino Sans","Noto Sans JP","Yu Gothic",sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, pad, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: true, transparent: true }));
  const aspect = c.width / c.height;
  sp.scale.set(worldH * aspect, worldH, 1);
  sp.userData.isLabel = true;
  return sp;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const mat = {
  concrete: new THREE.MeshStandardMaterial({ color: 0xe9e5db, roughness: 0.9 }),
  concrete2: new THREE.MeshStandardMaterial({ color: 0xdfdbd1, roughness: 0.9 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x9fc4d8, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.5 }),
  glassSolid: new THREE.MeshStandardMaterial({ color: 0x6f93a8, roughness: 0.3 }),
  louver: new THREE.MeshStandardMaterial({ color: 0xb9bdc2, roughness: 0.6 }),
  membrane: new THREE.MeshStandardMaterial({ color: 0xf7fbff, roughness: 0.4, transparent: true, opacity: 0.82, side: THREE.DoubleSide }),
  water: new THREE.MeshStandardMaterial({ color: 0x8ec7e0, roughness: 0.15 }),
  road: new THREE.MeshStandardMaterial({ color: 0xb9bcbe, roughness: 1 }),
  pad: new THREE.MeshStandardMaterial({ color: 0xd9d9d6, roughness: 1 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 }),
  leafA: new THREE.MeshStandardMaterial({ color: 0x79a860, roughness: 1 }),
  leafB: new THREE.MeshStandardMaterial({ color: 0x8fbf6a, roughness: 1 }),
  white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }),
};

function box(w, h, d, m, x, y, z) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z);
  return b;
}

// サイト座標 [east, south] → world [x, z]
export const W = (e, s) => [e, s];

// ---------------------------------------------------------------- site
export function buildSite() {
  const g = new THREE.Group();

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(760, 640), new THREE.MeshStandardMaterial({ color: 0xe4e9e0, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(5, 0, 0);
  ground.userData.pick = { t: '地面', d: '第1校地 敷地面積 49,620.73㎡(埼玉県川口市上青木3-1-40)。' };
  g.add(ground);

  // 竪川
  {
    const [x1, z1] = SITE.river.from, [x2, z2] = SITE.river.to;
    const len = Math.hypot(x2 - x1, z2 - z1);
    const r = box(len, 0.12, SITE.river.width, mat.water, (x1 + x2) / 2, 0.06, (z1 + z2) / 2);
    r.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    r.userData.pick = { t: '竪川', d: '敷地の南を流れる川。' };
    g.add(r);
    const lbl = textSprite('竪川', { worldH: 4 });
    lbl.position.set(0, 2.4, 128);
    g.add(lbl);
  }

  // 道路
  for (const rd of SITE.roads) {
    const [x1, z1] = rd.from, [x2, z2] = rd.to;
    const len = Math.hypot(x2 - x1, z2 - z1);
    const m = box(len, 0.1, rd.width, mat.road, (x1 + x2) / 2, 0.05, (z1 + z2) / 2);
    m.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    g.add(m);
  }

  // パッド(広場・駐輪・駐車)
  for (const p of SITE.pads) {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(p.c), roughness: 1, transparent: !!p.ghost, opacity: p.ghost ? 0.5 : 1 });
    const b = box(p.s[0], 0.16, p.s[1], m, p.p[0], 0.08, p.p[1]);
    b.userData.pick = { t: p.n, d: p.d || '' };
    g.add(b);
  }

  // 第1グラウンド(人工芝+トラック)
  {
    const tex = canvasTexture(1024, 768, (ctx, w, h) => {
      ctx.fillStyle = '#8cba74'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#c07a52'; ctx.lineWidth = 88;
      ellipse(ctx, w / 2, h / 2, w * 0.42, h * 0.42); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 4;
      for (let i = -3; i <= 3; i++) { ellipse(ctx, w / 2, h / 2, w * 0.42 + i * 12, h * 0.42 + i * 12); ctx.stroke(); }
      ctx.fillStyle = '#79b063';
      ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w * 0.30, h * 0.30, 0, 0, Math.PI * 2); ctx.fill();
      // サッカーピッチ
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 5;
      ctx.strokeRect(w * 0.30, h * 0.22, w * 0.40, h * 0.56);
      ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.22); ctx.lineTo(w * 0.5, h * 0.78); ctx.stroke();
      ctx.beginPath(); ctx.arc(w * 0.5, h * 0.5, 46, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeRect(w * 0.30, h * 0.40, w * 0.06, h * 0.20);
      ctx.strokeRect(w * 0.64, h * 0.40, w * 0.06, h * 0.20);
    });
    const f = new THREE.Mesh(new THREE.PlaneGeometry(178, 124), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
    f.rotation.x = -Math.PI / 2;
    f.position.set(45, 0.12, 55);
    f.userData.pick = { t: '第1グラウンド(人工芝)', d: '部活動の活性化と砂埃対策で人工芝を導入。2021年8月竣工。' };
    g.add(f);
  }

  // テニスコート
  {
    const tex = canvasTexture(512, 320, (ctx, w, h) => {
      ctx.fillStyle = '#7fae6d'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        const x = 30 + i * 158;
        ctx.strokeRect(x, 30, 120, 260);
        ctx.beginPath(); ctx.moveTo(x, h / 2); ctx.lineTo(x + 120, h / 2); ctx.stroke();
        ctx.strokeRect(x + 24, 90, 72, 140);
      }
    });
    const t = new THREE.Mesh(new THREE.PlaneGeometry(64, 40), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
    t.rotation.x = -Math.PI / 2;
    t.position.set(58, 0.12, 116);
    t.userData.pick = { t: 'テニスコート', d: '現公民館敷地に整備。' };
    g.add(t);
  }

  // プール(既存)
  {
    const deck = box(52, 0.3, 30, mat.pad, -40, 0.15, -102);
    g.add(deck);
    const water = box(44, 0.34, 20, mat.water, -40, 0.34, -102);
    water.userData.pick = { t: 'プール(既存)', d: '既存施設を活かした25m級プール。' };
    g.add(water);
    // レーンロープ
    for (let i = -3; i <= 3; i++) g.add(box(44, 0.06, 0.25, mat.white, -40, 0.55, -102 + i * 2.6));
  }

  // 弓道場
  {
    const b = box(58, 0.4, 14, new THREE.MeshStandardMaterial({ color: 0xdfe8d2, roughness: 1 }), -42, 0.2, -128);
    b.userData.pick = { t: '弓道場', d: '北端の弓道場。近的・遠的場を整備。' };
    g.add(b);
  }

  // SKIPシティ
  {
    const [e, s] = SITE.skipCity.p;
    const m = new THREE.MeshStandardMaterial({ color: 0xcfd4da, roughness: 0.7 });
    const b1 = box(30, SITE.skipCity.h, 20, m, e - 6, SITE.skipCity.h / 2, s - 4);
    const b2 = box(16, SITE.skipCity.h * 0.7, 16, m, e + 16, SITE.skipCity.h * 0.35, s + 8);
    b1.userData.pick = b2.userData.pick = { t: 'SKIPシティ', d: '川口メディア産業拠点。新校はここ上青木の立地特性を生かし、SKIPシティと連携する。' };
    g.add(b1, b2);
    const l = textSprite('SKIPシティ', { worldH: 5 });
    l.position.set(e, SITE.skipCity.h + 5, s);
    g.add(l);
  }

  // 門
  for (const gt of SITE.gates) {
    const post = box(1.2, 5.4, 1.2, new THREE.MeshStandardMaterial({ color: 0x2e6e8e, roughness: 0.6 }), gt.p[0], 2.7, gt.p[1]);
    post.userData.pick = { t: gt.n, d: gt.d };
    g.add(post);
    const l = textSprite(gt.n, { worldH: 3.4, color: '#14506e', border: '#14506e' });
    l.position.set(gt.p[0], 8.4, gt.p[1]);
    g.add(l);
  }

  // 樹木(Instanced)
  {
    const n = SITE.trees.length;
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.3, 2.4, 6), mat.trunk, n);
    const leafG = new THREE.IcosahedronGeometry(1.7, 0);
    const leaf = new THREE.InstancedMesh(leafG, mat.leafA, n);
    const leaf2 = new THREE.InstancedMesh(leafG, mat.leafB, n);
    const d = new THREE.Object3D();
    SITE.trees.forEach(([e, s, h], i) => {
      d.position.set(e, 1.2, s); d.scale.setScalar(1); d.updateMatrix();
      trunk.setMatrixAt(i, d.matrix);
      d.position.set(e, 2.2 + h * 0.5, s); d.scale.setScalar(0.8 + (h - 2.2) * 0.35); d.updateMatrix();
      (i % 2 ? leaf : leaf2).setMatrixAt(i, d.matrix);
      const zero = new THREE.Matrix4().makeScale(0, 0, 0);
      (i % 2 ? leaf2 : leaf).setMatrixAt(i, zero);
    });
    g.add(trunk, leaf, leaf2);
  }
  return g;
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

// ---------------------------------------------------------------- 校舎棟
export function buildSchool() {
  const g = new THREE.Group();
  const { x: LX, y: LY } = SCHOOL.size;
  const [ce, cs] = SCHOOL.center;
  // ローカル(lx:0..LX 東, ly:0..LY 北) → ワールド
  const P = (lx, ly) => [ce - LX / 2 + lx, cs + LY / 2 - ly];

  const levels = [0, 4.0, 7.6, 11.2, 14.8, 18.4];
  const massing = new THREE.Group();
  massing.userData.kind = 'massing';

  const zS = { y0: 0, y1: 16.0 }, zN = { y0: 29.7, y1: LY };

  for (let f = 0; f < 5; f++) {
    const h = levels[f + 1] - levels[f];
    const y = levels[f] + h / 2;
    for (const z of [zS, zN]) {
      const [wx, wz] = P(LX / 2, (z.y0 + z.y1) / 2);
      const wing = box(LX, h, z.y1 - z.y0, f === 0 ? mat.concrete2 : mat.concrete, wx, y, wz);
      wing.userData.pick = { t: `校舎棟 ${f + 1}階`, d: '実施設計資料の平面図を参照。', floor: f + 1 };
      massing.add(wing);
      // 窓バンド(南・北ファサード)
      const winZ = z === zS ? P(LX / 2, 0)[1] + 0.15 : P(LX / 2, LY)[1] - 0.15;
      massing.add(box(LX - 4, 1.5, 0.18, mat.glassSolid, wx, levels[f] + h * 0.55, winZ));
    }
    // 南側バルコニー
    const [bx, bz] = P(LX / 2, -1.1);
    massing.add(box(LX, 0.35, 2.2, mat.concrete2, bx, levels[f + 1] - 0.2, bz));
    massing.add(box(LX, 1.0, 0.12, mat.louver, bx, levels[f + 1] + 0.4, bz - 1.0));
  }

  // 1階 ピロティ/ガラス(アトリウム両端)
  {
    const [w0x, w0z] = P(0, (zS.y1 + zN.y0) / 2);
    const [w1x] = P(LX, 0);
    const aw = zN.y0 - zS.y1;
    const g1 = box(0.3, 18.4, aw, mat.glass, w0x + 0.2, 9.2, w0z);
    const g2 = box(0.3, 18.4, aw, mat.glass, w1x - 0.2, 9.2, w0z);
    massing.add(g1, g2);
  }

  // 中央ガラスタワー(エレベーター・階段)
  {
    const [tx, tz] = P(LX / 2, (zS.y1 + zN.y0) / 2);
    massing.add(box(9, 21.6, aw2(zS, zN), mat.glass, tx, 10.8, tz));
  }
  function aw2(a, b) { return b.y0 - a.y1; }

  // 渡り廊下(3・4階)
  for (const lv of [11.2, 14.8]) {
    for (const lx of [26, 54.6, 83]) {
      const [wx, wz] = P(lx, (zS.y1 + zN.y0) / 2);
      massing.add(box(3.2, 0.4, aw2(zS, zN), mat.concrete2, wx, lv + 1.2, wz));
      massing.add(box(3.2, 1.1, 0.1, mat.louver, wx, lv + 1.9, wz - aw2(zS, zN) / 2 + 0.1));
      massing.add(box(3.2, 1.1, 0.1, mat.louver, wx, lv + 1.9, wz + aw2(zS, zN) / 2 - 0.1));
    }
  }

  // アトリウム内カラーボックス(イメージ図2風)
  const palette = [0x8fbf9e, 0x7ea8d8, 0xe8927c, 0xf2c94c, 0x9b8cd8, 0x6fc2c9];
  let pi = 0;
  for (let f = 1; f < 5; f++) {
    for (const lx of [12, 30, 48, 66, 84, 98]) {
      const m = new THREE.MeshStandardMaterial({ color: palette[pi++ % palette.length], roughness: 0.8 });
      const [sx, sz] = P(lx, zS.y1 + 1.6);
      massing.add(box(7, 3.0, 3.0, m, sx, levels[f] + 1.6, sz));
      const [nx, nz] = P(lx + 6, zN.y0 - 1.6);
      massing.add(box(7, 3.0, 3.0, new THREE.MeshStandardMaterial({ color: palette[pi++ % palette.length], roughness: 0.8 }), nx, levels[f] + 1.6, nz));
    }
  }

  // アトリウム内 樹木
  for (const lx of [20, 45, 70, 92]) {
    const [tx, tz] = P(lx, (zS.y1 + zN.y0) / 2);
    massing.add(box(0.3, 3.4, 0.3, mat.trunk, tx, 1.7, tz));
    const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(2.0, 0), mat.leafB);
    lf.position.set(tx, 4.4, tz);
    massing.add(lf);
  }

  // 膜屋根(アーチ)
  {
    const w = aw2(zS, zN) + 3.4;
    const seg = 24, len = LX + 6;
    const pos = [];
    const idx = [];
    for (let i = 0; i <= seg; i++) {
      const u = i / seg;
      const yy = 18.9 + Math.cos((u - 0.5) * Math.PI) * 3.0;
      const ly = (zS.y1 + zN.y0) / 2 + (u - 0.5) * w;
      const [xa, za] = P(-3, ly);
      pos.push(xa, yy, za);
      const [xb, zb] = P(LX + 3, ly);
      pos.push(xb, yy, zb);
    }
    for (let i = 0; i < seg; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mem = new THREE.Mesh(geo, mat.membrane);
    mem.userData.pick = { t: '膜屋根', d: 'ラーニングストリート上部の膜屋根。柔らかな光が吹抜に降り注ぐ。' };
    massing.add(mem);
    // 屋根トラス(両翼上部)
    for (const z of [zS, zN]) {
      const [wx, wz] = P(LX / 2, (z.y0 + z.y1) / 2);
      massing.add(box(LX * 0.62, 2.6, (z.y1 - z.y0) * 0.5, mat.louver, wx - LX * 0.12, 19.6, wz));
    }
  }

  const lbl = textSprite('校舎棟(ラーニングストリート)', { worldH: 4.6 });
  const [lx0, lz0] = P(LX / 2, LY / 2);
  lbl.position.set(lx0, 27.5, lz0);
  g.add(lbl);

  g.add(massing);

  // ---- 階探検用ルームグループ ----
  const floorGroups = {};
  for (const key of Object.keys(SCHOOL_FLOORS)) {
    const fg = buildFloorGroup(SCHOOL_FLOORS[key], SCHOOL, P, key);
    fg.visible = false;
    floorGroups[key] = fg;
    g.add(fg);
  }
  g.userData.floorGroups = floorGroups;
  g.userData.massing = massing;
  g.userData.levels = levels;
  return g;
}

function buildFloorGroup(rooms, def, P, key) {
  const g = new THREE.Group();
  const h = 2.7;
  for (const r of rooms) {
    const c = CAT[r.c] ? CAT[r.c].c : '#ddd';
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.85 });
    const w = r.x[1] - r.x[0], d = r.y[1] - r.y[0];
    const [wx, wz] = P((r.x[0] + r.x[1]) / 2, (r.y[0] + r.y[1]) / 2);
    const b = box(w - 0.25, h, d - 0.25, m, wx, h / 2 + 0.15, wz);
    b.userData.pick = { t: r.n, d: `${floorLabel(key)} / ${CAT[r.c]?.label || ''}`, room: true };
    g.add(b);
    if (w >= 6 && d >= 5) {
      const s = textSprite(r.n, { worldH: 2.6, px: 36, bg: 'rgba(255,255,255,0.85)', border: 'rgba(0,0,0,0.25)', color: '#333' });
      s.position.set(wx, h + 1.6, wz);
      g.add(s);
    }
  }
  return g;
}

export function floorLabel(k) {
  if (k === 'B1') return '地下1階';
  if (k === 'RF') return '屋階';
  return `${k.replace('F', '')}階`;
}

// ---------------------------------------------------------------- アリーナ
export function buildArena(def, name, extra) {
  const g = new THREE.Group();
  const { x: LX, y: LY } = def.size;
  const [ce, cs] = def.center;
  const P = (lx, ly) => [ce - LX / 2 + lx, cs + LY / 2 - ly];

  const massing = new THREE.Group();
  if (name === 'S') {
    const [mx, mz] = P(31, LY / 2);
    const main = box(62, 16.5, LY, mat.concrete, mx, 8.25, mz);
    main.userData.pick = { t: 'アリーナS棟 / 大アリーナ', d: 'バスケット3面・観客席480。' };
    massing.add(main);
    massing.add(box(62, 2.6, LY + 0.6, mat.louver, mx, 18.1, mz));
    const [ex, ez] = P(75, LY / 2);
    const east = box(26, 11, LY, mat.concrete2, ex, 5.5, ez);
    east.userData.pick = { t: 'アリーナS棟(ロビー・部室側)', d: 'ロビー、体育教員室、倉庫、ミーティングルーム。' };
    massing.add(east);
    // 大扉
    const [dx, dz] = P(31, -0.4);
    massing.add(box(20, 5, 0.4, mat.glassSolid, dx, 2.5, dz));
  } else {
    const [mx, mz] = P(LX / 2, LY / 2);
    const main = box(LX, 10.4, LY, mat.concrete, mx, 5.2, mz);
    main.userData.pick = { t: 'アリーナN棟', d: '1階 柔道場・剣道場 / 2階 中・小アリーナ。' };
    massing.add(main);
    massing.add(box(34, 2.2, LY * 0.8, mat.louver, P(20, LY / 2)[0], 11.4, P(20, LY / 2)[1]));
    massing.add(box(26, 2.2, LY * 0.8, mat.louver, P(64, LY / 2)[0], 11.4, P(64, LY / 2)[1]));
  }
  g.add(massing);

  const lbl = textSprite(name === 'S' ? 'アリーナS棟(大アリーナ)' : 'アリーナN棟(柔剣道場)', { worldH: 4.2 });
  lbl.position.set(ce, (name === 'S' ? 22 : 15), cs);
  g.add(lbl);

  const floorGroups = {};
  for (const key of Object.keys(def.floors)) {
    const fg = buildFloorGroup(def.floors[key], def, P, key);
    fg.visible = false;
    floorGroups[key] = fg;
    g.add(fg);
  }
  g.userData.floorGroups = floorGroups;
  g.userData.massing = massing;
  return g;
}

// 連絡ブリッジ(S↔N, S↔校舎)
export function buildBridges() {
  const g = new THREE.Group();
  const b1 = box(3.4, 0.5, 40, mat.concrete2, -46, 4.6, -38);
  g.add(b1);
  g.add(box(3.4, 1.1, 40, mat.louver, -46, 5.3, -38));
  const b2 = box(30, 0.5, 3.4, mat.concrete2, -18, 4.6, -16);
  g.add(b2);
  g.add(box(30, 1.1, 3.4, mat.louver, -18, 5.3, -16));
  return g;
}
