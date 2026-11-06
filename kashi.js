// =====================================================
//  KASHI — Step 3: Hankin's method — star patterns
// =====================================================

// ---- 1. Grab the canvas and its 2D drawing context ----
const canvas = document.getElementById("art");
const ctx = canvas.getContext("2d");

// ---- 2. Settings we will turn into sliders later ----
const settings = {
  tileSize: 90,          // edge length of each polygon, in pixels
  background: "#f4efe4", // warm off-white, like glazed tile
  lineColor: "#1b3f8b",  // Multani cobalt blue
  tiling: "octagon",     // which tiling to draw (a key of TILINGS)
  theta: 67.5,           // contact angle in degrees (0–90)
  delta: 0,              // ray offset from the edge midpoint (0–1)
  showTiling: true,      // draw the faint polygon skeleton underneath
};

// ---- 3. Tilings ----
// Every tiling is described the same way:
//   v1, v2 : two "lattice vectors" — how far to step to the next copy
//   cell   : the polygon(s) that make up ONE copy
// Repeating the cell at every i*v1 + j*v2 covers the whole plane.

// ---- helper: regular polygon with n sides, centre (cx,cy), circumradius r, first vertex at angle startDeg ----
function regularPolygon(n, cx, cy, r, startDeg) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const ang = (startDeg + (360 / n) * k) * Math.PI / 180;
    pts.push({ x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) });
  }
  return pts;
}

const SQRT3 = Math.sqrt(3);
const SQRT2 = Math.sqrt(2);

const TILINGS = {
  // 4.4.4.4 — squares
  square: {
    label: "Square (4.4.4.4)",
    make(a) {
      return {
        v1: { x: a, y: 0 },
        v2: { x: 0, y: a },
        cell: [
          [ { x: 0, y: 0 }, { x: a, y: 0 }, { x: a, y: a }, { x: 0, y: a } ],
        ],
      };
    },
  },

  // 6.6.6 — hexagons (pointy-top)
  hexagon: {
    label: "Hexagon (6.6.6)",
    make(a) {
      return {
        v1: { x: SQRT3 * a, y: 0 },
        v2: { x: SQRT3 * a / 2, y: 1.5 * a },
        cell: [ regularPolygon(6, 0, 0, a, 30) ],
      };
    },
  },

  // 3.3.3.3.3.3 — triangles (one pointing up, one pointing down per cell)
  triangle: {
    label: "Triangle (3.3.3.3.3.3)",
    make(a) {
      const h = SQRT3 / 2 * a;
      return {
        v1: { x: a, y: 0 },
        v2: { x: a / 2, y: h },
        cell: [
          [ { x: 0, y: 0 }, { x: a, y: 0 }, { x: a / 2, y: h } ],
          [ { x: a, y: 0 }, { x: 1.5 * a, y: h }, { x: a / 2, y: h } ],
        ],
      };
    },
  },

  // 4.8.8 — octagons + squares
  octagon: {
    label: "Octagon & Square (4.8.8)",
    make(a) {
      const w = a * (1 + SQRT2);              // distance between octagon centres
      const R = a / (2 * Math.sin(Math.PI / 8)); // octagon circumradius
      const d = a / SQRT2;                    // half-diagonal of the small square
      return {
        v1: { x: w, y: 0 },
        v2: { x: 0, y: w },
        cell: [
          regularPolygon(8, 0, 0, R, 22.5),
          [ { x: w / 2, y: w / 2 - d }, { x: w / 2 + d, y: w / 2 },
            { x: w / 2, y: w / 2 + d }, { x: w / 2 - d, y: w / 2 } ],
        ],
      };
    },
  },

  // 3.6.3.6 — hexagons + triangles (kagome / trihexagonal)
  kagome: {
    label: "Hexagon & Triangle (3.6.3.6)",
    make(a) {
      const h = SQRT3 / 2 * a;
      return {
        v1: { x: 2 * a, y: 0 },
        v2: { x: a, y: SQRT3 * a },
        cell: [
          regularPolygon(6, 0, 0, a, 0),
          [ { x: a, y: 0 }, { x: 1.5 * a, y: h }, { x: 0.5 * a, y: h } ],
          [ { x: -0.5 * a, y: h }, { x: 0.5 * a, y: h }, { x: 0, y: SQRT3 * a } ],
        ],
      };
    },
  },

  // 3.4.6.4 — hexagons + squares + triangles (rhombitrihexagonal)
  rhombi: {
    label: "Hexagon, Square & Triangle (3.4.6.4)",
    make(a) {
      const d = a * (SQRT3 + 1);             // distance between hexagon centres
      const dir = deg => ({ x: Math.cos(deg * Math.PI / 180), y: Math.sin(deg * Math.PI / 180) });
      const hexV = deg => ({ x: a * dir(deg).x, y: a * dir(deg).y });
      const add = (p, n) => ({ x: p.x + a * n.x, y: p.y + a * n.y });

      // a square sitting on the hexagon edge that faces direction `phi`
      const squareOn = phi => {
        const p1 = hexV(phi - 30), p2 = hexV(phi + 30), n = dir(phi);
        return [ p1, p2, add(p2, n), add(p1, n) ];
      };
      // a triangle in the gap at hexagon vertex `v`, between the squares facing `phiA` and `phiB`
      const triangleAt = (v, phiA, phiB) => {
        const V = hexV(v);
        return [ V, add(V, dir(phiA)), add(V, dir(phiB)) ];
      };

      return {
        v1: { x: d * Math.cos(Math.PI / 6), y: d * Math.sin(Math.PI / 6) },
        v2: { x: 0, y: d },
        cell: [
          regularPolygon(6, 0, 0, a, 0),
          squareOn(30), squareOn(90), squareOn(150),
          triangleAt(60, 30, 90),
          triangleAt(120, 90, 150),
        ],
      };
    },
  },
};

