// ランタイムスモークテスト(ヘッドレスブラウザ無しの代用検証)
// builders.js / ui.js / data.js のコードパスを Node + jsdom + canvasスタブで実行する。
import { JSDOM } from 'jsdom';

const dom = new JSDOM(
  `<body>
    <div id="scene"></div><div id="markers"></div><div id="crosshair"></div>
    <aside id="panel"></aside><div id="info-card" class="card"></div>
    <div id="tour-card" class="card"></div><div id="hint"></div><div id="loader"></div>
  </body>`,
  { pretendToBeVisual: true },
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.innerWidth = 1280;
globalThis.innerHeight = 800;

function ctxStub() {
  const target = {
    measureText: (t) => ({ width: String(t).length * 10 }),
    canvas: {},
  };
  return new Proxy(target, {
    get(t, k) {
      if (k in t) return t[k];
      return () => undefined;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}
dom.window.HTMLCanvasElement.prototype.getContext = function () { return ctxStub(); };

const data = await import('../src/data.js');
const builders = await import('../src/three/builders.js');

// --- 3D グループ構築パスを実行
const site = builders.buildSite();
const school = builders.buildSchool();
const arenaS = builders.buildArena(data.ARENA_S, 'S');
const arenaN = builders.buildArena(data.ARENA_N, 'N');
const bridges = builders.buildBridges();

const count = (g) => { let n = 0; g.traverse((o) => { if (o.isMesh || o.isSprite) n++; }); return n; };
console.log('site objects:', count(site));
console.log('school objects:', count(school), 'floorGroups:', Object.keys(school.userData.floorGroups));
console.log('arenaS objects:', count(arenaS), 'arenaN objects:', count(arenaN), 'bridges:', count(bridges));
if (count(site) < 40 || count(school) < 100) throw new Error('object count too low');

// --- 階グループの表示切替ロジック(メインループと同じ処理)
const buildings = { school, arenaS, arenaN };
function setExplorer(bKey, floor) {
  for (const [k, g] of Object.entries(buildings)) {
    const fg = g.userData.floorGroups;
    const active = floor && k === bKey;
    g.userData.massing.visible = !active;
    for (const [f, grp] of Object.entries(fg)) grp.visible = !!active && f === floor;
  }
}
setExplorer('school', 'F3');
if (school.userData.massing.visible !== false) throw new Error('massing should hide');
if (!school.userData.floorGroups.F3.visible) throw new Error('F3 should show');
if (school.userData.floorGroups.F4.visible) throw new Error('F4 should stay hidden');
setExplorer(null, null);
if (!school.userData.massing.visible) throw new Error('massing should restore');
console.log('explorer toggle logic: OK');

// --- UI 構築パスを実行(全タブ)
const uiMod = await import('../src/ui.js');
const noop = () => {};
uiMod.buildUI({ setMode: noop, focusHotspot: noop, setExplorer: noop, autoRotate: noop, tourStep: noop });
const tabs = [...document.querySelectorAll('.tab')];
console.log('tabs:', tabs.map((t) => t.textContent).join(','));
for (const t of tabs) t.click(); // 各タブの描画パスを実行
const planCheck = () => {
  // 階タブで F2 を選択して SVG 平面図を生成
  document.querySelector('[data-tab="floors"]').click();
  const chips = [...document.querySelectorAll('.panel-body .chips')[1].querySelectorAll('.chip')];
  chips[2].click(); // F2
  const svg = document.querySelector('.plan');
  if (!svg) throw new Error('plan SVG missing');
  const rooms = svg.querySelectorAll('rect').length;
  console.log('plan SVG rects (F2 school):', rooms);
  if (rooms < 15) throw new Error('too few rooms in plan');
};
planCheck();

// info / tour カード
uiMod.ui.showInfo({ t: 'テスト', d: '説明', tags: ['a'] });
if (!document.querySelector('#info-card.on')) throw new Error('info card not shown');
uiMod.ui.showTour(data.TOUR[0], 0, data.TOUR.length);
if (!document.querySelector('#tour-card.on')) throw new Error('tour card not shown');
console.log('cards: OK');

console.log('SMOKE OK');
