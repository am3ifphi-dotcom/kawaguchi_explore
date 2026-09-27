import { OVERVIEW, AREA_TABLE, TIMELINE, HOTSPOTS, CAT, SCHOOL_FLOORS, ARENA_S, ARENA_N, SCHOOL } from './data.js';

// ---------------------------------------------------------------- DOM helpers
const $ = (s) => document.querySelector(s);
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

export const BUILDINGS = {
  school: { name: '校舎棟', def: SCHOOL, floors: ['B1', 'F1', 'F2', 'F3', 'F4', 'F5'], data: SCHOOL_FLOORS },
  arenaS: { name: 'アリーナS棟', def: ARENA_S, floors: ['F1', 'F2'], data: ARENA_S.floors },
  arenaN: { name: 'アリーナN棟', def: ARENA_N, floors: ['F1', 'F2'], data: ARENA_N.floors },
};

export function floorName(k) {
  if (k === 'B1') return '地下1階';
  return `${k.replace('F', '')}階`;
}

// ---------------------------------------------------------------- panel build
export function buildUI(handlers) {
  const panel = $('#panel');
  panel.innerHTML = '';

  const head = el('div', 'panel-head');
  head.innerHTML = `<h1>川口市立高等学校<span>3D 探検</span></h1>
    <p class="sub">実施設計資料(全9頁)と広報かわぐちを精読して、第1校地を3Dで再現しました。</p>`;
  panel.appendChild(head);

  const tabs = el('nav', 'tabs');
  const names = { explore: '探検', floors: '階', guide: 'ガイド', overview: '概要', history: '沿革', source: '出典' };
  for (const k of Object.keys(names)) {
    const b = el('button', 'tab' + (k === 'explore' ? ' on' : ''), names[k]);
    b.dataset.tab = k;
    b.onclick = () => {
      tabs.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x === b));
      showTab(k);
    };
    tabs.appendChild(b);
  }
  panel.appendChild(tabs);

  const body = el('div', 'panel-body');
  panel.appendChild(body);

  function showTab(k) {
    body.innerHTML = '';
    if (k === 'explore') tabExplore();
    if (k === 'floors') tabFloors();
    if (k === 'guide') tabGuide();
    if (k === 'overview') tabOverview();
    if (k === 'history') tabHistory();
    if (k === 'source') tabSource();
  }

  // ---- 探検
  function tabExplore() {
    body.appendChild(el('h3', 'sec', '視点モード'));
    const modes = [
      ['orbit', '🛰 俯瞰オルビット', 'ドラッグで回転 / ホイールでズーム / 右ドラッグで平行移動'],
      ['walk', '🚶 徒歩モード', 'クリックで視点ロック、WASD/矢印で移動、Escで解除'],
      ['tour', '🎬 ガイドツアー', '資料の読みどころを9ステーションで巡る'],
    ];
    for (const [id, label, hint] of modes) {
      const b = el('button', 'mode-btn', `<b>${label}</b><small>${hint}</small>`);
      b.dataset.mode = id;
      b.onclick = () => handlers.setMode(id);
      b.id = 'mode-' + id;
      body.appendChild(b);
    }
    const rot = el('label', 'chk', '<input type="checkbox" id="autorot"> ゆっくり自動回転(オルビット)');
    body.appendChild(rot);
    rot.querySelector('input').onchange = (e) => handlers.autoRotate(e.target.checked);

    body.appendChild(el('h3', 'sec', '見どころクイックジャンプ'));
    const quick = el('div', 'chips');
    for (const h of HOTSPOTS.slice(0, 10)) {
      const c = el('button', 'chip', h.t.split('/')[0]);
      c.onclick = () => handlers.focusHotspot(h.id);
      quick.appendChild(c);
    }
    body.appendChild(quick);
  }

  // ---- 階
  function tabFloors() {
    body.appendChild(el('h3', 'sec', '建物を選択 → 階を選ぶと、3Dと平面図でその階を探検できます'));
    const bsel = el('div', 'chips');
    let curB = 'school', curF = null;
    for (const k of Object.keys(BUILDINGS)) {
      const b = el('button', 'chip' + (k === curB ? ' on' : ''), BUILDINGS[k].name);
      b.onclick = () => {
        curB = k; curF = null;
        bsel.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === b));
        handlers.setExplorer(k, null);
        renderFloors();
      };
      bsel.appendChild(b);
    }
    body.appendChild(bsel);

    const fsel = el('div', 'chips');
    body.appendChild(fsel);
    const planBox = el('div', 'plan-box');
    body.appendChild(planBox);
    const legend = el('div', 'legend');
    body.appendChild(legend);

    function renderFloors() {
      fsel.innerHTML = '';
      const whole = el('button', 'chip' + (curF === null ? ' on' : ''), '全体表示');
      whole.onclick = () => { curF = null; handlers.setExplorer(curB, null); renderFloors(); };
      fsel.appendChild(whole);
      for (const f of BUILDINGS[curB].floors) {
        const b = el('button', 'chip' + (curF === f ? ' on' : ''), floorName(f));
        b.onclick = () => { curF = f; handlers.setExplorer(curB, f); renderFloors(); };
        fsel.appendChild(b);
      }
      planBox.innerHTML = curF ? planSVG(BUILDINGS[curB], curF) : '<p class="muted">階を選ぶと、実施設計の平面図を基にしたカラー平面図と3D断面が表示されます。</p>';
      legend.innerHTML = curF
        ? Object.values(CAT).map((c) => `<span><i style="background:${c.c}"></i>${c.label}</span>`).filter((v, i, a) => a.indexOf(v) === i).join('')
        : '';
    }
    renderFloors();
  }

  // ---- ガイド
  function tabGuide() {
    body.appendChild(el('h3', 'sec', 'ガイドスポット(17) — クリックで飛ぶ'));
    for (const h of HOTSPOTS) {
      const b = el('button', 'guide-item', `<b>${h.t}</b><small>${h.tags.join(' / ')}</small>`);
      b.onclick = () => handlers.focusHotspot(h.id);
      body.appendChild(b);
    }
  }

  // ---- 概要
  function tabOverview() {
    const t = el('table', 'fact');
    for (const [k, v] of OVERVIEW.facts) t.innerHTML += `<tr><th>${k}</th><td>${v}</td></tr>`;
    body.appendChild(el('h3', 'sec', '学校概要'));
    body.appendChild(t);
    body.appendChild(el('h3', 'sec', '面積表(㎡)'));
    const a = el('table', 'fact area');
    a.innerHTML = `<tr>${AREA_TABLE.head.map((h) => `<th>${h}</th>`).join('')}</tr>` +
      AREA_TABLE.rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th>${c}</th>` : `<td>${c}</td>`)).join('')}</tr>`).join('');
    body.appendChild(a);
  }

  // ---- 沿革
  function tabHistory() {
    const ol = el('ol', 'timeline');
    for (const [d, t, x] of TIMELINE) ol.innerHTML += `<li><b>${d}</b><span>${t}</span><small>${x}</small></li>`;
    body.appendChild(ol);
  }

  // ---- 出典
  function tabSource() {
    body.appendChild(el('h3', 'sec', '出典資料'));
    body.appendChild(el('p', 'muted',
      '本サイトは以下の公開資料を精読し、教育・研究目的で3D再現したファンメイドの探検コンテンツです。川口市および学校公式のものではありません。'));
    const l1 = el('a', 'src-link', '📄 新市立高等学校実施設計について(全9頁) — 開く');
    l1.href = './source/design_27901siryou.pdf'; l1.target = '_blank';
    const l2 = el('a', 'src-link', '📄 広報かわぐち 2015年9月号(P02) — 開く');
    l2.href = './source/kouhou_P02.pdf'; l2.target = '_blank';
    body.appendChild(l1); body.appendChild(l2);
    body.appendChild(el('h3', 'sec', '再現のポイント'));
    body.appendChild(el('ul', 'srclist', `
      <li>配置図(03)より: 校舎棟・アリーナS/N棟・中央広場・フィジカルストリート・グラウンド・テニスコート・プール・弓道場・竪川・門・駐輪1,510台の位置関係を再現。</li>
      <li>平面図(04–07)より: B1〜5階の全教室・実験室・コモンズ・食堂・アリーナの間取りをカラーブロック化(「階」タブ)。</li>
      <li>立面・断面図(08–09)より: 軒高18.486m/高さ21.886m、階高3.6m、膜屋根アーチ、南面バルコニー、ルーバー屋根を再現。</li>
      <li>広報P02より: 開校スケジュール、人工芝・観客席480・防災備蓄倉庫・マンホールトイレ等の情報を収録。</li>`));
  }

  showTab('explore');

  // ---------------------------------------------------------------- cards
  const infoCard = $('#info-card');
  export_.showInfo = function (data) {
    infoCard.innerHTML = `
      <button class="close" id="info-close">✕</button>
      <h2>${data.t}</h2>
      ${data.tags ? `<div class="tags">${data.tags.map((t) => `<span>${t}</span>`).join('')}</div>` : ''}
      <p>${data.d}</p>
      ${data.extra || ''}`;
    infoCard.classList.add('on');
    $('#info-close').onclick = () => infoCard.classList.remove('on');
  };
  export_.hideInfo = () => infoCard.classList.remove('on');

  const tourCard = $('#tour-card');
  export_.showTour = function (wp, i, n) {
    tourCard.innerHTML = `
      <div class="tour-head"><span>${i + 1} / ${n}</span><b>${wp.title}</b></div>
      <p>${wp.d}</p>
      <div class="tour-btns">
        <button id="tour-prev">← 前へ</button>
        <button id="tour-next">次へ →</button>
        <button id="tour-end">ツアー終了</button>
      </div>`;
    tourCard.classList.add('on');
    $('#tour-prev').onclick = () => handlers.tourStep(-1);
    $('#tour-next').onclick = () => handlers.tourStep(1);
    $('#tour-end').onclick = () => handlers.setMode('orbit');
  };
  export_.hideTour = () => tourCard.classList.remove('on');

  export_.setModeUI = (mode) => {
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    const hint = {
      orbit: 'ドラッグ:回転 / ホイール:ズーム / 右ドラッグ:移動 — 建物やスポットをクリックで詳細',
      walk: 'クリックで視点ロック → WASD/矢印で歩行 / Escで解除',
      tour: 'ガイドツアー再生中 — 画面下のボタンで操作',
    }[mode];
    $('#hint').textContent = hint;
    $('#crosshair').style.display = mode === 'walk' ? 'block' : 'none';
  };
}

