"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { resolveNodeCollisions } from "@/artifacts/graph/resolve-node-collisions";
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
  medication:
    "border-sky-300/80 bg-sky-100/90 text-sky-950 dark:border-sky-400/60 dark:bg-sky-900/78 dark:text-sky-100",
  supplement:
    "border-emerald-300/80 bg-emerald-100/90 text-emerald-950 dark:border-emerald-400/60 dark:bg-emerald-900/78 dark:text-emerald-100",
  condition:
    "border-rose-300/80 bg-rose-100/90 text-rose-950 dark:border-rose-400/60 dark:bg-rose-900/78 dark:text-rose-100",
  lab: "border-amber-300/80 bg-amber-100/90 text-amber-950 dark:border-amber-400/60 dark:bg-amber-900/78 dark:text-amber-100",
  goal: "border-violet-300/80 bg-violet-100/90 text-violet-950 dark:border-violet-400/60 dark:bg-violet-900/78 dark:text-violet-100",
  symptom:
    "border-orange-300/80 bg-orange-100/90 text-orange-950 dark:border-orange-400/60 dark:bg-orange-900/78 dark:text-orange-100",
  recommendation:
    "border-cyan-300/80 bg-cyan-100/90 text-cyan-950 dark:border-cyan-400/60 dark:bg-cyan-900/78 dark:text-cyan-100",
  diagnostic:
    "border-yellow-300/80 bg-yellow-100/90 text-yellow-950 dark:border-yellow-400/60 dark:bg-yellow-900/78 dark:text-yellow-100",
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

type HoveredEdge = {
  id: string;
  label: string;
  explanation: string;
  x: number;
  y: number;
};

const GRAPH_PADDING = 240;
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 3.5;
const WHEEL_ZOOM_SENSITIVITY = 0.0085;
const GESTURE_ZOOM_DAMPING = 1.9;
const CLUSTER_COLUMN_GAP = 220;
const CLUSTER_ROW_GAP = 84;
const CLUSTER_NODE_GAP = 28;
const CLUSTER_GROUP_GAP = 72;

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

function getNodeDegree(nodeId: string, neighborMap: Map<string, Set<string>>) {
  return neighborMap.get(nodeId)?.size ?? 0;
}

function splitComponentIntoClusters(
  component: PositionedNode[],
  neighborMap: Map<string, Set<string>>
) {
  if (component.length <= 5) {
    return [component];
  }

  const targetSeedCount = clamp(Math.round(component.length / 5), 2, 4);
  const sortedNodes = [...component].sort((a, b) => {
    return (
      getNodeDegree(b.id, neighborMap) - getNodeDegree(a.id, neighborMap) ||
      a.label.localeCompare(b.label)
    );
  });

  const seeds: PositionedNode[] = [];

  for (const node of sortedNodes) {
    const isTooCloseToExistingSeed = seeds.some((seed) => {
      if (seed.id === node.id) {
        return true;
      }

      return neighborMap.get(seed.id)?.has(node.id);
    });

    if (isTooCloseToExistingSeed && seeds.length < targetSeedCount) {
      continue;
    }

    seeds.push(node);

    if (seeds.length >= targetSeedCount) {
      break;
    }
  }

  if (seeds.length <= 1) {
    return [component];
  }

  const nodeIds = new Set(component.map((node) => node.id));
  const assignments = new Map<string, string>();
  const distances = new Map<string, number>();
  const queue: Array<{ id: string; seedId: string; distance: number }> = [];

  for (const seed of seeds) {
    assignments.set(seed.id, seed.id);
    distances.set(seed.id, 0);
    queue.push({ id: seed.id, seedId: seed.id, distance: 0 });
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    for (const neighborId of neighborMap.get(current.id) ?? []) {
      if (!nodeIds.has(neighborId)) {
        continue;
      }

      const nextDistance = current.distance + 1;
      const existingDistance = distances.get(neighborId);
      const existingSeed = assignments.get(neighborId);

      if (
        existingDistance === undefined ||
        nextDistance < existingDistance ||
        (nextDistance === existingDistance &&
          existingSeed &&
          current.seedId.localeCompare(existingSeed) < 0)
      ) {
        assignments.set(neighborId, current.seedId);
        distances.set(neighborId, nextDistance);
        queue.push({
          id: neighborId,
          seedId: current.seedId,
          distance: nextDistance,
        });
      }
    }
  }

  const clusters = new Map<string, PositionedNode[]>();
  for (const seed of seeds) {
    clusters.set(seed.id, []);
  }

  for (const node of component) {
    const seedId = assignments.get(node.id) ?? seeds[0].id;
    const cluster = clusters.get(seedId);
    if (!cluster) {
      continue;
    }
    cluster.push(node);
  }

  return [...clusters.values()].filter((cluster) => cluster.length > 0);
}

