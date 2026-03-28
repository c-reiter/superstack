"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  condition:
    "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200",
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

const VIRTUAL_WIDTH = 1000;
const MIN_GRAPH_HEIGHT = 560;
const ROW_GAP = 96;

type ElementSize = {
  width: number;
  height: number;
};

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
      y: 110 + row * ROW_GAP,
    };
  });

  const maxRows = Math.max(...Object.values(counters), 1);
  const height = Math.max(MIN_GRAPH_HEIGHT, 180 + (maxRows - 1) * ROW_GAP);

  return { positionedNodes, height };
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const update = () => {
      setSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return { ref, size };
}

export function GraphCanvas({ graph }: { graph: PatientGraph }) {
  const { positionedNodes, height } = useMemo(
    () => positionNodes(graph),
    [graph]
  );
  const nodeMap = useMemo(
    () => new Map(positionedNodes.map((node) => [node.id, node])),
    [positionedNodes]
  );
  const { ref: viewportRef, size } = useElementSize<HTMLDivElement>();

  const scale = useMemo(() => {
    if (!size.width || !size.height) {
      return 1;
    }

    const availableWidth = Math.max(size.width - 32, 320);
    const availableHeight = Math.max(size.height - 32, 260);

    return Math.min(
      availableWidth / VIRTUAL_WIDTH,
      availableHeight / height,
      1
    );
  }, [height, size.height, size.width]);

  const scaledWidth = VIRTUAL_WIDTH * scale;
  const scaledHeight = height * scale;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden text-foreground">
      <div className="shrink-0 border-b border-border/50 bg-background/70 p-4 backdrop-blur">
        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] ${TYPE_STYLES[type as keyof typeof TYPE_LABELS]}`}
              key={type}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.08),_transparent_55%)]"
        ref={viewportRef}
      >
        <div className="absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border/60 bg-background/90 px-3 py-1 text-[11px] text-muted-foreground shadow-sm">
          Hover connections to inspect their meaning.
        </div>

        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: scaledWidth,
            height: scaledHeight,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className="relative origin-center"
            style={{
              width: VIRTUAL_WIDTH,
              height,
              transform: `scale(${scale})`,
            }}
          >
            <svg
              className="absolute inset-0 h-full w-full"
              preserveAspectRatio="xMidYMid meet"
              viewBox={`0 0 ${VIRTUAL_WIDTH} ${height}`}
            >
              {graph.edges.map((edge) => {
                const source = nodeMap.get(edge.source);
                const target = nodeMap.get(edge.target);

                if (!source || !target) {
                  return null;
                }

                const midX = (source.x + target.x) / 2;
                const curve = `M ${source.x} ${source.y} C ${(source.x + midX) / 2} ${source.y}, ${(target.x + midX) / 2} ${target.y}, ${target.x} ${target.y}`;

                return (
                  <path
                    className={EDGE_STYLES[edge.severity]}
                    d={curve}
                    fill="none"
                    key={edge.id}
                    opacity="0.82"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                  >
                    <title>{`${edge.label}: ${edge.explanation}`}</title>
                  </path>
                );
              })}
            </svg>

            {positionedNodes.map((node) => (
              <div
                className={`absolute w-40 -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-3 py-2.5 shadow-lg backdrop-blur ${TYPE_STYLES[node.type]}`}
                key={node.id}
                style={{
                  left: `${(node.x / VIRTUAL_WIDTH) * 100}%`,
                  top: node.y,
                }}
                title={node.subtitle ?? node.label}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/55">
                  {TYPE_LABELS[node.type]}
                </div>
                <div className="mt-1 text-sm font-semibold leading-tight text-foreground">
                  {node.label}
                </div>
                {node.subtitle ? (
                  <div className="mt-1 text-xs leading-relaxed text-foreground/70 line-clamp-3">
                    {node.subtitle}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {graph.notes && graph.notes.length > 0 ? (
        <div className="shrink-0 border-t border-border/50 bg-background/80 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {graph.notes.map((note) => (
              <div
                className="rounded-full border border-border/50 bg-muted/60 px-3 py-1 text-[11px] text-muted-foreground"
                key={note}
              >
                {note}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const graphArtifact = new Artifact<"graph", GraphArtifactMetadata>({
  kind: "graph",
  description:
    "Useful for visual interaction graphs for current stacks and recommendations.",
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
