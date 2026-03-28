"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type GraphPan = {
  x: number;
  y: number;
};

type GraphViewState = {
  zoom: number;
  pan: GraphPan;
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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
  const [viewState, setViewState] = useState<GraphViewState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
  });
  const dragStateRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);

  const baseScale = useMemo(() => {
    if (!size.width || !size.height) {
      return 1;
    }

    const availableWidth = Math.max(size.width - 48, 320);
    const availableHeight = Math.max(size.height - 48, 260);

    return Math.min(
      availableWidth / VIRTUAL_WIDTH,
      availableHeight / height,
      1
    );
  }, [height, size.height, size.width]);
  const graphVersion = useMemo(
    () =>
      [
        graph.title,
        graph.subtitle ?? "",
        graph.nodes.map((node) => node.id).join("|"),
        graph.edges.map((edge) => edge.id).join("|"),
      ].join("::"),
    [graph.edges, graph.nodes, graph.subtitle, graph.title]
  );

  const clampPan = useCallback(
    (pan: GraphPan, zoom: number) => {
      const totalScale = baseScale * zoom;
      const scaledWidth = VIRTUAL_WIDTH * totalScale;
      const scaledHeight = height * totalScale;
      const padding = 96;

      const maxX = Math.max((scaledWidth - size.width) / 2 + padding, padding);
      const maxY = Math.max(
        (scaledHeight - size.height) / 2 + padding,
        padding
      );

      return {
        x: clamp(pan.x, -maxX, maxX),
        y: clamp(pan.y, -maxY, maxY),
      };
    },
    [baseScale, height, size.height, size.width]
  );

  const setZoomAroundPoint = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      setViewState((current) => {
        const nextZoom = clamp(current.zoom * factor, 0.8, 3.5);

        if (!viewportRef.current || !size.width || !size.height) {
          return {
            zoom: nextZoom,
            pan: clampPan(current.pan, nextZoom),
          };
        }

        const rect = viewportRef.current.getBoundingClientRect();
        const anchorX =
          clientX === undefined
            ? size.width / 2
            : clientX - rect.left - size.width / 2;
        const anchorY =
          clientY === undefined
            ? size.height / 2
            : clientY - rect.top - size.height / 2;
        const scaleRatio = nextZoom / current.zoom;

        const nextPan = clampPan(
          {
            x: current.pan.x - (anchorX - current.pan.x) * (scaleRatio - 1),
            y: current.pan.y - (anchorY - current.pan.y) * (scaleRatio - 1),
          },
          nextZoom
        );

        return {
          zoom: nextZoom,
          pan: nextPan,
        };
      });
    },
    [clampPan, size.height, size.width, viewportRef]
  );

  useEffect(() => {
    setViewState(() => {
      if (!graphVersion) {
        return {
          zoom: 1,
          pan: { x: 0, y: 0 },
        };
      }

      return {
        zoom: 1,
        pan: { x: 0, y: 0 },
      };
    });
  }, [graphVersion]);

  useEffect(() => {
    setViewState((current) => ({
      ...current,
      pan: clampPan(current.pan, current.zoom),
    }));
  }, [clampPan]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }

    let lastGestureScale = 1;

    const handleGestureStart = (event: Event) => {
      const gestureEvent = event as Event & { scale?: number };
      event.preventDefault();
      lastGestureScale = gestureEvent.scale ?? 1;
    };

    const handleGestureChange = (event: Event) => {
      const gestureEvent = event as Event & {
        clientX?: number;
        clientY?: number;
        scale?: number;
      };
      event.preventDefault();

      const currentScale = gestureEvent.scale ?? 1;
      const factor = currentScale / lastGestureScale;
      lastGestureScale = currentScale;

      setZoomAroundPoint(factor, gestureEvent.clientX, gestureEvent.clientY);
    };

    const handleGestureEnd = () => {
      lastGestureScale = 1;
    };

    element.addEventListener("gesturestart", handleGestureStart, {
      passive: false,
    });
    element.addEventListener("gesturechange", handleGestureChange, {
      passive: false,
    });
    element.addEventListener("gestureend", handleGestureEnd);

    return () => {
      element.removeEventListener("gesturestart", handleGestureStart);
      element.removeEventListener("gesturechange", handleGestureChange);
      element.removeEventListener("gestureend", handleGestureEnd);
    };
  }, [setZoomAroundPoint, viewportRef]);

  const totalScale = baseScale * viewState.zoom;

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
        className="relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.08),_transparent_55%)] touch-none"
        onPointerCancel={() => {
          dragStateRef.current = null;
        }}
        onPointerDown={(event) => {
          dragStateRef.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const dragState = dragStateRef.current;
          if (!dragState || dragState.pointerId !== event.pointerId) {
            return;
          }

          const deltaX = event.clientX - dragState.x;
          const deltaY = event.clientY - dragState.y;

          dragStateRef.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
          };

          setViewState((current) => ({
            ...current,
            pan: clampPan(
              {
                x: current.pan.x + deltaX,
                y: current.pan.y + deltaY,
              },
              current.zoom
            ),
          }));
        }}
        onPointerUp={(event) => {
          if (dragStateRef.current?.pointerId === event.pointerId) {
            dragStateRef.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onWheel={(event) => {
          event.preventDefault();

          if (event.ctrlKey || event.metaKey) {
            const factor = Math.exp(-event.deltaY * 0.0025);
            setZoomAroundPoint(factor, event.clientX, event.clientY);
            return;
          }

          setViewState((current) => ({
            ...current,
            pan: clampPan(
              {
                x: current.pan.x - event.deltaX,
                y: current.pan.y - event.deltaY,
              },
              current.zoom
            ),
          }));
        }}
        ref={viewportRef}
      >
        <div className="absolute top-3 left-4 z-10 rounded-full border border-border/60 bg-background/90 px-3 py-1 text-[11px] text-muted-foreground shadow-sm">
          Scroll to pan • Pinch or ⌘/ctrl + scroll to zoom
        </div>

        <div className="absolute top-3 right-4 z-10 flex items-center gap-2 rounded-full border border-border/60 bg-background/90 p-1 shadow-sm">
          <button
            className="rounded-full px-2.5 py-1 text-xs text-foreground transition hover:bg-muted"
            onClick={() => setZoomAroundPoint(1 / 1.2)}
            type="button"
          >
            −
          </button>
          <div className="min-w-12 text-center text-[11px] text-muted-foreground">
            {Math.round(totalScale * 100)}%
          </div>
          <button
            className="rounded-full px-2.5 py-1 text-xs text-foreground transition hover:bg-muted"
            onClick={() => setZoomAroundPoint(1.2)}
            type="button"
          >
            +
          </button>
          <button
            className="rounded-full px-2.5 py-1 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onClick={() =>
              setViewState({
                zoom: 1,
                pan: { x: 0, y: 0 },
              })
            }
            type="button"
          >
            Reset
          </button>
        </div>

        <div
          className="absolute left-1/2 top-1/2"
          style={{ transform: "translate(-50%, -50%)" }}
        >
          <div
            className="relative origin-center will-change-transform"
            style={{
              width: VIRTUAL_WIDTH,
              height,
              transform: `translate(${viewState.pan.x}px, ${viewState.pan.y}px) scale(${totalScale})`,
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
