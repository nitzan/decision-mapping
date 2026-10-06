"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Seats at the Table — Decision journey mapping
 * Nitzan Hermon, In Process Coaching
 *
 * Follows the method step by step:
 * 1. Aspects        list the aspects of a decision
 * 2. Constellation  arrange them spatially
 * 3. Axes           draw each as a line with values on each side; choose which get a seat
 * 4. Balance        set the desired region (jagged is fine)
 * 5. Options        plot the options and write the reasoning
 * 6. Camera moves   repeat when the perspective, opportunity or idea changes
 */

// ---------------------------------------------------------------- types
type Pt = { x: number; y: number };
type Aspect = {
  id: string;
  name: string;
  label: Pt; // where the name sits on the page
  a: Pt; // start of the axis line
  b: Pt; // end of the axis line
  aLabel: string;
  bLabel: string;
  seated: boolean;
  ideal: number; // 0..1 along a -> b
  room: number; // tolerance either side of ideal, 0..0.5
};
type Option = { id: string; name: string; values: Record<string, number>; reasoning: string };
type MapState = { title: string; aspects: Aspect[]; options: Option[] };
type MoveKind = "perspective" | "opportunity" | "idea";
type Snapshot = { id: string; at: string; kind: MoveKind; note: string; state: MapState };
type Store = MapState & { step: number; snapshots: Snapshot[] };
type Fit = { status: "inside" | "edge" | "outside" | "unplaced"; misses: Aspect[] };
type Drag =
  | { kind: "label"; id: string; from: Pt; start: Aspect }
  | { kind: "end"; id: string; which: "a" | "b" }
  | { kind: "ideal"; id: string }
  | { kind: "value"; id: string; optId: string }
  | null;

// ---------------------------------------------------------------- constants
const W = 1000;
const H = 700;
const STORE_KEY = "seats-at-the-table:v2";
const STEPS = [
  { n: 1, name: "Aspects", chip: "List the aspects" },
  { n: 2, name: "Constellation", chip: "Arrange the constellation" },
  { n: 3, name: "Axes", chip: "Open up each axis" },
  { n: 4, name: "Balance", chip: "Desired space of decisions" },
  { n: 5, name: "Options", chip: "Place options" },
  { n: 6, name: "Camera moves", chip: "When the camera moves" },
];
const MOVE_LABEL: Record<MoveKind, string> = {
  perspective: "New perspective",
  opportunity: "New opportunity",
  idea: "New idea",
};

// ---------------------------------------------------------------- utils
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const project = (p: Pt, a: Pt, b: Pt) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  return clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1);
};
const clampPt = (p: Pt): Pt => ({ x: clamp(p.x, 24, W - 24), y: clamp(p.y, 24, H - 24) });
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

function pointInPolygon(p: Pt, poly: Pt[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-9) + xi) inside = !inside;
  }
  return inside;
}

/** Order aspects by the angle of their ideal point around the shared centroid, so the region never self-intersects. */
function orderForRegion(aspects: Aspect[]) {
  const pts = aspects.map((a) => ({ a, p: lerp(a.a, a.b, a.ideal) }));
  if (!pts.length) return [] as Aspect[];
  const c = { x: pts.reduce((s, q) => s + q.p.x, 0) / pts.length, y: pts.reduce((s, q) => s + q.p.y, 0) / pts.length };
  return pts.sort((m, n) => Math.atan2(m.p.y - c.y, m.p.x - c.x) - Math.atan2(n.p.y - c.y, n.p.x - c.x)).map((q) => q.a);
}

function defaultAxis(label: Pt, len = 300): { a: Pt; b: Pt } {
  const y = clamp(label.y + 30, 24, H - 24);
  let x0 = label.x - len / 2;
  x0 = clamp(x0, 40, W - 40 - len);
  return { a: { x: x0, y }, b: { x: x0 + len, y } };
}

function newAspect(name: string, index: number): Aspect {
  const angle = -Math.PI / 2 + index * ((2 * Math.PI) / 6) + (index >= 6 ? 0.5 : 0);
  const label = clampPt({ x: 500 + Math.cos(angle) * 300, y: 330 + Math.sin(angle) * 220 });
  const { a, b } = defaultAxis(label);
  return { id: uid(), name, label, a, b, aLabel: "", bLabel: "", seated: true, ideal: 0.5, room: 0.15 };
}

function fitOf(opt: Option, seated: Aspect[]): Fit {
  if (!seated.length) return { status: "unplaced", misses: [] };
  const misses: Aspect[] = [];
  let near = true;
  for (const a of seated) {
    const v = opt.values[a.id];
    if (v === undefined) return { status: "unplaced", misses: [] };
    const gap = Math.abs(v - a.ideal) - a.room;
    if (gap > 1e-6) {
      misses.push(a);
      if (gap > 0.1) near = false;
    }
  }
  if (!misses.length) return { status: "inside", misses };
  return { status: near ? "edge" : "outside", misses };
}

