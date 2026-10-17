const CFG = {
    centerScale: 1.12,
    scaleStep: 0.2,
    minScale: 0.45,
    spacing: 1.06,
    dim: 0.22,
    blur: 0,
    smoothing: 110,
    inertia: 250,
    dragThreshold: 6,
    wheelThreshold: 40,
    wheelCooldown: 350,
};

const mod = (n: number, m: number) => ((n % m) + m) % m;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function init(container: HTMLElement) {
    const items = Array.from(container.querySelectorAll<HTMLElement>('.carrusel-item'));
    if (!items.length) return;

    const shades = items.map((el) => el.querySelector<HTMLElement>('.shade'));
    const pageBg = document.getElementById('page-bg');
    const bgText = document.getElementById('bg-text');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const N = items.length;
    const visible = Math.max(1, Math.min(N, Number(container.dataset.visible) || 3));
    const maxOffset = (visible - 1) / 2;
    const fadeEnd = Math.min(maxOffset + 1, N / 2);

    let pos = 0;
    let target = 0;
    let rendered = NaN;
    let spacing = 300;
    let activeIdx = -1;
    let raf = 0;
    let lastFrame = 0;
    let dragging = false;
    const hidden: boolean[] = items.map(() => false);

    function render() {
        rendered = pos;

        for (let i = 0; i < N; i++) {
            let o = mod(i - pos, N);
            if (o > N / 2) o -= N;
            const abs = Math.abs(o);
            const el = items[i];

            const fade = clamp((fadeEnd - abs) / (fadeEnd - maxOffset), 0, 1);

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

            const scale = Math.max(CFG.minScale, CFG.centerScale - CFG.scaleStep * abs);
            const d = Math.min(abs, 2);

            el.style.transform =
                `translate(-50%, -50%) translate3d(${(o * spacing).toFixed(2)}px, 0, 0) scale(${scale.toFixed(4)})`;
            el.style.opacity = fade.toFixed(3);
            el.style.zIndex = String(Math.round(100 - abs * 10));

            const shade = shades[i];
            if (shade) shade.style.opacity = (CFG.dim * d).toFixed(3);
            if (CFG.blur > 0) el.style.filter = `blur(${(CFG.blur * d).toFixed(2)}px)`;
        }

        const idx = mod(Math.round(pos), N);
        if (idx !== activeIdx) setActive(idx);
    }

    let lastText = bgText?.textContent ?? '';
    let textTimer = 0;

    function setActive(idx: number) {
        activeIdx = idx;
        items.forEach((el, i) => {
            el.classList.toggle('is-active', i === idx);
            if (i === idx) el.setAttribute('aria-current', 'true');
            else el.removeAttribute('aria-current');
        });

        const { color, text } = items[idx].dataset;
        if (color) pageBg?.style.setProperty('--bg-color', color);

        if (text && bgText && text !== lastText) {
            lastText = text;
            window.clearTimeout(textTimer);
            bgText.style.opacity = '0';
            bgText.style.transform = 'scale(0.95)';
            textTimer = window.setTimeout(() => {
                bgText.textContent = text;
                bgText.style.opacity = '1';
                bgText.style.transform = 'scale(1)';
            }, 180);
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

    let pressed = false;
    let moved = false;
    let startX = 0;
    let startPos = 0;
    let lastX = 0;
    let lastMoveT = 0;
    let vel = 0;
    let downItem: HTMLElement | null = null;

    container.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        pressed = true;
        moved = false;
        startX = lastX = e.clientX;
        startPos = pos;
        vel = 0;
        lastMoveT = e.timeStamp;
        downItem = (e.target as HTMLElement).closest<HTMLElement>('.carrusel-item');
        target = pos;
    });

    container.addEventListener('pointermove', (e) => {
        if (!pressed) return;
        const dx = e.clientX - startX;

        if (!moved) {
            if (Math.abs(dx) < CFG.dragThreshold) return;
            moved = true;
            dragging = true;
            container.classList.add('dragging');
            container.setPointerCapture(e.pointerId);
            kick();
        }

        const dt = e.timeStamp - lastMoveT;
        if (dt > 0) vel = 0.7 * vel + 0.3 * ((e.clientX - lastX) / dt);
        lastX = e.clientX;
        lastMoveT = e.timeStamp;

        pos = startPos - dx / spacing;
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
        const it = (e.target as HTMLElement).closest('.carrusel-item');
        if (moved || (it && it !== items[activeIdx])) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    document.getElementById('last')?.addEventListener('click', () => step(-1));
    document.getElementById('next')?.addEventListener('click', () => step(1));

    container.addEventListener('dragstart', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        const t = e.target as HTMLElement;
        if (t.matches?.('input, textarea, select, [contenteditable]')) return;

        switch (e.key) {
            case 'ArrowRight': step(1); break;
            case 'ArrowLeft': step(-1); break;
            case 'Home': goTo(0); break;
            case 'End': goTo(N - 1); break;
            default: return;
        }
        e.preventDefault();
    });

    let wheelAcc = 0;
    let wheelLock = 0;
    let lastWheel = 0;

    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const now = performance.now();
        if (now - lastWheel > 200) wheelAcc = 0;
        lastWheel = now;
        if (now < wheelLock) return;

        wheelAcc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (Math.abs(wheelAcc) >= CFG.wheelThreshold) {
            step(wheelAcc > 0 ? 1 : -1);
            wheelAcc = 0;
            wheelLock = now + CFG.wheelCooldown;
        }
    }, { passive: false });

    function measure() {
        const w = items[0].offsetWidth;
        if (!w) return;
        spacing = w * CFG.spacing;
        render();
    }

    new ResizeObserver(measure).observe(items[0]);
    measure();
}

const el = document.getElementById('carrusel-container');
if (el) init(el);