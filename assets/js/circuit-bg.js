/**
 * Sparse circuit accents — small animated patches here and there (homepage only).
 */
(function initCircuitBackground() {
    const canvas = document.getElementById('circuit-canvas');
    if (!canvas || !document.body.classList.contains('page-home')) {
        return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');

    let width = 0;
    let height = 0;
    let nodes = [];
    let edges = [];
    let pulses = [];
    let animationId = null;

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    /** Patch anchors (% of viewport) — scattered, not full coverage */
    function patchAnchors() {
        const mobile = width < 768;
        if (mobile) {
            return [
                { x: 0.12, y: 0.2 },
                { x: 0.88, y: 0.35 },
                { x: 0.18, y: 0.62 },
                { x: 0.82, y: 0.78 },
            ];
        }
        return [
            { x: 0.1, y: 0.18 },
            { x: 0.88, y: 0.22 },
            { x: 0.15, y: 0.48 },
            { x: 0.92, y: 0.55 },
            { x: 0.08, y: 0.78 },
            { x: 0.75, y: 0.85 },
        ];
    }

    function buildPatch(centerX, centerY) {
        const cols = 4;
        const rows = 3;
        const spacing = 52;
        const startX = centerX - ((cols - 1) * spacing) / 2;
        const startY = centerY - ((rows - 1) * spacing) / 2;
        const localNodes = [];
        const index = [];

        for (let r = 0; r < rows; r += 1) {
            index[r] = [];
            for (let c = 0; c < cols; c += 1) {
                const i = localNodes.length;
                localNodes.push({
                    x: startX + c * spacing + rand(-8, 8),
                    y: startY + r * spacing + rand(-8, 8),
                    phase: Math.random() * Math.PI * 2,
                    cx: centerX,
                    cy: centerY,
                });
                index[r][c] = i;
            }
        }

        const localEdges = [];
        const link = (a, b) => {
            if (localNodes[a] && localNodes[b]) {
                localEdges.push({
                    points: orthPath(localNodes[a], localNodes[b]),
                    cx: centerX,
                    cy: centerY,
                });
            }
        };

        for (let r = 0; r < rows; r += 1) {
            for (let c = 0; c < cols; c += 1) {
                if (c < cols - 1) {
                    link(index[r][c], index[r][c + 1]);
                }
                if (r < rows - 1) {
                    link(index[r][c], index[r + 1][c]);
                }
            }
        }

        return { nodes: localNodes, edges: localEdges };
    }

    function orthPath(n1, n2) {
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

    function buildScene() {
        nodes = [];
        edges = [];
        pulses = [];

        patchAnchors().forEach((anchor) => {
            const cx = anchor.x * width;
            const cy = anchor.y * height;
            const patch = buildPatch(cx, cy);
            const edgeOffset = edges.length;

            patch.nodes.forEach((n) => nodes.push(n));
            patch.edges.forEach((e) => edges.push(e));

            if (!prefersReducedMotion && patch.edges.length) {
                pulses.push({
                    edgeIndex: edgeOffset + Math.floor(Math.random() * patch.edges.length),
                    t: Math.random(),
                    speed: rand(0.001, 0.0022),
                });
            }
        });
    }

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildScene();
        draw(0);
    }

    function patchFade(node) {
        const maxR = 130;
        const d = Math.hypot(node.x - node.cx, node.y - node.cy);
        return Math.max(0, 1 - d / maxR);
    }

    function pointOnPath(points, t) {
        let total = 0;
        const lens = [];
        for (let i = 0; i < points.length - 1; i += 1) {
            const len = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
            lens.push(len);
            total += len;
        }
        let d = ((t % 1) + 1) % 1 * total;
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

    function draw(time) {
        ctx.clearRect(0, 0, width, height);

        edges.forEach((edge) => {
            const pts = edge.points;
            if (!pts.length) {
                return;
            }
            const fade = patchFade({ x: pts[0].x, y: pts[0].y, cx: edge.cx, cy: edge.cy });
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i += 1) {
                ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.strokeStyle = `rgba(140, 198, 63, ${0.14 * fade})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        nodes.forEach((node) => {
            const fade = patchFade(node);
            const a = prefersReducedMotion
                ? 0.28 * fade
                : (0.2 + Math.sin(time * 0.0018 + node.phase) * 0.14) * fade;
            if (a < 0.03) {
                return;
            }
            ctx.beginPath();
            ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(140, 198, 63, ${a})`;
            ctx.fill();
        });

        if (!prefersReducedMotion) {
            pulses.forEach((pulse) => {
                const edge = edges[pulse.edgeIndex];
                if (!edge || !edge.points.length) {
                    return;
                }
                const pos = pointOnPath(edge.points, pulse.t);
                const fade = patchFade({ x: pos.x, y: pos.y, cx: edge.cx, cy: edge.cy });
                const g = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 7);
                g.addColorStop(0, `rgba(170, 235, 100, ${0.5 * fade})`);
                g.addColorStop(1, 'rgba(140, 198, 63, 0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }

    function tick(time) {
        pulses.forEach((p) => {
            p.t += p.speed;
            if (p.t > 1) {
                p.t = 0;
            }
        });
        draw(time);
        animationId = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener('resize', resize);

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
