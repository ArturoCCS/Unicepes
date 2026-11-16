// @ts-nocheck
import * as THREE from 'three';
import { EYE, type Quality } from './config';

export function createCore(root: HTMLElement, Q: Quality, touch: boolean, sig: AbortSignal) {
  const cv = root.querySelector('.cv') as HTMLCanvasElement;
  const ren = new THREE.WebGLRenderer({ canvas: cv, antialias: Q.aa, powerPreference: 'high-performance' });
  ren.outputColorSpace = THREE.SRGBColorSpace;
  ren.toneMapping = THREE.ACESFilmicToneMapping;
  ren.shadowMap.enabled = true;
  ren.shadowMap.type = THREE.PCFShadowMap;
  ren.shadowMap.autoUpdate = false;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffffff, 45, 180);
  const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
  cam.rotation.order = 'YXZ';
  cam.position.set(-1.7, EYE, 2.4);
  const mgr = new THREE.LoadingManager(), loader = new THREE.TextureLoader(mgr);
  const maxDpr = Math.min(devicePixelRatio, Q.dpr);
  const st = { dirty: true, dpr: maxDpr, maxDpr };

  const resize = () => {
    const w = root.clientWidth, h = root.clientHeight;
    if (!w || !h) return;
    ren.setPixelRatio(st.dpr); ren.setSize(w, h, false);
    cam.aspect = w / h;
    cam.fov = cam.aspect < 1 ? Math.min(88, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(38)) / cam.aspect))) : touch ? 70 : 60;
    cam.updateProjectionMatrix(); st.dirty = true;
  };
  const ro = new ResizeObserver(resize); ro.observe(root); sig.addEventListener('abort', () => ro.disconnect());
  resize();

  const mk = (w: number, h: number, fn: (g: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const cn = document.createElement('canvas'); cn.width = w; cn.height = h; fn(cn.getContext('2d')!, w, h);
    const t = new THREE.CanvasTexture(cn); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(Q.aniso, ren.capabilities.getMaxAnisotropy()); return t;
  };
  const setDpr = (v: number) => { st.dpr = v; resize(); };
  return { root, cv, ren, scene, cam, mgr, loader, mk, st, setDpr };
}

export type Core = ReturnType<typeof createCore>;
export type Ctx = Core & { S: any; Q: Quality; B: number; D: number; N: number; touch: boolean; sig: AbortSignal };