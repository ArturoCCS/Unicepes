type Clip = { name: string; duration: number; src: string; c1: string; c2: string; _muted?: boolean };
type Categoria = { label: string; title: string; color: string; icon: string; clips: Clip[] };

const CATEGORIAS: Categoria[] = [
  {
    label: "Animación", title: "Animaciones", color: "#7c4dff",
    icon: '<path d="M12 3l1.9 5.8a2 2 0 001.3 1.3L21 12l-5.8 1.9a2 2 0 00-1.3 1.3L12 21l-1.9-5.8a2 2 0 00-1.3-1.3L3 12l5.8-1.9a2 2 0 001.3-1.3L12 3z"/>',
    clips: [
      { name: "Intro Logo", duration: 28, src: "/video-ejemplo.mp4", c1: "#cbbcf3", c2: "#9d88dd" },
      { name: "Personajes", duration: 6, src: "", c1: "#b7e8d4", c2: "#7cc2a6" },
      { name: "Transición", duration: 3, src: "", c1: "#ffd5b4", c2: "#f0a16f" }
    ]
  },
  {
    label: "Cortos", title: "Cortometrajes", color: "#ff5a1f",
    icon: '<rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/>',
    clips: [
      { name: "Escena 1",  duration: 12, src: "", c1: "#b6d5f6", c2: "#7ea9db" },
      { name: "Diálogo",   duration: 8,  src: "", c1: "#f6c8b0", c2: "#e0906b" },
      { name: "Desenlace", duration: 10, src: "", c1: "#b8e9ca", c2: "#7fc79b" }
    ]
  },
  {
    label: "Comercial", title: "Comerciales", color: "#e11d74",
    icon: '<rect x="2" y="7" width="20" height="15" rx="2"/><path d="M17 2l-5 5-5-5"/>',
    clips: [
      { name: "Gancho",     duration: 3, src: "", c1: "#f3bcee", c2: "#d68acb" },
      { name: "Beneficios", duration: 7, src: "", c1: "#f0e9ab", c2: "#d3c76a" },
      { name: "CTA",        duration: 4, src: "", c1: "#abe9e9", c2: "#6fc4c4" }
    ]
  },
  {
    label: "Otros", title: "Otros videos", color: "#0d9488",
    icon: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    clips: [
      { name: "B-Roll 01", duration: 5, src: "", c1: "#d6dae1", c2: "#aeb4be" },
      { name: "B-Roll 02", duration: 5, src: "", c1: "#c5cad2", c2: "#9aa1ac" }
    ]
  }
];

const flat = CATEGORIAS.flatMap((cat, c) => cat.clips.map((clip, i) => ({ c, i, clip })));
const N = flat.length;
const catStart: number[] = [], catCount: number[] = [], catTotal: number[] = [], catClipStart: number[][] = [];
CATEGORIAS.forEach((cat, c) => {
  catStart[c] = flat.findIndex(f => f.c === c);
  catCount[c] = cat.clips.length;
  let s = 0;
  catClipStart[c] = cat.clips.map(cl => { const x = s; s += cl.duration; return x; });
  catTotal[c] = s;
});

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const sc = $('scroller'), track = $('track'), pin = $('pin'), progEl = $('prog'),
      catsEl = $('cats'), railInd = $('railInd'), thumbsEl = $('thumbs'), layersEl = $('layers'), viewer = $('viewer'),
      blocksEl = $('blocks'), laneEl = $('lane'), playheadEl = $('playhead'),
      nameEl = $('clipName'), countEl = $('clipCount'), catTitleEl = $('catTitle'), tcEl = $('tc'),
      cueEl = $('cue'), cueText = $('cueText'),
      playIcon = $('playIcon'), muteIcon = $('muteIcon'), muteBtn = $('mute'), clipMuteBtn = $('clipMute');

const I_PLAY  = '<path d="M8 5v14l11-7z"/>';
const I_PAUSE = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>';
const I_VOL   = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/>';
const I_MUTE  = '<path d="M16.5 12A4.5 4.5 0 0 0 14 8v2.3l2.4 2.4c.1-.2.1-.5.1-.7zM19 12c0 .9-.2 1.8-.6 2.6l1.5 1.5A8.7 8.7 0 0 0 21 12c0-4.3-3-7.9-7-8.8v2c2.9.9 5 3.5 5 6.8zM4.3 3 3 4.3 7.7 9H3v6h4l5 5v-6.7l4.2 4.2c-.7.5-1.4.9-2.2 1.2v2a9 9 0 0 0 3.7-1.8l2 2 1.3-1.3-9-9L4.3 3zM12 4 9.9 6.1 12 8.2V4z"/>';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE = 'cubic-bezier(.22,.8,.3,1)';

