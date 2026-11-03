// @ts-nocheck
import * as THREE from 'three';
import { W, H, BAY, FONT } from './config';

export function buildWorks(c, world) {
  const { scene, mk, loader, S, N, B, D } = c;
  const { std } = world;
  const dm = new THREE.Object3D();

  const slots = [];
  for (let b = 0; b < B; b++) {
    const z0 = b * BAY;
    if (b > 0) slots.push([4.3, z0 + 0.13, 0, 1, 1]);
    slots.push([W / 2, z0 + 4, -1, 0, 1]);
    if (b < B - 1) slots.push([4.3, z0 + BAY - 0.13, 0, -1, 1]);
  }
  slots.push([0, D, 0, -1, 1.5]);

  const wash = mk(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  });
  const shT = mk(128, 128, (g) => {
    g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 14; g.shadowOffsetX = 300; g.fillStyle = '#000'; g.fillRect(36 - 300, 36, 56, 56);
  });
  const frM = std(S.frame, { roughness: 0.45, metalness: 0.25 }), matM = std('#f3efe6');
  const glassArt = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.05, envMapIntensity: 2.2, depthWrite: false });
  const washMs = [];


  const works = S.obras.map((o, i) => {
    const [x, z, nx, nz, sc] = slots[i];
    const g = new THREE.Group();
    g.position.set(x + nx * 0.012, 1.55, z + nz * 0.012); g.rotation.y = Math.atan2(nx, nz); scene.add(g);
    const pln = (m, zz) => { const q = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); q.position.z = zz; g.add(q); return q; };
    const wm = new THREE.MeshBasicMaterial({ map: wash, color: 0xffe2b0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    washMs.push(wm);
    const wa = pln(wm, 0.004);
    const sd = pln(new THREE.MeshBasicMaterial({ map: shT, transparent: true, opacity: 0.45, depthWrite: false }), 0.002);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.06), frM); fr.position.z = 0.03; fr.castShadow = true; g.add(fr);
    const mt = pln(matM, 0.061);
    const bv = pln(std('#fffdf6', { roughness: 0.9 }), 0.0625);
    const am = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const art = pln(am, 0.064); art.userData.i = i;
    const gl = pln(glassArt, 0.07);
    const cart = pln(new THREE.MeshBasicMaterial({
      map: mk(204, 120, (c, w, h) => {
        c.fillStyle = '#f4f1ea'; c.fillRect(0, 0, w, h); c.fillStyle = '#26221d';
        c.font = `italic 17px ${FONT}`; c.fillText(o.title.slice(0, 22), 10, 34);
        c.font = '12px sans-serif'; c.fillText(o.meta.slice(0, 30), 10, 58);
      }),
    }), 0.01);
    const m = S.mat, f = S.fw;
    const fit = (r) => {
      const mw = 2 * sc, mh = 1.5 * sc, wide = r > mw / mh, w = wide ? mw : mh * r, h = wide ? mw / r : mh, a = w + 2 * m, b = h + 2 * m;
      art.scale.set(w, h, 1); bv.scale.set(w + 0.03, h + 0.03, 1); mt.scale.set(a, b, 1); gl.scale.set(a, b, 1); fr.scale.set(a + 2 * f, b + 2 * f, 1);
      sd.scale.set(a + 0.5, b + 0.5, 1); sd.position.y = -0.06; wa.scale.set(a * 1.8, b * 2, 1); wa.position.y = b * 0.18;
      cart.scale.set(0.3, 0.18, 1); cart.position.set(a / 2 + f + 0.22, -0.3, 0.01);
    };
    fit(1.33);
    const w = { ...o, p: g.position, n: new THREE.Vector3(nx, 0, nz), url: o.src, art, am, sc };
    loader.load(o.src, (t) => {
      t.colorSpace = THREE.SRGBColorSpace; am.map = t; am.needsUpdate = true; fit(t.image.width / t.image.height);
    }, undefined, () => {
      const dr = S.slug === 'dibujos';
      const t = mk(512, 384, (c) => {
        c.fillStyle = dr ? '#efe9db' : `hsl(${(i * 47) % 360} 45% 78%)`; c.fillRect(0, 0, 512, 384);
        for (let k = 0; k < (dr ? 50 : 7); k++) {
          c.beginPath(); c.strokeStyle = '#2b2822'; c.fillStyle = `hsl(${(i * 47 + k * 40) % 360} 55% 60%)`;
          const px = Math.random() * 512, py = Math.random() * 384, r = 30 + Math.random() * 90;
          if (dr) { c.moveTo(px, py); c.bezierCurveTo(px + r, py - r, px - r, py + r, px + r * 2, py + r); c.stroke(); }
          else { c.arc(px, py, r, 0, 7); c.fill(); }
        }
      });
      am.map = t; am.needsUpdate = true; fit(4 / 3); w.url = t.image.toDataURL();
    });
    return w;
  });

  const fixM = new THREE.MeshBasicMaterial({ color: 0x888888, toneMapped: false });
  const heads = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.08, 0.26, 10).rotateX(Math.PI / 2), fixM, N);
  works.forEach((w, i) => {
    dm.position.set(w.p.x + w.n.x * 1.5, H - 0.22, w.p.z + w.n.z * 1.5); dm.scale.set(1, 1, 1);
    dm.lookAt(w.p); dm.updateMatrix(); heads.setMatrixAt(i, dm.matrix);
  });
  scene.add(heads);

  return { works, washMs, fixM };
}