// @ts-nocheck
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { W, H, BAY, RX, rnd } from './config';

export function buildWorld(c) {
  const { scene, ren, mk, loader, S, Q, B, D } = c;

  const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 0);
  const sun = new THREE.DirectionalLight(0xffffff, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(Q.shadow, Q.shadow);
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 130 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05; sun.shadow.radius = 6;
  sun.target.position.set(0, 0, D / 2);
  scene.add(hemi, sun, sun.target);

  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, ...o });
  const add = (g, m, x, y, z, cast = true) => {
    const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; scene.add(o); return o;
  };
  const buckets = new Map();
  const box = (w, h, d, m, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d).translate(x, y, z); if (!buckets.has(m)) buckets.set(m, []); buckets.get(m).push(g); };
  const wallM = std(S.wall), dark = std('#23211f'), oak = std('#c9a56e', { roughness: 0.55 });
  const alu = std('#cfcfca', { metalness: 0.3, roughness: 0.4 });
  const grain = mk(128, 128, (g, w, h) => {
    g.fillStyle = '#c9a56e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(110,75,35,${0.05 + Math.random() * 0.12})`; g.fillRect(Math.random() * w, 0, 1 + Math.random() * 2, h); }
  });
  oak.map = grain; oak.color.set('#ffffff');
  const noise = mk(256, 256, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) { const v = (Math.random() * 255) | 0; g.fillStyle = `rgba(${v},${v},${v},.45)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
  const nzT = (rx, ry) => { const t = noise.clone(); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.needsUpdate = true; return t; };
  wallM.bumpMap = nzT(8, 2); wallM.bumpScale = 0.3;
  const grassT = mk(256, 256, (g, w, h) => {
    g.fillStyle = '#7d9a68'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `hsl(${85 + Math.random() * 25} ${30 + Math.random() * 20}% ${28 + Math.random() * 22}%)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 5); }
  });
  grassT.wrapS = grassT.wrapT = THREE.RepeatWrapping; grassT.repeat.set(160, 160);
  const groundM = std('#ffffff', { map: grassT, roughness: 1 });

  const wood = true, tile = 3.2;
  const ft = mk(512, 512, (g, w, h) => {
    if (wood) {
      g.fillStyle = '#4a3826'; g.fillRect(0, 0, w, h);
      for (let cy = 0; cy < 8; cy++) for (let cx = 0; cx < 8; cx++) {
        const hz = (cx + cy) % 2;
        for (let i = 0; i < 4; i++) {
          g.fillStyle = `hsl(${S.floorHue + Math.random() * 6} 40% ${36 + Math.random() * 18}%)`;
          if (hz) g.fillRect(cx * 64, cy * 64 + i * 16, 63, 15); else g.fillRect(cx * 64 + i * 16, cy * 64, 15, 63);
        }
      }
    } else {
      g.fillStyle = '#bcb8b0'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '70,64,58'},${Math.random() * 0.06})`;
        g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 5 + Math.random() * 40, 0, 7); g.fill();
      }
      g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
    }
  });
  ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(W / tile, D / tile);
  const floorM = new THREE.MeshPhysicalMaterial({ map: ft, roughness: 0.5, roughnessMap: nzT(W / 3, D / 3), bumpMap: nzT(W / 3, D / 3), bumpScale: 0.12, clearcoat: 0.4, clearcoatRoughness: 0.25 });
  const floor = add(new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2), floorM, 0, 0, D / 2, false);
  add(new THREE.PlaneGeometry(700, 700).rotateX(-Math.PI / 2), groundM, 0, -0.05, D / 2, false);

  box(0.3, H, D, wallM, W / 2 + 0.15, H / 2, D / 2);
  box(W + 0.6, H, 0.3, wallM, 0, H / 2, -0.15);
  box(W + 0.6, H, 0.3, wallM, 0, H / 2, D + 0.15);
  box(W + 0.6, 0.3, D + 0.6, wallM, 0, H + 0.15, D / 2);
  
  for (let z = 0; z <= D; z += 4) box(0.5, H, 0.5, wallM, -6.25, H / 2, z);
  box(0.5, 0.5, D, wallM, -6.25, H - 0.25, D / 2);
  for (let z = 1; z < D; z++) if (z % 4) box(0.05, H - 0.5, 0.1, alu, -6.1, (H - 0.5) / 2, z);
  box(0.1, 0.05, D, alu, -6.1, 2.6, D / 2);
  const paneM = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.04, metalness: 0, envMapIntensity: 2.5, depthWrite: false });
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(D, H - 0.5).rotateY(Math.PI / 2), paneM); pane.position.set(-6.07, (H - 0.5) / 2, D / 2); scene.add(pane);

  const OB = [];
  const leather = new THREE.MeshPhysicalMaterial({ color: '#1a1a1e', roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.4 }), steel = std('#8a8d92', { metalness: 0.9, roughness: 0.32 });
  const soft = mk(128, 128, (g) => { g.shadowColor = '#000'; g.shadowBlur = 18; g.shadowOffsetX = 300; g.fillStyle = '#000'; g.fillRect(36 - 300, 36, 56, 56); });
  const contact = (x, z, w, d, o = 0.5) => {
    const q = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: soft, transparent: true, opacity: o, depthWrite: false }));
    q.position.set(x, 0.012, z); scene.add(q);
  };
  for (let b = 1; b < B; b++) {
    const z = b * BAY; box(3.4, 3.6, 0.24, wallM, 4.3, 1.8, z); box(3.42, 0.1, 0.28, dark, 4.3, 0.05, z);
    OB.push([RX, W / 2, z - 0.12, z + 0.12]); contact(4.3, z, 4.4, 1.2, 0.5);
  }
  for (let b = 0; b < B; b++) {
    const z = b * BAY + 4;
    add(new RoundedBoxGeometry(0.58, 0.14, 2.1, 4, 0.055), leather, -2.2, 0.43, z);
    [-1, 1].forEach((a) => { [-1, 1].forEach((c) => box(0.035, 0.36, 0.035, steel, -2.2 + a * 0.24, 0.18, z + c * 0.95)); box(0.03, 0.04, 1.9, steel, -2.2 + a * 0.24, 0.35, z); });
    OB.push([-2.45, -1.95, z - 1.1, z + 1.1]); contact(-2.2, z, 1.2, 3, 0.55);
  }
  box(0.03, 0.1, D, dark, W / 2 - 0.015, 0.05, D / 2); box(W, 0.1, 0.03, dark, 0, 0.05, 0.015); box(W, 0.1, 0.03, dark, 0, 0.05, D - 0.015);

  const skyT = mk(256, 256, (g, w, h) => {
    const q = g.createLinearGradient(0, 0, 0, h); q.addColorStop(0, '#ffffff'); q.addColorStop(1, '#e4eefb');
    g.fillStyle = q; g.fillRect(0, 0, w, h); g.strokeStyle = '#6f757c'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
    g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
  });
  skyT.wrapS = skyT.wrapT = THREE.RepeatWrapping; skyT.repeat.set(2, 4);
  const panelM = new THREE.MeshBasicMaterial({ map: skyT, color: 0xffffff, toneMapped: false });
  for (let b = 0; b < B; b++) {
    const zc = b * BAY + 4;
    add(new THREE.BoxGeometry(2.6, 0.04, 6), panelM, -1.7, H - 0.02, zc, false);
    [-2.5, 0, 2.5].forEach((q) => box(2.9, 0.14, 0.12, dark, -1.7, H - 0.07, zc + q));
    [-1.45, 1.45].forEach((q) => box(0.12, 0.14, 6, dark, -1.7 + q, H - 0.07, zc));
  }
  box(0.05, 0.05, D, dark, 4.5, H - 0.08, D / 2);
  const coveM = new THREE.MeshBasicMaterial({ color: 0xfff4e2, toneMapped: false });
  box(0.08, 0.05, D, coveM, 5.94, H - 0.1, D / 2); box(W - 0.2, 0.05, 0.08, coveM, -0.1, H - 0.1, D - 0.06); box(W - 0.2, 0.05, 0.08, coveM, -0.1, H - 0.1, 0.06);
  const topT = mk(4, 64, (g) => { const q = g.createLinearGradient(0, 0, 0, 64); q.addColorStop(0, 'rgba(0,0,0,.28)'); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(0, 0, 4, 64); });
  const topM = new THREE.MeshBasicMaterial({ map: topT, transparent: true, depthWrite: false, toneMapped: false });
  [[D, -Math.PI / 2, 5.985, D / 2], [W, Math.PI, 0, D - 0.01], [W, 0, 0, 0.01]].forEach(([w, ry, x, z]) => {
    const q = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.9), topM); q.rotation.y = ry; q.position.set(x, H - 0.45, z); scene.add(q);
  });
  RectAreaLightUniformsLib.init();
  const nL = Q.areaLights || Math.ceil(B / 2);
  const winL = [...Array(nL)].map((_, i) => { const l = new THREE.RectAreaLight(0xffffff, 0, D / nL, H - 0.5); l.position.set(-6.05, (H - 0.5) / 2, ((i + 0.5) * D) / nL); l.rotation.y = -Math.PI / 2; scene.add(l); return l; });
  const skyL = [...Array(nL)].map((_, i) => { const l = new THREE.RectAreaLight(0xffffff, 0, 2.6, (D / nL) * 0.85); l.position.set(-1.7, H - 0.05, ((i + 0.5) * D) / nL); l.rotation.x = -Math.PI / 2; scene.add(l); return l; });

  buckets.forEach((gs, m) => { const mesh = new THREE.Mesh(mergeGeometries(gs), m); mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh); });

  const FT = Q.floorTex, K = FT / 2048;
  loader.load('/texturas/piso.jpg', (t) => {
    const im = t.image, cols = [[6, 114], [130, 274], [292, 434], [452, 596], [614, 728]], PW = 81 * K;
    const big = mk(FT, FT, (g) => {
      g.fillStyle = '#1e1610'; g.fillRect(0, 0, FT, FT);
      for (let ci = 0; ci < 26; ci++) {
        let y = -rnd(0, 500 * K);
        while (y < FT) {
          const len = rnd(330 * K, 600 * K), [x0, x1] = cols[(Math.random() * 5) | 0], sw = x1 - x0, sh = Math.min((len * sw) / (PW - 2), im.height - 2);
          g.drawImage(im, x0, rnd(0, im.height - sh), sw, sh, ci * PW + 1, y + 1, PW - 2, len - 2);
          g.fillStyle = `rgba(0,0,0,${rnd(0, 0.16)})`; g.fillRect(ci * PW + 1, y + 1, PW - 2, len - 2);
          y += len;
        }
      }
    });
    big.anisotropy = Math.min(Q.aniso, ren.capabilities.getMaxAnisotropy()); big.wrapS = big.wrapT = THREE.RepeatWrapping; big.repeat.set(W / 4.8, D / 4.8);
    floorM.map = big; floorM.bumpMap = big; floorM.bumpScale = 0.06; floorM.roughnessMap = null; floorM.roughness = 0.55; floorM.color.setScalar(1.25); floorM.needsUpdate = true;
    t.dispose(); c.st.dirty = true;
  });

  return { hemi, sun, std, add, nzT, groundM, floor, OB, panelM, coveM, winL, skyL };
}