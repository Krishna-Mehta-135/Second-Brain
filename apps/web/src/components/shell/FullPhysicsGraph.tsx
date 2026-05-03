"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDocuments } from "@/lib/documents/useDocuments";
import { useRouter, useParams } from "next/navigation";

// ─── Full Physics Graph for graph page ──────────────────────────────────────
const MG_W = 1200,
  MG_H = 800;
const MG_REPULSION = 25000,
  MG_SPRING = 0.02,
  MG_REST = 120,
  MG_GRAVITY = 0.001,
  MG_DAMP = 0.85;

export function FullPhysicsGraph() {
  const { documents } = useDocuments();
  const router = useRouter();
  const params = useParams();
  const currentDocId = params?.docId as string;
  const [mounted, setMounted] = useState(false);
  const [nodes, setNodes] = useState<
    { id: number; docId: string; r: number; color: string; label: string }[]
  >([]);
  const [edges, setEdges] = useState<{ a: number; b: number }[]>([]);
  const lastDocIds = useRef<string>("");

  // Initialize nodes and edges from documents
  useEffect(() => {
    if (documents.length === 0) return;

    const currentDocIds = documents
      .slice(0, 10)
      .map((d) => d.id)
      .join(",");

    // Only rebuild graph if the set of documents has actually changed
    if (currentDocIds === lastDocIds.current) return;
    lastDocIds.current = currentDocIds;

    const newNodes = documents.slice(0, 10).map((doc, i) => {
      const isActive = doc.id === currentDocId;
      return {
        id: i,
        docId: doc.id,
        r: isActive ? 8 : 4.5,
        color: isActive ? "hsl(var(--sb-accent))" : "#ffffff",
        label: doc.title || "Untitled",
      };
    });

    const newEdges: { a: number; b: number }[] = [];
    for (let i = 1; i < newNodes.length; i++) {
      newEdges.push({ a: 0, b: i });
    }

    setNodes(newNodes);
    setEdges(newEdges);

    // Position root node in absolute center, spread others in a ring
    posRef.current = newNodes.map((_, i) => {
      const centerX = MG_W / 2;
      const centerY = MG_H / 2;
      if (i === 0) return { x: centerX, y: centerY };

      const a = (i / (newNodes.length - 1)) * Math.PI * 2;
      const radius = 50 + (Math.random() * 10 - 5); // Add slight randomness
      return {
        x: centerX + Math.cos(a) * radius,
        y: centerY + Math.sin(a) * radius,
      };
    });
    velRef.current = newNodes.map(() => ({ vx: 0, vy: 0 }));
  }, [documents, currentDocId]);

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

      // Calculate Forces
      for (let i = 0; i < N; i++) {
        // 1. Gravity (Pull to center)
        if (i !== di) {
          vel[i]!.vx += (MG_W / 2 - pos[i]!.x) * MG_GRAVITY * 1.5;
          vel[i]!.vy += (MG_H / 2 - pos[i]!.y) * MG_GRAVITY * 1.5;
        }

        // 2. Node Repulsion
        for (let j = i + 1; j < N; j++) {
          const dx = pos[j]!.x - pos[i]!.x;
          const dy = pos[j]!.y - pos[i]!.y;
          const d2 = dx * dx + dy * dy;
          if (d2 === 0) continue; // Prevent division by zero

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

      // 3. Spring Forces (Edges)
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

      // 4. Velocity integration & bounds
      for (let i = 0; i < N; i++) {
        if (i === di) continue;

        vel[i]!.vx *= MG_DAMP;
        vel[i]!.vy *= MG_DAMP;

        let newX = pos[i]!.x + vel[i]!.vx;
        let newY = pos[i]!.y + vel[i]!.vy;

        // Strict boundary enforcement with "bounce"
        if (newX < 15) {
          newX = 15;
          vel[i]!.vx *= -0.5;
        }
        if (newX > MG_W - 15) {
          newX = MG_W - 15;
          vel[i]!.vx *= -0.5;
        }
        if (newY < 15) {
          newY = 15;
          vel[i]!.vy *= -0.5;
        }
        if (newY > MG_H - 15) {
          newY = MG_H - 15;
          vel[i]!.vy *= -0.5;
        }

        pos[i]!.x = newX;
        pos[i]!.y = newY;
      }

      tick((t) => t + 1);
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [edges]);

  const toSVG = (e: React.MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const r = svgRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * MG_W,
      y: ((e.clientY - r.top) / r.height) * MG_H,
    };
  };
  const onDown = (e: React.MouseEvent, idx: number) => {
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
  };
  const onMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const { x, y } = toSVG(e);
    const { idx, ox, oy } = dragRef.current;
    posRef.current[idx] = {
      x: Math.max(12, Math.min(MG_W - 12, x - ox)),
      y: Math.max(12, Math.min(MG_H - 12, y - oy)),
    };
  };
  const onUp = () => {
    if (dragRef.current) {
      const { idx, startTime } = dragRef.current;
      const duration = Date.now() - startTime;

      // If short duration and minimal movement, treat as a click
      if (duration < 200) {
        const node = nodes[idx];
        if (node && node.docId) {
          router.push(`/documents/${node.docId}`);
        }
      }
    }
    dragRef.current = null;
  };
  const pos = posRef.current;

  if (!mounted || nodes.length === 0)
    return <div className="w-full h-full bg-transparent" />;

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
        <radialGradient id="mgGlow" cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor="hsl(var(--sb-accent))"
            stopOpacity="0.5"
          />
          <stop
            offset="100%"
            stopColor="hsl(var(--sb-accent))"
            stopOpacity="0"
          />
        </radialGradient>
      </defs>
      {edges.map(
        (e, idx) =>
          pos[e.a] &&
          pos[e.b] && (
            <line
              key={idx}
              x1={pos[e.a]!.x}
              y1={pos[e.a]!.y}
              x2={pos[e.b]!.x}
              y2={pos[e.b]!.y}
              stroke="hsl(var(--sb-border-hover))"
              strokeWidth="1"
              className="transition-opacity duration-300"
            />
          ),
      )}
      {nodes.map((n, i) => {
        const isDrag = dragRef.current?.idx === i;
        if (!pos[i]) return null;

        return (
          <g
            key={i}
            onMouseDown={(e) => onDown(e, i)}
            style={{
              cursor: isDrag ? "grabbing" : "pointer",
              transformBox: "fill-box",
              transformOrigin: "center",
            }}
            className="group"
          >
            {i === 0 && (
              <circle
                cx={pos[i]!.x}
                cy={pos[i]!.y}
                r="18"
                fill="url(#mgGlow)"
              />
            )}
            <circle
              cx={pos[i]!.x}
              cy={pos[i]!.y}
              r={n.r * 2} // Double node sizes for full graph
              fill={n.color}
              style={{
                filter: isDrag
                  ? `drop-shadow(0 0 12px hsl(var(--sb-accent)))`
                  : i === 0
                    ? `drop-shadow(0 0 8px hsla(var(--sb-accent-glow)/0.5))`
                    : undefined,
              }}
            />
            {n.label && (
              <text
                x={pos[i]!.x}
                y={pos[i]!.y + n.r * 2 + 20}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="12"
                className="pointer-events-none opacity-80 font-bold"
              >
                {n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
