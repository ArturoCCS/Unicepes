// @ts-nocheck
import * as THREE from 'three';
import { BAY, pickQuality, isTouch } from './config';
import { createCore, type Ctx } from './core';
import { buildWorld } from './world';
import { buildExterior } from './exterior';
import { buildWorks } from './works';
import { createLighting } from './lighting';
import { createControls } from './controls';
import { createUI } from './ui';

export function createGallery(root: HTMLElement) {
  const S = JSON.parse(root.dataset.sala!), N: number = S.obras.length;
  let B = 1; while (3 * B - 1 < N) B++;
  const ac = new AbortController(), touch = isTouch(), Q = pickQuality();
  root.dataset.q = Q.tier;

  const core = createCore(root, Q, touch, ac.signal);
  const c: Ctx = { ...core, S, Q, B, N, D: B * BAY, touch, sig: ac.signal };
  const world = buildWorld(c), ext = buildExterior(c, world), art = buildWorks(c, world);
  const lighting = createLighting(c, world, ext, art);
  const hooks = { locked: () => false, open: (_i: number) => {} };
  const controls = createControls(c, world, art.works, hooks);
  const ui = createUI(c, art.works, controls, lighting);
  hooks.locked = ui.locked; hooks.open = ui.open;

  const { ren, scene, cam, st } = core;
  core.cv.addEventListener('webglcontextlost', (e) => e.preventDefault(), { signal: ac.signal });
  core.cv.addEventListener('webglcontextrestored', () => (st.dirty = true), { signal: ac.signal });

  const clk = new THREE.Clock();
  let raf = 0, idle = 0, acc = 0, frames = 0, warm = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (document.hidden) { clk.getDelta(); return; }
    const dt = Math.min(clk.getDelta(), 0.05);
    ext.skyU.time.value += dt;
    const moved = controls.update(dt), lit = lighting.update(dt);
    ui.update(moved);
    idle += dt;
    if (!(st.dirty || moved || lit || idle > (Q.tier === 'high' ? 0.05 : 0.25))) return;
    idle = 0; st.dirty = false;
    ren.render(scene, cam);
    if ((moved || lit) && ++warm > 90) {
      acc += dt; frames++;
      if (frames >= 45) {
        const avg = acc / frames; acc = frames = 0;
        if (avg > 0.026 && st.dpr > 0.8) core.setDpr(Math.max(0.8, st.dpr - 0.15));
        else if (avg < 0.0185 && st.dpr < st.maxDpr) core.setDpr(Math.min(st.maxDpr, st.dpr + 0.1));
      }
    }
  };
  tick();

  const destroy = () => {
    cancelAnimationFrame(raf); ac.abort();
    scene.traverse((o: any) => {
      o.geometry?.dispose();
      (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m: any) => {
        Object.values(m).forEach((v: any) => v?.isTexture && v.dispose()); m.dispose();
      });
    });
    ren.dispose(); ren.forceContextLoss();
  };
  document.addEventListener('astro:before-swap', destroy, { once: true });
  addEventListener('pagehide', (e) => { if (!e.persisted) destroy(); }, { once: true });
  return { destroy };
}