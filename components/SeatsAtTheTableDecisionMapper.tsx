"use client";

import React, { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowRight } from "lucide-react";

/**
 * Seats at the Table — Decision Journey Mapper (short, stable build)
 *
 * Requirements implemented:
 * - Intake copy: "Write your considerations freely."
 * - Unnamed options are greyed out, start away from preference, and are NOT draggable
 * - Named options become draggable on the 2D map (dims[0], dims[1])
 * - Lightweight dev tests for NLP parsing
 * - Footer: Nitzan Hermon + in-process.net
 */

// -------------------- utils --------------------
const uid = () => Math.random().toString(36).slice(2, 9);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

function pointInPolygon(p: { x: number; y: number }, poly: Array<{ x: number; y: number }>) {
  // Ray casting point-in-polygon
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x,
      yi = poly[i].y;
    const xj = poly[j].x,
      yj = poly[j].y;
    const hit = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-9) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function makeDefaultPoly() {
  return [
    { x: 0.25, y: 0.15 },
    { x: 0.85, y: 0.25 },
    { x: 0.75, y: 0.8 },
    { x: 0.35, y: 0.9 },
    { x: 0.2, y: 0.55 },
  ];
}

// -------------------- NLP-lite intake --------------------
function normalizeText(raw: string) {
  return (raw || "")
    .replaceAll("•", "\n")
    .replaceAll("·", "\n")
    .replaceAll("\r", "")
    .trim();
}

