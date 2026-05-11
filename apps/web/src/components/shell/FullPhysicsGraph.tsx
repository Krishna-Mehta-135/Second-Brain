"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDocuments } from "@/lib/documents/useDocuments";
import { useRouter, useParams } from "next/navigation";
import { useBacklinks } from "@/lib/documents/useBacklinks";

// ─── Full Physics Graph for /graph page ──────────────────────────────────────
const MG_W = 1200,
  MG_H = 800;
/** Synchronized with MiniPhysicsGraph for consistent feel */
const MG_REPULSION = 3400,
  MG_SPRING = 0.012,
  MG_REST = 130,
  MG_GRAVITY = 0.001,
  MG_DAMP = 0.92;

interface GraphNode {
  id: number;
  docId: string;
  r: number;
  label: string;
}

export function FullPhysicsGraph() {
  const { documents } = useDocuments();
  const router = useRouter();
  const params = useParams();
  const currentDocId = params?.docId as string | undefined;
  const { backlinks } = useBacklinks(currentDocId ?? "");
  const backlinkIds = new Set(backlinks.map((b) => b.id));

  const [mounted, setMounted] = useState(false);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<{ a: number; b: number }[]>([]);
  const [focusIdx, setFocusIdx] = useState<number | null>(null);

  // Zoom/Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const lastPinchDistRef = useRef<number | null>(null);

  const posRef = useRef<{ x: number; y: number }[]>([]);
  const velRef = useRef<{ vx: number; vy: number }[]>([]);
  const dragRef = useRef<{
    idx: number;
    ox: number;
    oy: number;
    startTime: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number>(0);
  const [, tick] = useState(0);

  // Build nodes/edges when documents change
  useEffect(() => {
    if (documents.length === 0) return;

    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    const baseR = isMobile ? 10 : 3.5;
    const activeR = isMobile ? 16 : 6;

    // Initial zoom for mobile
    if (isMobile && zoom === 1) setZoom(0.85); // Slightly zoomed out to see more nodes on small screens

    const newNodes: GraphNode[] = documents.slice(0, 15).map((doc, i) => ({
      id: i,
      docId: doc.id,
      r: doc.id === currentDocId ? activeR : baseR,
      label: doc.title || "Untitled",
    }));

    const predefinedEdges = [
      { a: 0, b: 1 },
      { a: 0, b: 2 },
      { a: 0, b: 3 },
      { a: 1, b: 4 },
      { a: 1, b: 5 },
      { a: 2, b: 6 },
      { a: 3, b: 7 },
      { a: 5, b: 8 },
      { a: 6, b: 9 },
      { a: 1, b: 2 },
    ];

    const newEdges = predefinedEdges.filter(
      (e) => e.a < newNodes.length && e.b < newNodes.length,
    );

    for (let i = 1; i < newNodes.length; i++) {
      if (!newEdges.some((e) => e.a === i || e.b === i)) {
        newEdges.push({ a: Math.max(0, i - 1), b: i });
      }
    }

    setNodes((prevNodes) => {
      const prevPos = posRef.current;
      const prevVel = velRef.current;

      posRef.current = newNodes.map((n, i) => {
        const existingIdx = prevNodes.findIndex((pn) => pn.docId === n.docId);
        if (existingIdx !== -1 && prevPos[existingIdx]) {
          return prevPos[existingIdx]!;
        }
        if (i === 0) return { x: MG_W / 2, y: MG_H / 2 };
        const a = (i / Math.max(1, newNodes.length - 1)) * Math.PI * 2;
        const radius = 300 + Math.random() * 120 - 60;
        return {
          x: MG_W / 2 + Math.cos(a) * radius,
          y: MG_H / 2 + Math.sin(a) * radius,
        };
      });

      velRef.current = newNodes.map((n) => {
        const existingIdx = prevNodes.findIndex((pn) => pn.docId === n.docId);
        if (existingIdx !== -1 && prevVel[existingIdx]) {
          return prevVel[existingIdx]!;
        }
        return { vx: 0, vy: 0 };
      });

      return newNodes;
    });
    setEdges(newEdges);
  }, [documents, currentDocId, zoom]);

  // Physics simulation loop
  useEffect(() => {
    setMounted(true);
    const step = () => {
      const pos = posRef.current,
        vel = velRef.current,
        N = pos.length;

      if (N === 0) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      const di = dragRef.current?.idx ?? -1;

      for (let i = 0; i < N; i++) {
        if (i !== di) {
          vel[i]!.vx += (MG_W / 2 - pos[i]!.x) * MG_GRAVITY;
          vel[i]!.vy += (MG_H / 2 - pos[i]!.y) * MG_GRAVITY;
        }
        for (let j = i + 1; j < N; j++) {
          const dx = pos[j]!.x - pos[i]!.x;
          const dy = pos[j]!.y - pos[i]!.y;
          const d2 = dx * dx + dy * dy;
          if (d2 === 0) continue;
          const d = Math.sqrt(d2);
          const f = MG_REPULSION / d2;
          const fx = (f * dx) / d;
          const fy = (f * dy) / d;
          if (i !== di) {
            vel[i]!.vx -= fx;
            vel[i]!.vy -= fy;
          }
          if (j !== di) {
            vel[j]!.vx += fx;
            vel[j]!.vy += fy;
          }
        }
      }

      for (const e of edges) {
        if (!pos[e.a] || !pos[e.b]) continue;
        const dx = pos[e.b]!.x - pos[e.a]!.x;
        const dy = pos[e.b]!.y - pos[e.a]!.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d === 0) continue;
        const f = MG_SPRING * (d - MG_REST);
        const fx = (f * dx) / d;
        const fy = (f * dy) / d;
        if (e.a !== di) {
          vel[e.a]!.vx += fx;
          vel[e.a]!.vy += fy;
        }
        if (e.b !== di) {
          vel[e.b]!.vx -= fx;
          vel[e.b]!.vy -= fy;
        }
      }

      for (let i = 0; i < N; i++) {
        if (i === di) continue;
        vel[i]!.vx *= MG_DAMP;
        vel[i]!.vy *= MG_DAMP;
        pos[i]!.x = Math.max(15, Math.min(MG_W - 15, pos[i]!.x + vel[i]!.vx));
        pos[i]!.y = Math.max(15, Math.min(MG_H - 15, pos[i]!.y + vel[i]!.vy));
      }

      tick((t) => t + 1);
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [edges]);

  // Wheel listener attached to parent container for full coverage
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? 0.94 : 1.06; // Slightly faster zoom
      setZoom((z) => Math.max(0.1, Math.min(8, z * delta)));
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const toSVG = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const r = svgRef.current.getBoundingClientRect();

      let clientX = 0,
        clientY = 0;
      if ("touches" in e) {
        const touch = e.touches[0];
        if (!touch) return { x: 0, y: 0 };
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
      }

      const sx = ((clientX - r.left) / r.width) * MG_W;
      const sy = ((clientY - r.top) / r.height) * MG_H;

      return {
        x: (sx - pan.x) / zoom,
        y: (sy - pan.y) / zoom,
      };
    },
    [zoom, pan],
  );

  const onDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent, idx: number) => {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      const { x, y } = toSVG(e);
      velRef.current[idx] = { vx: 0, vy: 0 };
      dragRef.current = {
        idx,
        ox: x - posRef.current[idx]!.x,
        oy: y - posRef.current[idx]!.y,
        startTime: Date.now(),
      };
      setFocusIdx(idx);
    },
    [toSVG],
  );

  const onMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      let clientX = 0,
        clientY = 0;
      let touches: React.TouchList | TouchList | undefined;

      if ("touches" in e) {
        touches = e.touches;
        const touch = touches[0];
        if (touch) {
          clientX = touch.clientX;
          clientY = touch.clientY;
        }
      } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
      }

      // Handle Pinch to Zoom
      if (touches && touches.length === 2) {
        const t1 = touches[0]!;
        const t2 = touches[1]!;
        const dist = Math.sqrt(
          Math.pow(t2.clientX - t1.clientX, 2) +
            Math.pow(t2.clientY - t1.clientY, 2),
        );

        if (lastPinchDistRef.current !== null) {
          const delta = dist / lastPinchDistRef.current;
          setZoom((z) => Math.max(0.1, Math.min(8, z * delta)));
        }
        lastPinchDistRef.current = dist;
        return;
      }

      if (dragRef.current) {
        const { x, y } = toSVG(e);
        const { idx, ox, oy } = dragRef.current;
        posRef.current[idx] = {
          x: Math.max(15, Math.min(MG_W - 15, x - ox)),
          y: Math.max(15, Math.min(MG_H - 15, y - oy)),
        };
      } else if (isPanningRef.current) {
        const isMobile =
          typeof window !== "undefined" && window.innerWidth < 640;
        const multiplier = isMobile ? 1.6 : 1;
        const dx = (clientX - lastMousePosRef.current.x) * multiplier;
        const dy = (clientY - lastMousePosRef.current.y) * multiplier;
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      }
      lastMousePosRef.current = { x: clientX, y: clientY };
    },
    [toSVG],
  );

  const onUp = useCallback(() => {
    if (dragRef.current) {
      const { idx, startTime } = dragRef.current;
      if (Date.now() - startTime < 200) {
        const node = nodes[idx];
        if (node?.docId) router.push(`/documents/${node.docId}`);
      }
    }
    dragRef.current = null;
    isPanningRef.current = false;
    lastPinchDistRef.current = null;
    setFocusIdx(null);
  }, [nodes, router]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && !dragRef.current) {
      isPanningRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touches = e.touches;
    if (touches.length === 2) {
      const t1 = touches[0]!;
      const t2 = touches[1]!;
      lastPinchDistRef.current = Math.sqrt(
        Math.pow(t2.clientX - t1.clientX, 2) +
          Math.pow(t2.clientY - t1.clientY, 2),
      );
    } else if (touches.length === 1 && !dragRef.current) {
      const touch = touches[0]!;
      isPanningRef.current = true;
      lastMousePosRef.current = { x: touch.clientX, y: touch.clientY };
    }
  }, []);

  const pos = posRef.current;

  if (!mounted || nodes.length === 0)
    return <div className="w-full h-full bg-transparent" />;

  const relatedToFocus = new Set<number>();
  if (focusIdx !== null) {
    relatedToFocus.add(focusIdx);
    for (const e of edges) {
      if (e.a === focusIdx) relatedToFocus.add(e.b);
      if (e.b === focusIdx) relatedToFocus.add(e.a);
    }
  }
  const hasFocus = focusIdx !== null;

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-[hsl(var(--sb-bg))] cursor-grab active:cursor-grabbing touch-none"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MG_W} ${MG_H}`}
        className="w-full h-full overflow-visible select-none"
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onTouchMove={onMove}
        onTouchEnd={onUp}
      >
        <defs>
          <radialGradient id="fgActiveGlow" cx="50%" cy="50%" r="50%">
            <stop
              offset="0%"
              stopColor="hsl(var(--sb-accent))"
              stopOpacity="0.6"
            />
            <stop
              offset="100%"
              stopColor="hsl(var(--sb-accent))"
              stopOpacity="0"
            />
          </radialGradient>
          <radialGradient id="fgBacklinkGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {edges.map((e, idx) => {
            if (!pos[e.a] || !pos[e.b]) return null;
            const isHighlighted =
              hasFocus && relatedToFocus.has(e.a) && relatedToFocus.has(e.b);
            return (
              <line
                key={idx}
                x1={pos[e.a]!.x}
                y1={pos[e.a]!.y}
                x2={pos[e.b]!.x}
                y2={pos[e.b]!.y}
                stroke={
                  isHighlighted
                    ? "rgba(255,255,255,0.85)"
                    : "rgba(255,255,255,0.2)"
                }
                strokeWidth={isHighlighted ? "2.5" : "1"}
                opacity={hasFocus && !isHighlighted ? 0.08 : 1}
                style={{ transition: "opacity 0.15s, stroke 0.15s" }}
              />
            );
          })}

          {nodes.map((n, i) => {
            const isDrag = dragRef.current?.idx === i;
            if (!pos[i]) return null;
            const isActive = n.docId === currentDocId;
            const isBacklink = backlinkIds.has(n.docId);
            const isRelated = hasFocus ? relatedToFocus.has(i) : true;
            const isHovered = focusIdx === i;
            const nodeColor = isActive
              ? "hsl(var(--sb-accent))"
              : isBacklink
                ? "#ffffff"
                : "rgba(255,255,255,0.55)";
            const nodeOpacity = hasFocus ? (isRelated ? 1 : 0.12) : 1;
            const nodeR = n.r * 2;

            return (
              <g
                key={i}
                onMouseDown={(e) => onDown(e, i)}
                onTouchStart={(e) => onDown(e, i)}
                onMouseEnter={() => !dragRef.current && setFocusIdx(i)}
                onMouseLeave={() => !dragRef.current && setFocusIdx(null)}
                style={{ cursor: isDrag ? "grabbing" : "pointer" }}
                opacity={nodeOpacity}
              >
                {isActive && (
                  <circle
                    cx={pos[i]!.x}
                    cy={pos[i]!.y}
                    r={nodeR + 14}
                    fill="url(#fgActiveGlow)"
                  />
                )}
                {isBacklink && !isActive && (
                  <circle
                    cx={pos[i]!.x}
                    cy={pos[i]!.y}
                    r={nodeR + 10}
                    fill="url(#fgBacklinkGlow)"
                  />
                )}
                <circle
                  cx={pos[i]!.x}
                  cy={pos[i]!.y}
                  r={nodeR}
                  fill={nodeColor}
                  style={{
                    filter: isDrag
                      ? `drop-shadow(0 0 14px hsl(var(--sb-accent)))`
                      : isActive
                        ? `drop-shadow(0 0 10px hsla(var(--sb-accent-glow)/0.9))`
                        : isBacklink
                          ? `drop-shadow(0 0 7px rgba(255,255,255,0.7))`
                          : undefined,
                    transition: "fill 0.2s",
                  }}
                />
                {(isHovered || isActive || isDrag) && (
                  <text
                    x={pos[i]!.x}
                    y={pos[i]!.y + nodeR + 25}
                    textAnchor="middle"
                    fill={isActive ? "hsl(var(--sb-accent))" : "#ffffff"}
                    fontSize="24"
                    className="pointer-events-none"
                    style={{
                      fontWeight: isActive ? 700 : 400,
                      opacity: 1,
                      transition: "opacity 0.15s",
                    }}
                  >
                    {n.label.length > 22 ? n.label.slice(0, 20) + "…" : n.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-6 right-6 flex flex-col gap-3">
        {/* Zoom Controls */}
        <div className="flex flex-col bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <button
            onClick={() => setZoom((z) => Math.min(8, z * 1.2))}
            className="p-3 hover:bg-white/10 text-white/70 hover:text-white transition-colors border-b border-white/5"
            title="Zoom In"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.1, z / 1.2))}
            className="p-3 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        <div className="bg-black/60 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl text-xs font-medium text-white/90 shadow-2xl flex items-center gap-3">
          <span className="opacity-50">Scale</span>
          <span className="min-w-[3ch] text-right font-mono">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