let slot = 600, scrollLen = 1800;
let pd = 0;
let active = -1, curCat = -1, playing = false, masterMuted = false;
let layers: HTMLElement[] = [], railBtns: HTMLElement[] = [], catFills: HTMLElement[] = [];
let blocks: HTMLElement[] = [], fills: HTMLElement[] = [], thumbs: HTMLElement[] = [], tbars: HTMLElement[] = [];
let lastScrollAt = 0, autoPos = 0, cueState = '';

const pad = (v: number) => String(Math.floor(v)).padStart(2, '0');
const mmss = (s: number) => pad(s / 60) + ':' + pad(s % 60);
const vid = (gi: number): HTMLVideoElement | null => layers[gi]?.querySelector('video') ?? null;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

flat.forEach(({ clip }) => {
  const l = document.createElement('div');
  l.className = 'layer';
  l.innerHTML = '<div class="layer-inner">' + (clip.src
    ? `<video muted loop playsinline preload="none" data-src="${clip.src}"></video>`
    : `<div class="ph" style="--c1:${clip.c1};--c2:${clip.c2}"><div class="ph-play"><svg viewBox="0 0 24 24">${I_PLAY}</svg></div></div>`) + '</div>';
  layersEl.appendChild(l);
});
layers = [...layersEl.children] as HTMLElement[];