type ClusterLayout = {
  nodes: PositionedNode[];
  width: number;
  height: number;
  minX: number;
  minY: number;
};

function getClusterRoot(
  cluster: PositionedNode[],
  neighborMap: Map<string, Set<string>>
) {
  return [...cluster].sort((a, b) => {
    return (
      getNodeDegree(b.id, neighborMap) - getNodeDegree(a.id, neighborMap) ||
      hashString(a.id) - hashString(b.id) ||
      a.label.localeCompare(b.label)
    );
  })[0];
}

function getClusterLevelMap(
  cluster: PositionedNode[],
  neighborMap: Map<string, Set<string>>
) {
  const clusterIds = new Set(cluster.map((node) => node.id));
  const root = getClusterRoot(cluster, neighborMap);
  const levelMap = new Map<string, number>();
  const queue = [root.id];
  levelMap.set(root.id, 0);

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    const currentLevel = levelMap.get(currentId) ?? 0;

    for (const neighborId of neighborMap.get(currentId) ?? []) {
      if (!clusterIds.has(neighborId) || levelMap.has(neighborId)) {
        continue;
      }

      levelMap.set(neighborId, currentLevel + 1);
      queue.push(neighborId);
    }
  }

  return levelMap;
}

function layoutClusterHorizontally(
  cluster: PositionedNode[],
  neighborMap: Map<string, Set<string>>
): ClusterLayout {
  if (cluster.length === 1) {
    const node = cluster[0];
    node.x = NODE_WIDTH / 2;
    node.y = node.height / 2;

    return {
      nodes: cluster,
      width: NODE_WIDTH,
      height: node.height,
      minX: 0,
      minY: 0,
    };
  }

  const levelMap = getClusterLevelMap(cluster, neighborMap);
  const maxLevel = Math.max(...levelMap.values(), 0);
  const columns = Array.from(
    { length: maxLevel + 1 },
    () => [] as PositionedNode[]
  );

  for (const node of cluster) {
    const level = levelMap.get(node.id) ?? 0;
    columns[level]?.push(node);
  }

  const getNodeOrder = (column: PositionedNode[]) => {
    return new Map(column.map((node, index) => [node.id, index]));
  };

  for (const column of columns) {
    column.sort((a, b) => {
      return (
        getNodeDegree(b.id, neighborMap) - getNodeDegree(a.id, neighborMap) ||
        a.label.localeCompare(b.label)
      );
    });
  }

  for (let iteration = 0; iteration < 6; iteration += 1) {
    for (let columnIndex = 1; columnIndex < columns.length; columnIndex += 1) {
      const previousOrder = getNodeOrder(columns[columnIndex - 1] ?? []);
      columns[columnIndex]?.sort((a, b) => {
        const getBarycenter = (node: PositionedNode) => {
          const neighbors = [...(neighborMap.get(node.id) ?? [])]
            .filter(
              (neighborId) =>
                (levelMap.get(neighborId) ?? 0) === columnIndex - 1
            )
            .map((neighborId) => previousOrder.get(neighborId))
            .filter((value): value is number => value !== undefined);

          if (neighbors.length === 0) {
            return Number.POSITIVE_INFINITY;
          }

          return (
            neighbors.reduce((sum, value) => sum + value, 0) / neighbors.length
          );
        };

        return (
          getBarycenter(a) - getBarycenter(b) ||
          getNodeDegree(b.id, neighborMap) - getNodeDegree(a.id, neighborMap) ||
          a.label.localeCompare(b.label)
        );
      });
    }

    for (
      let columnIndex = columns.length - 2;
      columnIndex >= 0;
      columnIndex -= 1
    ) {
      const nextOrder = getNodeOrder(columns[columnIndex + 1] ?? []);
      columns[columnIndex]?.sort((a, b) => {
        const getBarycenter = (node: PositionedNode) => {
          const neighbors = [...(neighborMap.get(node.id) ?? [])]
            .filter(
              (neighborId) =>
                (levelMap.get(neighborId) ?? 0) === columnIndex + 1
            )
            .map((neighborId) => nextOrder.get(neighborId))
            .filter((value): value is number => value !== undefined);

          if (neighbors.length === 0) {
            return Number.POSITIVE_INFINITY;
          }

          return (
            neighbors.reduce((sum, value) => sum + value, 0) / neighbors.length
          );
        };

        return (
          getBarycenter(a) - getBarycenter(b) ||
          getNodeDegree(b.id, neighborMap) - getNodeDegree(a.id, neighborMap) ||
          a.label.localeCompare(b.label)
        );
      });
    }
  }

  const columnGap =
    maxLevel === 0
      ? 0
      : clamp(
          (Math.min(VIRTUAL_WIDTH - 220, 760) - NODE_WIDTH) / maxLevel,
          170,
          CLUSTER_COLUMN_GAP
        );

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  columns.forEach((column, columnIndex) => {
    const columnHeight =
      column.reduce((sum, node) => sum + node.height, 0) +
      Math.max(0, column.length - 1) * CLUSTER_NODE_GAP;
    let cursorY = -columnHeight / 2;

    for (const node of column) {
      node.x = NODE_WIDTH / 2 + columnIndex * columnGap;
      node.y = cursorY + node.height / 2;
      cursorY += node.height + CLUSTER_NODE_GAP;

      minX = Math.min(minX, node.x - NODE_WIDTH / 2);
      maxX = Math.max(maxX, node.x + NODE_WIDTH / 2);
      minY = Math.min(minY, node.y - node.height / 2);
      maxY = Math.max(maxY, node.y + node.height / 2);
    }
  });

  return {
    nodes: cluster,
    width: maxX - minX,
    height: maxY - minY,
    minX,
    minY,
  };
}

