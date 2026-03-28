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
  height: number;
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
  medication: "border-sky-400/60 bg-sky-900/86 text-sky-100",
  supplement: "border-emerald-400/60 bg-emerald-900/86 text-emerald-100",
  condition: "border-rose-400/60 bg-rose-900/86 text-rose-100",
  lab: "border-amber-400/60 bg-amber-900/86 text-amber-100",
  goal: "border-violet-400/60 bg-violet-900/86 text-violet-100",
  symptom: "border-orange-400/60 bg-orange-900/86 text-orange-100",
  recommendation: "border-cyan-400/60 bg-cyan-900/86 text-cyan-100",
  diagnostic: "border-yellow-400/60 bg-yellow-900/86 text-yellow-100",
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

const VIRTUAL_WIDTH = 1000;
const MIN_GRAPH_HEIGHT = 560;
const NODE_WIDTH = 160;
const NODE_BASE_HEIGHT = 54;
const LABEL_LINE_HEIGHT = 18;
const SUBTITLE_LINE_HEIGHT = 16;
const MAX_LABEL_LINES = 3;
const MAX_SUBTITLE_LINES = 3;

type ElementSize = {
  width: number;
  height: number;
};

type ViewportScroll = {
  left: number;
  top: number;
};

type Point = {
  x: number;
  y: number;
};

const GRAPH_PADDING = 240;
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 3.5;
const WHEEL_ZOOM_SENSITIVITY = 0.0085;
const GESTURE_ZOOM_DAMPING = 1.9;

function estimateLineCount(text: string | undefined, charsPerLine: number) {
  if (!text) {
    return 0;
  }

  return Math.max(1, Math.ceil(text.trim().length / charsPerLine));
}

