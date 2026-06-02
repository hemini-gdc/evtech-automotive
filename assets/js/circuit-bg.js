/**
 * Animated circuit background — section.advantages (Why Choose Us) only.
 * Procedural PCB-style traces (orthogonal routing, pads, vias, IC footprints).
 */
(function initCircuitBackground() {
    const section = document.querySelector('section.advantages');
    const canvas = section?.querySelector('#circuit-canvas');

    if (!section || !canvas || !document.body.classList.contains('theme-dark')) {
        return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');

    const LINE_COLOR = '140, 198, 63';
    const PULSE_COLOR = '190, 255, 120';
    const TEXT_PAD = 28;
    const FEATHER = 36;

    const TEXT_EXCLUSION_SELECTOR = [
        '.advantages-header',
        '.advantages-title',
        '.advantages-intro',
        '.advantage-card',
        '.advantage-card-content',
        '.advantage-card-media',
    ].join(', ');

    const DIR = {
        n: { dx: 0, dy: -1 },
        s: { dx: 0, dy: 1 },
        e: { dx: 1, dy: 0 },
        w: { dx: -1, dy: 0 },
    };
    const OPPOSITE = { n: 's', s: 'n', e: 'w', w: 'e' };
    const PERP = {
        n: ['e', 'w'],
        s: ['e', 'w'],
        e: ['n', 's'],
        w: ['n', 's'],
    };

    let width = 0;
    let height = 0;
    let nodes = [];
    let edges = [];
    let chips = [];
    let pulses = [];
    let exclusionZones = [];
    let animationId = null;

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    function randInt(min, max) {
        return Math.floor(rand(min, max + 1));
    }

    function snap(v, grid) {
        return Math.round(v / grid) * grid;
    }

    function rectToLocal(rect, pad) {
        const sRect = section.getBoundingClientRect();
        return {
            left: rect.left - sRect.left - pad,
            right: rect.right - sRect.left + pad,
            top: rect.top - sRect.top - pad,
            bottom: rect.bottom - sRect.top + pad,
        };
    }

    function updateExclusionZones() {
        exclusionZones = [];

        section.querySelectorAll(TEXT_EXCLUSION_SELECTOR).forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2) {
                return;
            }
            exclusionZones.push(rectToLocal(rect, TEXT_PAD));
        });
    }

    function distToRect(x, y, zone) {
        const dx = x < zone.left ? zone.left - x : x > zone.right ? x - zone.right : 0;
        const dy = y < zone.top ? zone.top - y : y > zone.bottom ? y - zone.bottom : 0;
        return Math.hypot(dx, dy);
    }

    function visibilityAt(x, y) {
        if (x < 0 || x > width || y < 0 || y > height) {
            return 0;
        }

        let minDist = Infinity;

        for (let i = 0; i < exclusionZones.length; i += 1) {
            const zone = exclusionZones[i];
            if (x >= zone.left && x <= zone.right && y >= zone.top && y <= zone.bottom) {
                return 0;
            }
            minDist = Math.min(minDist, distToRect(x, y, zone));
        }

        if (minDist === Infinity || minDist >= FEATHER) {
            return 1;
        }
        return minDist / FEATHER;
    }

    function isFullyExcluded(x, y) {
        return visibilityAt(x, y) <= 0.02;
    }

    function pointsVisible(points) {
        let maxVis = 0;
        points.forEach((p) => {
            maxVis = Math.max(maxVis, visibilityAt(p.x, p.y));
        });
        return maxVis;
    }

    function gridSpacing() {
        const mobile = width < 768;
        return {
            x: mobile ? 280 : 200,
            y: mobile ? 320 : 220,
        };
    }

    function gridAnchors() {
        const { x: stepX, y: stepY } = gridSpacing();
        const anchors = [];
        const offsetX = stepX * 0.28;
        const offsetY = stepY * 0.2;

        for (let row = 0, y = stepY * 0.4; y < height + stepY; row += 1, y += stepY) {
            const rowShift = (row % 2) * (stepX * 0.5);
            for (let x = stepX * 0.25 + rowShift; x < width + stepX; x += stepX) {
                const ax = x + rand(-offsetX, offsetX);
                const ay = y + rand(-offsetY, offsetY);
                if (isFullyExcluded(ax, ay)) {
                    continue;
                }
                anchors.push({ x: ax, y: ay });
            }
        }
        return anchors;
    }

    function orthPath(n1, n2) {
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;

        if (Math.abs(dx) < 3 || Math.abs(dy) < 3) {
            return [
                { x: n1.x, y: n1.y },
                { x: n2.x, y: n2.y },
            ];
        }

        if (Math.random() > 0.5) {
            return [
                { x: n1.x, y: n1.y },
                { x: n2.x, y: n1.y },
                { x: n2.x, y: n2.y },
            ];
        }
        return [
            { x: n1.x, y: n1.y },
            { x: n1.x, y: n2.y },
            { x: n2.x, y: n2.y },
        ];
    }

    function buildPatch(centerX, centerY) {
        const mobile = width < 768;
        const patchW = mobile ? rand(130, 185) : rand(175, 255);
        const patchH = mobile ? rand(95, 140) : rand(125, 185);
        const grid = mobile ? 14 : 16;
        const left = centerX - patchW / 2;
        const top = centerY - patchH / 2;
        const right = left + patchW;
        const bottom = top + patchH;

        const localNodes = [];
        const localEdges = [];
        const localChips = [];
        const nodeMap = new Map();
        const edgeKeys = new Set();

        function nodeKey(x, y) {
            return `${snap(x, grid)},${snap(y, grid)}`;
        }

        function getOrCreateNode(x, y, kind) {
            const sx = snap(x, grid);
            const sy = snap(y, grid);
            if (sx < left || sx > right || sy < top || sy > bottom) {
                return -1;
            }
            if (isFullyExcluded(sx, sy)) {
                return -1;
            }

            const key = nodeKey(sx, sy);
            if (nodeMap.has(key)) {
                const idx = nodeMap.get(key);
                if (kind === 'pad' || kind === 'via') {
                    localNodes[idx].pad = kind;
                }
                return idx;
            }

            const idx = localNodes.length;
            nodeMap.set(key, idx);
            localNodes.push({
                x: sx + rand(-1.2, 1.2),
                y: sy + rand(-1.2, 1.2),
                phase: Math.random() * Math.PI * 2,
                cx: centerX,
                cy: centerY,
                pad: kind || 'junction',
            });
            return idx;
        }

        function addEdge(aIdx, bIdx, widthMul) {
            if (aIdx < 0 || bIdx < 0 || aIdx === bIdx) {
                return;
            }
            const key = aIdx < bIdx ? `${aIdx}-${bIdx}` : `${bIdx}-${aIdx}`;
            if (edgeKeys.has(key)) {
                return;
            }

            const a = localNodes[aIdx];
            const b = localNodes[bIdx];
            const points = orthPath(a, b);
            if (pointsVisible(points) < 0.08) {
                return;
            }

            edgeKeys.add(key);
            localEdges.push({
                points,
                cx: centerX,
                cy: centerY,
                width: widthMul || 1,
            });
        }

        function stepInDirection(x, y, dir, segments) {
            const vec = DIR[dir];
            const dist = segments * grid;
            return {
                x: x + vec.dx * dist,
                y: y + vec.dy * dist,
            };
        }

        function runTrace(startX, startY, stepCount) {
            let x = snap(startX, grid);
            let y = snap(startY, grid);
            let idx = getOrCreateNode(x, y, 'pad');
            let lastDir = null;

            for (let s = 0; s < stepCount; s += 1) {
                const dirs = ['n', 's', 'e', 'w'].filter((d) => d !== OPPOSITE[lastDir]);
                const dir = dirs[randInt(0, dirs.length - 1)];
                const segments = randInt(1, 4);
                const next = stepInDirection(x, y, dir, segments);

                const nextIdx = getOrCreateNode(next.x, next.y, s === stepCount - 1 ? 'pad' : 'junction');
                if (idx >= 0 && nextIdx >= 0) {
                    addEdge(idx, nextIdx, lastDir ? 1 : 1.15);
                }

                if (nextIdx >= 0 && Math.random() < 0.28) {
                    const branchDir = PERP[dir][randInt(0, 1)];
                    const branchLen = randInt(1, 3);
                    const branchEnd = stepInDirection(next.x, next.y, branchDir, branchLen);
                    const branchIdx = getOrCreateNode(branchEnd.x, branchEnd.y, 'via');
                    if (branchIdx >= 0) {
                        addEdge(nextIdx, branchIdx, 0.85);
                        localNodes[branchIdx].pad = 'via';
                    }
                }

                x = snap(next.x, grid);
                y = snap(next.y, grid);
                idx = nextIdx;
                lastDir = dir;
            }
        }

        function addBusTrace(startX, startY, dir, length) {
            let x = snap(startX, grid);
            let y = snap(startY, grid);
            let idx = getOrCreateNode(x, y, 'pad');
            const segments = Math.max(2, Math.floor(length / grid));

            for (let i = 0; i < segments; i += 1) {
                const next = stepInDirection(x, y, dir, 1);
                const nextIdx = getOrCreateNode(next.x, next.y, i === segments - 1 ? 'pad' : 'junction');
                if (idx >= 0 && nextIdx >= 0) {
                    addEdge(idx, nextIdx, 1.2);
                }

                if (nextIdx >= 0 && Math.random() < 0.35) {
                    const spurDir = PERP[dir][randInt(0, 1)];
                    const spurEnd = stepInDirection(next.x, next.y, spurDir, randInt(1, 2));
                    const spurIdx = getOrCreateNode(spurEnd.x, spurEnd.y, 'via');
                    if (spurIdx >= 0) {
                        addEdge(nextIdx, spurIdx, 0.8);
                    }
                }

                x = next.x;
                y = next.y;
                idx = nextIdx;
            }
        }

        function addChip(cx, cy) {
            const chipW = rand(28, 42);
            const chipH = rand(18, 28);
            if (
                cx - chipW / 2 < left ||
                cx + chipW / 2 > right ||
                cy - chipH / 2 < top ||
                cy + chipH / 2 > bottom ||
                isFullyExcluded(cx, cy)
            ) {
                return;
            }

            const chip = {
                x: cx,
                y: cy,
                w: chipW,
                h: chipH,
                cx: centerX,
                cy: centerY,
                pinIndices: [],
            };

            const pinOffsets = [
                { x: -chipW / 2, y: -chipH / 4 },
                { x: -chipW / 2, y: chipH / 4 },
                { x: chipW / 2, y: -chipH / 4 },
                { x: chipW / 2, y: chipH / 4 },
                { x: 0, y: -chipH / 2 },
                { x: 0, y: chipH / 2 },
            ];

            pinOffsets.forEach((off) => {
                const pinIdx = getOrCreateNode(cx + off.x, cy + off.y, 'pad');
                if (pinIdx >= 0) {
                    chip.pinIndices.push(pinIdx);
                    localNodes[pinIdx].pad = 'pad';
                }
            });

            if (chip.pinIndices.length >= 2) {
                localChips.push(chip);
                const midIdx = getOrCreateNode(cx, cy, 'junction');
                chip.pinIndices.forEach((pinIdx) => {
                    if (midIdx >= 0) {
                        addEdge(midIdx, pinIdx, 0.75);
                    }
                });
            }
        }

        const traceCount = mobile ? randInt(3, 5) : randInt(4, 7);
        for (let t = 0; t < traceCount; t += 1) {
            runTrace(
                rand(left + grid * 2, right - grid * 2),
                rand(top + grid * 2, bottom - grid * 2),
                randInt(7, 16)
            );
        }

        if (Math.random() > 0.25) {
            addBusTrace(
                rand(left + grid, right - grid * 3),
                rand(top + grid, bottom - grid),
                Math.random() > 0.5 ? 'e' : 's',
                rand(grid * 4, grid * 8)
            );
        }

        if (Math.random() > 0.35) {
            addChip(centerX + rand(-patchW * 0.2, patchW * 0.2), centerY + rand(-patchH * 0.2, patchH * 0.2));
        }

        return { nodes: localNodes, edges: localEdges, chips: localChips };
    }

    function buildScene() {
        updateExclusionZones();
        nodes = [];
        edges = [];
        chips = [];
        pulses = [];

        gridAnchors().forEach((anchor) => {
            const patch = buildPatch(anchor.x, anchor.y);
            if (!patch.nodes.length) {
                return;
            }

            const nodeOffset = nodes.length;
            const edgeOffset = edges.length;
            patch.nodes.forEach((n) => nodes.push(n));
            patch.edges.forEach((e) => edges.push(e));
            patch.chips.forEach((c) => {
                chips.push({
                    ...c,
                    pinIndices: c.pinIndices.map((i) => i + nodeOffset),
                });
            });

            if (!prefersReducedMotion && patch.edges.length) {
                const pulseCount = width < 768 ? 1 : 2;
                for (let p = 0; p < pulseCount; p += 1) {
                    pulses.push({
                        edgeIndex: edgeOffset + Math.floor(Math.random() * patch.edges.length),
                        t: Math.random(),
                        speed: rand(0.0025, 0.0055),
                        trail: rand(0.06, 0.12),
                    });
                }
            }
        });
    }

    function sectionInView() {
        const rect = section.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight;
    }

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = section.clientWidth;
        height = section.clientHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildScene();
        draw(performance.now());
    }

    function patchFade(node) {
        const maxR = width < 768 ? 110 : 125;
        const d = Math.hypot(node.x - node.cx, node.y - node.cy);
        return Math.max(0.65, 1 - (d / maxR) * 0.35);
    }

    function pointOnPath(points, t) {
        let total = 0;
        const lens = [];
        for (let i = 0; i < points.length - 1; i += 1) {
            const len = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
            lens.push(len);
            total += len;
        }
        let d = ((((t % 1) + 1) % 1) * total);
        for (let i = 0; i < lens.length; i += 1) {
            if (d <= lens[i]) {
                const r = lens[i] === 0 ? 0 : d / lens[i];
                return {
                    x: points[i].x + (points[i + 1].x - points[i].x) * r,
                    y: points[i].y + (points[i + 1].y - points[i].y) * r,
                };
            }
            d -= lens[i];
        }
        return points[points.length - 1];
    }

    function samplePath(points, tStart, tEnd, steps) {
        const samples = [];
        for (let i = 0; i <= steps; i += 1) {
            const t = tStart + ((tEnd - tStart) * i) / steps;
            samples.push(pointOnPath(points, t));
        }
        return samples;
    }

    function drawPulseTrail(edge, pulse, fade) {
        const pts = edge.points;
        if (pts.length < 2) {
            return;
        }

        const tEnd = pulse.t;
        const tStart = Math.max(0, pulse.t - pulse.trail);
        const trailPts = samplePath(pts, tStart, tEnd, 8);
        if (trailPts.length < 2) {
            return;
        }

        const head = trailPts[trailPts.length - 1];
        const headVis = visibilityAt(head.x, head.y);
        if (headVis < 0.08) {
            return;
        }

        const trailFade = fade * headVis;
        const grad = ctx.createLinearGradient(
            trailPts[0].x,
            trailPts[0].y,
            head.x,
            head.y
        );
        grad.addColorStop(0, `rgba(${PULSE_COLOR}, 0)`);
        grad.addColorStop(0.55, `rgba(${PULSE_COLOR}, ${0.34 * trailFade})`);
        grad.addColorStop(1, `rgba(${PULSE_COLOR}, ${0.82 * trailFade})`);

        ctx.beginPath();
        ctx.moveTo(trailPts[0].x, trailPts[0].y);
        for (let i = 1; i < trailPts.length; i += 1) {
            ctx.lineTo(trailPts[i].x, trailPts[i].y);
        }
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 10);
        g.addColorStop(0, `rgba(255, 255, 240, ${0.9 * trailFade})`);
        g.addColorStop(0.35, `rgba(${PULSE_COLOR}, ${0.6 * trailFade})`);
        g.addColorStop(1, `rgba(${PULSE_COLOR}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 10, 0, Math.PI * 2);
        ctx.fill();
    }

    function nearestPulseGlow(node) {
        if (prefersReducedMotion) {
            return 0;
        }
        let boost = 0;
        pulses.forEach((pulse) => {
            const edge = edges[pulse.edgeIndex];
            if (!edge) {
                return;
            }
            const pos = pointOnPath(edge.points, pulse.t);
            const dist = Math.hypot(node.x - pos.x, node.y - pos.y);
            if (dist < 22) {
                boost = Math.max(boost, 1 - dist / 22);
            }
        });
        return boost;
    }

    function drawChip(chip, time) {
        const vis = visibilityAt(chip.x, chip.y);
        if (vis < 0.08) {
            return;
        }

        const fade = patchFade({ x: chip.x, y: chip.y, cx: chip.cx, cy: chip.cy }) * vis;
        const pulse = prefersReducedMotion ? 0 : 0.04 * Math.sin(time * 0.0018 + chip.x);

        ctx.save();
        ctx.translate(chip.x, chip.y);
        ctx.strokeStyle = `rgba(${LINE_COLOR}, ${0.5 * fade})`;
        ctx.fillStyle = `rgba(8, 14, 10, ${0.85 * fade})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-chip.w / 2, -chip.h / 2, chip.w, chip.h, 3);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = `rgba(${LINE_COLOR}, ${0.35 * fade})`;
        ctx.beginPath();
        ctx.moveTo(-chip.w / 2 + 4, 0);
        ctx.lineTo(chip.w / 2 - 4, 0);
        ctx.stroke();
        ctx.restore();

        chip.pinIndices.forEach((pinIdx) => {
            const node = nodes[pinIdx];
            if (node) {
                node._chipGlow = fade + pulse;
            }
        });
    }

    function drawPad(node, fade, glow, time) {
        const pad = node.pad || 'junction';
        const vis = visibilityAt(node.x, node.y);
        if (vis < 0.08) {
            return;
        }

        const f = fade * vis;
        const chipBoost = node._chipGlow || 0;
        const pulse = prefersReducedMotion
            ? 0
            : 0.12 * Math.sin(time * 0.0022 + node.phase);

        if (pad === 'pad') {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(12, 18, 14, ${0.9 * f})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(${LINE_COLOR}, ${0.55 * f})`;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${LINE_COLOR}, ${(0.65 + pulse) * f})`;
            ctx.fill();
        } else if (pad === 'via') {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 2.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${LINE_COLOR}, ${(0.35 + pulse * 0.5) * f})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(node.x, node.y, 1.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 240, ${(0.5 + glow * 0.4) * f})`;
            ctx.fill();
        } else {
            const base = prefersReducedMotion
                ? 0.42 * f
                : (0.32 + Math.sin(time * 0.0022 + node.phase) * 0.14) * f;
            const a = Math.min(1, base + glow * 0.5 + chipBoost * 0.3);
            ctx.beginPath();
            ctx.arc(node.x, node.y, 1.8 + glow, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${LINE_COLOR}, ${a})`;
            ctx.fill();
        }

        if (glow > 0.35 || chipBoost > 0.2) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 6 + glow * 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${PULSE_COLOR}, ${(glow * 0.45 + chipBoost * 0.25) * f})`;
            ctx.fill();
        }

        node._chipGlow = 0;
    }

    function draw(time) {
        ctx.clearRect(0, 0, width, height);

        if (!sectionInView()) {
            return;
        }

        updateExclusionZones();

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        edges.forEach((edge) => {
            const pts = edge.points;
            if (!pts.length) {
                return;
            }

            const vis = pointsVisible(pts);
            if (vis < 0.08) {
                return;
            }

            const fade = patchFade({ x: pts[0].x, y: pts[0].y, cx: edge.cx, cy: edge.cy }) * vis;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i += 1) {
                ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.strokeStyle = `rgba(${LINE_COLOR}, ${0.42 * fade})`;
            ctx.lineWidth = 1.1 * (edge.width || 1);
            ctx.stroke();
        });

        chips.forEach((chip) => drawChip(chip, time));

        if (!prefersReducedMotion) {
            pulses.forEach((pulse) => {
                const edge = edges[pulse.edgeIndex];
                if (!edge || !edge.points.length) {
                    return;
                }
                const vis = pointsVisible(edge.points);
                if (vis < 0.08) {
                    return;
                }
                const fade = patchFade({ x: edge.points[0].x, y: edge.points[0].y, cx: edge.cx, cy: edge.cy }) * vis;
                drawPulseTrail(edge, pulse, fade);
            });
        }

        nodes.forEach((node) => {
            const vis = visibilityAt(node.x, node.y);
            if (vis < 0.08) {
                return;
            }

            const fade = patchFade(node) * vis;
            const glow = nearestPulseGlow(node);
            drawPad(node, fade, glow, time);
        });
    }

    function tick(time) {
        if (!prefersReducedMotion) {
            pulses.forEach((p) => {
                p.t += p.speed;
                if (p.t > 1) {
                    p.t = 0;
                    const edge = edges[p.edgeIndex];
                    if (!edge || pointsVisible(edge.points) < 0.2) {
                        p.edgeIndex = pickVisibleEdge();
                    } else if (Math.random() > 0.65) {
                        p.edgeIndex = pickVisibleEdge();
                    }
                }
            });
        }
        draw(time);
        animationId = requestAnimationFrame(tick);
    }

    function pickVisibleEdge() {
        const visible = edges
            .map((e, i) => ({ e, i }))
            .filter(({ e }) => pointsVisible(e.points) > 0.25);
        if (!visible.length) {
            return Math.floor(Math.random() * edges.length);
        }
        return visible[Math.floor(Math.random() * visible.length)].i;
    }

    let rebuildTimer = null;
    function scheduleRebuild() {
        if (rebuildTimer) {
            clearTimeout(rebuildTimer);
        }
        rebuildTimer = setTimeout(() => {
            resize();
        }, 120);
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', () => draw(performance.now()), { passive: true });

    if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(scheduleRebuild);
        ro.observe(section);
    }

    if (!prefersReducedMotion) {
        animationId = requestAnimationFrame(tick);
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        } else if (!document.hidden && !animationId && !prefersReducedMotion) {
            animationId = requestAnimationFrame(tick);
        }
    });
})();
