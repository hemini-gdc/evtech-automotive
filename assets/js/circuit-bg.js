/**
 * Full-page circuit accents — margins & empty areas only (no hero, no text).
 * Enabled on all body.theme-dark pages.
 */
(function initCircuitBackground() {
    const canvas = document.getElementById('circuit-canvas');
    if (!canvas || !document.body.classList.contains('theme-dark')) {
        return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');

    const LINE_COLOR = '140, 198, 63';
    const PULSE_COLOR = '190, 255, 120';
    const TEXT_PAD = 28;
    const HERO_PAD = 12;
    const FEATHER = 36;

    const TEXT_EXCLUSION_SELECTOR = [
        'header',
        'section:not(.hero) .sub-title',
        'section:not(.hero) h1',
        'section:not(.hero) h2',
        'section:not(.hero) h3',
        'section:not(.hero) h4',
        'section:not(.hero) p',
        'section:not(.hero) li',
        'section:not(.hero) blockquote',
        'section:not(.hero) cite',
        'section:not(.hero) .btn',
        'section:not(.hero) .read-more',
        'section:not(.hero) .section-header',
        'section:not(.hero) .advantages-header',
        'section:not(.hero) .advantage-card-content',
        'section:not(.hero) .service-info',
        'section:not(.hero) .google-rating-card',
        'section:not(.hero) .slide-content',
        'section:not(.hero) .cta-content',
        'section:not(.hero) .experience-card',
        'section:not(.hero) .center-btn',
        'section:not(.hero) .contact-form-container',
        'section:not(.hero) .contact-info-card',
        'section:not(.hero) .location-branch-details',
        'section:not(.hero) .location-branch-map',
        'section:not(.hero) .all-locations-directory',
        'section:not(.hero) .all-locations-city',
        'section:not(.hero) .legal-wrap',
        'section:not(.hero) label',
        'section:not(.hero) input',
        'section:not(.hero) textarea',
        'section:not(.hero) select',
        'footer',
    ].join(', ');

    let width = 0;
    let height = 0;
    let docHeight = 0;
    let nodes = [];
    let edges = [];
    let pulses = [];
    let exclusionZones = [];
    let heroZone = null;
    let animationId = null;
    let scrollY = 0;

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    function getDocumentHeight() {
        return Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight,
            window.innerHeight
        );
    }

    function rectToDoc(rect, pad) {
        return {
            left: rect.left - pad,
            right: rect.right + pad,
            top: rect.top + scrollY - pad,
            bottom: rect.bottom + scrollY + pad,
        };
    }

    function updateExclusionZones() {
        scrollY = window.scrollY || window.pageYOffset;
        exclusionZones = [];
        heroZone = null;

        const hero = document.querySelector('section.hero');
        if (hero) {
            heroZone = rectToDoc(hero.getBoundingClientRect(), HERO_PAD);
            exclusionZones.push(heroZone);
        }

        const cta = document.querySelector('section.cta-banner');
        if (cta) {
            exclusionZones.push(rectToDoc(cta.getBoundingClientRect(), HERO_PAD));
        }

        document.querySelectorAll(TEXT_EXCLUSION_SELECTOR).forEach((el) => {
            if (!el.getBoundingClientRect) {
                return;
            }
            const rect = el.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2) {
                return;
            }
            exclusionZones.push(rectToDoc(rect, TEXT_PAD));
        });
    }

    function distToRect(x, y, zone) {
        const dx = x < zone.left ? zone.left - x : x > zone.right ? x - zone.right : 0;
        const dy = y < zone.top ? zone.top - y : y > zone.bottom ? y - zone.bottom : 0;
        return Math.hypot(dx, dy);
    }

    function visibilityAt(x, y) {
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
        const offsetX = stepX * 0.3;
        const offsetY = stepY * 0.22;

        for (let row = 0, y = stepY * 0.35; y < docHeight + stepY; row += 1, y += stepY) {
            const rowShift = (row % 2) * (stepX * 0.5);
            for (let x = stepX * 0.3 + rowShift; x < width + stepX; x += stepX) {
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

    function buildPatch(centerX, centerY) {
        const cols = 4;
        const rows = 3;
        const spacing = 48;
        const startX = centerX - ((cols - 1) * spacing) / 2;
        const startY = centerY - ((rows - 1) * spacing) / 2;
        const localNodes = [];
        const index = [];

        for (let r = 0; r < rows; r += 1) {
            index[r] = [];
            for (let c = 0; c < cols; c += 1) {
                const i = localNodes.length;
                const nx = startX + c * spacing + rand(-6, 6);
                const ny = startY + r * spacing + rand(-6, 6);
                if (isFullyExcluded(nx, ny)) {
                    index[r][c] = -1;
                    continue;
                }
                localNodes.push({
                    x: nx,
                    y: ny,
                    phase: Math.random() * Math.PI * 2,
                    cx: centerX,
                    cy: centerY,
                });
                index[r][c] = localNodes.length - 1;
            }
        }

        const localEdges = [];
        const link = (a, b) => {
            if (a < 0 || b < 0 || !localNodes[a] || !localNodes[b]) {
                return;
            }
            const points = orthPath(localNodes[a], localNodes[b]);
            if (pointsVisible(points) < 0.08) {
                return;
            }
            localEdges.push({
                points,
                cx: centerX,
                cy: centerY,
            });
        };

        for (let r = 0; r < rows; r += 1) {
            for (let c = 0; c < cols; c += 1) {
                const idx = index[r][c];
                if (idx < 0) {
                    continue;
                }
                if (c < cols - 1 && index[r][c + 1] >= 0) {
                    link(idx, index[r][c + 1]);
                }
                if (r < rows - 1 && index[r + 1][c] >= 0) {
                    link(idx, index[r + 1][c]);
                }
            }
        }

        return { nodes: localNodes, edges: localEdges };
    }

    function orthPath(n1, n2) {
        if (Math.random() > 0.45) {
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
        updateExclusionZones();
        nodes = [];
        edges = [];
        pulses = [];

        gridAnchors().forEach((anchor) => {
            const patch = buildPatch(anchor.x, anchor.y);
            if (!patch.nodes.length) {
                return;
            }

            const edgeOffset = edges.length;
            patch.nodes.forEach((n) => nodes.push(n));
            patch.edges.forEach((e) => edges.push(e));

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

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        docHeight = getDocumentHeight();
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
        return Math.max(0.45, 1 - (d / maxR) * 0.45);
    }

    function inViewport(y, margin = 120) {
        const top = scrollY - margin;
        const bottom = scrollY + height + margin;
        return y >= top && y <= bottom;
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
        grad.addColorStop(0.55, `rgba(${PULSE_COLOR}, ${0.22 * trailFade})`);
        grad.addColorStop(1, `rgba(${PULSE_COLOR}, ${0.65 * trailFade})`);

        ctx.beginPath();
        ctx.moveTo(trailPts[0].x, trailPts[0].y);
        for (let i = 1; i < trailPts.length; i += 1) {
            ctx.lineTo(trailPts[i].x, trailPts[i].y);
        }
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();

        const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 10);
        g.addColorStop(0, `rgba(255, 255, 240, ${0.85 * trailFade})`);
        g.addColorStop(0.35, `rgba(${PULSE_COLOR}, ${0.55 * trailFade})`);
        g.addColorStop(1, `rgba(${PULSE_COLOR}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 10, 0, Math.PI * 2);
        ctx.fill();
    }

    function nearestPulseGlow(node, time) {
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

    function draw(time) {
        updateExclusionZones();
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(0, -scrollY);

        edges.forEach((edge) => {
            const pts = edge.points;
            if (!pts.length) {
                return;
            }
            const midY = pts.reduce((s, p) => s + p.y, 0) / pts.length;
            if (!inViewport(midY)) {
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
            ctx.strokeStyle = `rgba(${LINE_COLOR}, ${0.26 * fade})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        if (!prefersReducedMotion) {
            pulses.forEach((pulse) => {
                const edge = edges[pulse.edgeIndex];
                if (!edge || !edge.points.length) {
                    return;
                }
                const midY = edge.points.reduce((s, p) => s + p.y, 0) / edge.points.length;
                if (!inViewport(midY)) {
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
            if (!inViewport(node.y)) {
                return;
            }
            const vis = visibilityAt(node.x, node.y);
            if (vis < 0.08) {
                return;
            }

            const fade = patchFade(node) * vis;
            const glow = nearestPulseGlow(node, time);
            const base = prefersReducedMotion
                ? 0.38 * fade
                : (0.28 + Math.sin(time * 0.0022 + node.phase) * 0.12) * fade;
            const a = Math.min(0.95, base + glow * 0.55);
            if (a < 0.04) {
                return;
            }
            const radius = 2 + glow * 1.5;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${LINE_COLOR}, ${a})`;
            ctx.fill();
            if (glow > 0.35) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius + 4, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${PULSE_COLOR}, ${glow * 0.35})`;
                ctx.fill();
            }
        });

        ctx.restore();
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
            docHeight = getDocumentHeight();
            buildScene();
        }, 120);
    }

    resize();
    window.addEventListener('resize', resize);

    if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(scheduleRebuild);
        ro.observe(document.body);
        ro.observe(document.documentElement);
        document.querySelectorAll('section').forEach((section) => ro.observe(section));
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
