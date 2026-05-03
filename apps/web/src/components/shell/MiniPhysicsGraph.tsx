"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDocuments } from "@/lib/documents/useDocuments";
import { useRouter, useParams } from "next/navigation";
import { useBacklinks } from "@/lib/documents/useBacklinks";

// ─── Mini Physics Graph for right panel ──────────────────────────────────────
const MG_W = 200,
  MG_H = 160;
/** Weaker repulsion + shorter springs keep the cluster centered (Obsidian-like). */
const MG_REPULSION = 340,
  MG_SPRING = 0.028,
  MG_REST = 44,
  MG_GRAVITY = 0.0034,
  MG_DAMP = 0.86;
/** Gentle push inward near edges — avoids nodes “sticking” to the bbox border. */
const MG_EDGE_MARGIN = 20;
const MG_EDGE_SOFT = 0.09;

interface GraphNode {
  id: number;
  docId: string;
  r: number;
  label: string;
}

export function MiniPhysicsGraph() {
  const { documents } = useDocuments();
  const router = useRouter();
  const params = useParams();
  const currentDocId = params?.docId as string;
  const { backlinks } = useBacklinks(currentDocId);
  const backlinkIds = new Set(backlinks.map((b) => b.id));

  const [mounted, setMounted] = useState(false);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<{ a: number; b: number }[]>([]);
  // Which node index is currently active (hovered or dragged) for dimming
  const [focusIdx, setFocusIdx] = useState<number | null>(null);

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

    const newNodes: GraphNode[] = documents.slice(0, 10).map((doc, i) => ({
      id: i,
      docId: doc.id,
      r: doc.id === currentDocId ? 5 : 3.5,
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
        const radius = 32 + (Math.random() * 14 - 7);
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
  }, [documents, currentDocId]);

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
        const x = pos[i]!.x;
        const y = pos[i]!.y;

        if (x < MG_EDGE_MARGIN)
          vel[i]!.vx += (MG_EDGE_MARGIN - x) * MG_EDGE_SOFT;
        if (x > MG_W - MG_EDGE_MARGIN)
          vel[i]!.vx -= (x - (MG_W - MG_EDGE_MARGIN)) * MG_EDGE_SOFT;
        if (y < MG_EDGE_MARGIN)
          vel[i]!.vy += (MG_EDGE_MARGIN - y) * MG_EDGE_SOFT;
        if (y > MG_H - MG_EDGE_MARGIN)
          vel[i]!.vy -= (y - (MG_H - MG_EDGE_MARGIN)) * MG_EDGE_SOFT;

        vel[i]!.vx *= MG_DAMP;
        vel[i]!.vy *= MG_DAMP;

        const pad = 10;
        const nx = x + vel[i]!.vx;
        const ny = y + vel[i]!.vy;
        pos[i]!.x = Math.max(pad, Math.min(MG_W - pad, nx));
        pos[i]!.y = Math.max(pad, Math.min(MG_H - pad, ny));
      }

      tick((t) => t + 1);
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [edges]);

  const toSVG = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const r = svgRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * MG_W,
      y: ((e.clientY - r.top) / r.height) * MG_H,
    };
  }, []);

  const onDown = useCallback(
    (e: React.MouseEvent, idx: number) => {
      e.preventDefault();
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
    (e: React.MouseEvent) => {
      if (!dragRef.current) return;
      const { x, y } = toSVG(e);
      const { idx, ox, oy } = dragRef.current;
      posRef.current[idx] = {
        x: Math.max(12, Math.min(MG_W - 12, x - ox)),
        y: Math.max(12, Math.min(MG_H - 12, y - oy)),
      };
    },
    [toSVG],
  );

  const onUp = useCallback(() => {
    if (dragRef.current) {
      const { idx, startTime } = dragRef.current;
      const duration = Date.now() - startTime;
      if (duration < 200) {
        const node = nodes[idx];
        if (node?.docId) router.push(`/documents/${node.docId}`);
      }
    }
    dragRef.current = null;
    setFocusIdx(null);
  }, [nodes, router]);

  const pos = posRef.current;

  if (!mounted || nodes.length === 0)
    return <div className="w-full h-full bg-transparent" />;

  // Determine which nodes are "related" to the focused node via edges
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
    <svg
      ref={svgRef}
      viewBox={`0 0 ${MG_W} ${MG_H}`}
      className="w-full h-full overflow-visible select-none"
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      style={{ cursor: dragRef.current ? "grabbing" : "default" }}
    >
      <defs>
        <radialGradient id="miniActiveGlow" cx="50%" cy="50%" r="50%">
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
        <radialGradient id="miniBacklinkGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Edges */}
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
                ? "rgba(255,255,255,0.7)"
                : "hsl(var(--sb-border-hover))"
            }
            strokeWidth={isHighlighted ? "1.5" : "0.8"}
            opacity={hasFocus && !isHighlighted ? 0.1 : 1}
            style={{ transition: "opacity 0.15s, stroke 0.15s" }}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((n, i) => {
        const isDrag = dragRef.current?.idx === i;
        if (!pos[i]) return null;

        const isActive = n.docId === currentDocId;
        const isBacklink = backlinkIds.has(n.docId);
        const isRelated = hasFocus ? relatedToFocus.has(i) : true;

        // Color logic: active = accent, backlink = white, others = dimmed white
        const nodeColor = isActive
          ? "hsl(var(--sb-accent))"
          : isBacklink
            ? "#ffffff"
            : "rgba(255,255,255,0.5)";

        const nodeOpacity = hasFocus ? (isRelated ? 1 : 0.15) : 1;

        return (
          <g
            key={i}
            onMouseDown={(e) => onDown(e, i)}
            onMouseEnter={() => !dragRef.current && setFocusIdx(i)}
            onMouseLeave={() => !dragRef.current && setFocusIdx(null)}
            style={{ cursor: isDrag ? "grabbing" : "pointer" }}
            opacity={nodeOpacity}
          >
            {/* Glow ring for active node */}
            {isActive && (
              <circle
                cx={pos[i]!.x}
                cy={pos[i]!.y}
                r={n.r + 6}
                fill="url(#miniActiveGlow)"
              />
            )}
            {/* Glow ring for backlink nodes */}
            {isBacklink && !isActive && (
              <circle
                cx={pos[i]!.x}
                cy={pos[i]!.y}
                r={n.r + 4}
                fill="url(#miniBacklinkGlow)"
              />
            )}
            <circle
              cx={pos[i]!.x}
              cy={pos[i]!.y}
              r={n.r}
              fill={nodeColor}
              style={{
                filter: isDrag
                  ? `drop-shadow(0 0 6px hsl(var(--sb-accent)))`
                  : isActive
                    ? `drop-shadow(0 0 5px hsla(var(--sb-accent-glow)/0.8))`
                    : isBacklink
                      ? `drop-shadow(0 0 4px rgba(255,255,255,0.6))`
                      : undefined,
                transition: "fill 0.2s",
              }}
            />
            {/* Label — only show for active + hovered nodes */}
            {(isActive || isDrag || focusIdx === i) && (
              <text
                x={pos[i]!.x}
                y={pos[i]!.y + n.r + 9}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="6"
                className="pointer-events-none"
                style={{ fontWeight: isActive ? 700 : 400 }}
              >
                {n.label.length > 18 ? n.label.slice(0, 16) + "…" : n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
