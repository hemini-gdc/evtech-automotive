/**
 * Subtle animated circuit accent for the homepage (sparse, not busy).
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

    function pageHeight() {
        return Math.max(document.documentElement.scrollHeight, window.innerHeight);
    }

    function buildGrid() {
        const spacing = window.innerWidth < 768 ? 200 : 260;
        const cols = Math.ceil(width / spacing) + 1;
        const rows = Math.ceil(height / spacing) + 1;
        nodes = [];
        edges = [];
        pulses = [];

        for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < cols; col += 1) {
                nodes.push({
                    x: col * spacing + rand(-20, 20),
                    y: row * spacing + rand(-20, 20),
                    phase: Math.random() * Math.PI * 2,
                });
            }
        }

        const at = (c, r) => r * cols + c;

        for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < cols; col += 1) {
                const from = at(col, row);
                if (col < cols - 1 && Math.random() > 0.35) {
                    edges.push(path(nodes[from], nodes[at(col + 1, row)]));
                }
                if (row < rows - 1 && Math.random() > 0.35) {
                    edges.push(path(nodes[from], nodes[at(col, row + 1)]));
                }
            }
        }

        const pulseCount = prefersReducedMotion ? 0 : Math.min(5, Math.max(2, Math.floor(edges.length * 0.08)));
        for (let i = 0; i < pulseCount && edges.length; i += 1) {
            pulses.push({
                edgeIndex: Math.floor(Math.random() * edges.length),
                t: Math.random(),
                speed: rand(0.0008, 0.0018),
            });
        }
    }

    function path(n1, n2) {
        if (!n1 || !n2) {
            return [];
        }
        if (Math.random() > 0.5) {
            return [{ x: n1.x, y: n1.y }, { x: n2.x, y: n1.y }, { x: n2.x, y: n2.y }];
        }
        return [{ x: n1.x, y: n1.y }, { x: n1.x, y: n2.y }, { x: n2.x, y: n2.y }];
    }

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = pageHeight();
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildGrid();
        draw(0);
    }

    function pointOnPath(points, t) {
        let total = 0;
        const seg = [];
        for (let i = 0; i < points.length - 1; i += 1) {
            const len = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
            seg.push(len);
            total += len;
        }
        let d = ((t % 1) + 1) % 1 * total;
        for (let i = 0; i < seg.length; i += 1) {
            if (d <= seg[i]) {
                const r = d / seg[i];
                return {
                    x: points[i].x + (points[i + 1].x - points[i].x) * r,
                    y: points[i].y + (points[i + 1].y - points[i].y) * r,
                };
            }
            d -= seg[i];
        }
        return points[points.length - 1];
    }

    function draw(time) {
        ctx.clearRect(0, 0, width, height);

        edges.forEach((pts) => {
            if (!pts.length) {
                return;
            }
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i += 1) {
                ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.strokeStyle = 'rgba(140, 198, 63, 0.09)';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        nodes.forEach((node) => {
            const a = prefersReducedMotion ? 0.25 : 0.18 + Math.sin(time * 0.0015 + node.phase) * 0.12;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(140, 198, 63, ${a})`;
            ctx.fill();
        });

        if (!prefersReducedMotion) {
            pulses.forEach((pulse) => {
                const pts = edges[pulse.edgeIndex];
                if (!pts) {
                    return;
                }
                const pos = pointOnPath(pts, pulse.t);
                const g = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 8);
                g.addColorStop(0, 'rgba(160, 230, 90, 0.55)');
                g.addColorStop(1, 'rgba(140, 198, 63, 0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
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
    window.addEventListener('load', resize);

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
