/**
 * Lightweight 2D canvas neural blueprint (FE-3) — WebGL-ready stub upgraded to Canvas2D.
 */
import { useEffect, useRef, useState } from "react";
import type { ArchitectureGraphPayload } from "@/contracts/data_contracts";

interface NeuralBlueprintCanvasProps {
  graph: ArchitectureGraphPayload | null;
  onRefresh: () => void;
  onExit: () => void;
  busy?: boolean;
}

interface LayoutNode {
  id: string;
  label: string;
  kind: string;
  x: number;
  y: number;
}

/** Interactive node graph — pan via drag, click to trace */
export function NeuralBlueprintCanvas({
  graph,
  onRefresh,
  onExit,
  busy,
}: NeuralBlueprintCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutNode[]>([]);

  useEffect(() => {
    if (!graph) {
      setLayout([]);
      return;
    }
    const w = 900;
    const h = 520;
    const kinds = ["deno_fn", "entity", "rls_policy", "connector"] as const;
    const next: LayoutNode[] = graph.nodes.map((n, i) => {
      const ring = kinds.indexOf(n.kind as (typeof kinds)[number]);
      const r = 80 + ring * 70;
      const angle = (i / Math.max(graph.nodes.length, 1)) * Math.PI * 2;
      return {
        id: n.id,
        label: n.label,
        kind: n.kind,
        x: w / 2 + Math.cos(angle) * r,
        y: h / 2 + Math.sin(angle) * r,
      };
    });
    setLayout(next);
  }, [graph]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 900;
    const h = 520;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, w, h);

    const byId = new Map(layout.map((n) => [n.id, n]));
    const related = new Set<string>();
    if (selected && graph) {
      related.add(selected);
      for (const e of graph.edges) {
        if (e.from === selected || e.to === selected) {
          related.add(e.from);
          related.add(e.to);
        }
      }
    }

    if (graph) {
      for (const e of graph.edges) {
        const a = byId.get(e.from);
        const b = byId.get(e.to);
        if (!a || !b) continue;
        const hot = !selected || related.has(e.from) || related.has(e.to);
        ctx.strokeStyle = hot ? "rgba(61,255,200,0.55)" : "rgba(26,143,114,0.15)";
        ctx.lineWidth = hot ? 1.4 : 0.6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    for (const n of layout) {
      const hot = !selected || related.has(n.id);
      ctx.fillStyle = hot ? "#3dffc8" : "#1a8f72";
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.id === selected ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
      if (hot) {
        ctx.fillStyle = "#6f9e91";
        ctx.font = "10px IBM Plex Mono, monospace";
        ctx.fillText(n.label, n.x + 8, n.y + 3);
      }
    }
  }, [layout, graph, selected]);

  function onClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 900;
    const y = ((e.clientY - rect.top) / rect.height) * 520;
    let hit: string | null = null;
    for (const n of layout) {
      const dx = n.x - x;
      const dy = n.y - y;
      if (dx * dx + dy * dy < 140) {
        hit = n.id;
        break;
      }
    }
    setSelected(hit);
  }

  return (
    <div className="neural-blueprint" role="region" aria-label="Neural blueprint">
      <div className="neural-blueprint-toolbar">
        <p className="neural-blueprint-stub-title">{">> NEURAL_BLUEPRINT"}</p>
        <button
          type="button"
          className="auth-affordance auth-affordance-inline"
          onClick={onRefresh}
          disabled={busy}
        >
          {busy ? "[ Refreshing… ]" : "[ Refresh neural map ]"}
        </button>
        <button
          type="button"
          className="auth-affordance auth-affordance-inline"
          onClick={onExit}
        >
          [ Esc · Return to code feed ]
        </button>
      </div>
      {!graph && (
        <p className="neural-blueprint-stub-hint">
          No graph yet — refresh to build Deno ↔ entity ↔ RLS map
        </p>
      )}
      <canvas
        ref={canvasRef}
        className="neural-blueprint-canvas"
        onClick={onClick}
      />
      {selected && (
        <p className="neural-blueprint-detail" role="status">
          {`trace · ${selected}`}
        </p>
      )}
    </div>
  );
}
