export { };

interface Mockup {
    src: string;
    span?: 'full' | 'half' | 'third' | 'tall';
    alt?: string;
}
interface Design {
    src: string;
    title: string;
    author: string;
    desc: string;
    tags?: string[];
    mockups?: Mockup[];
}

const CFG = {
    centerScale: 1.2,
    minScale: 0.2,
    falloff: 1.1,
    gap: 0.12,
    dim: 0,

    arc: 0.9,
    radius: 0.75,
    tilt: 0.5,

    blur: 7,
    blurStart: 0.5,
    sideOpacity: 0.35,

    smoothing: 85,
    inertia: 250,
    dragThreshold: 6,
    wheelPerItem: 120,
    wheelSnapDelay: 110,
};

const mod = (n: number, m: number) => ((n % m) + m) % m;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const scaleAt = (a: number) =>
    CFG.minScale +
    (CFG.centerScale - CFG.minScale) * Math.exp(-(a * a) / (2 * CFG.falloff * CFG.falloff));

function init(container: HTMLElement) {
    const items = Array.from(container.querySelectorAll<HTMLElement>('.vcarrusel-item'));
    if (!items.length) return;

    const shades = items.map((el) => el.querySelector<HTMLElement>('.shade'));
    const frames = Array.from(document.querySelectorAll<HTMLElement>('.detail-img'));
    const dFrame = document.querySelector<HTMLElement>('.detail-frame');
    const dInfo = document.getElementById('detail-info');
    const dTitle = document.getElementById('detail-title');
    const dAuthor = document.getElementById('detail-author');
    const dDesc = document.getElementById('detail-desc');
    const dCounter = document.getElementById('detail-counter');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = window.matchMedia('(max-width: 700px)');

    let data: Design[] = [];
    try {
        data = JSON.parse(document.getElementById('designs-data')?.textContent || '[]');
    } catch {
        data = [];
    }

    const N = items.length;
    const visible = Math.max(1, Math.min(N, Number(container.dataset.visible) || 5));
    const maxOffset = (visible - 1) / 2;
    const fadeEnd = Math.min(maxOffset + 1, N / 2);
    const fadeRange = Math.max(0.001, fadeEnd - maxOffset);

    let pos = 0;
    let target = 0;
    let rendered = NaN;
    let spacing = 300;
    let cardH = 300;
    let boxH = 800;
    let activeIdx = -1;
    let raf = 0;
    let lastFrame = 0;
    let dragging = false;
    const hidden: boolean[] = items.map(() => false);

    const STEP = 1 / 16;
    let yTable: number[] = [0, 0];

    function buildTable() {
        const maxA = Math.ceil(N / 2) + 2;
        const count = Math.ceil(maxA / STEP);
        const gapPx = cardH * CFG.gap;
        yTable = [0];
        for (let i = 0; i < count; i++) {
            const mid = (i + 0.5) * STEP;
            yTable.push(yTable[i] + (cardH * scaleAt(mid) + gapPx) * STEP);
        }
    }

    function yAt(a: number) {
        const f = a / STEP;
        const i = Math.min(Math.floor(f), yTable.length - 2);
        return yTable[i] + (yTable[i + 1] - yTable[i]) * (f - i);
    }

    function render() {
        rendered = pos;

        const R = boxH * CFG.radius;
        const arc = compact.matches ? 0 : CFG.arc;
        const tilt = compact.matches ? 0 : CFG.tilt;

        for (let i = 0; i < N; i++) {
            let o = mod(i - pos, N);
            if (o > N / 2) o -= N;
            const abs = Math.abs(o);
            const el = items[i];

            const fade = smoothstep(clamp((fadeEnd - abs) / fadeRange, 0, 1));

            if (fade <= 0.01) {
                if (!hidden[i]) {
                    el.style.visibility = 'hidden';
                    el.style.opacity = '0';
                    hidden[i] = true;
                }
                continue;
            }
            if (hidden[i]) {
                el.style.visibility = 'visible';
                hidden[i] = false;
            }

            const scale = scaleAt(abs);
            const y = Math.sign(o) * yAt(abs);

            const yc = clamp(y, -R * 0.98, R * 0.98);
            const x = -(R - Math.sqrt(R * R - yc * yc)) * arc;
            const rot = Math.asin(yc / R) * (180 / Math.PI) * tilt;

            el.style.transform =
                `translate(-50%, -50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) ` +
                `rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(4)})`;

            const side = smoothstep(clamp(abs / Math.max(maxOffset, 1), 0, 1));
            const opacity = fade * (1 - (1 - CFG.sideOpacity) * side);
            el.style.opacity = opacity.toFixed(3);

            const b =
                CFG.blur *
                smoothstep(clamp((abs - CFG.blurStart) / (fadeEnd - CFG.blurStart), 0, 1));
            el.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : 'none';

            el.style.zIndex = String(Math.round(100 - abs * 10));

            const shade = shades[i];
            if (shade) {
                const d = smoothstep(Math.min(abs, 2) / 2);
                shade.style.opacity = (CFG.dim * d).toFixed(3);
            }
        }

        const idx = mod(Math.round(pos), N);
        if (idx !== activeIdx) setActive(idx);
    }

    function setActive(idx: number) {
        activeIdx = idx;

        items.forEach((el, i) => {
            el.classList.toggle('is-active', i === idx);
            if (i === idx) el.setAttribute('aria-current', 'true');
            else el.removeAttribute('aria-current');
        });

        frames.forEach((f, i) => f.classList.toggle('is-active', i === idx));

        const { title = '', author = '', desc = '' } = items[idx].dataset;
        if (dTitle) dTitle.textContent = title;
        if (dAuthor) dAuthor.textContent = author;
        if (dDesc) dDesc.textContent = desc;
        if (dCounter) {
            dCounter.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
        }

        if (dInfo) {
            dInfo.classList.remove('pop');
            void dInfo.offsetWidth;
            dInfo.classList.add('pop');
        }
    }

    function frame(now: number) {
        raf = 0;
        const dt = clamp(now - lastFrame, 0, 50);
        lastFrame = now;

        if (!dragging) {
            if (reduceMotion.matches) pos = target;
            else pos += (target - pos) * (1 - Math.exp(-dt / CFG.smoothing));
            if (Math.abs(target - pos) < 0.0005) pos = target;
        }

        if (pos !== rendered) render();
        if (dragging || pos !== target) raf = requestAnimationFrame(frame);
    }

    function kick() {
        if (raf) return;
        lastFrame = performance.now();
        raf = requestAnimationFrame(frame);
    }

    function step(delta: number) {
        target = Math.round(target) + delta;
        kick();
    }

    function goTo(index: number) {
        const current = Math.round(target);
        let d = mod(index - current, N);
        if (d > N / 2) d -= N;
        target = current + d;
        kick();
    }

    const caseEl = document.getElementById('case');
    const caseScroll = document.getElementById('case-scroll');
    const caseClose = document.getElementById('case-close');
    const cImg = document.getElementById('case-img') as HTMLImageElement | null;
    const cTitle = document.getElementById('case-title');
    const cAuthor = document.getElementById('case-author');
    const cDesc = document.getElementById('case-desc');
    const cTags = document.getElementById('case-tags');
    const cGrid = document.getElementById('case-grid');
    const cStage = document.getElementById('case-stage');
    let lastFocus: HTMLElement | null = null;

    const MAX_Z = 5;
    let zs = 1;
    let tx = 0;
    let ty = 0;

    function applyZoom(animate = false) {
        if (!cImg || !cStage) return;
        const maxX = (cStage.clientWidth * (zs - 1)) / 2;
        const maxY = (cStage.clientHeight * (zs - 1)) / 2;
        tx = clamp(tx, -maxX, maxX);
        ty = clamp(ty, -maxY, maxY);
        cImg.style.transition = animate ? 'transform 0.25s ease' : 'none';
        cImg.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${zs})`;
        cStage.classList.toggle('is-zoomed', zs > 1.001);
    }

    function zoomAt(next: number, clientX: number, clientY: number, animate = false) {
        if (!cStage) return;
        const r = cStage.getBoundingClientRect();
        const cx = clientX - (r.left + r.width / 2);
        const cy = clientY - (r.top + r.height / 2);
        next = clamp(next, 1, MAX_Z);
        const k = next / zs;
        tx = cx - (cx - tx) * k;
        ty = cy - (cy - ty) * k;
        zs = next;
        if (zs === 1) tx = ty = 0;
        applyZoom(animate);
    }

    function zoomCenter(next: number) {
        if (!cStage) return;
        const r = cStage.getBoundingClientRect();
        zoomAt(next, r.left + r.width / 2, r.top + r.height / 2, true);
    }

    const io = new IntersectionObserver(
        (entries) =>
            entries.forEach((en) => {
                if (en.isIntersecting) {
                    en.target.classList.add('in');
                    io.unobserve(en.target);
                }
            }),
        { root: caseScroll, threshold: 0.1 },
    );

    const isOpen = () => !!caseEl?.classList.contains('is-open');

    document.getElementById('zoom-in')?.addEventListener('click', () => zoomCenter(zs * 1.5));
    document.getElementById('zoom-out')?.addEventListener('click', () => zoomCenter(zs / 1.5));
    document.getElementById('zoom-reset')?.addEventListener('click', () => zoomCenter(1));

    const ptrs = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;
    let pinchScale = 1;

    cStage?.addEventListener('pointerdown', (e) => {
        cStage.setPointerCapture(e.pointerId);
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ptrs.size === 2) {
            const [a, b] = [...ptrs.values()];
            pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
            pinchScale = zs;
        }
    });

    cStage?.addEventListener('pointermove', (e) => {
        const prev = ptrs.get(e.pointerId);
        if (!prev) return;
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (ptrs.size === 2) {
            const [a, b] = [...ptrs.values()];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            zoomAt(pinchScale * (dist / pinchDist), (a.x + b.x) / 2, (a.y + b.y) / 2);
        } else if (zs > 1) {
            tx += e.clientX - prev.x;
            ty += e.clientY - prev.y;
            applyZoom();
        }
    });

    const endPtr = (e: PointerEvent) => ptrs.delete(e.pointerId);
    cStage?.addEventListener('pointerup', endPtr);
    cStage?.addEventListener('pointercancel', endPtr);

    cStage?.addEventListener('dblclick', (e) =>
        zoomAt(zs > 1.01 ? 1 : 2.5, e.clientX, e.clientY, true),
    );

    cStage?.addEventListener('wheel', (e) => {
        e.preventDefault();
        zoomAt(zs * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    }, { passive: false });

    function openCase(idx: number) {
        const d = data[idx];
        if (!d || !caseEl || !cImg) return;

        lastFocus = document.activeElement as HTMLElement | null;

        cImg.src = d.src;
        cImg.alt = d.title;
        zs = 1; tx = 0; ty = 0;
        applyZoom();
        if (cTitle) cTitle.textContent = d.title;
        if (cAuthor) cAuthor.textContent = d.author;
        if (cDesc) cDesc.textContent = d.desc;

        cTags?.replaceChildren(
            ...(d.tags ?? []).map((t) => {
                const li = document.createElement('li');
                li.textContent = t;
                return li;
            }),
        );

        const figs = (d.mockups ?? []).map((m) => {
            const fig = document.createElement('figure');
            fig.className = `m m--${m.span ?? 'half'}`;
            const img = document.createElement('img');
            img.src = m.src;
            img.alt = m.alt ?? d.title;
            img.loading = 'lazy';
            img.draggable = false;
            fig.appendChild(img);
            return fig;
        });
        cGrid?.replaceChildren(...figs);

        if (caseScroll) caseScroll.scrollTop = 0;
        caseEl.classList.add('is-open');
        requestAnimationFrame(() =>
            requestAnimationFrame(() => {
                caseEl.classList.add('is-revealed');
                figs.forEach((f) => io.observe(f));
            }),
        );
        caseClose?.focus();
    }

    function closeCase() {
        if (!caseEl) return;
        caseEl.classList.remove('is-open', 'is-revealed');
        lastFocus?.focus?.();
    }

    caseClose?.addEventListener('click', closeCase);
    dFrame?.addEventListener('click', () => openCase(activeIdx));

    let pressed = false;
    let moved = false;
    let startY = 0;
    let startPos = 0;
    let lastY = 0;
    let lastMoveT = 0;
    let vel = 0;
    let downItem: HTMLElement | null = null;

    container.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        pressed = true;
        moved = false;
        startY = lastY = e.clientY;
        startPos = pos;
        vel = 0;
        lastMoveT = e.timeStamp;
        downItem = (e.target as HTMLElement).closest<HTMLElement>('.vcarrusel-item');
        target = pos;
    });

    container.addEventListener('pointermove', (e) => {
        if (!pressed) return;
        const dy = e.clientY - startY;

        if (!moved) {
            if (Math.abs(dy) < CFG.dragThreshold) return;
            moved = true;
            dragging = true;
            container.classList.add('dragging');
            container.setPointerCapture(e.pointerId);
            kick();
        }

        const dt = e.timeStamp - lastMoveT;
        if (dt > 0) vel = 0.7 * vel + 0.3 * ((e.clientY - lastY) / dt);
        lastY = e.clientY;
        lastMoveT = e.timeStamp;

        pos = startPos - dy / spacing;
        target = pos;
    });

    function endPress(e: PointerEvent) {
        if (!pressed) return;
        pressed = false;
        dragging = false;
        container.classList.remove('dragging');

        if (moved) {
            const idle = e.timeStamp - lastMoveT > 80;
            const v = idle ? 0 : -vel / spacing;
            target = Math.round(pos + clamp(v * CFG.inertia, -visible, visible));
        } else if (downItem && downItem !== items[activeIdx]) {
            goTo(items.indexOf(downItem));
            return;
        } else {
            target = Math.round(pos);
        }
        kick();
    }

    container.addEventListener('pointerup', endPress);
    container.addEventListener('pointercancel', endPress);

    container.addEventListener('click', (e) => {
        const it = (e.target as HTMLElement).closest<HTMLElement>('.vcarrusel-item');
        if (moved || (it && it !== items[activeIdx])) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (it && it === items[activeIdx]) openCase(activeIdx);
    }, true);

    container.addEventListener('dragstart', (e) => e.preventDefault());

    document.getElementById('v-up')?.addEventListener('click', () => step(-1));
    document.getElementById('v-down')?.addEventListener('click', () => step(1));

    window.addEventListener('keydown', (e) => {
        if (isOpen()) {
            if (e.key === 'Escape') closeCase();
            else if (e.key === '+' || e.key === '=') zoomCenter(zs * 1.5);
            else if (e.key === '-') zoomCenter(zs / 1.5);
            else if (e.key === '0') zoomCenter(1);
            return;
        }
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        const t = e.target as HTMLElement;
        if (t.matches?.('input, textarea, select, [contenteditable]')) return;

        switch (e.key) {
            case 'ArrowDown': step(1); break;
            case 'ArrowUp': step(-1); break;
            case 'Home': goTo(0); break;
            case 'End': goTo(N - 1); break;
            case 'Enter':
                if (t === container) openCase(activeIdx);
                break;
            default: return;
        }
        e.preventDefault();
    });

    let wheelTimer = 0;

    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        const px = e.deltaMode === 1 ? raw * 16 : e.deltaMode === 2 ? raw * 400 : raw;

        target += clamp(px, -200, 200) / CFG.wheelPerItem;
        kick();

        window.clearTimeout(wheelTimer);
        wheelTimer = window.setTimeout(() => {
            target = Math.round(target);
            kick();
        }, CFG.wheelSnapDelay);
    }, { passive: false });

    function measure() {
        const h = items[0].offsetHeight;
        if (!h) return;
        cardH = h;
        boxH = container.clientHeight || boxH;
        buildTable();
        spacing = yAt(1);
        rendered = NaN;
        render();
    }

    const ro = new ResizeObserver(measure);
    ro.observe(items[0]);
    ro.observe(container);
    compact.addEventListener('change', measure);
    measure();
}

const el = document.getElementById('vcarrusel-container');
if (el) init(el);