function fitSentence(f: Fit, seatedCount: number) {
  const names = f.misses.map((a) => a.name).join(", ");
  if (f.status === "unplaced") return "Not placed on every seat yet";
  if (f.status === "inside") return seatedCount === 1 ? "Inside the balance on its seat" : `Inside the balance on all ${seatedCount} seats`;
  if (f.status === "edge") return `At the edge on ${names}`;
  return `Outside on ${names}`;
}

function relocationExample(): MapState {
  const mk = (p: Partial<Aspect> & Pick<Aspect, "name" | "label" | "a" | "b" | "aLabel" | "bLabel" | "ideal">): Aspect => ({
    id: uid(),
    seated: true,
    room: 0.2,
    ...p,
  });
  const place = mk({ name: "Place of living", label: { x: 399, y: 79 }, a: { x: 396, y: 140 }, b: { x: 396, y: 600 }, aLabel: "High preference", bLabel: "Low preference", ideal: 0.8 });
  const salary = mk({ name: "Salary", label: { x: 852, y: 216 }, a: { x: 197, y: 235 }, b: { x: 767, y: 235 }, aLabel: "Median and growing", bLabel: "High, short term", ideal: 0.29 });
  const life = mk({ name: "Work-life balance", label: { x: 143, y: 375 }, a: { x: 242, y: 396 }, b: { x: 812, y: 396 }, aLabel: "All work", bLabel: "All life", ideal: 0.65 });
  const growth = mk({ name: "Growth options", label: { x: 650, y: 660 }, a: { x: 700, y: 140 }, b: { x: 700, y: 600 }, aLabel: "Visible", bLabel: "Hidden", ideal: 0.27 });
  const v = (pl: number, sa: number, li: number, gr: number) => ({ [place.id]: pl, [salary.id]: sa, [life.id]: li, [growth.id]: gr });
  return {
    title: "Relocate for a new job?",
    aspects: [place, salary, life, growth],
    options: [
      { id: uid(), name: "Stay and renegotiate", values: v(0.7, 0.3, 0.55, 0.4), reasoning: "Home stays home. The raise is modest but keeps growing, and the next step up is already visible." },
      { id: uid(), name: "Offer in Philadelphia", values: v(0.75, 0.45, 0.72, 0.3), reasoning: "Close enough to keep my people. Better hours. Growth is clear on paper, less so in practice." },
      { id: uid(), name: "Startup in San Francisco", values: v(0.15, 0.9, 0.12, 0.85), reasoning: "Big number up front, but it asks for all of my time, and where it leads is hidden." },
    ],
  };
}

const emptyStore = (): Store => ({ title: "", aspects: [], options: [], step: 1, snapshots: [] });
const cloneState = (s: MapState): MapState => JSON.parse(JSON.stringify({ title: s.title, aspects: s.aspects, options: s.options }));