const export_ = {};
export const ui = export_;

// ---------------------------------------------------------------- 2D plan SVG
function planSVG(b, floorKey) {
  const { def } = b;
  const rooms = b.data[floorKey] || [];
  const W = def.size.x, H = def.size.y;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="plan" style="width:100%">`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" fill="#fafaf7" stroke="#333" stroke-width="0.6"/>`;
  for (const r of rooms) {
    const c = CAT[r.c] ? CAT[r.c].c : '#eee';
    const x = r.x[0], y = H - r.y[1], w = r.x[1] - r.x[0], hh = r.y[1] - r.y[0];
    s += `<rect x="${x + 0.15}" y="${y + 0.15}" width="${w - 0.3}" height="${hh - 0.3}" fill="${c}" stroke="#8a8a8a" stroke-width="0.18"/>`;
    if (w > 6.5 && hh > 4.5) {
      s += `<text x="${x + w / 2}" y="${y + hh / 2}" font-size="${Math.min(2.6, hh / 3)}" text-anchor="middle" dominant-baseline="middle" fill="#333">${r.n}</text>`;
    }
  }
  s += `<text x="1.5" y="3.6" font-size="3.4" fill="#17364a" font-weight="700">${b.name} ${floorName(floorKey)} 平面図</text>`;
  s += `<text x="${W - 1.5}" y="${H - 1.5}" font-size="2.6" fill="#777" text-anchor="end">北↑ / ${W}m × ${H}m</text>`;
  s += '</svg>';
  return s;
}