function estimateNodeHeight(node: PatientGraph["nodes"][number]) {
  const labelLines = clamp(
    estimateLineCount(node.label, 18),
    1,
    MAX_LABEL_LINES
  );
  const subtitleLines = clamp(
    estimateLineCount(node.subtitle ?? undefined, 26),
    0,
    MAX_SUBTITLE_LINES
  );

  return (
    NODE_BASE_HEIGHT +
    (labelLines - 1) * LABEL_LINE_HEIGHT +
    subtitleLines * SUBTITLE_LINE_HEIGHT +
    (subtitleLines > 0 ? 6 : 0)
  );
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getDeterministicUnit(value: string) {
  return (hashString(value) % 10_000) / 10_000;
}

function getConnectedComponents(
  nodes: PositionedNode[],
  neighborMap: Map<string, Set<string>>
) {
  const components: PositionedNode[][] = [];
  const visited = new Set<string>();
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  for (const node of nodes) {
    if (visited.has(node.id)) {
      continue;
    }

    const stack = [node.id];
    const component: PositionedNode[] = [];
    visited.add(node.id);

    while (stack.length > 0) {
      const currentId = stack.pop();
      if (!currentId) {
        continue;
      }

      const currentNode = nodesById.get(currentId);
      if (!currentNode) {
        continue;
      }

      component.push(currentNode);

      for (const neighborId of neighborMap.get(currentId) ?? []) {
        if (visited.has(neighborId)) {
          continue;
        }

        visited.add(neighborId);
        stack.push(neighborId);
      }
    }

    components.push(component);
  }

  return components;
}

function positionNodes(graph: PatientGraph) {
  const nodes = graph.nodes.map((node) => ({
    ...node,
    height: estimateNodeHeight(node),
    x: VIRTUAL_WIDTH / 2,
    y: MIN_GRAPH_HEIGHT / 2,
  }));

  if (nodes.length === 0) {
    return {
      positionedNodes: nodes,
      height: MIN_GRAPH_HEIGHT,
    };
  }

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const neighborMap = new Map<string, Set<string>>();

  for (const node of nodes) {
    neighborMap.set(node.id, new Set());
  }

  for (const edge of graph.edges) {
    const source = nodesById.get(edge.source);
    const target = nodesById.get(edge.target);

    if (!source || !target) {
      continue;
    }

    neighborMap.get(source.id)?.add(target.id);
    neighborMap.get(target.id)?.add(source.id);
  }

  const components = getConnectedComponents(nodes, neighborMap).sort((a, b) => {
    const edgeWeightA = a.reduce(
      (sum, node) => sum + (neighborMap.get(node.id)?.size ?? 0),
      0
    );
    const edgeWeightB = b.reduce(
      (sum, node) => sum + (neighborMap.get(node.id)?.size ?? 0),
      0
    );

    return edgeWeightB - edgeWeightA || b.length - a.length;
  });

  const centerX = VIRTUAL_WIDTH / 2;
  const centerY = MIN_GRAPH_HEIGHT / 2;
  const isolatedNodes: PositionedNode[] = [];
  const connectedComponents = components.filter((component) => {
    if (component.length === 1) {
      const node = component[0];
      if ((neighborMap.get(node.id)?.size ?? 0) === 0) {
        isolatedNodes.push(node);
        return false;
      }
    }

    return true;
  });

  connectedComponents.forEach((component, componentIndex) => {
    const anchorRadius = componentIndex === 0 ? 0 : 120 + componentIndex * 90;
    const anchorAngle = componentIndex * 1.35;
    const anchorX = centerX + Math.cos(anchorAngle) * anchorRadius;
    const anchorY = centerY + Math.sin(anchorAngle) * anchorRadius * 0.7;
    const sortedNodes = [...component].sort((a, b) => {
      const degreeDiff =
        (neighborMap.get(b.id)?.size ?? 0) - (neighborMap.get(a.id)?.size ?? 0);
      return degreeDiff || a.label.localeCompare(b.label);
    });

    sortedNodes.forEach((node, nodeIndex) => {
      if (nodeIndex === 0) {
        node.x = anchorX;
        node.y = anchorY;
        return;
      }

      const ring = Math.floor((nodeIndex - 1) / 5) + 1;
      const indexInRing = (nodeIndex - 1) % 5;
      const angleOffset = getDeterministicUnit(node.id) * Math.PI * 2;
      const angle = angleOffset + (indexInRing / 5) * Math.PI * 2;
      const radius = 120 + ring * 60;

      node.x = anchorX + Math.cos(angle) * radius;
      node.y = anchorY + Math.sin(angle) * radius * 0.8;
    });
  });

  isolatedNodes.forEach((node, index) => {
    const angle = (index / Math.max(isolatedNodes.length, 1)) * Math.PI * 2;
    const radius = Math.max(320, 260 + isolatedNodes.length * 14);

    node.x = centerX + Math.cos(angle) * radius;
    node.y = centerY + Math.sin(angle) * radius * 0.72;
  });

  const connectedSet = new Set(
    connectedComponents.flatMap((component) => component.map((node) => node.id))
  );

  for (let iteration = 0; iteration < 220; iteration += 1) {
    const forces = new Map<string, Point>(
      nodes.map((node) => [node.id, { x: 0, y: 0 }])
    );

    for (let index = 0; index < nodes.length; index += 1) {
      for (
        let otherIndex = index + 1;
        otherIndex < nodes.length;
        otherIndex += 1
      ) {
        const node = nodes[index];
        const other = nodes[otherIndex];
        let dx = other.x - node.x;
        let dy = other.y - node.y;

        if (dx === 0 && dy === 0) {
          const jitterAngle =
            getDeterministicUnit(`${node.id}:${other.id}`) * Math.PI * 2;
          dx = Math.cos(jitterAngle) * 0.01;
          dy = Math.sin(jitterAngle) * 0.01;
        }

        const distance = Math.hypot(dx, dy);
        const desiredX = NODE_WIDTH + 44;
        const desiredY = (node.height + other.height) / 2 + 36;
        const overlapX = desiredX - Math.abs(dx);
        const overlapY = desiredY - Math.abs(dy);
        const forceA = forces.get(node.id);
        const forceB = forces.get(other.id);

        if (!forceA || !forceB) {
          continue;
        }

        if (overlapX > 0 && overlapY > 0) {
          const pushX = (overlapX / Math.max(distance, 1)) * 0.22;
          const pushY = (overlapY / Math.max(distance, 1)) * 0.22;
          const signX = dx >= 0 ? 1 : -1;
          const signY = dy >= 0 ? 1 : -1;

          forceA.x -= signX * pushX;
          forceB.x += signX * pushX;
          forceA.y -= signY * pushY;
          forceB.y += signY * pushY;
          continue;
        }

        const repulsion = 18_000 / Math.max(distance * distance, 1200);
        const unitX = dx / Math.max(distance, 1);
        const unitY = dy / Math.max(distance, 1);

        forceA.x -= unitX * repulsion;
        forceA.y -= unitY * repulsion;
        forceB.x += unitX * repulsion;
        forceB.y += unitY * repulsion;
      }
    }

    for (const edge of graph.edges) {
      const source = nodesById.get(edge.source);
      const target = nodesById.get(edge.target);

      if (!source || !target) {
        continue;
      }

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const idealDistance =
        170 + Math.abs(source.height - target.height) * 0.12;
      const spring = (distance - idealDistance) * 0.05;
      const unitX = dx / distance;
      const unitY = dy / distance;
      const sourceForce = forces.get(source.id);
      const targetForce = forces.get(target.id);

      if (!sourceForce || !targetForce) {
        continue;
      }

      sourceForce.x += unitX * spring;
      sourceForce.y += unitY * spring;
      targetForce.x -= unitX * spring;
      targetForce.y -= unitY * spring;
    }

    for (const component of connectedComponents) {
      const anchor = component.reduce(
        (sum, node) => ({ x: sum.x + node.x, y: sum.y + node.y }),
        { x: 0, y: 0 }
      );
      const anchorX = anchor.x / component.length;
      const anchorY = anchor.y / component.length;

      for (const node of component) {
        const force = forces.get(node.id);
        if (!force) {
          continue;
        }

        force.x += (centerX - anchorX) * 0.01 + (anchorX - node.x) * 0.02;
        force.y += (centerY - anchorY) * 0.01 + (anchorY - node.y) * 0.02;
      }
    }

    for (const node of isolatedNodes) {
      const force = forces.get(node.id);
      if (!force) {
        continue;
      }

      const angle = Math.atan2(node.y - centerY, node.x - centerX);
      const targetRadius = Math.max(340, isolatedNodes.length * 20 + 300);
      const targetX = centerX + Math.cos(angle) * targetRadius;
      const targetY = centerY + Math.sin(angle) * targetRadius * 0.72;

      force.x += (targetX - node.x) * 0.016;
      force.y += (targetY - node.y) * 0.016;
    }

    for (const node of nodes) {
      const force = forces.get(node.id);
      if (!force) {
        continue;
      }

      const gravityStrength = connectedSet.has(node.id) ? 0.006 : 0.002;
      force.x += (centerX - node.x) * gravityStrength;
      force.y += (centerY - node.y) * gravityStrength;

      node.x += force.x;
      node.y += force.y;
    }
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    minX = Math.min(minX, node.x - NODE_WIDTH / 2);
    maxX = Math.max(maxX, node.x + NODE_WIDTH / 2);
    minY = Math.min(minY, node.y - node.height / 2);
    maxY = Math.max(maxY, node.y + node.height / 2);
  }

  const targetCenterX = VIRTUAL_WIDTH / 2;
  const widthCenter = (minX + maxX) / 2;
  const shiftX = targetCenterX - widthCenter;
  const shiftY = 96 - minY;

  for (const node of nodes) {
    node.x += shiftX;
    node.y += shiftY;
    node.x = clamp(
      node.x,
      NODE_WIDTH / 2 + 40,
      VIRTUAL_WIDTH - NODE_WIDTH / 2 - 40
    );
    node.y = Math.max(node.y, node.height / 2 + 40);
  }

  const graphHeight = Math.max(
    MIN_GRAPH_HEIGHT,
    ...nodes.map((node) => node.y + node.height / 2 + 56)
  );

  return {
    positionedNodes: nodes,
    height: graphHeight,
  };
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

function getNodeAttachmentPoint(
  node: PositionedNode,
  target: PositionedNode
): Point {
  const dx = target.x - node.x;
  const dy = target.y - node.y;
  const halfWidth = NODE_WIDTH / 2;
  const halfHeight = node.height / 2;

  if (dx === 0 && dy === 0) {
    return { x: node.x, y: node.y };
  }

  const scaleX = dx === 0 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(dx);
  const scaleY =
    dy === 0 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY);

  return {
    x: node.x + dx * scale,
    y: node.y + dy * scale,
  };
}

function buildEdgePath(source: PositionedNode, target: PositionedNode) {
  const start = getNodeAttachmentPoint(source, target);
  const end = getNodeAttachmentPoint(target, source);
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    const handle = Math.max(Math.abs(dx) * 0.35, 40) * Math.sign(dx || 1);

    return `M ${start.x} ${start.y} C ${start.x + handle} ${start.y}, ${end.x - handle} ${end.y}, ${end.x} ${end.y}`;
  }

  const handle = Math.max(Math.abs(dy) * 0.35, 40) * Math.sign(dy || 1);

  return `M ${start.x} ${start.y} C ${start.x} ${start.y + handle}, ${end.x} ${end.y - handle}, ${end.x} ${end.y}`;
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
  const [isViewportHovered, setIsViewportHovered] = useState(false);
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

    const handleMouseEnter = () => {
      setIsViewportHovered(true);
    };

    const handleMouseLeave = () => {
      setIsViewportHovered(false);
    };

    element.addEventListener("mouseenter", handleMouseEnter);
    element.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [viewportRef]);

  useEffect(() => {
    if (!isViewportHovered) {
      return;
    }

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverscrollBehaviorX = html.style.overscrollBehaviorX;
    const previousBodyOverscrollBehaviorX = body.style.overscrollBehaviorX;

    const preventMacNavigationGesture = (event: Event) => {
      const viewport = viewportRef.current;
      if (!viewport) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !viewport.contains(target)) {
        return;
      }

      if (event.cancelable) {
        event.preventDefault();
      }
    };

    html.style.overscrollBehaviorX = "none";
    body.style.overscrollBehaviorX = "none";

    window.addEventListener("wheel", preventMacNavigationGesture, {
      capture: true,
      passive: false,
    });
    window.addEventListener("gesturestart", preventMacNavigationGesture, {
      capture: true,
      passive: false,
    });
    window.addEventListener("gesturechange", preventMacNavigationGesture, {
      capture: true,
      passive: false,
    });
    window.addEventListener("gestureend", preventMacNavigationGesture, {
      capture: true,
      passive: false,
    });

    return () => {
      html.style.overscrollBehaviorX = previousHtmlOverscrollBehaviorX;
      body.style.overscrollBehaviorX = previousBodyOverscrollBehaviorX;

      window.removeEventListener("wheel", preventMacNavigationGesture, true);
      window.removeEventListener(
        "gesturestart",
        preventMacNavigationGesture,
        true
      );
      window.removeEventListener(
        "gesturechange",
        preventMacNavigationGesture,
        true
      );
      window.removeEventListener(
        "gestureend",
        preventMacNavigationGesture,
        true
      );
    };
  }, [isViewportHovered, viewportRef]);

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
          0.78,
          1.22
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
      const factor = clamp(dampZoomFactor(rawFactor), 0.78, 1.22);
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
    <div className="flex h-full min-h-0 min-w-0 max-w-full select-none flex-col overflow-hidden overflow-x-hidden text-foreground">
      <div className="shrink-0 border-b border-border/50 p-4">
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

      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden overflow-x-hidden">
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
          className="no-scrollbar overscroll-behavior-contain absolute inset-0 min-w-0 max-w-full cursor-grab overflow-auto select-none active:cursor-grabbing"
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
              contain: "layout paint",
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

                  const curve = buildEdgePath(source, target);

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
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border px-3 py-2.5 ${TYPE_STYLES[node.type]}`}
                  key={node.id}
                  style={{
                    left: `${(node.x / VIRTUAL_WIDTH) * 100}%`,
                    minHeight: node.height,
                    top: node.y,
                    width: NODE_WIDTH,
                  }}
                  title={node.subtitle ?? node.label}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/55">
                    {TYPE_LABELS[node.type]}
                  </div>
                  <div className="mt-1 line-clamp-3 text-sm font-semibold leading-tight text-foreground">
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
