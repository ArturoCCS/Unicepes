// @ts-nocheck — módulo
import * as THREE from 'three';

export function createLighting(c, world, ext, art) {
  const { scene, ren, D } = c;
  const { hemi, sun, winL, skyL, panelM, coveM, groundM } = world;
  const { skyU, stars, titleM, treeM, shrubM } = ext;
  const { works, washMs, fixM } = art;

  const C = (h) => new THREE.Color(h);
  const mkEnv = (day) => {
    const e = new THREE.Scene();
    const em = (c, i, side = THREE.DoubleSide) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side });
    const at = (g, m, x, y, z, ry = 0, rx = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.rotation.set(rx, ry, 0); e.add(o); };
    at(new THREE.BoxGeometry(30, 14, 60), em(day ? '#c4c6c8' : '#0a0d15', 1, THREE.BackSide), 0, 0, 0);
    at(new THREE.PlaneGeometry(50, 9), em(day ? '#bfdcff' : '#12234d', day ? 4 : 0.5), -14.8, 1, 0, Math.PI / 2);
    at(new THREE.PlaneGeometry(5, 46), em('#fff0d8', day ? 2.5 : 0.35), -1.7, 6.9, 0, 0, Math.PI / 2);
    return e;
  };
  const pmrem = new THREE.PMREMGenerator(ren), envDay = pmrem.fromScene(mkEnv(true), 0.03).texture, envNight = pmrem.fromScene(mkEnv(false), 0.03).texture;
  const DAY = { win: 1.7, wc: C('#fff2e0'), sk: 1.1, sc: C('#fff8ef'), hemi: 1.0, env: 0.5, sun: 2.3, wash: 0.05, art: 1, exp: 0.8, cl: C('#ffffff'), top: C('#79addf'), bot: C('#dfeaf0'), sunC: C('#ffe9cc'), hs: C('#cfe2ff'), hg: C('#d8ccb6'), pan: C('#eef4fb'), fix: C('#8d887c'), gr: C('#dfe9d2'), tt: C('#2b261f') };
  const NIGHT = { win: 0.25, wc: C('#7189cc'), sk: 1.4, sc: C('#ffdcae'), hemi: 0.35, env: 0.8, sun: 1.6, wash: 0.85, art: 0.86, exp: 1.1, pt: 32, cl: C('#2a3858'), top: C('#03050e'), bot: C('#15203a'), sunC: C('#9fb4ff'), hs: C('#1d2c55'), hg: C('#08080c'), pan: C('#6b5a42'), fix: C('#ffefc4'), gr: C('#1b2619'), tt: C('#e9e0cc') };
  const dp = new THREE.Vector3(-30, 16, D / 2 - 12), np = new THREE.Vector3(-20, 24, D / 2 - 6);
  let k = 0, tk = 0;
  const mix = (a, b) => a + (b - a) * k, col = (t, a, b) => t.copy(a).lerp(b, k);
  function light() {
    hemi.intensity = mix(DAY.hemi, NIGHT.hemi); col(hemi.color, DAY.hs, NIGHT.hs); col(hemi.groundColor, DAY.hg, NIGHT.hg);
    scene.environment = k < 0.5 ? envDay : envNight; scene.environmentIntensity = mix(DAY.env, NIGHT.env) * Math.max(0.2, Math.abs(1 - 2 * k));
    sun.intensity = mix(DAY.sun, NIGHT.sun); col(sun.color, DAY.sunC, NIGHT.sunC); sun.position.lerpVectors(dp, np, k);
    winL.forEach((l) => { l.intensity = mix(DAY.win, NIGHT.win); col(l.color, DAY.wc, NIGHT.wc); });
    skyL.forEach((l) => { l.intensity = mix(DAY.sk, NIGHT.sk); col(l.color, DAY.sc, NIGHT.sc); });
    washMs.forEach((m) => (m.opacity = mix(DAY.wash, NIGHT.wash)));
    works.forEach((w) => w.am.color.setScalar(mix(DAY.art, NIGHT.art)));
    col(skyU.top.value, DAY.top, NIGHT.top); col(skyU.bot.value, DAY.bot, NIGHT.bot); col(scene.fog.color, DAY.bot, NIGHT.bot);
    col(panelM.color, DAY.pan, NIGHT.pan); col(fixM.color, DAY.fix, NIGHT.fix); col(groundM.color, DAY.gr, NIGHT.gr); col(titleM.color, DAY.tt, NIGHT.tt);
    stars.material.opacity = k; ren.toneMappingExposure = mix(DAY.exp, NIGHT.exp); coveM.color.setScalar(mix(0.6, 1.2));
    col(skyU.cloud.value, DAY.cl, NIGHT.cl); treeM.color.setScalar(mix(1.7, 0.55)); shrubM.color.setScalar(mix(1.25, 0.45));
    ren.shadowMap.needsUpdate = true;
  }

  const isDark = () => {
    const e = document.documentElement;
    return e.classList.contains('dark') || e.dataset.theme === 'dark' ||
      (!e.classList.contains('light') && !e.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  };
  const sync = () => (tk = isDark() ? 1 : 0);
  sync(); k = tk; light();
  const mo = new MutationObserver(sync); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] }); c.sig.addEventListener('abort', () => mo.disconnect());
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', sync, { signal: c.sig });
  const toggle = () => {
    const d = !isDark(), e = document.documentElement;
    e.classList.toggle('dark', d); e.dataset.theme = d ? 'dark' : 'light';
    try { localStorage.setItem('theme', d ? 'dark' : 'light'); } catch {}
  };
  const update = (dt) => { if (k === tk) return false; k += Math.sign(tk - k) * Math.min(Math.abs(tk - k), dt * 1.2); light(); return true; };
  return { update, toggle };
}