CATEGORIAS.forEach((cat, c) => {
  const b = document.createElement('button');
  b.className = 'cat';
  b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${cat.icon}</svg><span>${cat.label}</span><span class="cat-bar"><i></i></span>`;
  b.addEventListener('click', () => goTo(catStart[c]));
  catsEl.appendChild(b);
});
railBtns = [...catsEl.querySelectorAll<HTMLElement>('.cat')];
catFills = railBtns.map(b => b.querySelector('.cat-bar i') as HTMLElement);

viewer.addEventListener('pointermove', (e: PointerEvent) => {
  const r = viewer.getBoundingClientRect();
  viewer.style.setProperty('--px', String(((e.clientX - r.left) / r.width - 0.5) * 2));
  viewer.style.setProperty('--py', String(((e.clientY - r.top) / r.height - 0.5) * 2));
});

function moveIndicator() {
  const b = railBtns[curCat];
  if (!b) return;
  railInd.style.width = b.offsetWidth + 'px';
  railInd.style.height = b.offsetHeight + 'px';
  railInd.style.transform = `translate(${b.offsetLeft}px, ${b.offsetTop}px)`;
}
function layout() {
    const H = sc.clientHeight;
    slot = Math.max(H * 1.2, 700); 
    scrollLen = slot * N;
    pin.style.height = H + 'px';
    track.style.height = (H + scrollLen) + 'px';
    moveIndicator();
}

function setCategory(c: number) {
  const prev = curCat;
  curCat = c;
  const cat = CATEGORIAS[c];

  railBtns.forEach((b, k) => b.classList.toggle('is-active', k === c));
  moveIndicator();
  sc.style.setProperty('--accent', cat.color);

  catTitleEl.textContent = cat.title;
  if (prev !== -1 && !reduced) {
    catTitleEl.animate([{ transform: 'translateY(105%)' }, { transform: 'none' }], { duration: 700, easing: EASE });
  }

  thumbsEl.innerHTML = ''; blocksEl.innerHTML = '';
  cat.clips.forEach((clip, i) => {
    const b = document.createElement('div');
    b.className = 'block rise'; b.style.flex = String(clip.duration); b.style.setProperty('--d', (i * 0.07) + 's');
    b.innerHTML = `<div class="block-fill"></div><span class="block-name">${clip.name}</span><span class="block-dur">${clip.duration} s</span>`;
    blocksEl.appendChild(b);

    const t = document.createElement('button');
    t.className = 'thumb rise'; t.style.setProperty('--d', (i * 0.07) + 's');
    t.innerHTML = `<span class="thumb-icon"><svg viewBox="0 0 24 24">${I_PLAY}</svg></span><span class="thumb-name">${clip.name}</span><span class="thumb-dur">${clip.duration} s</span><span class="thumb-bar"></span>`;
    t.addEventListener('click', () => goTo(catStart[c] + i));
    thumbsEl.appendChild(t);
  });
  blocks = [...blocksEl.children] as HTMLElement[];
  thumbs = [...thumbsEl.children] as HTMLElement[];
  fills = blocks.map(b => b.querySelector('.block-fill') as HTMLElement);
  tbars = thumbs.map(t => t.querySelector('.thumb-bar') as HTMLElement);
}

function centerThumb(i: number) {
  const t = thumbs[i];
  if (!t) return;
  const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth';
  if (window.innerWidth <= 720) thumbsEl.scrollTo({ left: t.offsetLeft - thumbsEl.clientWidth / 2 + t.offsetWidth / 2, behavior });
  else thumbsEl.scrollTo({ top: t.offsetTop - thumbsEl.clientHeight / 2 + t.offsetHeight / 2, behavior });
}

function warm(gi: number) {
  [gi - 1, gi, gi + 1].forEach(k => {
    const v = vid(k);
    if (v && !v.getAttribute('src') && v.dataset.src) { v.src = v.dataset.src; v.preload = 'metadata'; }
  });
}

function setActive(gi: number) {
  const prev = active;
  active = gi;
  const { c, i, clip } = flat[gi];
  layers.forEach((l, k) => {
    l.classList.toggle('is-active', k === gi);
    l.classList.toggle('is-past', k < gi);
    if (k !== gi) vid(k)?.pause();
  });
  blocks.forEach((b, k) => b.classList.toggle('is-active', k === i));
  thumbs.forEach((t, k) => t.classList.toggle('is-active', k === i));
  nameEl.textContent = clip.name;
  countEl.textContent = `${i + 1} / ${catCount[c]}`;
  if (prev !== -1 && !reduced) {
    nameEl.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: EASE });
  }
  centerThumb(i);
  warm(gi);
  applyMute(gi); updateClipMuteBtn();
}

function setCue(text: string | null) {
  const key = text ?? '';
  if (key === cueState) return;
  cueState = key;
  if (text) cueText.textContent = text;
  cueEl.classList.toggle('is-hidden', !text);
}

function render(p: number, moving: boolean) {
  const raw = p * N;
  const gi = Math.min(N - 1, Math.floor(raw));
  const local = p >= 1 ? 1 : raw - gi;
  const { c, i, clip } = flat[gi];

  if (c !== curCat) setCategory(c);
  if (gi !== active) setActive(gi);

  layers[gi].style.setProperty('--z', (1 + local * 0.06).toFixed(4));

  thumbs.forEach((_, k) => {
    const w = (k < i ? 100 : k > i ? 0 : local * 100) + '%';
    fills[k].style.width = w; tbars[k].style.width = w;
  });
  catFills.forEach((f, k) => { f.style.width = clamp((raw - catStart[k]) / catCount[k], 0, 1) * 100 + '%'; });
  progEl.style.transform = `scaleX(${p})`;

  const t = catClipStart[c][i] + local * clip.duration;
  playheadEl.style.left = `calc(${(t / catTotal[c]) * 100}% - 1px)`;
  laneEl.setAttribute('aria-valuenow', String(Math.round((t / catTotal[c]) * 100)));
  tcEl.innerHTML = `${mmss(t)} <small>/ ${mmss(catTotal[c])}</small>`;

  const next = CATEGORIAS[c + 1];
  if (p < 0.02) setCue('Desplázate para avanzar');
  else if (next && i === catCount[c] - 1 && local > 0.55) setCue('Sigue: ' + next.title);
  else setCue(null);

  const v = vid(gi);
  if (v && isFinite(v.duration)) {
    const want = local * v.duration;
    if (Math.abs(v.currentTime - want) > 0.45) v.currentTime = want;
    if (moving && v.paused) v.play().catch(() => {});
    if (!moving && !v.paused) v.pause();
  }
}

let last = performance.now();
function loop(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;

  if (playing) {
    if (Math.abs(sc.scrollTop - autoPos) > 2) autoPos = sc.scrollTop;
    const idx = Math.min(N - 1, Math.floor(pd * N));
    autoPos = Math.min(scrollLen, autoPos + (slot / flat[idx].clip.duration) * dt);
    sc.scrollTo(0, autoPos);
    if (autoPos >= scrollLen) setPlaying(false);
  }

  const target = clamp(sc.scrollTop / scrollLen, 0, 1);
  const diff = target - pd;
  pd = Math.abs(diff) < 0.0002 ? target : pd + diff * (1 - Math.exp(-dt * 10));
  const moving = playing || Math.abs(diff) > 0.0005 || now - lastScrollAt < 250;
  render(pd, moving);
  requestAnimationFrame(loop);
}
sc.addEventListener('scroll', () => {
    const scrollTop = sc.scrollTop;
    const p = clamp(scrollTop / scrollLen, 0, 1);
    
    render(p, true);
}, { passive: true });

let rt: ReturnType<typeof setTimeout>;
new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(layout, 120); }).observe(sc);

function scrollToP(p: number, smooth: boolean) {
  sc.scrollTo({ top: clamp(p, 0, 1) * scrollLen, behavior: smooth && !reduced ? 'smooth' : 'auto' });
}
function goTo(gi: number) {
  gi = clamp(gi, 0, N - 1);
  const near = Math.abs(gi - pd * N) <= 1.6;
  scrollToP((gi + 0.001) / N, near);
  autoPos = (gi + 0.001) / N * scrollLen;
}
function currentLocal() { const raw = pd * N; return raw - Math.min(N - 1, Math.floor(raw)); }

$('prev').addEventListener('click', () => goTo(currentLocal() > 0.1 ? active : active - 1));
$('next').addEventListener('click', () => goTo(active + 1));

function setPlaying(v: boolean) {
  playing = v;
  playIcon.innerHTML = v ? I_PAUSE : I_PLAY;
  if (v) { if (sc.scrollTop >= scrollLen - 2) sc.scrollTo(0, 0); autoPos = sc.scrollTop; }
}
$('play').addEventListener('click', () => setPlaying(!playing));

let dragging = false;
function seekX(x: number) {
  const c = curCat;
  const r = laneEl.getBoundingClientRect();
  const t = clamp((x - r.left) / r.width, 0, 1) * catTotal[c];
  const starts = catClipStart[c];
  let i = catCount[c] - 1; while (i > 0 && t < starts[i]) i--;
  const local = clamp((t - starts[i]) / CATEGORIAS[c].clips[i].duration, 0, 1);
  scrollToP((catStart[c] + i + local) / N, false);
}
laneEl.addEventListener('pointerdown', (e: PointerEvent) => { dragging = true; laneEl.setPointerCapture(e.pointerId); setPlaying(false); seekX(e.clientX); });
laneEl.addEventListener('pointermove', (e: PointerEvent) => { if (dragging) seekX(e.clientX); });
laneEl.addEventListener('pointerup', () => { dragging = false; });
laneEl.addEventListener('pointercancel', () => { dragging = false; });
laneEl.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'ArrowRight') { e.preventDefault(); goTo(active + 1); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); goTo(active - 1); }
});

function applyMute(gi: number) { const v = vid(gi); if (v) v.muted = masterMuted || !!flat[gi].clip._muted; }
function updateClipMuteBtn() {
  const m = !!flat[active]?.clip._muted;
  clipMuteBtn.classList.toggle('is-muted', m);
  clipMuteBtn.innerHTML = `<svg viewBox="0 0 24 24">${m ? I_MUTE : I_VOL}</svg>`;
}
clipMuteBtn.addEventListener('click', () => { const cl = flat[active].clip; cl._muted = !cl._muted; applyMute(active); updateClipMuteBtn(); });
muteBtn.addEventListener('click', () => {
  masterMuted = !masterMuted;
  muteBtn.classList.toggle('is-muted', masterMuted);
  muteIcon.innerHTML = masterMuted ? I_MUTE : I_VOL;
  flat.forEach((_, gi) => applyMute(gi));
});

const themeBtn = $('theme');
const I_SUN  = '<path d="M12 7a5 5 0 100 10 5 5 0 000-10zM11 1h2v3h-2zM11 20h2v3h-2zM1 11h3v2H1zM20 11h3v2h-3zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4zM16.3 17.7l1.4-1.4 2.1 2.1-1.4 1.4zM4.2 18.4l2.1-2.1 1.4 1.4-2.1 2.1zM16.3 6.3l2.1-2.1 1.4 1.4-2.1 2.1z"/>';
const I_MOON = '<path d="M21 14.5A9 9 0 0 1 9.5 3a9 9 0 1 0 11.5 11.5z"/>';
type Tema = 'light' | 'dark';
function applyTheme(t: Tema, save = true) {
  sc.dataset.theme = t;
  document.documentElement.dataset.theme = t;
  themeBtn.innerHTML = `<svg viewBox="0 0 24 24">${t === 'dark' ? I_SUN : I_MOON}</svg>`;
  themeBtn.setAttribute('aria-label', t === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  if (save) { try { localStorage.setItem('hm-theme', t); } catch {} }
}
let saved: string | null = null;
try { saved = localStorage.getItem('hm-theme'); } catch {}
applyTheme(saved === 'dark' || saved === 'light' ? saved : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'), false);
themeBtn.addEventListener('click', () => applyTheme(sc.dataset.theme === 'dark' ? 'light' : 'dark'));

playIcon.innerHTML = I_PLAY;
muteIcon.innerHTML = I_VOL;
layout();
sc.scrollTo(0, 0);
render(0, false);
requestAnimationFrame(loop);

window.addEventListener('DOMContentLoaded', () => {
    sc.focus();
});

document.addEventListener('click', (e) => {
    const target = e.target as Element | null;

    if (!target?.closest('button') && !target?.closest('input')) {
        sc.focus();
    }
});
export {};