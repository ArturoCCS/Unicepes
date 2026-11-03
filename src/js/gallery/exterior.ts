// @ts-nocheck
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FONT, rnd } from './config';

export function buildExterior(c, world) {
  const { scene, mk, S, Q, D } = c;
  const { std, add, nzT } = world;
  const dm = new THREE.Object3D();
  const leafT = mk(256, 256, (g) => {
    for (let i = 0; i < 520; i++) {
      const a = rnd(0, 6.28), r = Math.sqrt(Math.random()) * 118;
      g.save(); g.translate(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); g.rotate(rnd(0, 6.28));
      g.fillStyle = `hsl(${rnd(78, 112)} ${rnd(35, 55)}% ${rnd(34, 62)}%)`;
      g.beginPath(); g.ellipse(0, 0, rnd(8, 14), rnd(3.5, 6), 0, 0, 7); g.fill(); g.restore();
    }
  });
  const treeM = new THREE.MeshStandardMaterial({ map: leafT, vertexColors: true, alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.9 });
  const barkM = std('#ffffff', { vertexColors: true, roughness: 1 });
  const treeGeo = () => {
    const cy = rnd(6, 7.2), R = [rnd(2.6, 3.4), rnd(2.2, 2.8), rnd(2.6, 3.4)], leaves = [], tmp = new THREE.Object3D();
    const bk = (g) => {
      const p = g.attributes.position, c = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const k = 0.8 + 0.3 * Math.sin(p.getY(i) * 7 + p.getX(i) * 31 + p.getZ(i) * 17); c.set([0.3 * k, 0.22 * k, 0.16 * k], i * 3); }
      return g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    };
    const wood = [bk(new THREE.CylinderGeometry(0.12, 0.3, 5, 9, 4).translate(0, 2.5, 0))];
    for (let i = 0; i < 5; i++) {
      const a = new THREE.Vector3(0, rnd(3.4, 4.4), 0), b = new THREE.Vector3(rnd(-1.8, 1.8), cy + rnd(-1, 1.2), rnd(-1.8, 1.8)), len = a.distanceTo(b);
      const g = new THREE.CylinderGeometry(0.03, 0.1, len, 5).translate(0, len / 2, 0).rotateX(Math.PI / 2);
      tmp.position.copy(a); tmp.lookAt(b); tmp.updateMatrix(); g.applyMatrix4(tmp.matrix); wood.push(bk(g));
    }
    for (let i = 0; i < Q.cards; i++) {
      const u = rnd(0, 6.28), v = Math.acos(rnd(-1, 1)), q = Math.cbrt(Math.random());
      const x = Math.sin(v) * Math.cos(u) * R[0] * q, y = Math.cos(v) * R[1] * q, z = Math.sin(v) * Math.sin(u) * R[2] * q;
      const g = new THREE.PlaneGeometry(rnd(1.5, 2.3), rnd(1.5, 2.3));
      tmp.position.set(x, cy + y, z); tmp.rotation.set(rnd(0, 3.14), rnd(0, 6.28), rnd(0, 3.14)); tmp.updateMatrix(); g.applyMatrix4(tmp.matrix);
      const n = new THREE.Vector3(x, y + 0.6, z).normalize(), sh = THREE.MathUtils.clamp(0.45 + (y / R[1]) * 0.3 + q * 0.35 + rnd(-0.1, 0.1), 0.25, 1.1);
      const c = [], nn = []; for (let j = 0; j < 4; j++) { c.push(sh, sh, sh * 0.9); nn.push(n.x, n.y, n.z); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3)); leaves.push(g);
    }
    return { wood: mergeGeometries(wood), leaves: mergeGeometries(leaves) };
  };
  const TCNT = Q.treeCount;
  [...Array(Q.treeVariants)].forEach(() => {
    const t = treeGeo(), iw = new THREE.InstancedMesh(t.wood, barkM, TCNT), il = new THREE.InstancedMesh(t.leaves, treeM, TCNT);
    for (let i = 0; i < TCNT; i++) {
      const sc = rnd(0.9, 1.7);
      dm.position.set(i < 4 ? -(10 + 3.6 * sc + rnd(0, 6)) : -rnd(26, 90), 0, rnd(-30, D + 30)); dm.rotation.set(0, rnd(0, 6.28), 0); dm.scale.set(sc, sc * rnd(0.9, 1.2), sc); dm.updateMatrix();
      iw.setMatrixAt(i, dm.matrix); il.setMatrixAt(i, dm.matrix); il.setColorAt(i, new THREE.Color().setScalar(rnd(0.85, 1.15)));
    }
    scene.add(iw, il);
  });
  const shrubM = treeM.clone();
  const bushGeo = () => {
    const leaves = [], tmp = new THREE.Object3D();
    for (let i = 0; i < Q.bushCards; i++) {
      const u = rnd(0, 6.28), v = Math.acos(rnd(-1, 1)), q = Math.cbrt(Math.random());
      const x = Math.sin(v) * Math.cos(u) * 1.6 * q, y = 0.45 + Math.abs(Math.cos(v)) * 0.8 * q, z = Math.sin(v) * Math.sin(u) * 1.2 * q;
      const g = new THREE.PlaneGeometry(rnd(0.8, 1.2), rnd(0.8, 1.2)), sh = THREE.MathUtils.clamp(0.4 + y * 0.35 + rnd(-0.1, 0.1), 0.3, 1);
      tmp.position.set(x, y, z); tmp.rotation.set(rnd(0, 3.14), rnd(0, 6.28), rnd(0, 3.14)); tmp.updateMatrix(); g.applyMatrix4(tmp.matrix);
      const n = new THREE.Vector3(x, y + 0.3, z).normalize(), c = [], nn = [];
      for (let j = 0; j < 4; j++) { c.push(sh, sh, sh * 0.9); nn.push(n.x, n.y, n.z); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3)); leaves.push(g);
    }
    return mergeGeometries(leaves);
  };
  [0, 1].forEach(() => {
    const im = new THREE.InstancedMesh(bushGeo(), shrubM, Q.bushCount);
    for (let i = 0; i < Q.bushCount; i++) {
      const sc = rnd(0.9, 1.7);
      dm.position.set(-rnd(10.8, 14.5), 0, (i + rnd(0, 1)) * ((D + 30) / Q.bushCount) - 15); dm.rotation.set(0, rnd(0, 6.28), 0); dm.scale.set(sc * 1.3, sc, sc * 1.3); dm.updateMatrix();
      im.setMatrixAt(i, dm.matrix); im.setColorAt(i, new THREE.Color().setScalar(rnd(0.85, 1.15)));
    }
    scene.add(im);
  });
  add(new THREE.PlaneGeometry(5, D + 24).rotateX(-Math.PI / 2), std('#a49e92', { roughness: 0.85, bumpMap: nzT(2, 12), bumpScale: 0.3 }), -9, -0.03, D / 2, false);
  const skyU = { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, cloud: { value: new THREE.Color() }, time: { value: 0 } };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: skyU,
    vertexShader: `varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 bot; uniform vec3 cloud; uniform float time; varying vec3 d;
float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ns(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(hs(i), hs(i + vec2(1., 0.)), f.x), mix(hs(i + vec2(0., 1.)), hs(i + vec2(1., 1.)), f.x), f.y); }
void main(){
  vec3 c = mix(bot, top, smoothstep(-.02, .55, d.y));
  vec2 uv = d.xz / (d.y + .3) * 1.4 + time * .012; float f = 0., a = .5;
  for (int i = 0; i < 4; i++) { f += a * ns(uv); uv *= 2.1; a *= .5; }
  c = mix(c, cloud, smoothstep(.5, .85, f) * smoothstep(.02, .3, d.y) * .9);
  gl_FragColor = vec4(c, 1.);
#include <colorspace_fragment>
}`,
  }));
  dome.position.set(0, 0, D / 2); dome.renderOrder = -1; scene.add(dome);
  const sp = new Float32Array(1200);
  for (let i = 0; i < 1200; i += 3) {
    const a = Math.random() * 6.283, e = 0.1 + Math.random() * 1.3;
    sp[i] = Math.cos(a) * Math.cos(e) * 140; sp[i + 1] = Math.sin(e) * 140; sp[i + 2] = Math.sin(a) * Math.cos(e) * 140 + D / 2;
  }
  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sp, 3)),
    new THREE.PointsMaterial({ size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false })
  );
  scene.add(stars);

  const titleM = new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, visible: false });
  const titleMesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), titleM); titleMesh.position.set(0, 2.4, 0.02); scene.add(titleMesh);
  const drawTitle = () => {
    titleM.map = mk(1024, 512, (g, w) => {
      g.fillStyle = '#fff'; g.textAlign = 'center';
      g.font = `italic 120px ${FONT}`; g.fillText(S.nombre, w / 2, 250);
      g.font = '34px "DM Sans", sans-serif'; g.fillText(S.desc, w / 2, 330);
    });
    titleM.visible = true; titleM.needsUpdate = true;
  };
  document.fonts.load('italic 120px "Bodoni Moda"').then(drawTitle, drawTitle);

  return { treeM, shrubM, skyU, stars, titleM };
}