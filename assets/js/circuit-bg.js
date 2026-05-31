/**
 * Animated PCB-style circuit background for the homepage.
 */
(function initCircuitBackground() {
    const canvas = document.getElementById('circuit-canvas');
    if (!canvas || !document.body.classList.contains('page-home')) {
        return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');
    const COLOR = { line: 'rgba(140, 198, 63, 0.14)', node: 'rgba(140, 198, 63, 0.35)', pulse: 'rgba(160, 230, 90, 0.95)' };

    let width = 0;
    let height = 0;
    let nodes = [];
    let edges = [];
    let pulses = [];
    let animationId = null;

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    function buildGrid() {
        const spacing = window.innerWidth < 768 ? 110 : 88;
        const cols = Math.ceil(width / spacing) + 1;
        const rows = Math.ceil(height / spacing) + 1;
        nodes = [];
        edges = [];
        pulses = [];

        for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < cols; col += 1) {
                const jitter = spacing * 0.22;
                nodes.push({
                    x: col * spacing + rand(-jitter, jitter),
                    y: row * spacing + rand(-jitter, jitter),
                    phase: Math.random() * Math.PI * 2,
                });
            }
        }

        const indexAt = (col, row) => row * cols + col;

        for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < cols; col += 1) {
                const from = indexAt(col, row);
                if (col < cols - 1) {
                    addEdge(from, indexAt(col + 1, row), Math.random() > 0.08);
                }
                if (row < rows - 1) {
                    addEdge(from, indexAt(col, row + 1), Math.random() > 0.08);
                }
                if (col < cols - 1 && row < rows - 1 && Math.random() > 0.72) {
                    addEdge(from, indexAt(col + 1, row + 1), false);
                }
            }
        }

        edges.forEach((edge, i) => {
            if (Math.random() > 0.55) {
                pulses.push({ edgeIndex: i, t: Math.random(), speed: rand(0.0012, 0.0035) });
            }
        });
    }

    function addEdge(a, b, skip) {
        if (skip) {
            return;
        }
        const n1 = nodes[a];
        const n2 = nodes[b];
        if (!n1 || !n2) {
            return;
        }
        edges.push({ a, b, points: orthogonalPath(n1, n2) });
    }

    function orthogonalPath(n1, n2) {
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

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildGrid();
        if (prefersReducedMotion) {
            draw(0);
        }
    }

    function drawPulseOnPath(points, t) {
        const segments = [];
        let total = 0;
        for (let i = 0; i < points.length - 1; i += 1) {
            const dx = points[i + 1].x - points[i].x;
            const dy = points[i + 1].y - points[i].y;
            const len = Math.hypot(dx, dy);
            segments.push({ len, from: points[i], to: points[i + 1] });
            total += len;
        }
        let dist = t * total;
        for (let i = 0; i < segments.length; i += 1) {
            if (dist <= segments[i].len) {
                const seg = segments[i];
                const ratio = dist / seg.len;
                return {
                    x: seg.from.x + (seg.to.x - seg.from.x) * ratio,
                    y: seg.from.y + (seg.to.y - seg.from.y) * ratio,
                };
            }
            dist -= segments[i].len;
        }
        return points[points.length - 1];
    }

    function draw(time) {
        ctx.clearRect(0, 0, width, height);

        edges.forEach((edge) => {
            const pts = edge.points;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i += 1) {
                ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.strokeStyle = COLOR.line;
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        nodes.forEach((node) => {
            const glow = prefersReducedMotion ? 0.5 : 0.35 + Math.sin(time * 0.002 + node.phase) * 0.25;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(140, 198, 63, ${glow})`;
            ctx.fill();
        });

        if (!prefersReducedMotion) {
            pulses.forEach((pulse) => {
                const edge = edges[pulse.edgeIndex];
                if (!edge) {
                    return;
                }
                const pos = drawPulseOnPath(edge.points, pulse.t);
                const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 10);
                grad.addColorStop(0, COLOR.pulse);
                grad.addColorStop(1, 'rgba(140, 198, 63, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }

    function tick(time) {
        if (!prefersReducedMotion) {
            pulses.forEach((pulse) => {
                pulse.t += pulse.speed;
                if (pulse.t > 1) {
                    pulse.t = 0;
                    pulse.speed = rand(0.0012, 0.0035);
                }
            });
            draw(time);
            animationId = requestAnimationFrame(tick);
        }
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
