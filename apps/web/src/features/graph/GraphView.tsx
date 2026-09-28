import { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { Graph } from '@/types/api';

type Node = { id: string; title: string; degree: number; x?: number; y?: number };

type GraphViewProps = {
  graph: Graph;
  onNodeClick: (id: string) => void;
  /** Highlighted node (the current note in a local graph). */
  focusId?: string;
  height?: number;
};

function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Force-directed graph of notes: node size grows with the number of links. */
export function GraphView({ graph, onNodeClick, focusId, height }: GraphViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: height ?? 0 });

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: height ?? entry.contentRect.height }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [height]);

  // The simulation mutates the objects it receives: give it fresh copies.
  const data = useMemo(
    () => ({
      nodes: graph.nodes.map((n) => ({ ...n })),
      links: graph.edges.map((e) => ({ ...e })),
    }),
    [graph],
  );
  const colors = useMemo(
    () => ({
      node: cssVar('--secondary', '#bba0d3'),
      focus: cssVar('--primary', '#7a5c8e'),
      link: cssVar('--border', '#d2c5b8'),
      text: cssVar('--foreground', '#2a2430'),
    }),
    [],
  );

  return (
    <div ref={container} className="h-full w-full overflow-hidden" style={height ? { height } : undefined}>
      {size.width > 0 && size.height > 0 && (
        <ForceGraph2D
          width={size.width}
          height={size.height}
          graphData={data}
          nodeId="id"
          nodeLabel={(node) => (node as Node).title}
          nodeVal={(node) => 1 + (node as Node).degree}
          nodeRelSize={4}
          linkColor={() => colors.link}
          linkWidth={1.2}
          cooldownTicks={120}
          onNodeClick={(node) => onNodeClick((node as Node).id)}
          nodeCanvasObjectMode={() => 'after'}
          nodeCanvasObject={(raw, ctx, scale) => {
            const node = raw as Node;
            const radius = Math.sqrt(1 + node.degree) * 4;
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI);
            ctx.fillStyle = node.id === focusId ? colors.focus : colors.node;
            ctx.fill();
            // Labels only once zoomed in enough to stay readable.
            if (scale < 0.9 && node.id !== focusId) return;
            ctx.font = `${12 / scale}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = colors.text;
            ctx.fillText(node.title, node.x ?? 0, (node.y ?? 0) + radius + 2 / scale);
          }}
        />
      )}
    </div>
  );
}
