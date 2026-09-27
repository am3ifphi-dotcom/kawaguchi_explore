import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { buildSite, buildSchool, buildArena, buildBridges } from './three/builders.js';
import { HOTSPOTS, TOUR, SITE, ARENA_S, ARENA_N } from './data.js';
import { buildUI, ui, BUILDINGS } from './ui.js';

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.getElementById('scene').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdceaf4);
scene.fog = new THREE.Fog(0xdceaf4, 300, 720);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.5, 1500);
camera.position.set(170, 95, -170);

scene.add(new THREE.HemisphereLight(0xeaf4ff, 0xaebfa0, 1.15));
const sun = new THREE.DirectionalLight(0xfff1da, 1.9);
sun.position.set(140, 200, 90);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xcfe0ff, 0.5);
fill.position.set(-120, 80, -140);
scene.add(fill);

// ---------------------------------------------------------------- world
const site = buildSite();
const school = buildSchool();
const arenaS = buildArena(ARENA_S, 'S');
const arenaN = buildArena(ARENA_N, 'N');
scene.add(site, school, arenaS, arenaN, buildBridges());

const buildings = { school, arenaS, arenaN };

// ---------------------------------------------------------------- controls
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
orbit.maxPolarAngle = 1.52;
orbit.minDistance = 6;
orbit.maxDistance = 460;
orbit.target.set(10, 4, -20);
orbit.autoRotateSpeed = 0.7;

const walk = new PointerLockControls(camera, renderer.domElement);
const keys = {};
addEventListener('keydown', (e) => { keys[e.code] = true; });
addEventListener('keyup', (e) => { keys[e.code] = false; });

// ---------------------------------------------------------------- state
const state = {
  mode: 'orbit',
  explorer: { b: null, f: null },
  tween: null,
  tour: { i: 0, anim: null, holdUntil: 0 },
};

function flyTo(pos, target, dur = 1.6, then) {
  state.tween = {
    p0: camera.position.clone(), t0: orbit.target.clone(),
    p1: new THREE.Vector3(...pos), t1: new THREE.Vector3(...target),
    start: performance.now(), dur: dur * 1000, then,
  };
}

function setMode(m) {
  state.mode = m;
  ui.setModeUI(m);
  ui.hideTour();
  if (m === 'orbit') {
    if (walk.isLocked) walk.unlock();
    orbit.enabled = true;
  } else if (m === 'walk') {
    orbit.enabled = false;
    camera.position.set(camera.position.x, 1.7, camera.position.z);
  } else if (m === 'tour') {
    orbit.enabled = false;
    if (walk.isLocked) walk.unlock();
    tourGo(0);
  }
}

function tourGo(i) {
  state.tour.i = (i + TOUR.length) % TOUR.length;
  const wp = TOUR[state.tour.i];
  ui.showTour(wp, state.tour.i, TOUR.length);
  flyTo(wp.p, wp.t, 2.6, () => { state.tour.holdUntil = performance.now() + 6500; });
}
function tourStep(d) { tourGo(state.tour.i + d); }

function setExplorer(bKey, floor) {
  state.explorer = { b: bKey, f: floor };
  for (const [k, g] of Object.entries(buildings)) {
    const fg = g.userData.floorGroups;
    const active = floor && k === bKey;
    g.userData.massing.visible = !active;
    for (const [f, grp] of Object.entries(fg)) grp.visible = active && f === floor;
  }
  if (floor) {
    const def = BUILDINGS[bKey].def;
    const [e, s] = def.center;
    flyTo([e + def.size.x * 0.55, 60, s + def.size.y * 1.4], [e, 1, s], 1.4);
  }
}

function focusHotspot(id) {
  const h = HOTSPOTS.find((x) => x.id === id);
  if (!h) return;
  if (state.mode === 'walk') setMode('orbit');
  if (state.mode === 'tour') { orbit.enabled = false; }
  setModeKeepOrbit();
  flyTo(h.cam, [h.p[0], 3, h.p[1]], 1.7);
  ui.showInfo(h);
  function setModeKeepOrbit() { if (state.mode !== 'orbit') { state.mode = 'orbit'; ui.setModeUI('orbit'); ui.hideTour(); } orbit.enabled = true; }
}