// ---- 4. Repeat the cell across the screen ----
function buildPolygons(tiling, width, height) {
  const { v1, v2, cell } = tiling;
  const cx = width / 2;
  const cy = height / 2;

  // How far from the centre we need to cover (half the screen diagonal + a margin)
  const len1 = Math.hypot(v1.x, v1.y);
  const len2 = Math.hypot(v2.x, v2.y);
  const reach = Math.hypot(width, height) / 2 + 2 * Math.max(len1, len2);

  // How many steps in each direction are enough to get that far
  const n = Math.ceil(reach / (Math.min(len1, len2) * 0.5)) + 1;

  const polygons = [];
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      // Position of this copy of the cell
      const ox = cx + i * v1.x + j * v2.x;
      const oy = cy + i * v1.y + j * v2.y;

      // Skip copies that are far off-screen
      if (Math.hypot(ox - cx, oy - cy) > reach) continue;

      // Move every polygon of the cell to this position
      for (const shape of cell) {
        polygons.push(shape.map(p => ({ x: p.x + ox, y: p.y + oy })));
      }
    }
  }
  return polygons;
}

// ---- 5. Hankin's method ----
// Where two rays  p + t*r  and  q + u*s  cross. Returns null if they never meet going forward.
function rayIntersection(p, r, q, s) {
  const cross = r.x * s.y - r.y * s.x;
  const qp = { x: q.x - p.x, y: q.y - p.y };

  if (Math.abs(cross) < 1e-9) {
    // Parallel rays. Special case: they lie on the SAME line and point at each other
    // (happens at one exact angle per polygon, e.g. 45° in a square). They "meet" in the middle.
    const sameLine = Math.abs(qp.x * r.y - qp.y * r.x) < 1e-6;
    const facing = qp.x * r.x + qp.y * r.y > 0;
    if (sameLine && facing) return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    return null;                                       // truly parallel: never meet
  }
  const t = (qp.x * s.y - qp.y * s.x) / cross;         // distance along ray 1
  const u = (qp.x * r.y - qp.y * r.x) / cross;         // distance along ray 2
  if (t <= 0 || u <= 0) return null;                   // they only "meet" behind a start point
  return { x: p.x + t * r.x, y: p.y + t * r.y };
}