function splitCandidates(raw: string) {
  const t = normalizeText(raw);
  if (!t) return [] as string[];

  const parts: string[] = [];
  for (const line of t.split("\n")) {
    for (const semi of line.split(";")) {
      for (const chunk of semi.split(",")) {
        const s = chunk.trim();
        if (s) parts.push(s);
      }
    }
  }

  // de-dupe case-insensitively
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    const k = p.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

function inferAxis(text: string) {
  const s = (text || "").trim();
  const lower = s.toLowerCase();

  const vs = lower.indexOf(" vs ");
  if (vs > 0) {
    const a = s.slice(0, vs).trim();
    const b = s.slice(vs + 4).trim();
    if (a && b) return { name: `${a} ↔ ${b}`, left: a, right: b };
  }

  const slash = s.indexOf("/");
  if (slash > 0) {
    const a = s.slice(0, slash).trim();
    const b = s.slice(slash + 1).trim();
    if (a && b) return { name: `${a} ↔ ${b}`, left: a, right: b };
  }

  // very light keyword mapping
  if (lower.includes("money") || lower.includes("salary") || lower.includes("pay")) return { name: "Money", left: "Lower", right: "Higher" };
  if (lower.includes("time") || lower.includes("balance") || lower.includes("burnout") || lower.includes("life"))
    return { name: "Work-life", left: "All work", right: "All life" };
  if (lower.includes("growth") || lower.includes("learning") || lower.includes("skills")) return { name: "Growth", left: "Stable", right: "Expansive" };
  if (lower.includes("meaning") || lower.includes("purpose") || lower.includes("impact")) return { name: "Meaning", left: "Instrumental", right: "Purposeful" };
  if (lower.includes("risk") || lower.includes("security") || lower.includes("stability")) return { name: "Risk", left: "Safer", right: "Riskier" };

  return { name: s || "Dimension", left: "Lower", right: "Higher" };
}

function buildDimensionsFromConsiderations(raw: string, max = 8) {
  const parts = splitCandidates(raw).slice(0, max);
  if (!parts.length) return null as null | Array<Dim>;

  const dims: Dim[] = parts.map((p) => {
    const a = inferAxis(p);
    return { id: uid(), name: a.name, leftLabel: a.left, rightLabel: a.right, preference: 0.5 };
  });

  // Ensure 2D map works.
  while (dims.length < 2) {
    dims.push({ id: uid(), name: `Dimension ${dims.length + 1}`, leftLabel: "Lower", rightLabel: "Higher", preference: 0.5 });
  }

  return dims;
}

// -------------------- types + defaults --------------------
type Dim = { id: string; name: string; leftLabel: string; rightLabel: string; preference: number };
type Opt = { id: string; name: string; notes: string; scores: Record<string, number> };

const DEFAULT_DIMS: Dim[] = [
  { id: uid(), name: "Work-life", leftLabel: "All work", rightLabel: "All life", preference: 0.65 },
  { id: uid(), name: "Money", leftLabel: "Lower", rightLabel: "Higher", preference: 0.7 },
  { id: uid(), name: "Growth", leftLabel: "Stable", rightLabel: "Expansive", preference: 0.6 },
  { id: uid(), name: "Meaning", leftLabel: "Instrumental", rightLabel: "Purposeful", preference: 0.7 },
];

const DEFAULT_OPTIONS: Opt[] = [
  { id: uid(), name: "", notes: "", scores: {} },
  { id: uid(), name: "", notes: "", scores: {} },
  { id: uid(), name: "", notes: "", scores: {} },
];

function initOptions(dims: Dim[]) {
  // Start unnamed options away from the preference point in dims[0]/dims[1].
  const p0 = dims[0]?.preference ?? 0.5;
  const p1 = dims[1]?.preference ?? 0.5;
  const outside0 = p0 < 0.5 ? 0.9 : 0.1;
  const outside1 = p1 < 0.5 ? 0.9 : 0.1;

  return DEFAULT_OPTIONS.map((o) => ({
    ...o,
    scores: Object.fromEntries(dims.map((d, idx) => [d.id, idx === 0 ? outside0 : idx === 1 ? outside1 : 0.5])),
  }));
}

// -------------------- tiny dev tests --------------------
function runTests() {
  const assert = (c: boolean, m: string) => {
    if (!c) throw new Error(m);
  };

  assert(splitCandidates("• a\n• b").length === 2, "splitCandidates bullets");
  assert(inferAxis("x vs y").left === "x" && inferAxis("x vs y").right === "y", "inferAxis vs");
  assert(inferAxis("remote / in-person").left === "remote" && inferAxis("remote / in-person").right === "in-person", "inferAxis slash");
  assert(normalizeText("a\r\nb") === "a\nb", "normalizeText CR");

  const dims = buildDimensionsFromConsiderations("money")!;
  assert(dims.length >= 2, "buildDimensions ensures at least 2");

  const os = initOptions([
    { id: "a", name: "A", leftLabel: "L", rightLabel: "R", preference: 0.8 },
    { id: "b", name: "B", leftLabel: "L", rightLabel: "R", preference: 0.2 },
  ] as any);
  assert(os[0].scores.a === 0.1 && os[0].scores.b === 0.9, "initOptions places outside preference");
}

try {
  // eslint-disable-next-line no-undef
  if (typeof process === "undefined" || process.env?.NODE_ENV !== "production") runTests();
} catch {
  // Don’t break runtime for dev-only tests.
}

// -------------------- component --------------------
export default function SeatsAtTheTableDecisionMapper() {
  const [step, setStep] = useState<"intake" | "visual">("intake");
  const [decisionTitle, setDecisionTitle] = useState("My decision");
  const [considerations, setConsiderations] = useState("");

  const [dims, setDims] = useState<Dim[]>(DEFAULT_DIMS);
  const [options, setOptions] = useState<Opt[]>(() => initOptions(DEFAULT_DIMS));
  const [poly, setPoly] = useState(() => makeDefaultPoly());
  const [selectedOptionId, setSelectedOptionId] = useState<string>(DEFAULT_OPTIONS[0]?.id);

  // SVG layout
  const size = 420;
  const pad = 26;
  const inner = size - pad * 2;
  const toSvg = (p: { x: number; y: number }) => ({ x: pad + p.x * inner, y: pad + (1 - p.y) * inner });
  const fromSvg = (p: { x: number; y: number }) => ({ x: clamp01((p.x - pad) / inner), y: clamp01(1 - (p.y - pad) / inner) });

  const polySvg = poly.map(toSvg);
  const polyPath = polySvg.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  // option scoring: distance-to-preference + polygon inclusion (2D)
  const statusById = useMemo(() => {
    const pref = Object.fromEntries(dims.map((d) => [d.id, d.preference]));
    const out: Record<string, { dist: number; inside: boolean; score: number }> = {};

    for (const o of options) {
      const coords = dims.map((d) => o.scores[d.id] ?? 0.5);
      const prefs = dims.map((d) => pref[d.id] ?? 0.5);

      let sum = 0;
      for (let i = 0; i < coords.length; i++) {
        const diff = coords[i] - prefs[i];
        sum += diff * diff;
      }
      const dist = Math.sqrt(sum / Math.max(1, coords.length));

      const x = coords[0] ?? 0.5;
      const y = coords[1] ?? 0.5;
      const inside = poly.length >= 3 ? pointInPolygon({ x, y }, poly) : true;
      const score = (1 - dist) * (inside ? 1 : 0.75);

      out[o.id] = { dist, inside, score };
    }

    return out;
  }, [dims, options, poly]);

  const points2D = useMemo(() => {
    const xId = dims[0]?.id;
    const yId = dims[1]?.id;
    return options.map((o) => {
      const isNamed = !!o.name.trim();
      return {
        id: o.id,
        displayName: isNamed ? o.name : "New option",
        isNamed,
        x: o.scores[xId] ?? 0.5,
        y: o.scores[yId] ?? 0.5,
      };
    });
  }, [dims, options]);

  const pref2D = useMemo(() => ({ x: dims[0]?.preference ?? 0.5, y: dims[1]?.preference ?? 0.5 }), [dims]);

  // dragging state
  const [dragPolyIdx, setDragPolyIdx] = useState<number | null>(null);
  const [dragOptionId, setDragOptionId] = useState<string | null>(null);
  const dragModeRef = useRef<"none" | "poly" | "option">("none");

  const selected = options.find((o) => o.id === selectedOptionId) || options[0];

  const startFromIntake = () => {
    const built = buildDimensionsFromConsiderations(considerations);
    const nextDims = built || DEFAULT_DIMS;
    setDims(nextDims);
    setOptions(initOptions(nextDims));
    setPoly(makeDefaultPoly());
    setSelectedOptionId(DEFAULT_OPTIONS[0]?.id);
    setStep("visual");
  };

  const addOption = () => {
    // New unnamed option, placed away from preference.
    const p0 = dims[0]?.preference ?? 0.5;
    const p1 = dims[1]?.preference ?? 0.5;
    const outside0 = p0 < 0.5 ? 0.9 : 0.1;
    const outside1 = p1 < 0.5 ? 0.9 : 0.1;

    const o: Opt = {
      id: uid(),
      name: "",
      notes: "",
      scores: Object.fromEntries(dims.map((d, idx) => [d.id, idx === 0 ? outside0 : idx === 1 ? outside1 : 0.5])),
    };

    setOptions((os) => [...os, o]);
    setSelectedOptionId(o.id);
  };

  const removeOption = (id: string) => {
    const next = options.filter((o) => o.id !== id);
    setOptions(next);
    if (selectedOptionId === id) setSelectedOptionId(next[0]?.id);
  };

  const top3 = useMemo(() => {
    return [...options]
      .map((o) => ({ o, s: statusById[o.id] }))
      .sort((a, b) => (b.s?.score ?? 0) - (a.s?.score ?? 0))
      .slice(0, 3);
  }, [options, statusById]);

  // Process overview (short)
  const processSteps = [
    { key: "intake", label: "1) Write your considerations freely.", desc: "Messy is fine." },
    { key: "axes", label: "2) Name axes", desc: "Edit the polarities." },
    { key: "region", label: "3) Draw passable region", desc: "Drag polygon points." },
    { key: "place", label: "4) Place options", desc: "Sliders; drag once named." },
    { key: "reflect", label: "5) Reflect", desc: "See what rises." },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">Seats at the Table</div>
            <div className="text-3xl font-semibold tracking-tight">Decision Journey Mapper</div>
          </div>
          {step === "visual" ? (
            <Button variant="secondary" onClick={() => setStep("intake")}>
              New intake
            </Button>
          ) : null}
        </div>
        <div>
          <Label>Decision</Label>
          <Input value={decisionTitle} onChange={(e) => setDecisionTitle(e.target.value)} placeholder="e.g., Take the new job?" />
        </div>
      </div>

      {/* Process overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {processSteps.map((s) => (
              <div
                key={s.key}
                className={cn("rounded-2xl border p-3", (step === "intake" ? s.key === "intake" : s.key === "place") && "border-primary bg-primary/5")}
              >
                <div className="font-medium text-sm">{s.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {step === "intake" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Start with words</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Write your considerations in plain language. Bullets, fragments, contradictions — all good. If you write “X vs Y” or “X / Y”, we’ll auto-build an axis.
            </div>

            <div className="space-y-2">
              <Label>Write your considerations freely.</Label>
              <Textarea
                value={considerations}
                onChange={(e) => setConsiderations(e.target.value)}
                placeholder={[
                  "Examples:",
                  "• money vs time",
                  "• location / commute",
                  "• growth options",
                  "• identity / meaning",
                  "• risk, runway, security",
                  "• my relationships + community",
                ].join("\n")}
                className="min-h-[180px]"
              />
              <div className="text-xs text-muted-foreground">We’ll infer up to 8 dimensions. You can edit later.</div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">Tip: write “X vs Y” to define an axis.</div>
              <Button onClick={startFromIntake} className="gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Map</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="shrink-0">
                  <svg
                    width={size}
                    height={size}
                    className="rounded-2xl border bg-background"
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const np = fromSvg({ x: e.clientX - rect.left, y: e.clientY - rect.top });

                      if (dragModeRef.current === "poly" && dragPolyIdx !== null) {
                        setPoly((ps) => ps.map((pt, i) => (i === dragPolyIdx ? np : pt)));
                        return;
                      }

                      if (dragModeRef.current === "option" && dragOptionId) {
                        const xId = dims[0]?.id;
                        const yId = dims[1]?.id;
                        if (!xId || !yId) return;
                        setOptions((os) =>
                          os.map((o) => (o.id === dragOptionId ? { ...o, scores: { ...o.scores, [xId]: np.x, [yId]: np.y } } : o))
                        );
                      }
                    }}
                    onMouseUp={() => {
                      dragModeRef.current = "none";
                      setDragPolyIdx(null);
                      setDragOptionId(null);
                    }}
                    onMouseLeave={() => {
                      dragModeRef.current = "none";
                      setDragPolyIdx(null);
                      setDragOptionId(null);
                    }}
                  >
                    {/* midlines */}
                    <line x1={pad} y1={pad + inner / 2} x2={pad + inner} y2={pad + inner / 2} strokeDasharray="3 4" className="stroke-muted-foreground/40" />
                    <line x1={pad + inner / 2} y1={pad} x2={pad + inner / 2} y2={pad + inner} strokeDasharray="3 4" className="stroke-muted-foreground/40" />

                    {/* passable region */}
                    <path d={polyPath} className="fill-primary/15 stroke-primary/50" strokeWidth={2} />

                    {/* preference dot */}
                    {(() => {
                      const sp = toSvg(pref2D);
                      return <circle cx={sp.x} cy={sp.y} r={6} className="fill-foreground" />;
                    })()}

                    {/* options */}
                    {points2D.map((p) => {
                      const s = statusById[p.id];
                      const sp = toSvg(p);
                      const isSelected = p.id === selectedOptionId;

                      // Avoid nested ternaries in JSX to prevent syntax mistakes.
                      const fillClass = !p.isNamed
                        ? "fill-muted-foreground"
                        : isSelected
                          ? "fill-primary"
                          : s?.inside
                            ? "fill-foreground"
                            : "fill-muted-foreground";

                      return (
                        <g key={p.id}>
                          <circle
                            cx={sp.x}
                            cy={sp.y}
                            r={isSelected ? 8 : 6}
                            className={fillClass}
                            opacity={isSelected ? 1 : p.isNamed ? 0.9 : 0.35}
                            onMouseDown={(ev) => {
                              // Always allow selecting.
                              ev.preventDefault();
                              setSelectedOptionId(p.id);

                              // Unnamed options are NOT draggable.
                              if (!p.isNamed) return;

                              setDragOptionId(p.id);
                              dragModeRef.current = "option";
                            }}
                            style={{ cursor: p.isNamed ? "grab" : "not-allowed" }}
                          />
                          <text x={sp.x + 10} y={sp.y + 4} className="fill-muted-foreground" fontSize={12}>
                            {p.displayName}
                          </text>
                        </g>
                      );
                    })}

                    {/* polygon handles */}
                    {polySvg.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={7}
                        className="fill-background stroke-primary"
                        strokeWidth={2}
                        onMouseDown={(ev) => {
                          ev.preventDefault();
                          setDragPolyIdx(i);
                          dragModeRef.current = "poly";
                        }}
                        style={{ cursor: "grab" }}
                      />
                    ))}

                    {/* axis labels */}
                    <text x={pad} y={pad - 8} className="fill-muted-foreground" fontSize={12}>
                      {dims[1]?.name || "Y"}
                    </text>
                    <text x={pad + inner - 8} y={pad + inner + 18} textAnchor="end" className="fill-muted-foreground" fontSize={12}>
                      {dims[0]?.name || "X"}
                    </text>
                  </svg>

                  <div className="mt-3 text-xs text-muted-foreground">
                    Drag polygon points to define “passable.” Name an option to enable dragging its dot.
                  </div>
                </div>

                {/* Editors */}
                <div className="flex-1 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Options</div>
                    <Button variant="secondary" onClick={addOption} className="gap-2">
                      <Plus className="w-4 h-4" /> Add
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {options.map((o) => {
                      const s = statusById[o.id];
                      const isSelected = o.id === selectedOptionId;
                      const isNamed = !!o.name.trim();
                      const displayName = isNamed ? o.name : "New option";

                      return (
                        <div key={o.id} className={cn("rounded-2xl border p-3", isSelected && "border-primary", !isNamed && "opacity-60")}>
                          <div className="flex items-center justify-between gap-2">
                            <button className="text-left" onClick={() => setSelectedOptionId(o.id)}>
                              <div className="font-medium flex items-center gap-2">
                                {displayName}
                                <span className="text-xs text-muted-foreground">score {(s?.score ?? 0).toFixed(2)}</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {s?.inside ? "Inside" : "Outside"} • dist {(s?.dist ?? 0).toFixed(2)}
                              </div>
                            </button>
                            <Button variant="ghost" size="icon" onClick={() => removeOption(o.id)} title="Remove">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Selected option editor */}
                          {isSelected ? (
                            <div className="mt-3 space-y-3">
                              <div>
                                <Label>Name (enables drag)</Label>
                                <Input
                                  value={o.name}
                                  onChange={(e) => setOptions((os) => os.map((x) => (x.id === o.id ? { ...x, name: e.target.value } : x)))}
                                  placeholder="Give it a name…"
                                />
                                {!isNamed ? <div className="text-xs text-muted-foreground mt-1">Unnamed options are grey + non-draggable.</div> : null}
                              </div>

                              <div className="space-y-3">
                                {dims.map((d) => {
                                  const v = o.scores[d.id] ?? 0.5;
                                  return (
                                    <div key={d.id} className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium">{d.name}</div>
                                        <div className="text-xs text-muted-foreground">{Math.round(v * 100)}</div>
                                      </div>
                                      <Slider
                                        value={[Math.round(v * 100)]}
                                        onValueChange={(arr) => {
                                          const val = ((arr as number[])?.[0] ?? 50) / 100;
                                          setOptions((os) => os.map((x) => (x.id === o.id ? { ...x, scores: { ...x.scores, [d.id]: val } } : x)));
                                        }}
                                        max={100}
                                        step={1}
                                      />
                                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{d.leftLabel}</span>
                                        <span>{d.rightLabel}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {/* Preferences */}
                  <div className="space-y-3">
                    <div className="font-medium">Preferences</div>
                    {dims.map((d) => (
                      <div key={d.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{d.name}</div>
                          <div className="text-xs text-muted-foreground">{Math.round(d.preference * 100)}</div>
                        </div>
                        <Slider
                          value={[Math.round(d.preference * 100)]}
                          onValueChange={(arr) => {
                            const val = ((arr as number[])?.[0] ?? 50) / 100;
                            setDims((ds) => ds.map((x) => (x.id === d.id ? { ...x, preference: val } : x)));
                          }}
                          max={100}
                          step={1}
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{d.leftLabel}</span>
                          <span>{d.rightLabel}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Now what */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Now what?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-2xl border p-3 bg-muted/30">
                <div className="font-medium">Top candidates</div>
                <div className="text-xs text-muted-foreground mt-1">Closer to preferences + inside passable region.</div>
                <div className="mt-2 space-y-2">
                  {top3.map(({ o, s }) => (
                    <div key={o.id} className="rounded-2xl border p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{o.name.trim() ? o.name : "New option"}</div>
                        <div className="text-xs text-muted-foreground">{(s?.score ?? 0).toFixed(2)}</div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {s?.inside ? "Inside" : "Outside"} • dist {(s?.dist ?? 0).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                {considerations || "(no intake text)"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <div className="pt-6 border-t text-xs text-muted-foreground flex items-center justify-between">
        <div>Nitzan Hermon</div>
        <a className="underline hover:no-underline" href="https://in-process.net" target="_blank" rel="noreferrer">
          in-process.net
        </a>
      </div>
    </div>
  );
}
