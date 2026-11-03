// @ts-nocheck
import * as THREE from 'three';
import { W, RX, BAY } from './config';
import type { Ctx } from './core';

export function createUI(c: Ctx, works: any[], controls: any, lighting: { toggle(): void }) {
  const { root, N, B, D, touch, mgr, sig, st } = c;
  const $ = (id: string) => root.querySelector('#' + id) as HTMLElement;
  let started = false, cur = -1, last = 0, lbOn = false, lbI = 0;

  const gob = $('gob') as HTMLButtonElement;
  $('how').innerHTML = (touch
    ? ['Toca y arrastra a la izquierda para caminar', 'Arrastra a la derecha para mirar', 'Toca un cuadro para acercarte, o el piso para ir allí']
    : ['Arrastra para mirar a tu alrededor', 'Camina con W A S D (Shift para correr)', 'Clic en un cuadro para acercarte, o en el piso para ir allí']
  ).map((t) => `<li>${t}</li>`).join('');
  mgr.onProgress = (_u, l, t) => { gob.textContent = `Preparando la sala… ${Math.round((l / t) * 100)}%`; };
  const ready = () => {
    if (!gob.disabled) return;
    gob.disabled = false; gob.textContent = 'Entrar a la sala'; st.dirty = true;
    $('dl').innerHTML = works.map((w, i) => `<button data-i="${i}"><img src="${w.url}" alt="" loading="lazy" decoding="async"><span><b>${w.title}</b><small>${w.meta}</small></span></button>`).join('');
  };
  mgr.onLoad = ready;
  const to = setTimeout(ready, 8000); sig.addEventListener('abort', () => clearTimeout(to));
  gob.onclick = () => { started = true; controls.enabled = true; $('intro').classList.add('off'); st.dirty = true; };

  const drawer = $('drawer'), scrim = $('scrim'), bo = $('bo');
  const setDrawer = (on: boolean) => { drawer.classList.toggle('on', on); scrim.classList.toggle('on', on); bo.setAttribute('aria-expanded', String(on)); };
  bo.onclick = () => setDrawer(!drawer.classList.contains('on')); $('dx').onclick = () => setDrawer(false); scrim.onclick = () => setDrawer(false);
  $('dl').onclick = (e) => { const b = (e.target as HTMLElement).closest('button'); if (b) { controls.walkTo(+b.dataset.i!); setDrawer(false); } };
  $('tm').onclick = () => lighting.toggle();
  if (root.requestFullscreen) $('bf').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen());
  else $('bf').remove();

  const lb = $('lb'), lbi = $('lbi') as HTMLImageElement, z = { s: 1, x: 0, y: 0 }, pts = new Map<number, { x: number; y: number }>();
  let pd = 1, ps = 1, tapT = 0, tapX = 0, tapY = 0, sx0 = 0, sy0 = 0;
  const paint = () => {
    z.s = Math.min(5, Math.max(1, z.s));
    const mx = ((z.s - 1) * lbi.offsetWidth) / 2, my = ((z.s - 1) * lbi.offsetHeight) / 2;
    z.x = Math.min(mx, Math.max(-mx, z.x)); z.y = Math.min(my, Math.max(-my, z.y));
    lbi.style.transform = `translate(${z.x}px, ${z.y}px) scale(${z.s})`; lbi.classList.toggle('zoom', z.s > 1.01);
  };
  const showLb = (i: number) => {
    lbI = (i + N) % N; const w = works[lbI];
    lbi.src = w.url; z.s = 1; z.x = z.y = 0; paint(); $('lbc').textContent = `${w.title}. ${w.meta}`;
  };
  const openLb = (i: number) => { lbOn = true; controls.releaseKeys(); showLb(i); lb.classList.add('on'); };
  const closeLb = () => { lbOn = false; lb.classList.remove('on'); st.dirty = true; };
  const zoomAt = (x: number, y: number) => {
    if (z.s > 1.01) { z.s = 1; z.x = z.y = 0; }
    else { const r = lbi.getBoundingClientRect(); z.s = 2.6; z.x = -(x - (r.left + r.width / 2)) * 1.6; z.y = -(y - (r.top + r.height / 2)) * 1.6; }
    lbi.classList.add('snap'); setTimeout(() => lbi.classList.remove('snap'), 240); paint();
  };
  $('lbx').onclick = closeLb; $('lbp').onclick = () => showLb(lbI - 1); $('lbn').onclick = () => showLb(lbI + 1);
  lbi.addEventListener('pointerdown', (e) => {
    lbi.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); sx0 = e.clientX; sy0 = e.clientY;
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pd = Math.hypot(a.x - b.x, a.y - b.y) || 1; ps = z.s; }
  }, { signal: sig });
  lbi.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 2) { const [a, b] = [...pts.values()]; z.s = (ps * Math.hypot(a.x - b.x, a.y - b.y)) / pd; z.x += dx / 2; z.y += dy / 2; paint(); }
    else if (z.s > 1.01) { z.x += dx; z.y += dy; paint(); }
  }, { signal: sig });
  const up = (e: PointerEvent) => {
    if (!pts.delete(e.pointerId)) return;
    const dx = e.clientX - sx0, dy = e.clientY - sy0, t = performance.now();
    if (pts.size) return;
    if (z.s <= 1.01 && Math.abs(dx) > 60 && Math.abs(dy) < 60) return showLb(lbI + (dx < 0 ? 1 : -1));
    if (Math.hypot(dx, dy) < 10) {
      if (t - tapT < 320 && Math.hypot(e.clientX - tapX, e.clientY - tapY) < 24) { tapT = 0; zoomAt(e.clientX, e.clientY); }
      else { tapT = t; tapX = e.clientX; tapY = e.clientY; }
    }
  };
  lbi.addEventListener('pointerup', up, { signal: sig }); lbi.addEventListener('pointercancel', up, { signal: sig });
  lbi.addEventListener('wheel', (e) => { e.preventDefault(); z.s *= Math.exp(-e.deltaY * 0.002); paint(); }, { passive: false, signal: sig });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeLb(); setDrawer(false); }
    else if (lbOn && e.key === 'ArrowLeft') showLb(lbI - 1);
    else if (lbOn && e.key === 'ArrowRight') showLb(lbI + 1);
  }, { signal: sig });

  const card = $('card'), F = new THREE.Vector3(), dir = new THREE.Vector3();
  $('pv').onclick = () => openLb(last); $('pp').onclick = () => controls.walkTo((last - 1 + N) % N); $('pn').onclick = () => controls.walkTo((last + 1) % N);
  function near() {
    let b = -1, bs = 0.82;
    F.set(-Math.sin(controls.yaw), 0, -Math.cos(controls.yaw));
    works.forEach((w, i) => {
      dir.subVectors(w.p, controls.P); dir.y = 0;
      if (dir.length() > 6.5) return;
      dir.normalize(); const s = F.dot(dir);
      if (s > bs && w.n.dot(F) < -0.3) { bs = s; b = i; }
    });
    if (b === cur) return;
    cur = b;
    if (b < 0) return card.classList.remove('on');
    last = b;
    $('cn').textContent = `${String(b + 1).padStart(2, '0')} de ${N}`; $('pt').textContent = works[b].title; $('pm').textContent = works[b].meta;
    card.classList.add('on');
  }

  const mapEl = $('map') as HTMLCanvasElement, mc = mapEl.getContext('2d')!, MS = 7;
  mapEl.width = W * MS + 16; mapEl.height = D * MS + 16;
  function drawMap() {
    const g = mc, X = (x: number) => (x + W / 2) * MS + 8, Z = (z: number) => z * MS + 8;
    g.clearRect(0, 0, mapEl.width, mapEl.height);
    g.lineWidth = 1.5; g.strokeStyle = '#8a8a8a'; g.strokeRect(X(-W / 2), Z(0), W * MS, D * MS);
    g.lineWidth = 4; g.strokeStyle = '#6fa8dc'; g.beginPath(); g.moveTo(X(-W / 2), Z(0)); g.lineTo(X(-W / 2), Z(D)); g.stroke();
    g.lineWidth = 3; g.strokeStyle = '#9a9a9a';
    for (let b = 1; b < B; b++) { g.beginPath(); g.moveTo(X(RX), Z(b * BAY)); g.lineTo(X(W / 2), Z(b * BAY)); g.stroke(); }
    works.forEach((w, i) => { g.fillStyle = i === cur ? '#e8a33d' : '#c9c4b8'; g.beginPath(); g.arc(X(w.p.x), Z(w.p.z), i === cur ? 4 : 3, 0, 7); g.fill(); });
    g.save(); g.translate(X(controls.P.x), Z(controls.P.z)); g.rotate(-controls.yaw); g.fillStyle = '#e8a33d';
    g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(-5, 6); g.fill(); g.restore();
  }
  $('bm').onclick = () => { mapEl.classList.toggle('on'); drawMap(); };

  return {
    open: openLb, locked: () => lbOn,
    update(moved: boolean) {
      if (!started || lbOn) return;
      near();
      if (moved && mapEl.classList.contains('on')) drawMap();
    },
  };
}