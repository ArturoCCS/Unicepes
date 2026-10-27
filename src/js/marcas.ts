type Mockup = { src: string; span?: string; alt?: string };
type Brand = { name?: string; description?: string; tags?: string[]; mockups?: Mockup[], autor?: string; };

const root = document.getElementById("ecosystem") as HTMLElement;
const nodes = Array.from(root.querySelectorAll<HTMLElement>(".node"));
const brands: Brand[] = JSON.parse(document.getElementById("brands-data")?.textContent || "[]");

const panel = document.getElementById("case") as HTMLElement;
const scroller = document.getElementById("case-scroll") as HTMLElement;
const caseLogo = document.getElementById("case-logo") as HTMLImageElement;
const caseName = document.getElementById("case-name")!;
const caseAutor = document.getElementById("case-autor")!;
const caseDesc = document.getElementById("case-desc")!;
const caseTags = document.getElementById("case-tags")!;
const caseGrid = document.getElementById("case-grid")!;
const closeBtn = document.getElementById("case-close")!;

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE = "cubic-bezier(0.22, 0.8, 0.2, 1)";
const wait = (ms: number) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));

const AUTO_SPIN = reduce ? 0 : 0.0025;
const SPHERE = 0.33;
const DRAG_SENS = 0.006;
const DRAG_THRESHOLD = 6;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const n = nodes.length;
const golden = Math.PI * (3 - Math.sqrt(5));
const pts = nodes.map((_, i) => {
  const y = 1 - (2 * (i + 0.5)) / n;
  const r = Math.sqrt(1 - y * y);
  const t = i * golden;
  return { x: Math.cos(t) * r, y, z: Math.sin(t) * r };
});

let yaw = 0;
let pitch = -0.2;
let vYaw = AUTO_SPIN;
let vPitch = 0;
let dragging = false;
let moved = 0;
let lastX = 0;
let lastY = 0;
let justDragged = false;

type Active = { node: HTMLElement; img: HTMLImageElement };
let active: Active | null = null;
let closing = false;
let busy = false;
let openAmt = 0;

nodes.forEach((el) => {
  el.style.position = "absolute";
  el.style.left = "50%";
  el.style.top = "50%";
  el.style.translate = "none";
  el.style.transition = "none";
});

const t0 = performance.now();
let last = t0;

function frame(now: number) {
  const dt = Math.min(50, now - last) / 16.667;
  last = now;

  if (!active && !dragging) {
    vYaw += (AUTO_SPIN - vYaw) * 0.03 * dt;
    vPitch *= Math.pow(0.94, dt);
    yaw += vYaw * dt;
    pitch += vPitch * dt;
  }
  pitch = clamp(pitch, -1.2, 1.2);

  const goal = active && !closing ? 1 : 0;
  openAmt += (goal - openAmt) * Math.min(1, 0.12 * dt);
  if (Math.abs(goal - openAmt) < 0.001) openAmt = goal;

  const W = root.clientWidth;
  const H = root.clientHeight;
  const R = Math.min(W, H) * SPHERE;

  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);

  for (let i = 0; i < n; i++) {
    const el = nodes[i];
    const p = pts[i];

    const x1 = p.x * cy + p.z * sy;
    const z1 = -p.x * sy + p.z * cy;
    const y2 = p.y * cp - z1 * sp;
    const z2 = p.y * sp + z1 * cp;

    const persp = 3 / (3 - z2);
    const front = (z2 + 1) / 2;
    const k = reduce ? 1 : easeOut(clamp((now - t0 - 150 - i * 70) / 1100, 0, 1));

    const isActive = active?.node === el;
    const push = isActive ? 1 : 1 + openAmt * 0.7;
    const px = x1 * R * persp * push * k;
    const py = y2 * R * persp * push * k;
    const s = persp * 0.85 * (0.3 + 0.7 * k);
    const opacity = (0.25 + 0.75 * front) * k * (isActive ? 1 : 1 - openAmt);

    el.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%) scale(${s})`;
    el.style.opacity = String(opacity);
    el.style.zIndex = String(Math.round(front * 100) + 1);
    el.style.pointerEvents = !active && z2 > -0.05 ? "auto" : "none";
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

root.addEventListener("pointerdown", (e) => {
  if (active) return;
  dragging = true;
  moved = 0;
  lastX = e.clientX;
  lastY = e.clientY;
  vYaw = 0;
  vPitch = 0;
});

root.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  moved += Math.abs(dx) + Math.abs(dy);
  if (moved <= DRAG_THRESHOLD) return;

  if (!root.hasPointerCapture(e.pointerId)) {
    root.setPointerCapture(e.pointerId);
    root.classList.add("is-dragging");
  }
  yaw += dx * DRAG_SENS;
  pitch -= dy * DRAG_SENS;
  vYaw = vYaw * 0.5 + dx * DRAG_SENS * 0.5;
  vPitch = vPitch * 0.5 - dy * DRAG_SENS * 0.5;
});

const endDrag = (e: PointerEvent) => {
  if (!dragging) return;
  dragging = false;
  root.classList.remove("is-dragging");
  if (root.hasPointerCapture(e.pointerId)) root.releasePointerCapture(e.pointerId);
  if (moved > DRAG_THRESHOLD) {
    justDragged = true;
    setTimeout(() => (justDragged = false), 60);
  }
};
root.addEventListener("pointerup", endDrag);
root.addEventListener("pointercancel", endDrag);

let io: IntersectionObserver | null = null;

function fillCase(brand: Brand, logoSrc: string) {
  caseLogo.src = logoSrc;
  caseLogo.alt = brand.name ?? "";
  caseName.textContent = brand.name ?? "";
  caseAutor.textContent = brand.autor ?? "";
  caseDesc.textContent = brand.description ?? "";
  caseTags.replaceChildren(
    ...(brand.tags ?? []).map((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      return li;
    })
  );

  io?.disconnect();
  io = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io?.unobserve(en.target);
        }
      }),
    { root: scroller, threshold: 0.12 }
  );

  caseGrid.replaceChildren(
    ...(brand.mockups ?? []).map((m) => {
      const fig = document.createElement("figure");
      fig.className = `m m--${m.span ?? "half"}`;
      const im = new Image();
      im.src = m.src;
      im.alt = m.alt ?? "";
      im.loading = "lazy";
      im.decoding = "async";
      fig.append(im);
      io!.observe(fig);
      return fig;
    })
  );
}

const centerOf = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

function makeClone(img: HTMLImageElement, r: DOMRect) {
  const c = img.cloneNode() as HTMLImageElement;
  c.className = "expanded";
  Object.assign(c.style, {
    left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`,
  });
  root.append(c);
  return c;
}

