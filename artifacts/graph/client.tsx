"use client";

import { useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Artifact } from "@/components/chat/create-artifact";
import type { PatientGraph } from "@/lib/superstack/types";

type GraphArtifactMetadata = Record<string, never>;

type PositionedNode = PatientGraph["nodes"][number] & {
  x: number;
  y: number;
};

const COLUMN_X: Record<PatientGraph["nodes"][number]["type"], number> = {
  condition: 130,
  symptom: 130,
  medication: 380,
  supplement: 380,
  recommendation: 630,
  goal: 630,
  lab: 870,
  diagnostic: 870,
};

const TYPE_LABELS: Record<PatientGraph["nodes"][number]["type"], string> = {
  medication: "Medication",
  supplement: "Supplement",
  condition: "Condition",
  lab: "Lab",
  goal: "Goal",
  symptom: "Symptom",
  recommendation: "Recommendation",
  diagnostic: "Diagnostic",
};

const TYPE_STYLES: Record<PatientGraph["nodes"][number]["type"], string> = {
  medication: "border-sky-500/25 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  supplement:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  condition: "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200",
  lab: "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  goal: "border-violet-500/25 bg-violet-500/10 text-violet-800 dark:text-violet-200",
  symptom:
    "border-orange-500/25 bg-orange-500/10 text-orange-800 dark:text-orange-200",
  recommendation:
    "border-cyan-500/25 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200",
  diagnostic:
    "border-yellow-500/25 bg-yellow-500/10 text-yellow-800 dark:text-yellow-200",
};

const EDGE_STYLES = {
  info: "stroke-zinc-400/90 dark:stroke-zinc-500/80",
  low: "stroke-emerald-500/90",
  moderate: "stroke-amber-500/90",
  high: "stroke-rose-500/90",
};

function parseGraph(content: string): PatientGraph | null {
  if (!content) {
    return null;
  }

  try {
    return JSON.parse(content) as PatientGraph;
  } catch {
    return null;
  }
}

function getColumnKey(type: PositionedNode["type"]) {
  switch (type) {
    case "condition":
    case "symptom":
      return "left";
    case "medication":
    case "supplement":
      return "stack";
    case "recommendation":
    case "goal":
      return "plan";
    case "lab":
    case "diagnostic":
      return "signals";
    default:
      return "stack";
  }
}

function positionNodes(graph: PatientGraph) {
  const counters = {
    left: 0,
    stack: 0,
    plan: 0,
    signals: 0,
  };

  const positionedNodes = graph.nodes.map((node) => {
    const columnKey = getColumnKey(node.type);
    const row = counters[columnKey];
    counters[columnKey] += 1;

    return {
      ...node,
      x: COLUMN_X[node.type] ?? 380,
      y: 110 + row * 96,
    };
  });

  const maxRows = Math.max(...Object.values(counters), 1);
  const height = Math.max(560, 170 + (maxRows - 1) * 96);

  return { positionedNodes, height };
}

export function GraphCanvas({ graph }: { graph: PatientGraph }) {
  const { positionedNodes, height } = useMemo(() => positionNodes(graph), [graph]);
  const nodeMap = useMemo(
    () => new Map(positionedNodes.map((node) => [node.id, node])),
    [positionedNodes]
  );

  return (
    <div className="relative h-full min-h-[560px] overflow-x-hidden overflow-y-auto text-foreground">
      <div className="sticky top-0 z-10 flex flex-wrap gap-2 border-b border-border/50 p-4 backdrop-blur">
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] ${TYPE_STYLES[type as keyof typeof TYPE_LABELS]}`}
            key={type}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="relative w-full overflow-hidden" style={{ height }}>
        <svg
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMin meet"
          viewBox={`0 0 1000 ${height}`}
        >
          {graph.edges.map((edge) => {
            const source = nodeMap.get(edge.source);
            const target = nodeMap.get(edge.target);

            if (!source || !target) {
              return null;
            }

            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;
            const curve = `M ${source.x} ${source.y} C ${(source.x + midX) / 2} ${source.y}, ${(target.x + midX) / 2} ${target.y}, ${target.x} ${target.y}`;

            return (
              <g key={edge.id}>
                <path
                  className={EDGE_STYLES[edge.severity]}
                  d={curve}
                  fill="none"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.85"
                />
                <foreignObject height="28" width="150" x={midX - 75} y={midY - 14}>
                  <div className="flex h-full items-center justify-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="rounded-full border border-border/60 bg-background/90 px-2.5 py-1 text-[10px] font-medium text-foreground shadow-lg backdrop-blur transition hover:border-border hover:bg-background"
                          type="button"
                        >
                          {edge.label}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 border-border/60 bg-background/95 text-foreground">
                        <div className="space-y-2">
                          <div className="text-sm font-semibold">{edge.label}</div>
                          <div className="text-sm text-muted-foreground">{edge.explanation}</div>
                          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
                            {edge.severity} significance
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>

        {positionedNodes.map((node) => (
          <div
            className={`absolute w-44 -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-3.5 py-3 shadow-xl backdrop-blur ${TYPE_STYLES[node.type]}`}
            key={node.id}
            style={{ left: `${(node.x / 1000) * 100}%`, top: node.y }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/55">
              {TYPE_LABELS[node.type]}
            </div>
            <div className="mt-1 text-sm font-semibold leading-tight text-foreground">
              {node.label}
            </div>
            {node.subtitle ? (
              <div className="mt-1 text-xs leading-relaxed text-foreground/70">{node.subtitle}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export const graphArtifact = new Artifact<"graph", GraphArtifactMetadata>({
  kind: "graph",
  description: "Useful for visual interaction graphs for current stacks and recommendations.",
  initialize: ({ setMetadata }) => {
    setMetadata({});
  },
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === "data-graphDelta") {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible: true,
        status: "streaming",
      }));
    }
  },
  content: ({ content }) => {
    const graph = parseGraph(content);

    if (!graph) {
      return (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
          No graph available yet.
        </div>
      );
    }

    return <GraphCanvas graph={graph} />;
  },
  actions: [],
  toolbar: [],
});
