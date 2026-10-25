
export {};

const STICKER_CFG = {
    dragThreshold: 5,
    keyStep: 24,
};

type StickerItem = {
    el: HTMLElement;
    x: number;
    y: number;
    fx: number;
    fy: number;
};

type ActiveDrag = {
    item: StickerItem;
    id: number;
    startX: number;
    startY: number;
    ox: number;
    oy: number;
    moved: boolean;
};

function initStickers(root: HTMLElement) {
    const stickers: StickerItem[] = Array.from(
        root.querySelectorAll<HTMLElement>('.sticker-item'),
    ).map((el) => ({ el, x: 0, y: 0, fx: 0, fy: 0 }));
    if (!stickers.length) return;

    root.querySelectorAll('a, img').forEach((n) => n.setAttribute('draggable', 'false'));

    let zTop = 20;
    let wasDragged = false;
    let active: ActiveDrag | null = null;

    function apply(s: StickerItem) {
        s.el.style.setProperty('--dx', `${s.x.toFixed(2)}px`);
        s.el.style.setProperty('--dy', `${s.y.toFixed(2)}px`);
    }

    function fit(s: StickerItem) {
        const c = root.getBoundingClientRect();
        if (!c.width || !c.height) return;
        const r = s.el.getBoundingClientRect();
        let ddx = 0;
        let ddy = 0;

        if (r.right > c.right) ddx = c.right - r.right;
        if (r.left + ddx < c.left) ddx = c.left - r.left;
        if (r.bottom > c.bottom) ddy = c.bottom - r.bottom;
        if (r.top + ddy < c.top) ddy = c.top - r.top;

        if (ddx || ddy) {
            s.x += ddx;
            s.y += ddy;
            apply(s);
        }
    }

    function remember(s: StickerItem) {
        const { width, height } = root.getBoundingClientRect();
        s.fx = width ? s.x / width : 0;
        s.fy = height ? s.y / height : 0;
    }

    function bringToFront(s: StickerItem) {
        s.el.style.zIndex = String(++zTop);
    }

    root.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const el = (e.target as HTMLElement).closest<HTMLElement>('.sticker-item');
        const item = stickers.find((s) => s.el === el);
        if (!item) return;

        wasDragged = false;
        active = {
            item,
            id: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            ox: item.x,
            oy: item.y,
            moved: false,
        };
        bringToFront(item);
    });

    root.addEventListener('pointermove', (e) => {
        if (!active || e.pointerId !== active.id) return;

        const dx = e.clientX - active.startX;
        const dy = e.clientY - active.startY;

        if (!active.moved) {
            if (Math.hypot(dx, dy) < STICKER_CFG.dragThreshold) return;
            active.moved = true;
            wasDragged = true;
            active.item.el.classList.add('dragging');
            active.item.el.setPointerCapture(e.pointerId);
        }

        active.item.x = active.ox + dx;
        active.item.y = active.oy + dy;
        apply(active.item);
        fit(active.item);
    });

    function endDrag(e: PointerEvent) {
        if (!active || e.pointerId !== active.id) return;
        active.item.el.classList.remove('dragging');
        remember(active.item);
        active = null;
    }

    root.addEventListener('pointerup', endDrag);
    root.addEventListener('pointercancel', endDrag);

    root.addEventListener(
        'click',
        (e) => {
            if (wasDragged) {
                e.preventDefault();
                e.stopPropagation();
                wasDragged = false;
            }
        },
        true,
    );

    root.addEventListener('dragstart', (e) => e.preventDefault());

    root.addEventListener('keydown', (e) => {
        if (!e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
        const el = (e.target as HTMLElement).closest<HTMLElement>('.sticker-item');
        const item = stickers.find((s) => s.el === el);
        if (!item) return;

        switch (e.key) {
            case 'ArrowLeft': item.x -= STICKER_CFG.keyStep; break;
            case 'ArrowRight': item.x += STICKER_CFG.keyStep; break;
            case 'ArrowUp': item.y -= STICKER_CFG.keyStep; break;
            case 'ArrowDown': item.y += STICKER_CFG.keyStep; break;
            default: return;
        }
        e.preventDefault();
        bringToFront(item);
        apply(item);
        fit(item);
        remember(item);
    });

    new ResizeObserver(() => {
        const { width, height } = root.getBoundingClientRect();
        if (!width || !height) return;
        for (const s of stickers) {
            s.x = s.fx * width;
            s.y = s.fy * height;
            apply(s);
            fit(s);
        }
    }).observe(root);
}

const stickerRoot = document.getElementById('sticker-container');
if (stickerRoot) initStickers(stickerRoot);