// ---------------------------------------------------------------- markers
const markerWrap = document.getElementById('markers');
const markers = HOTSPOTS.map((h) => {
  const m = document.createElement('button');
  m.className = 'marker';
  m.innerHTML = `<i></i><span>${h.t.split('/')[0].split('(')[0]}</span>`;
  m.onclick = (e) => { e.stopPropagation(); focusHotspot(h.id); };
  markerWrap.appendChild(m);
  return { h, m };
});

// ---------------------------------------------------------------- picking
const ray = new THREE.Raycaster();
const pickables = [];
scene.traverse((o) => { if (o.isMesh && o.userData.pick) pickables.push(o); });

let downAt = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
  downAt = null;
  if (moved > 6) return;
  if (state.mode === 'walk') { if (!walk.isLocked) walk.lock(); return; }
  if (state.mode === 'tour') return;
  ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
  const hits = ray.intersectObjects(pickables, false);
  if (hits.length) {
    const p = hits[0].object.userData.pick;
    ui.showInfo({ t: p.t, d: p.d || '', tags: p.floor ? [`${p.floor}階`] : p.room ? ['部屋'] : null });
  }
});

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
const ease = (t) => t * t * (3 - 2 * t);

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();

  if (state.tween) {
    const tw = state.tween;
    const k = Math.min(1, (now - tw.start) / tw.dur);
    const e = ease(k);
    camera.position.lerpVectors(tw.p0, tw.p1, e);
    orbit.target.lerpVectors(tw.t0, tw.t1, e);
    if (k >= 1) { const then = tw.then; state.tween = null; then && then(); }
  }

  if (state.mode === 'walk' && walk.isLocked) {
    const sp = (keys.ShiftLeft ? 22 : 11) * dt;
    const dir = new THREE.Vector3();
    if (keys.KeyW || keys.ArrowUp) dir.z -= 1;
    if (keys.KeyS || keys.ArrowDown) dir.z += 1;
    if (keys.KeyA || keys.ArrowLeft) dir.x -= 1;
    if (keys.KeyD || keys.ArrowRight) dir.x += 1;
    if (dir.lengthSq()) {
      dir.normalize();
      walk.moveRight(dir.x * sp);
      walk.moveForward(-dir.z * sp);
    }
    camera.position.y = 1.7;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, SITE.bounds.x[0], SITE.bounds.x[1]);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, SITE.bounds.z[0], SITE.bounds.z[1]);
  }

  if (state.tween || state.mode === 'tour') camera.lookAt(orbit.target);
  if (state.mode === 'tour' && !state.tween && now > state.tour.holdUntil) tourGo(state.tour.i + 1);
  if (state.mode === 'orbit') orbit.update();

  // markers
  const showMarkers = state.mode !== 'walk';
  const v = new THREE.Vector3();
  for (const { h, m } of markers) {
    if (!showMarkers) { m.style.display = 'none'; continue; }
    v.set(h.p[0], 5.5, h.p[1]).project(camera);
    if (v.z > 1 || v.z < -1) { m.style.display = 'none'; continue; }
    const x = (v.x * 0.5 + 0.5) * innerWidth;
    const y = (-v.y * 0.5 + 0.5) * innerHeight;
    m.style.display = 'block';
    m.style.transform = `translate(${x}px, ${y}px)`;
    const dist = camera.position.distanceTo(new THREE.Vector3(h.p[0], 5.5, h.p[1]));
    m.style.opacity = dist > 420 ? 0.25 : 1;
  }

  renderer.render(scene, camera);
}

// ---------------------------------------------------------------- boot
buildUI({ setMode, focusHotspot, setExplorer, autoRotate: (v) => { orbit.autoRotate = v; }, tourStep });
setMode('orbit');
flyTo([150, 78, -150], [10, 2, -18], 2.4);
tick();
document.getElementById('loader').classList.add('done');
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