// ---------------------------------------------------------------- component
export default function SeatsAtTheTableDecisionMapper() {
  const [store, setStore] = useState<Store>(emptyStore);
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState("");
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [focusAspect, setFocusAspect] = useState<string | null>(null);
  const [ghostId, setGhostId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [moveKind, setMoveKind] = useState<MoveKind>("perspective");
  const [moveNote, setMoveNote] = useState("");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<Drag>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // load + save
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Store;
        if (parsed && Array.isArray(parsed.aspects)) setStore({ ...emptyStore(), ...parsed });
      }
    } catch {
      /* start fresh */
    }
    const d = new Date();
    setToday(`${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`);
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      /* storage full or blocked */
    }
  }, [store, loaded]);

  const { step, aspects, options, snapshots, title } = store;
  const set = useCallback((fn: (s: Store) => Store) => setStore((s) => fn(s)), []);
  const patchAspect = (id: string, p: Partial<Aspect>) => set((s) => ({ ...s, aspects: s.aspects.map((a) => (a.id === id ? { ...a, ...p } : a)) }));
  const patchOption = (id: string, p: Partial<Option>) => set((s) => ({ ...s, options: s.options.map((o) => (o.id === id ? { ...o, ...p } : o)) }));
  const goto = (n: number) => set((s) => ({ ...s, step: clamp(n, 1, 6) }));

  const seated = useMemo(() => aspects.filter((a) => a.seated && a.name.trim()), [aspects]);
  const ordered = useMemo(() => orderForRegion(seated), [seated]);
  const regionPts = ordered.map((a) => lerp(a.a, a.b, a.ideal));
  const fits = useMemo(() => Object.fromEntries(options.map((o) => [o.id, fitOf(o, seated)])) as Record<string, Fit>, [options, seated]);
  const ghost = snapshots.find((s) => s.id === ghostId) || null;
  const ghostPts = useMemo(() => {
    if (!ghost) return [] as Pt[];
    const gs = ghost.state.aspects.filter((a) => a.seated && a.name.trim());
    return orderForRegion(gs).map((a) => lerp(a.a, a.b, a.ideal));
  }, [ghost]);

  // Where each option sits on the page. The region's centre is a perfect fit; the edge of the
  // region is the limit of your give on the seat that strains most. Further out means further off.
  const placements = useMemo(() => {
    if (!seated.length) return [] as Array<{ o: Option; p: Pt }>;
    const ideals = seated.map((a) => lerp(a.a, a.b, a.ideal));
    const c = { x: ideals.reduce((s, q) => s + q.x, 0) / ideals.length, y: ideals.reduce((s, q) => s + q.y, 0) / ideals.length };
    const out: Array<{ o: Option; p: Pt }> = [];
    for (const o of options) {
      let worst = 0;
      let wi = 0;
      seated.forEach((a, i) => {
        const r = Math.abs((o.values[a.id] ?? 0.5) - a.ideal) / Math.max(a.room, 0.03);
        if (r > worst) {
          worst = r;
          wi = i;
        }
      });
      const a = seated[wi];
      let dx = ideals[wi].x - c.x;
      let dy = ideals[wi].y - c.y;
      let R = Math.hypot(dx, dy);
      if (R < 20) {
        const sign = (o.values[a.id] ?? 0.5) >= a.ideal ? 1 : -1;
        const vx = a.b.x - a.a.x;
        const vy = a.b.y - a.a.y;
        const len = Math.hypot(vx, vy) || 1;
        dx = (vx / len) * sign;
        dy = (vy / len) * sign;
        R = 80;
      } else {
        dx /= R;
        dy /= R;
      }
      const dist = R * Math.min(worst, 3.2) * 0.65;
      const fitIn = (q: Pt): Pt => ({ x: clamp(q.x, 110, W - 110), y: clamp(q.y, 90, H - 56) });
      let p = fitIn({ x: c.x + dx * dist, y: c.y + dy * dist + 5 });
      // keep labels from sitting on top of each other
      for (let k = 0; k < 6 && out.some((q) => Math.abs(q.p.x - p.x) < 140 && Math.abs(q.p.y - p.y) < 20); k++) p = fitIn({ x: p.x, y: p.y + 22 });
      out.push({ o, p });
    }
    return out;
  }, [options, seated]);

  const showAxes = step >= 3;
  const showRegion = step >= 4;
  const showOptions = step >= 5;

  // ------------------------------------------------ pointer handling
  const toSheet = (e: React.PointerEvent): Pt => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const r = pt.matrixTransform(m.inverse());
    return { x: r.x, y: r.y };
  };
  const begin = (e: React.PointerEvent, d: NonNullable<Drag>) => {
    e.preventDefault();
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = d;
  };
  const onMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const p = toSheet(e);
    if (d.kind === "label") {
      const dx = clamp(p.x - d.from.x, 24 - Math.min(d.start.label.x, d.start.a.x, d.start.b.x), W - 24 - Math.max(d.start.label.x, d.start.a.x, d.start.b.x));
      const dy = clamp(p.y - d.from.y, 24 - Math.min(d.start.label.y, d.start.a.y, d.start.b.y), H - 24 - Math.max(d.start.label.y, d.start.a.y, d.start.b.y));
      const sh = (q: Pt) => ({ x: q.x + dx, y: q.y + dy });
      patchAspect(d.id, { label: sh(d.start.label), a: sh(d.start.a), b: sh(d.start.b) });
    } else if (d.kind === "end") {
      const asp = aspects.find((a) => a.id === d.id);
      if (!asp) return;
      const other = d.which === "a" ? asp.b : asp.a;
      const q = clampPt(p);
      if (Math.hypot(q.x - other.x, q.y - other.y) < 60) return;
      patchAspect(d.id, { [d.which]: q } as Partial<Aspect>);
    } else if (d.kind === "ideal") {
      const asp = aspects.find((a) => a.id === d.id);
      if (asp) patchAspect(d.id, { ideal: project(p, asp.a, asp.b) });
    } else if (d.kind === "value") {
      const asp = aspects.find((a) => a.id === d.id);
      const opt = options.find((o) => o.id === d.optId);
      if (asp && opt) patchOption(opt.id, { values: { ...opt.values, [asp.id]: project(p, asp.a, asp.b) } });
    }
  };
  const end = () => {
    dragRef.current = null;
  };
  const nudge = (e: React.KeyboardEvent, apply: (dx: number, dy: number) => void) => {
    const big = e.shiftKey ? 5 : 1;
    const k = e.key;
    if (k === "ArrowLeft") apply(-big, 0);
    else if (k === "ArrowRight") apply(big, 0);
    else if (k === "ArrowUp") apply(0, -big);
    else if (k === "ArrowDown") apply(0, big);
    else return;
    e.preventDefault();
  };
  const alongStep = (a: Aspect, dx: number, dy: number) => {
    // translate an arrow-key press into movement along the axis direction
    const vx = a.b.x - a.a.x;
    const vy = a.b.y - a.a.y;
    const len = Math.hypot(vx, vy) || 1;
    return ((dx * vx + dy * vy) / len) * 0.02;
  };

  // ------------------------------------------------ actions
  const addAspect = () => {
    const name = draft.trim();
    if (!name) return;
    set((s) => ({ ...s, aspects: [...s.aspects, newAspect(name, s.aspects.length)] }));
    setDraft("");
  };
  const removeAspect = (id: string) =>
    set((s) => ({
      ...s,
      aspects: s.aspects.filter((a) => a.id !== id),
      options: s.options.map((o) => {
        const values = { ...o.values };
        delete values[id];
        return { ...o, values };
      }),
    }));
  const orient = (a: Aspect, dir: "h" | "v" | "flip") => {
    if (dir === "flip") return patchAspect(a.id, { a: a.b, b: a.a });
    const mid = lerp(a.a, a.b, 0.5);
    const len = clamp(Math.hypot(a.b.x - a.a.x, a.b.y - a.a.y), 120, dir === "h" ? W - 80 : H - 80);
    const p1 = dir === "h" ? { x: mid.x - len / 2, y: mid.y } : { x: mid.x, y: mid.y - len / 2 };
    const p2 = dir === "h" ? { x: mid.x + len / 2, y: mid.y } : { x: mid.x, y: mid.y + len / 2 };
    const shift = dir === "h" ? clamp(p1.x, 40, W - 40 - len) - p1.x : clamp(p1.y, 40, H - 40 - len) - p1.y;
    const sh = (q: Pt) => (dir === "h" ? { x: q.x + shift, y: q.y } : { x: q.x, y: q.y + shift });
    patchAspect(a.id, { a: sh(p1), b: sh(p2) });
  };
  const spreadOut = () =>
    set((s) => ({
      ...s,
      aspects: s.aspects.map((a, i) => {
        const fresh = newAspect(a.name, i);
        return { ...a, label: fresh.label, a: fresh.a, b: fresh.b };
      }),
    }));
  const addOption = () => {
    const o: Option = { id: uid(), name: "", values: Object.fromEntries(seated.map((a) => [a.id, 0.5])), reasoning: "" };
    set((s) => ({ ...s, options: [...s.options, o] }));
    setSelectedOpt(o.id);
  };
  const removeOption = (id: string) => {
    set((s) => ({ ...s, options: s.options.filter((o) => o.id !== id) }));
    if (selectedOpt === id) setSelectedOpt(null);
  };
  const takeSnapshot = () => {
    const snap: Snapshot = { id: uid(), at: new Date().toISOString(), kind: moveKind, note: moveNote.trim(), state: cloneState(store) };
    set((s) => ({ ...s, snapshots: [snap, ...s.snapshots] }));
    setMoveNote("");
  };
  const restore = (snap: Snapshot) => {
    if (!window.confirm("Restore this snapshot? The current map will be replaced. Take a snapshot first if you want to keep it.")) return;
    set((s) => ({ ...s, ...cloneState(snap.state) }));
    setGhostId(null);
    setSelectedOpt(null);
  };
  const loadExample = () => {
    set((s) => ({ ...s, ...relocationExample(), step: 4 }));
    setSelectedOpt(null);
  };
  const startOver = () => {
    if (!window.confirm("Start a new map? This clears the current map and its snapshots. Export it first if you want a copy.")) return;
    setStore(emptyStore());
    setSelectedOpt(null);
    setGhostId(null);
  };
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "seats-at-the-table").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importJson = (file: File) => {
    file.text().then((t) => {
      try {
        const parsed = JSON.parse(t) as Store;
        if (!Array.isArray(parsed.aspects)) throw new Error("bad file");
        setStore({ ...emptyStore(), ...parsed });
        setSelectedOpt(null);
        setGhostId(null);
      } catch {
        window.alert("That file isn't a Seats at the Table map. Choose a .json file exported from this tool.");
      }
    });
  };

  // auto-select first option on step 5
  useEffect(() => {
    if (step === 5 && !selectedOpt && options.length) setSelectedOpt(options[0].id);
  }, [step, selectedOpt, options]);

  // ------------------------------------------------ sheet rendering helpers
  const poleLabel = (end: Pt, other: Pt, text: string, key: string) => {
    if (!text) return null;
    const dx = end.x - other.x;
    const dy = end.y - other.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const anchor = ux > 0.5 ? "start" : ux < -0.5 ? "end" : "middle";
    const x = end.x + ux * 10;
    const y = end.y + uy * 14 + (uy > 0.5 ? 6 : uy < -0.5 ? -2 : 4);
    return (
      <text key={key} x={x} y={y} textAnchor={anchor} className="pole">
        {text}
      </text>
    );
  };

  const selected = options.find((o) => o.id === selectedOpt) || null;
  const stepInfo = STEPS[step - 1];

  // ------------------------------------------------ render
  return (
    <div className="mat">
      <header className="top">
        <div className="brand">
          <a className="brand-title" href="https://www.criticalbusinessschool.com">Critical Business School</a>
          <a className="brand-sub" href="/">Tools</a>
          <a className="brand-sub crumb" href="/in-process">In Process</a>
        </div>
        <a className="byline" href="https://in-process.net" target="_blank" rel="noreferrer">Nitzan Hermon</a>
      </header>

      <div className="tool-name">Seats at the Table: decision journey mapping</div>

      <div className="decision decision-under-name">
        <label htmlFor="decision-title" className="sr-only">
          What are you deciding?
        </label>
        <input
          id="decision-title"
          className="decision-input"
          value={title}
          onChange={(e) => set((s) => ({ ...s, title: e.target.value }))}
          placeholder="What are you deciding?"
        />
      </div>

      <nav className="steps" aria-label="Steps">
        {STEPS.map((s) => (
          <button key={s.n} className={cn("step", s.n === step && "is-current", s.n < step && "is-done")} onClick={() => goto(s.n)} aria-current={s.n === step ? "step" : undefined}>
            <span className="step-n">{s.n}</span>
            <span className="step-name">{s.name}</span>
          </button>
        ))}
      </nav>

      <main className="work">
        {/* ------------------------------------------------ the page */}
        <section className="sheet-wrap" aria-label="Map">
          <div className="sheet-scroll">
          <svg
            ref={svgRef}
            className="sheet"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Map of ${title || "your decision"}`}
            onPointerMove={onMove}
            onPointerUp={end}
            onPointerCancel={end}
          >
            <rect x={0} y={0} width={W} height={H} className="paper" />

            {/* chip */}
            <g transform="translate(28 28)">
              <rect width={stepInfo.chip.length * 9.4 + 28} height={32} rx={3} className="chip" />
              <text x={14} y={21} className="chip-text">
                {stepInfo.chip.toUpperCase()}
              </text>
            </g>

            {!aspects.length && (
              <text x={W / 2} y={H / 2} textAnchor="middle" className="empty">
                Your aspects will appear here as you list them.
              </text>
            )}

            {/* axes */}
            {showAxes &&
              aspects.map((a) => (
                <line key={`l-${a.id}`} x1={a.a.x} y1={a.a.y} x2={a.b.x} y2={a.b.y} className={cn("axis", !a.seated && "is-unseated")} />
              ))}

            {/* desired region */}
            {showRegion && regionPts.length >= 3 && <polygon points={regionPts.map((p) => `${p.x},${p.y}`).join(" ")} className="region" />}
            {showRegion && regionPts.length === 2 && <line x1={regionPts[0].x} y1={regionPts[0].y} x2={regionPts[1].x} y2={regionPts[1].y} className="region-line" />}
            {ghost && ghostPts.length >= 3 && <polygon points={ghostPts.map((p) => `${p.x},${p.y}`).join(" ")} className="ghost" />}

            {/* room on each axis */}
            {showRegion &&
              seated.map((a) => {
                const p1 = lerp(a.a, a.b, clamp(a.ideal - a.room, 0, 1));
                const p2 = lerp(a.a, a.b, clamp(a.ideal + a.room, 0, 1));
                return <line key={`r-${a.id}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className="room" />;
              })}

            {/* selected option footprint */}
            {showOptions && selected && seated.length >= 3 && (
              <polygon
                points={ordered.map((a) => lerp(a.a, a.b, selected.values[a.id] ?? 0.5)).map((p) => `${p.x},${p.y}`).join(" ")}
                className="footprint"
              />
            )}

            {/* pole labels + names */}
            {aspects.map((a) => (
              <g key={`n-${a.id}`} className={cn(!a.seated && showAxes && "is-unseated")}>
                {showAxes && poleLabel(a.a, a.b, a.aLabel, "pa")}
                {showAxes && poleLabel(a.b, a.a, a.bLabel, "pb")}
                <text
                  x={a.label.x}
                  y={a.label.y}
                  textAnchor="middle"
                  className={cn("aspect-name", focusAspect === a.id && "is-focus")}
                  tabIndex={0}
                  role="button"
                  aria-label={`${a.name}. Drag or use arrow keys to move.`}
                  onPointerDown={(e) => begin(e, { kind: "label", id: a.id, from: toSheet(e), start: a })}
                  onKeyDown={(e) =>
                    nudge(e, (dx, dy) =>
                      patchAspect(a.id, {
                        label: { x: a.label.x + dx * 4, y: a.label.y + dy * 4 },
                        a: { x: a.a.x + dx * 4, y: a.a.y + dy * 4 },
                        b: { x: a.b.x + dx * 4, y: a.b.y + dy * 4 },
                      })
                    )
                  }
                  onFocus={() => setFocusAspect(a.id)}
                  onBlur={() => setFocusAspect(null)}
                >
                  {a.name || "Untitled"}
                </text>
              </g>
            ))}

            {/* axis end handles */}
            {step === 3 &&
              aspects.flatMap((a) =>
                (["a", "b"] as const).map((w) => (
                  <g key={`e-${a.id}-${w}`}>
                    <circle cx={a[w].x} cy={a[w].y} r={16} className="hit" onPointerDown={(e) => begin(e, { kind: "end", id: a.id, which: w })} />
                    <circle cx={a[w].x} cy={a[w].y} r={5} className="end-handle" pointerEvents="none" />
                  </g>
                ))
              )}

            {/* ideal points */}
            {showRegion &&
              seated.map((a) => {
                const p = lerp(a.a, a.b, a.ideal);
                const interactive = step === 4;
                return (
                  <g key={`i-${a.id}`}>
                    {interactive && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={18}
                        className="hit"
                        tabIndex={0}
                        role="slider"
                        aria-label={`Balance on ${a.name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(a.ideal * 100)}
                        onPointerDown={(e) => begin(e, { kind: "ideal", id: a.id })}
                        onKeyDown={(e) => nudge(e, (dx, dy) => patchAspect(a.id, { ideal: clamp(a.ideal + alongStep(a, dx, dy), 0, 1) }))}
                      />
                    )}
                    <circle cx={p.x} cy={p.y} r={8} className="ideal" pointerEvents="none" />
                  </g>
                );
              })}

            {/* option value handles for the selected option */}
            {step === 5 &&
              selected &&
              seated.map((a) => {
                const v = selected.values[a.id] ?? 0.5;
                const p = lerp(a.a, a.b, v);
                return (
                  <g key={`v-${a.id}`}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={16}
                      className="hit"
                      tabIndex={0}
                      role="slider"
                      aria-label={`${selected.name || "Option"} on ${a.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(v * 100)}
                      onPointerDown={(e) => begin(e, { kind: "value", id: a.id, optId: selected.id })}
                      onKeyDown={(e) =>
                        nudge(e, (dx, dy) => patchOption(selected.id, { values: { ...selected.values, [a.id]: clamp(v + alongStep(a, dx, dy), 0, 1) } }))
                      }
                    />
                    <rect x={p.x - 6} y={p.y - 6} width={12} height={12} className="value-handle" pointerEvents="none" />
                  </g>
                );
              })}

            {/* options as "@ Name": nearer the centre the better they fit, leaning toward the seat that strains most */}
            {showOptions &&
              placements.map(({ o, p }) => {
                const onRed = regionPts.length >= 3 && pointInPolygon(p, regionPts);
                const f = fits[o.id];
                return (
                  <text
                    key={`o-${o.id}`}
                    x={p.x}
                    y={p.y}
                    textAnchor="middle"
                    className={cn("opt", onRed && "on-red", f?.status === "outside" && "is-out", o.id === selectedOpt && "is-selected")}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setSelectedOpt(o.id);
                      if (step !== 5) goto(5);
                    }}
                  >
                    @ {o.name || "Unnamed option"}
                  </text>
                );
              })}

            {/* slide chrome */}
            <text x={W - 28} y={H - 22} textAnchor="end" className="chrome">
              in-process.net
            </text>
            <text x={28} y={H - 22} className="chrome">
              {today}
            </text>
          </svg>
          </div>

          <div className="sheet-tools">
            <button className="link" onClick={exportJson}>
              Export map
            </button>
            <button className="link" onClick={() => fileRef.current?.click()}>
              Import map
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJson(f);
                e.target.value = "";
              }}
            />
            <button className="link" onClick={() => window.print()}>
              Print
            </button>
            <button className="link" onClick={startOver}>
              Start a new map
            </button>
          </div>
        </section>

        {/* ------------------------------------------------ the prompt */}
        <aside className="panel" aria-live="polite">
          <div className="eyebrow">Step {step} of 6</div>
          <h2 className="panel-title">{stepInfo.name}</h2>

          {step === 1 && (
            <>
              <p className="prompt">What are the dimensions of your decision? What factors into it, and what would be affected? What are the places where this will live?</p>
              <form
                className="row"
                onSubmit={(e) => {
                  e.preventDefault();
                  addAspect();
                }}
              >
                <label htmlFor="aspect-draft" className="sr-only">
                  New aspect
                </label>
                <input id="aspect-draft" className="field" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Salary, commute, my partner's work…" />
                <button className="btn" type="submit" disabled={!draft.trim()}>
                  Add
                </button>
              </form>
              {aspects.length ? (
                <ul className="list">
                  {aspects.map((a) => (
                    <li key={a.id} className="list-row">
                      <input className="field field-quiet" value={a.name} aria-label="Aspect name" onChange={(e) => patchAspect(a.id, { name: e.target.value })} />
                      <button className="link" onClick={() => removeAspect(a.id)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-panel">
                  <p>Write them as they come. Messy is fine; you will decide later which ones get a seat.</p>
                  <button className="link" onClick={loadExample}>
                    Or walk through the example: relocating for a new job
                  </button>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <p className="prompt">Can you arrange them on a page as a constellation? How do they orbit each other? Are there clusters?</p>
              <p className="hint">Drag each aspect on the page. Put the ones that pull on each other close together. Post-its on a real table work too.</p>
              {aspects.length > 1 && (
                <button className="link" onClick={spreadOut}>
                  Spread them out again
                </button>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <p className="prompt">Open up space within each of these focal points. Draw each as a line and assign values for each side of the line.</p>
              <p className="hint">Explore the dualities, and the scale, of each dimension. Then decide which ones make it to the table. Drag the ends of a line to tilt or stretch it.</p>
              <ul className="list">
                {aspects.map((a) => (
                  <li key={a.id} className={cn("axis-card", !a.seated && "is-unseated")} onMouseEnter={() => setFocusAspect(a.id)} onMouseLeave={() => setFocusAspect(null)}>
                    <div className="axis-head">
                      <span className="axis-name">{a.name || "Untitled"}</span>
                      <label className="seat">
                        <input type="checkbox" checked={a.seated} onChange={(e) => patchAspect(a.id, { seated: e.target.checked })} />
                        Seat at the table
                      </label>
                    </div>
                    <div className="poles">
                      <input className="field" value={a.aLabel} aria-label={`${a.name}: one end`} placeholder="One end" onChange={(e) => patchAspect(a.id, { aLabel: e.target.value })} />
                      <input className="field" value={a.bLabel} aria-label={`${a.name}: other end`} placeholder="Other end" onChange={(e) => patchAspect(a.id, { bLabel: e.target.value })} />
                    </div>
                    <div className="row-links">
                      <button className="link" onClick={() => orient(a, "h")}>
                        Horizontal
                      </button>
                      <button className="link" onClick={() => orient(a, "v")}>
                        Vertical
                      </button>
                      <button className="link" onClick={() => orient(a, "flip")}>
                        Swap ends
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {step === 4 && (
            <>
              <p className="prompt">Within this constellation, is there an ideal region you would like to exist? What is the range of balance you would like to live within?</p>
              <p className="hint">It need not be a perfect circle. It can be jagged and prioritize one aspect of the decision. Drag the points on the page; the dark stroke along each line is how much give you have.</p>
              {seated.length < 3 && <p className="note">Seat at least three aspects to see the region as a shape.</p>}
              <ul className="list">
                {seated.map((a) => (
                  <li key={a.id} className="axis-card">
                    <div className="axis-head">
                      <span className="axis-name">{a.name}</span>
                    </div>
                    <label className="range-label">
                      <span>Ideal</span>
                      <input type="range" min={0} max={100} value={Math.round(a.ideal * 100)} onChange={(e) => patchAspect(a.id, { ideal: Number(e.target.value) / 100 })} />
                    </label>
                    <div className="ends">
                      <span>{a.aLabel || "One end"}</span>
                      <span>{a.bLabel || "Other end"}</span>
                    </div>
                    <label className="range-label">
                      <span>Give</span>
                      <input type="range" min={0} max={50} value={Math.round(a.room * 100)} onChange={(e) => patchAspect(a.id, { room: Number(e.target.value) / 100 })} />
                    </label>
                    <div className="ends">
                      <span>Non-negotiable</span>
                      <span>Flexible</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {step === 5 && (
            <>
              <p className="prompt">Plot the available options. Write your reasoning for the way you positioned them.</p>
              <p className="hint">Select an option, then drag its squares along each line. Its outline shows where it sits on every seat. Its name sits nearer the centre the better it fits, and leans toward the seat that strains most; outside your balance, it is struck through.</p>
              <ul className="list">
                {options.map((o) => {
                  const f = fits[o.id];
                  const isSel = o.id === selectedOpt;
                  return (
                    <li key={o.id} className={cn("opt-card", isSel && "is-selected")}>
                      <button className="opt-head" onClick={() => setSelectedOpt(o.id)} aria-expanded={isSel}>
                        <span className={cn("opt-name", f?.status === "outside" && "is-out")}>{o.name || "Unnamed option"}</span>
                        <span className={cn("fit", `fit-${f?.status}`)}>{fitSentence(f, seated.length)}</span>
                      </button>
                      {isSel && (
                        <div className="opt-body">
                          <input className="field" value={o.name} placeholder="Name this option" aria-label="Option name" onChange={(e) => patchOption(o.id, { name: e.target.value })} />
                          {seated.map((a) => (
                            <div key={a.id}>
                              <label className="range-label">
                                <span>{a.name}</span>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={Math.round((o.values[a.id] ?? 0.5) * 100)}
                                  onChange={(e) => patchOption(o.id, { values: { ...o.values, [a.id]: Number(e.target.value) / 100 } })}
                                />
                              </label>
                              <div className="ends">
                                <span>{a.aLabel || "One end"}</span>
                                <span>{a.bLabel || "Other end"}</span>
                              </div>
                            </div>
                          ))}
                          <label className="stack">
                            <span>Why did you place it here?</span>
                            <textarea className="field" rows={3} value={o.reasoning} onChange={(e) => patchOption(o.id, { reasoning: e.target.value })} />
                          </label>
                          <button className="link" onClick={() => removeOption(o.id)}>
                            Remove option
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <button className="btn" onClick={addOption} disabled={!seated.length}>
                Add an option
              </button>
              {!seated.length && <p className="note">Give at least one aspect a seat before placing options.</p>}
            </>
          )}

          {step === 6 && (
            <>
              <p className="prompt">Do this repeatedly when the camera moves: a new perspective, opportunity, or idea.</p>
              <p className="hint">Take a snapshot of the map as it is now, then go back and change what moved. Show an earlier snapshot to see its region traced over the current one.</p>
              <div className="kinds" role="radiogroup" aria-label="What moved?">
                {(Object.keys(MOVE_LABEL) as MoveKind[]).map((k) => (
                  <button key={k} role="radio" aria-checked={moveKind === k} className={cn("kind", moveKind === k && "is-on")} onClick={() => setMoveKind(k)}>
                    {MOVE_LABEL[k]}
                  </button>
                ))}
              </div>
              <label className="stack">
                <span>What changed?</span>
                <textarea className="field" rows={2} value={moveNote} onChange={(e) => setMoveNote(e.target.value)} placeholder="A second offer came in…" />
              </label>
              <button className="btn" onClick={takeSnapshot} disabled={!aspects.length}>
                Take snapshot
              </button>
              {snapshots.length > 0 && (
                <ul className="list snaps">
                  {snapshots.map((s) => {
                    const sSeated = s.state.aspects.filter((a) => a.seated && a.name.trim());
                    const changed = options.filter((o) => {
                      const old = s.state.options.find((x) => x.id === o.id);
                      return old && fitOf(old, sSeated).status !== fits[o.id]?.status;
                    });
                    return (
                      <li key={s.id} className="snap">
                        <div className="snap-head">
                          <span className="snap-kind">{MOVE_LABEL[s.kind]}</span>
                          <span className="snap-date">{new Date(s.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                        </div>
                        {s.note && <p className="snap-note">{s.note}</p>}
                        {changed.length > 0 && <p className="snap-diff">Since then: {changed.map((o) => `${o.name || "Unnamed"} is now ${fits[o.id].status}`).join("; ")}.</p>}
                        <div className="row-links">
                          <button className="link" onClick={() => setGhostId(ghostId === s.id ? null : s.id)}>
                            {ghostId === s.id ? "Hide on map" : "Show on map"}
                          </button>
                          <button className="link" onClick={() => restore(s)}>
                            Restore
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}

          <div className="pager">
            {step > 1 ? (
              <button className="link" onClick={() => goto(step - 1)}>
                Back
              </button>
            ) : (
              <span />
            )}
            {step < 6 && (
              <button className="btn" onClick={() => goto(step + 1)} disabled={step === 1 && !aspects.length}>
                Next: {STEPS[step].name}
              </button>
            )}
          </div>
        </aside>
      </main>

      <footer className="foot">
        <span>
          <a href="https://in-process.net" target="_blank" rel="noreferrer">
            In Process Coaching
          </a>
        </span>
        <span>Your map is saved in this browser only.</span>
      </footer>
    </div>
  );
}