function resolveNodeOverlaps(nodes: PositionedNode[]) {
  const resolvedNodes = resolveNodeCollisions(
    nodes.map((node) => ({
      ...node,
      x: node.x - NODE_WIDTH / 2,
      y: node.y - node.height / 2,
      width: NODE_WIDTH,
      height: node.height,
    })),
    {
      maxIterations: 80,
      overlapThreshold: 0.5,
      margin: 10,
      minX: 40,
      maxX: VIRTUAL_WIDTH - NODE_WIDTH - 40,
      minY: 40,
    }
  );

  resolvedNodes.forEach((resolvedNode, index) => {
    nodes[index].x = resolvedNode.x + NODE_WIDTH / 2;
    nodes[index].y = resolvedNode.y + resolvedNode.height / 2;
  });
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
    const score = (component: PositionedNode[]) =>
      component.reduce(
        (sum, node) => sum + getNodeDegree(node.id, neighborMap),
        0
      );

    return score(b) - score(a) || b.length - a.length;
  });

  const connectedClusterLayouts = components
    .filter(
      (component) =>
        component.length > 1 ||
        getNodeDegree(component[0]?.id ?? "", neighborMap) > 0
    )
    .flatMap((component) => splitComponentIntoClusters(component, neighborMap))
    .map((cluster) => layoutClusterHorizontally(cluster, neighborMap))
    .sort(
      (a, b) =>
        b.width * b.height - a.width * a.height ||
        b.nodes.length - a.nodes.length
    );

  const isolatedLayouts = components
    .filter(
      (component) =>
        component.length === 1 &&
        getNodeDegree(component[0]?.id ?? "", neighborMap) === 0
    )
    .map((component) => layoutClusterHorizontally(component, neighborMap));

  const clusterLayouts = [...connectedClusterLayouts, ...isolatedLayouts];
  const canvasMinX = 40;
  const canvasMaxX = VIRTUAL_WIDTH - 40;
  const availableWidth = canvasMaxX - canvasMinX;
  const rows: Array<{
    layouts: ClusterLayout[];
    width: number;
    height: number;
  }> = [];
  let currentRow: { layouts: ClusterLayout[]; width: number; height: number } =
    {
      layouts: [],
      width: 0,
      height: 0,
    };

  for (const layout of clusterLayouts) {
    const nextWidth =
      currentRow.layouts.length === 0
        ? layout.width
        : currentRow.width + CLUSTER_GROUP_GAP + layout.width;

    if (currentRow.layouts.length > 0 && nextWidth > availableWidth) {
      rows.push(currentRow);
      currentRow = {
        layouts: [],
        width: 0,
        height: 0,
      };
    }

    currentRow.layouts.push(layout);
    currentRow.width =
      currentRow.layouts.length === 1
        ? layout.width
        : currentRow.width + CLUSTER_GROUP_GAP + layout.width;
    currentRow.height = Math.max(currentRow.height, layout.height);
  }

  if (currentRow.layouts.length > 0) {
    rows.push(currentRow);
  }

  let cursorY = 72;

  for (const row of rows) {
    let cursorX = canvasMinX + Math.max(0, (availableWidth - row.width) / 2);

    for (const layout of row.layouts) {
      const offsetX = cursorX - layout.minX;
      const offsetY = cursorY + (row.height - layout.height) / 2 - layout.minY;

      for (const node of layout.nodes) {
        node.x += offsetX;
        node.y += offsetY;
      }

      cursorX += layout.width + CLUSTER_GROUP_GAP;
    }

    cursorY += row.height + CLUSTER_ROW_GAP;
  }

  resolveNodeOverlaps(nodes);

  for (const node of nodes) {
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

function buildEdgeGeometry(source: PositionedNode, target: PositionedNode) {
  const start = getNodeAttachmentPoint(source, target);
  const end = getNodeAttachmentPoint(target, source);
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    const handle = Math.max(Math.abs(dx) * 0.35, 40) * Math.sign(dx || 1);
    const control1 = { x: start.x + handle, y: start.y };
    const control2 = { x: end.x - handle, y: end.y };

    return {
      path: `M ${start.x} ${start.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${end.x} ${end.y}`,
      midpoint: {
        x: (start.x + 3 * control1.x + 3 * control2.x + end.x) / 8,
        y: (start.y + 3 * control1.y + 3 * control2.y + end.y) / 8,
      },
    };
  }

  const handle = Math.max(Math.abs(dy) * 0.35, 40) * Math.sign(dy || 1);
  const control1 = { x: start.x, y: start.y + handle };
  const control2 = { x: end.x, y: end.y - handle };

  return {
    path: `M ${start.x} ${start.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${end.x} ${end.y}`,
    midpoint: {
      x: (start.x + 3 * control1.x + 3 * control2.x + end.x) / 8,
      y: (start.y + 3 * control1.y + 3 * control2.y + end.y) / 8,
    },
  };
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
  const [hoveredEdge, setHoveredEdge] = useState<HoveredEdge | null>(null);
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
    setHoveredEdge(null);
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

                  const geometry = buildEdgeGeometry(source, target);
                  const isHovered = hoveredEdge?.id === edge.id;

                  return (
                    <g key={edge.id}>
                      <path
                        className={EDGE_STYLES[edge.severity]}
                        d={geometry.path}
                        fill="none"
                        opacity={isHovered ? "0.98" : "0.82"}
                        strokeLinecap="round"
                        strokeWidth={isHovered ? "3.5" : "2.5"}
                      />
                      <path
                        d={geometry.path}
                        fill="none"
                        onPointerEnter={() => {
                          setHoveredEdge({
                            id: edge.id,
                            label: edge.label,
                            explanation: edge.explanation,
                            x: geometry.midpoint.x,
                            y: geometry.midpoint.y,
                          });
                        }}
                        onPointerLeave={() => {
                          setHoveredEdge((current) =>
                            current?.id === edge.id ? null : current
                          );
                        }}
                        stroke="transparent"
                        strokeLinecap="round"
                        strokeWidth="16"
                      />
                    </g>
                  );
                })}
              </svg>

              {hoveredEdge ? (
                <div
                  className="pointer-events-none absolute z-20 w-56 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-xl border border-border/70 bg-background/96 px-3 py-2 shadow-lg"
                  style={{
                    left: hoveredEdge.x,
                    top: hoveredEdge.y,
                  }}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {hoveredEdge.label}
                  </div>
                  <div className="mt-1 text-xs leading-relaxed text-foreground">
                    {hoveredEdge.explanation}
                  </div>
                </div>
              ) : null}

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
