"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

type ViewportScroll = {
  left: number;
  top: number;
};

const GRAPH_PADDING = 240;
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 3.5;
const WHEEL_ZOOM_SENSITIVITY = 0.0012;
const GESTURE_ZOOM_DAMPING = 0.35;

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

function normalizeWheelDelta(event: WheelEvent) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * 16;
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * 120;
  }

  return event.deltaY;
}

function dampZoomFactor(rawFactor: number, damping = GESTURE_ZOOM_DAMPING) {
  if (!Number.isFinite(rawFactor) || rawFactor <= 0) {
    return 1;
  }

  return 1 + (rawFactor - 1) * damping;
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
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const pendingScrollRef = useRef<ViewportScroll | null>(null);
  const hasCenteredRef = useRef(false);
  const dragStateRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
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

  const totalScale = baseScale * zoom;
  const graphPixelWidth = VIRTUAL_WIDTH * totalScale;
  const graphPixelHeight = height * totalScale;
  const contentWidth = Math.max(
    size.width + GRAPH_PADDING * 2,
    graphPixelWidth + GRAPH_PADDING * 2
  );
  const contentHeight = Math.max(
    size.height + GRAPH_PADDING * 2,
    graphPixelHeight + GRAPH_PADDING * 2
  );
  const graphLeft = (contentWidth - graphPixelWidth) / 2;
  const graphTop = (contentHeight - graphPixelHeight) / 2;

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    if (!graphVersion) {
      return;
    }

    zoomRef.current = 1;
    setZoom(1);
    hasCenteredRef.current = false;
    pendingScrollRef.current = null;
  }, [graphVersion]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !size.width || !size.height) {
      return;
    }

    const maxLeft = Math.max(contentWidth - size.width, 0);
    const maxTop = Math.max(contentHeight - size.height, 0);

    if (pendingScrollRef.current) {
      viewport.scrollTo({
        left: clamp(pendingScrollRef.current.left, 0, maxLeft),
        top: clamp(pendingScrollRef.current.top, 0, maxTop),
      });
      pendingScrollRef.current = null;
      hasCenteredRef.current = true;
      return;
    }

    if (!hasCenteredRef.current) {
      viewport.scrollTo({
        left: maxLeft / 2,
        top: maxTop / 2,
      });
      hasCenteredRef.current = true;
    }
  }, [contentHeight, contentWidth, size.height, size.width, viewportRef]);

  const setZoomAroundPoint = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      const viewport = viewportRef.current;
      const currentZoom = zoomRef.current;
      const nextZoom = clamp(currentZoom * factor, MIN_ZOOM, MAX_ZOOM);

      if (
        !viewport ||
        !size.width ||
        !size.height ||
        nextZoom === currentZoom
      ) {
        zoomRef.current = nextZoom;
        setZoom(nextZoom);
        return;
      }

      const rect = viewport.getBoundingClientRect();
      const localX =
        clientX === undefined ? size.width / 2 : clientX - rect.left;
      const localY =
        clientY === undefined ? size.height / 2 : clientY - rect.top;

      const currentTotalScale = baseScale * currentZoom;
      const currentGraphWidth = VIRTUAL_WIDTH * currentTotalScale;
      const currentGraphHeight = height * currentTotalScale;
      const currentContentWidth = Math.max(
        size.width + GRAPH_PADDING * 2,
        currentGraphWidth + GRAPH_PADDING * 2
      );
      const currentContentHeight = Math.max(
        size.height + GRAPH_PADDING * 2,
        currentGraphHeight + GRAPH_PADDING * 2
      );
      const currentGraphLeft = (currentContentWidth - currentGraphWidth) / 2;
      const currentGraphTop = (currentContentHeight - currentGraphHeight) / 2;

      const graphX =
        (viewport.scrollLeft + localX - currentGraphLeft) / currentTotalScale;
      const graphY =
        (viewport.scrollTop + localY - currentGraphTop) / currentTotalScale;

      const nextTotalScale = baseScale * nextZoom;
      const nextGraphWidth = VIRTUAL_WIDTH * nextTotalScale;
      const nextGraphHeight = height * nextTotalScale;
      const nextContentWidth = Math.max(
        size.width + GRAPH_PADDING * 2,
        nextGraphWidth + GRAPH_PADDING * 2
      );
      const nextContentHeight = Math.max(
        size.height + GRAPH_PADDING * 2,
        nextGraphHeight + GRAPH_PADDING * 2
      );
      const nextGraphLeft = (nextContentWidth - nextGraphWidth) / 2;
      const nextGraphTop = (nextContentHeight - nextGraphHeight) / 2;

      pendingScrollRef.current = {
        left: nextGraphLeft + graphX * nextTotalScale - localX,
        top: nextGraphTop + graphY * nextTotalScale - localY,
      };

      zoomRef.current = nextZoom;
      setZoom(nextZoom);
    },
    [baseScale, height, size.height, size.width, viewportRef]
  );

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }

    let lastGestureScale = 1;

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.cancelable) {
          event.preventDefault();
        }
        event.stopPropagation();

        const delta = normalizeWheelDelta(event);
        const factor = clamp(
          Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY),
          0.97,
          1.03
        );
        setZoomAroundPoint(factor, event.clientX, event.clientY);
        return;
      }

      if (event.cancelable) {
        event.preventDefault();
      }
      event.stopPropagation();

      element.scrollLeft += event.deltaX;
      element.scrollTop += event.deltaY;
    };

    const handleGestureStart = (event: Event) => {
      const gestureEvent = event as Event & { scale?: number };
      if (event.cancelable) {
        event.preventDefault();
      }
      event.stopPropagation();
      lastGestureScale = gestureEvent.scale ?? 1;
    };

    const handleGestureChange = (event: Event) => {
      const gestureEvent = event as Event & {
        clientX?: number;
        clientY?: number;
        scale?: number;
      };
      if (event.cancelable) {
        event.preventDefault();
      }
      event.stopPropagation();

      const currentScale = gestureEvent.scale ?? 1;
      const rawFactor = currentScale / lastGestureScale;
      const factor = clamp(dampZoomFactor(rawFactor), 0.98, 1.02);
      lastGestureScale = currentScale;

      setZoomAroundPoint(factor, gestureEvent.clientX, gestureEvent.clientY);
    };

    const handleGestureEnd = (event: Event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      event.stopPropagation();
      lastGestureScale = 1;
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    element.addEventListener("gesturestart", handleGestureStart, {
      passive: false,
    });
    element.addEventListener("gesturechange", handleGestureChange, {
      passive: false,
    });
    element.addEventListener("gestureend", handleGestureEnd, {
      passive: false,
    });

    return () => {
      element.removeEventListener("wheel", handleWheel);
      element.removeEventListener("gesturestart", handleGestureStart);
      element.removeEventListener("gesturechange", handleGestureChange);
      element.removeEventListener("gestureend", handleGestureEnd);
    };
  }, [setZoomAroundPoint, viewportRef]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden text-foreground">
      <div className="shrink-0 border-b border-border/50 bg-background p-4">
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

      <div className="relative min-h-0 flex-1 overflow-hidden bg-background">
        <div className="absolute top-3 left-4 z-10 rounded-full border border-border/60 bg-background px-3 py-1 text-[11px] text-muted-foreground">
          Two-finger scroll to move • Pinch or ⌘/ctrl + scroll to zoom
        </div>

        <div className="absolute top-3 right-4 z-10 flex items-center gap-2 rounded-full border border-border/60 bg-background p-1">
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
            onClick={() => {
              pendingScrollRef.current = {
                left: Math.max(contentWidth - size.width, 0) / 2,
                top: Math.max(contentHeight - size.height, 0) / 2,
              };
              zoomRef.current = 1;
              setZoom(1);
            }}
            type="button"
          >
            Reset
          </button>
        </div>

        <div
          className="no-scrollbar overscroll-behavior-contain h-full w-full cursor-grab overflow-auto active:cursor-grabbing"
          onPointerCancel={() => {
            dragStateRef.current = null;
          }}
          onPointerDown={(event) => {
            if (!(event.target instanceof Element)) {
              return;
            }

            if (event.target.closest("button")) {
              return;
            }

            dragStateRef.current = {
              pointerId: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              scrollLeft: event.currentTarget.scrollLeft,
              scrollTop: event.currentTarget.scrollTop,
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

            event.currentTarget.scrollLeft = dragState.scrollLeft - deltaX;
            event.currentTarget.scrollTop = dragState.scrollTop - deltaY;
          }}
          onPointerUp={(event) => {
            if (dragStateRef.current?.pointerId === event.pointerId) {
              dragStateRef.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          ref={viewportRef}
        >
          <div
            className="relative"
            style={{
              width: contentWidth,
              height: contentHeight,
            }}
          >
            <div
              className="absolute origin-top-left"
              style={{
                left: graphLeft,
                top: graphTop,
                width: VIRTUAL_WIDTH,
                height,
                transform: `scale(${totalScale})`,
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
                  className={`absolute w-40 -translate-x-1/2 -translate-y-1/2 rounded-xl border px-3 py-2.5 ${TYPE_STYLES[node.type]}`}
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
      </div>
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