// Turn ONE polygon into star-pattern line pieces.
// theta : contact angle in degrees (how steeply rays go inward)
// delta : 0..1, how far the two rays of each edge start apart from the midpoint
function hankinPolygon(points, theta, delta) {
  const n = points.length;
  const th = theta * Math.PI / 180;

  // centre of the polygon — used to know which side is "inside"
  let cx = 0, cy = 0;
  for (const p of points) { cx += p.x; cy += p.y; }
  cx /= n; cy /= n;

  // Step A: two rays per edge
  const edges = [];
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const d = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };   // unit vector along the edge
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };       // midpoint

    // inward normal: perpendicular to the edge, pointing toward the centre
    let nrm = { x: -d.y, y: d.x };
    if (nrm.x * (cx - m.x) + nrm.y * (cy - m.y) < 0) nrm = { x: d.y, y: -d.x };

    const off = delta * len / 2;
    edges.push({
      // ray A starts a little toward vertex a, and leans back toward a
      startA: { x: m.x - d.x * off, y: m.y - d.y * off },
      dirA:   { x: -d.x * Math.cos(th) + nrm.x * Math.sin(th),
                y: -d.y * Math.cos(th) + nrm.y * Math.sin(th) },
      // ray B starts a little toward vertex b, and leans toward b
      startB: { x: m.x + d.x * off, y: m.y + d.y * off },
      dirB:   { x: d.x * Math.cos(th) + nrm.x * Math.sin(th),
                y: d.y * Math.cos(th) + nrm.y * Math.sin(th) },
    });
  }

  // Step B: ray B of edge i meets ray A of edge i+1, near the corner they share
  const pieces = [];
  for (let i = 0; i < n; i++) {
    const e1 = edges[i];
    const e2 = edges[(i + 1) % n];
    const hit = rayIntersection(e1.startB, e1.dirB, e2.startA, e2.dirA);
    if (hit) pieces.push([ e1.startB, hit, e2.startA ]);   // a little "V" shape
  }
  return pieces;
}

// ---- 6. Drawing helpers ----
// Draw a list of points as a line. closed = true joins the last point back to the first.
function drawPath(points, closed) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let k = 1; k < points.length; k++) {
    ctx.lineTo(points[k].x, points[k].y);
  }
  if (closed) ctx.closePath();
  ctx.stroke();
}

// ---- 7. Draw the whole picture ----
function draw() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  // Background
  ctx.fillStyle = settings.background;
  ctx.fillRect(0, 0, width, height);

  // Tiling
  const tiling = TILINGS[settings.tiling].make(settings.tileSize);
  const polygons = buildPolygons(tiling, width, height);

  // Layer 1: the faint tiling skeleton
  if (settings.showTiling) {
    ctx.strokeStyle = "rgba(27, 63, 139, 0.15)";
    ctx.lineWidth = 1;
    for (const poly of polygons) drawPath(poly, true);
  }

  // Layer 2: the star pattern
  ctx.strokeStyle = settings.lineColor;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const poly of polygons) {
    for (const piece of hankinPolygon(poly, settings.theta, settings.delta)) {
      drawPath(piece, false);
    }
  }
}

// ---- 8. Keep the canvas sharp and full-screen ----
function resize() {
  const dpr = window.devicePixelRatio || 1;   // 2 on most phones / retina screens
  canvas.width = canvas.clientWidth * dpr;    // real pixels
  canvas.height = canvas.clientHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);     // so we can keep drawing in CSS pixels
  draw();
}

// ---- 9. Controls ----
const tilingSelect = document.getElementById("tiling");

// Fill the dropdown from the TILINGS object, so new tilings appear automatically
for (const [key, t] of Object.entries(TILINGS)) {
  const option = document.createElement("option");
  option.value = key;
  option.textContent = t.label;
  tilingSelect.appendChild(option);
}
tilingSelect.value = settings.tiling;

tilingSelect.addEventListener("change", () => {
  settings.tiling = tilingSelect.value;
  draw();
});

// Connect a slider to a setting, and show its value next to the label
function bindSlider(id, key, format) {
  const slider = document.getElementById(id);
  const output = document.getElementById(id + "-value");
  slider.value = settings[key];
  output.textContent = format(settings[key]);
  slider.addEventListener("input", () => {
    settings[key] = parseFloat(slider.value);
    output.textContent = format(settings[key]);
    draw();
  });
}
bindSlider("theta", "theta", v => v.toFixed(1) + "°");
bindSlider("delta", "delta", v => v.toFixed(2));

const tilingToggle = document.getElementById("showTiling");
tilingToggle.checked = settings.showTiling;
tilingToggle.addEventListener("change", () => {
  settings.showTiling = tilingToggle.checked;
  draw();
});

window.addEventListener("resize", resize);
resize();