async function open(node: HTMLElement) {
  if (active || busy) return;
  const img = node.querySelector("img") as HTMLImageElement;
  if (!img) return;
  busy = true;

  fillCase(brands[nodes.indexOf(node)] ?? {}, img.currentSrc || img.src);
  scroller.scrollTop = 0;
  await caseLogo.decode().catch(() => { });

  const from = img.getBoundingClientRect();
  const to = caseLogo.getBoundingClientRect();

  const clone = makeClone(img, to);
  caseLogo.style.visibility = "hidden";

  const a = centerOf(from);
  const b = centerOf(to);
  const fly = clone.animate(
    [
      { transform: `translate(${a.x - b.x}px, ${a.y - b.y}px) scale(${from.width / to.width})` },
      { transform: "none" },
    ],
    { duration: reduce ? 0 : 800, easing: EASE }
  );

  node.style.visibility = "hidden";
  root.classList.add("is-open");
  panel.classList.add("is-open");
  active = { node, img };

  await fly.finished.catch(() => { });
  caseLogo.style.visibility = "";
  clone.remove();
  panel.classList.add("is-revealed");
  busy = false;
}

async function close() {
  if (!active || busy || closing) return;
  busy = true;
  closing = true;
  const { node, img } = active;

  panel.classList.remove("is-revealed");
  await wait(250);
  scroller.scrollTop = 0;

  const from = caseLogo.getBoundingClientRect();
  const to = img.getBoundingClientRect();
  const clone = makeClone(img, from);
  caseLogo.style.visibility = "hidden";

  const a = centerOf(from);
  const b = centerOf(to);
  root.classList.remove("is-open");
  panel.classList.remove("is-open");

  const back = clone.animate(
    [
      { transform: "none" },
      { transform: `translate(${b.x - a.x}px, ${b.y - a.y}px) scale(${to.width / from.width})` },
    ],
    { duration: reduce ? 0 : 700, easing: EASE, fill: "forwards" }
  );

  await back.finished.catch(() => { });
  node.style.visibility = "";
  clone.remove();
  caseLogo.style.visibility = "";
  active = null;
  closing = false;
  busy = false;
}

root.addEventListener("click", (e) => {
  if (justDragged || active) return;
  const node = (e.target as Element).closest<HTMLElement>(".node");
  if (node) open(node);
});
closeBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  close();
});
addEventListener("keydown", (e) => e.key === "Escape" && close());

export {};