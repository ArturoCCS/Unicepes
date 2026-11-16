// @ts-nocheck
import * as THREE from 'three';
import { W, EYE } from './config';
import type { Ctx } from './core';

type Hooks = { locked: () => boolean; open: (i: number) => void };
type Fly = { to: THREE.Vector3; yaw: number | null };
type Ptr = { x0: number; y0: number; x: number; y: number; t0: number; move: boolean; moved: boolean };

export function createControls(c: Ctx, world: any, works: any[], hooks: Hooks) {
  const { cam, cv, root, sig, D } = c, P = cam.position;
  const keys: Record<string, number> = {}, ptrs = new Map<number, Ptr>(), sv = { x: 0, y: 0 };
  const stick = root.querySelector('#stick') as HTMLElement, knob = stick.firstElementChild as HTMLElement;
  const ray = new THREE.Raycaster(), v2 = new THREE.Vector2(), clamp = THREE.MathUtils.clamp;
  const obstacles: number[][] = world.OB;
  let enabled = false, yaw = Math.PI, pitch = 0, tyaw = yaw, tpitch = 0, fly: Fly | null = null;
  const angle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  const setKnob = (x: number, y: number) => { knob.style.setProperty('--x', x + 'px'); knob.style.setProperty('--y', y + 'px'); };
  const showStick = (p: Ptr) => {
    const r = root.getBoundingClientRect();
    stick.style.transform = `translate(${p.x0 - r.left - 58}px, ${p.y0 - r.top - 58}px)`; setKnob(0, 0); stick.classList.add('on');
  };
  cam.rotation.set(pitch, yaw, 0);

  const walkTo = (i: number) => {
    const w = works[i], d = 2.9 + (w.sc - 1) * 2.4;
    fly = { to: new THREE.Vector3(w.p.x + w.n.x * d, EYE, w.p.z + w.n.z * d), yaw: Math.atan2(w.n.x, w.n.z) };
  };
  const go = (i: number) => (P.distanceTo(works[i].p) < 3.6 + (works[i].sc - 1) * 2.4 ? hooks.open(i) : walkTo(i));
  function pick(e: PointerEvent) {
    const r = cv.getBoundingClientRect();
    v2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v2, cam);
    const h = ray.intersectObjects([...works.map((w) => w.art), world.floor])[0];
    if (!h) return;
    if (h.object === world.floor) fly = { to: new THREE.Vector3(h.point.x, EYE, h.point.z), yaw: null };
    else go(h.object.userData.i);
  }

  cv.addEventListener('pointerdown', (e) => {
    if (!enabled || hooks.locked()) return;
    cv.setPointerCapture(e.pointerId);
    const r = cv.getBoundingClientRect();
    const move = e.pointerType === 'touch' && e.clientX - r.left < r.width * 0.45 && ![...ptrs.values()].some((p) => p.move);
    ptrs.set(e.pointerId, { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), move, moved: false });
  }, { signal: sig });
  cv.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (!p.moved && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) > (e.pointerType === 'mouse' ? 3 : 8)) { p.moved = true; if (p.move) showStick(p); }
    if (!p.moved) return;
    if (p.move) {
      const R = 46; let x = p.x - p.x0, y = p.y - p.y0; const m = Math.hypot(x, y);
      if (m > R) { x *= R / m; y *= R / m; }
      sv.x = x / R; sv.y = y / R; setKnob(x, y);
    } else {
      const g = e.pointerType === 'mouse' ? 0.004 : 0.0055;
      tyaw -= dx * g; tpitch = clamp(tpitch - dy * g * 0.75, -0.7, 0.7); fly = null;
    }
  }, { signal: sig });
  const end = (e: PointerEvent) => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    ptrs.delete(e.pointerId);
    if (p.move) { sv.x = sv.y = 0; stick.classList.remove('on'); setKnob(0, 0); }
    if (e.type === 'pointerup' && !p.moved && performance.now() - p.t0 < 350) pick(e);
  };
  cv.addEventListener('pointerup', end, { signal: sig }); cv.addEventListener('pointercancel', end, { signal: sig });
  cv.addEventListener('contextmenu', (e) => e.preventDefault(), { signal: sig });
  cv.addEventListener('wheel', (e) => {
    if (!enabled || hooks.locked()) return;
    e.preventDefault(); fly = null; const s = -e.deltaY * 0.004; P.x += -Math.sin(yaw) * s; P.z += -Math.cos(yaw) * s;
  }, { passive: false, signal: sig });

  const KM: Record<string, string> = { w: 'f', arrowup: 'f', s: 'b', arrowdown: 'b', a: 'sl', d: 'sr', arrowleft: 'tl', arrowright: 'tr' };
  const releaseKeys = () => Object.keys(keys).forEach((k) => (keys[k] = 0));
  addEventListener('keydown', (e) => { keys.run = e.shiftKey ? 1 : 0; const q = KM[e.key.toLowerCase()]; if (q && enabled && !hooks.locked()) keys[q] = 1; }, { signal: sig });
  addEventListener('keyup', (e) => { keys.run = e.shiftKey ? 1 : 0; const q = KM[e.key.toLowerCase()]; if (q) keys[q] = 0; }, { signal: sig });
  addEventListener('blur', releaseKeys, { signal: sig });

  function update(dt: number) {
    if (!enabled || hooks.locked()) return false;
    const px = P.x, pz = P.z, py = yaw, pp = pitch;
    tyaw += ((keys.tl || 0) - (keys.tr || 0)) * 1.8 * dt;
    const mz = (keys.f || 0) - (keys.b || 0) - sv.y, mx = (keys.sr || 0) - (keys.sl || 0) + sv.x;
    if (mz || mx) {
      fly = null;
      const s = (((keys.run || Math.hypot(sv.x, sv.y) > 0.92) ? 5.2 : 3.2) * dt) / Math.max(1, Math.hypot(mz, mx));
      P.x += (-Math.sin(yaw) * mz + Math.cos(yaw) * mx) * s; P.z += (-Math.cos(yaw) * mz - Math.sin(yaw) * mx) * s;
    }
    if (fly) {
      P.lerp(fly.to, 1 - Math.pow(0.003, dt));
      if (fly.yaw != null) { tyaw = yaw + angle(fly.yaw - yaw); tpitch = 0; }
      if (P.distanceTo(fly.to) < 0.05 && Math.abs(angle(tyaw - yaw)) < 0.02) fly = null;
    }
    const k = 1 - Math.exp(-(fly ? 6 : 16) * dt);
    yaw += (tyaw - yaw) * k; pitch += (tpitch - pitch) * k;
    const m = 0.45;
    P.x = clamp(P.x, -W / 2 + 0.6, W / 2 - 0.6); P.z = clamp(P.z, 0.6, D - 0.6); P.y = EYE;
    for (const o of obstacles) {
      if (P.x > o[0] - m && P.x < o[1] + m && P.z > o[2] - m && P.z < o[3] + m) {
        const a = [P.x - (o[0] - m), o[1] + m - P.x, P.z - (o[2] - m), o[3] + m - P.z], mn = Math.min(...a);
        if (mn === a[0]) P.x = o[0] - m; else if (mn === a[1]) P.x = o[1] + m; else if (mn === a[2]) P.z = o[2] - m; else P.z = o[3] + m;
      }
    }
    cam.rotation.set(pitch, yaw, 0);
    return Math.abs(P.x - px) + Math.abs(P.z - pz) + Math.abs(yaw - py) + Math.abs(pitch - pp) > 1e-5;
  }

  return {
    update, walkTo, releaseKeys, P,
    get yaw() { return yaw; },
    set enabled(v: boolean) { enabled = v; },
  };
}