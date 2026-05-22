import { useMemo } from "react";

export type GraphNode = { id: string; label: string; group?: string };
export type GraphEdge = { source: string; target: string; weight?: number };

// Simple deterministic circular layout — no external deps, SSR-safe.
export function NetworkGraph({
  nodes,
  edges,
  meId,
  height = 280,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  meId?: string;
  height?: number;
}) {
  const layout = useMemo(() => {
    const cx = 200;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 30;
    const positioned = nodes.map((n, i) => {
      if (n.id === meId) return { ...n, x: cx, y: cy };
      const others = nodes.filter((m) => m.id !== meId);
      const idx = others.findIndex((m) => m.id === n.id);
      const angle = (idx / Math.max(others.length, 1)) * Math.PI * 2 - Math.PI / 2;
      return { ...n, x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    });
    const byId = new Map(positioned.map((p) => [p.id, p]));
    return { positioned, byId };
  }, [nodes, meId, height]);

  if (nodes.length === 0) {
    return <div className="text-xs text-muted-foreground/60 text-center py-12">Connect with peers to see your graph</div>;
  }

  return (
    <svg viewBox={`0 0 400 ${height}`} className="w-full h-full">
      <defs>
        <radialGradient id="meglow">
          <stop offset="0%" stopColor="white" stopOpacity="0.4" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
      {edges.map((e, i) => {
        const a = layout.byId.get(e.source);
        const b = layout.byId.get(e.target);
        if (!a || !b) return null;
        return (
          <line
            key={i}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke="currentColor"
            strokeOpacity={0.25}
            strokeWidth={(e.weight ?? 1) * 1.2}
          />
        );
      })}
      {layout.positioned.map((n) => {
        const me = n.id === meId;
        return (
          <g key={n.id}>
            {me && <circle cx={n.x} cy={n.y} r={26} fill="url(#meglow)" />}
            <circle
              cx={n.x} cy={n.y}
              r={me ? 14 : 9}
              fill={me ? "white" : "rgba(255,255,255,0.85)"}
              stroke="white"
              strokeOpacity={me ? 1 : 0.4}
              strokeWidth={me ? 2 : 1}
            />
            <text x={n.x} y={n.y + (me ? 32 : 22)} textAnchor="middle" fontSize={me ? 11 : 9} fill="currentColor" opacity={0.8}>
              {n.label.length > 14 ? n.label.slice(0, 12) + "…" : n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
