"use client";

import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useInternalNode,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type InternalNode,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Artifact } from "@/components/chat/create-artifact";
import type { PatientGraph } from "@/lib/superstack/types";

type GraphArtifactMetadata = Record<string, never>;
type GraphNodeType = PatientGraph["nodes"][number]["type"];
type GraphSeverity = PatientGraph["edges"][number]["severity"];

type GraphNodeData = {
  label: string;
  subtitle?: string;
  type: GraphNodeType;
};

type GraphEdgeData = {
  label: string;
  explanation: string;
  severity: GraphSeverity;
};

type GraphFlowNode = Node<GraphNodeData, "patientNode">;
type GraphFlowEdge = Edge<GraphEdgeData, "floatingEdge">;

type SimulationGraphNode = SimulationNodeDatum & {
  id: string;
  type: GraphNodeType;
  width: number;
  height: number;
  fx: number | null;
  fy: number | null;
};

type SimulationGraphLink = SimulationLinkDatum<SimulationGraphNode> & {
  source: string | SimulationGraphNode;
  target: string | SimulationGraphNode;
  distance: number;
  strength: number;
};

const NODE_WIDTH = 224;
const NODE_FALLBACK_HEIGHT = 92;
const GRAPH_DEFAULT_HEIGHT = 720;
const GRAPH_PADDING = 72;

const TYPE_LABELS: Record<GraphNodeType, string> = {
  medication: "Medication",
  supplement: "Supplement",
  condition: "Condition",
  lab: "Lab",
  goal: "Goal",
  symptom: "Symptom",
  recommendation: "Recommendation",
  diagnostic: "Diagnostic",
};

const TYPE_STYLES: Record<GraphNodeType, string> = {
  medication:
    "border-sky-500/35 bg-linear-to-br from-sky-500/16 via-sky-500/10 to-sky-500/5 text-sky-950 shadow-[0_20px_45px_-30px_rgba(14,165,233,0.65)] dark:text-sky-50",
  supplement:
    "border-emerald-500/35 bg-linear-to-br from-emerald-500/16 via-emerald-500/10 to-emerald-500/5 text-emerald-950 shadow-[0_20px_45px_-30px_rgba(16,185,129,0.65)] dark:text-emerald-50",
  condition:
    "border-rose-500/35 bg-linear-to-br from-rose-500/16 via-rose-500/10 to-rose-500/5 text-rose-950 shadow-[0_20px_45px_-30px_rgba(244,63,94,0.65)] dark:text-rose-50",
  lab: "border-amber-500/35 bg-linear-to-br from-amber-500/16 via-amber-500/10 to-amber-500/5 text-amber-950 shadow-[0_20px_45px_-30px_rgba(245,158,11,0.65)] dark:text-amber-50",
  goal: "border-violet-500/35 bg-linear-to-br from-violet-500/16 via-violet-500/10 to-violet-500/5 text-violet-950 shadow-[0_20px_45px_-30px_rgba(139,92,246,0.65)] dark:text-violet-50",
  symptom:
    "border-orange-500/35 bg-linear-to-br from-orange-500/16 via-orange-500/10 to-orange-500/5 text-orange-950 shadow-[0_20px_45px_-30px_rgba(249,115,22,0.65)] dark:text-orange-50",
  recommendation:
    "border-cyan-500/35 bg-linear-to-br from-cyan-500/16 via-cyan-500/10 to-cyan-500/5 text-cyan-950 shadow-[0_20px_45px_-30px_rgba(6,182,212,0.65)] dark:text-cyan-50",
  diagnostic:
    "border-yellow-500/35 bg-linear-to-br from-yellow-500/16 via-yellow-500/10 to-yellow-500/5 text-yellow-950 shadow-[0_20px_45px_-30px_rgba(234,179,8,0.65)] dark:text-yellow-50",
};

const TYPE_ACCENTS: Record<GraphNodeType, string> = {
  medication: "#0ea5e9",
  supplement: "#10b981",
  condition: "#f43f5e",
  lab: "#f59e0b",
  goal: "#8b5cf6",
  symptom: "#f97316",
  recommendation: "#06b6d4",
  diagnostic: "#eab308",
};

const EDGE_COLORS: Record<GraphSeverity, string> = {
  info: "#94a3b8",
  low: "#10b981",
  moderate: "#f59e0b",
  high: "#f43f5e",
};

const EDGE_LABEL_STYLES: Record<GraphSeverity, string> = {
  info: "border-slate-400/35 bg-slate-50/92 text-slate-700 dark:border-slate-500/40 dark:bg-slate-950/92 dark:text-slate-200",
  low: "border-emerald-500/35 bg-emerald-50/92 text-emerald-700 dark:border-emerald-500/45 dark:bg-emerald-950/88 dark:text-emerald-200",
  moderate:
    "border-amber-500/35 bg-amber-50/92 text-amber-700 dark:border-amber-500/45 dark:bg-amber-950/88 dark:text-amber-200",
  high: "border-rose-500/35 bg-rose-50/92 text-rose-700 dark:border-rose-500/45 dark:bg-rose-950/88 dark:text-rose-200",
};

const CLUSTERS = ["left", "stack", "plan", "signals"] as const;
type ClusterKey = (typeof CLUSTERS)[number];

const TYPE_OFFSETS: Record<GraphNodeType, number> = {
  condition: -96,
  symptom: 92,
  medication: -82,
  supplement: 82,
  recommendation: -76,
  goal: 76,
  lab: -64,
  diagnostic: 64,
};

const nodeTypes = {
  patientNode: memo(function PatientNode({ data, selected }: NodeProps<GraphFlowNode>) {
    return (
      <>
        <Handle
          className="!pointer-events-none !h-3 !w-3 !opacity-0"
          position={Position.Top}
          type="target"
        />
        <div
          className={`w-56 rounded-[22px] border px-4 py-3.5 backdrop-blur-md transition-all duration-200 ${TYPE_STYLES[data.type]} ${selected ? "ring-2 ring-foreground/20" : "ring-1 ring-white/10"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-current/55">
                {TYPE_LABELS[data.type]}
              </div>
              <div className="mt-1 text-sm font-semibold leading-tight text-current">
                {data.label}
              </div>
            </div>
            <div
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_18px_currentColor]"
              style={{ backgroundColor: TYPE_ACCENTS[data.type] }}
            />
          </div>
          {data.subtitle ? (
            <div className="mt-2 text-xs leading-relaxed text-current/72">{data.subtitle}</div>
          ) : null}
        </div>
        <Handle
          className="!pointer-events-none !h-3 !w-3 !opacity-0"
          position={Position.Bottom}
          type="source"
        />
      </>
    );
  }),
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getClusterKey(type: GraphNodeType): ClusterKey {
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

function getClusterCenter(cluster: ClusterKey, width: number, height: number) {
  const usableWidth = Math.max(width - GRAPH_PADDING * 2, 420);
  const step = usableWidth / Math.max(CLUSTERS.length - 1, 1);
  const index = CLUSTERS.indexOf(cluster);

  return {
    x: GRAPH_PADDING + step * index,
    y: height / 2,
  };
}

function getTypeAnchor(type: GraphNodeType, width: number, height: number) {
  const cluster = getClusterKey(type);
  const center = getClusterCenter(cluster, width, height);

  return {
    x: center.x,
    y: center.y + TYPE_OFFSETS[type],
  };
}

function createSeedPosition(
  type: GraphNodeType,
  index: number,
  total: number,
  width: number,
  height: number
) {
  const anchor = getTypeAnchor(type, width, height);
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  const orbit = 22 + (index % 4) * 18;

  return {
    x: anchor.x + Math.cos(angle) * orbit,
    y: anchor.y + Math.sin(angle) * orbit,
  };
}

function createFlowElements(graph: PatientGraph, width: number, height: number) {
  const nodes: GraphFlowNode[] = graph.nodes.map((node, index) => {
    const seed = createSeedPosition(node.type, index, graph.nodes.length, width, height);

    return {
      id: node.id,
      type: "patientNode",
      position: {
        x: seed.x - NODE_WIDTH / 2,
        y: seed.y - NODE_FALLBACK_HEIGHT / 2,
      },
      data: {
        label: node.label,
        subtitle: node.subtitle,
        type: node.type,
      },
      draggable: true,
      deletable: false,
      selectable: true,
      style: {
        width: NODE_WIDTH,
      },
    };
  });

  const edges: GraphFlowEdge[] = graph.edges.map((edge) => ({
    id: edge.id,
    type: "floatingEdge",
    source: edge.source,
    target: edge.target,
    data: {
      label: edge.label,
      explanation: edge.explanation,
      severity: edge.severity,
    },
    markerEnd: {
      color: EDGE_COLORS[edge.severity],
      type: MarkerType.ArrowClosed,
      width: 18,
      height: 18,
    },
    animated: edge.severity === "high",
    deletable: false,
    selectable: true,
  }));

  return { nodes, edges };
}

function getNodeBox(node: InternalNode<GraphFlowNode>) {
  const width = node.measured?.width ?? node.width ?? NODE_WIDTH;
  const height = node.measured?.height ?? node.height ?? NODE_FALLBACK_HEIGHT;
  const position = node.internals.positionAbsolute;

  return {
    x: position.x,
    y: position.y,
    width,
    height,
  };
}

function getNodeIntersection(source: InternalNode<GraphFlowNode>, target: InternalNode<GraphFlowNode>) {
  const sourceBox = getNodeBox(source);
  const targetBox = getNodeBox(target);

  const sourceCenterX = sourceBox.x + sourceBox.width / 2;
  const sourceCenterY = sourceBox.y + sourceBox.height / 2;
  const targetCenterX = targetBox.x + targetBox.width / 2;
  const targetCenterY = targetBox.y + targetBox.height / 2;

  const normalizedX = (targetCenterX - sourceCenterX) / (2 * sourceBox.width / 2);
  const normalizedY = (targetCenterY - sourceCenterY) / (2 * sourceBox.height / 2);

  const xx = normalizedX - normalizedY;
  const yy = normalizedX + normalizedY;
  const scale = 1 / (Math.abs(xx) + Math.abs(yy));
  const intersectionX = scale * xx;
  const intersectionY = scale * yy;

  return {
    x: sourceBox.width / 2 * (intersectionX + intersectionY) + sourceCenterX,
    y: sourceBox.height / 2 * (-intersectionX + intersectionY) + sourceCenterY,
  };
}

function getEdgeSide(node: InternalNode<GraphFlowNode>, point: { x: number; y: number }) {
  const box = getNodeBox(node);

  if (point.x <= box.x + 1) {
    return Position.Left;
  }

  if (point.x >= box.x + box.width - 1) {
    return Position.Right;
  }

  if (point.y <= box.y + 1) {
    return Position.Top;
  }

  return Position.Bottom;
}

function getFloatingEdgeParams(
  source: InternalNode<GraphFlowNode>,
  target: InternalNode<GraphFlowNode>
) {
  const sourcePoint = getNodeIntersection(source, target);
  const targetPoint = getNodeIntersection(target, source);

  return {
    sx: sourcePoint.x,
    sy: sourcePoint.y,
    tx: targetPoint.x,
    ty: targetPoint.y,
    sourcePosition: getEdgeSide(source, sourcePoint),
    targetPosition: getEdgeSide(target, targetPoint),
  };
}

function FloatingEdge(props: EdgeProps<GraphFlowEdge>) {
  const sourceNode = useInternalNode<GraphFlowNode>(props.source);
  const targetNode = useInternalNode<GraphFlowNode>(props.target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePosition, targetPosition } = getFloatingEdgeParams(
    sourceNode,
    targetNode
  );

  const severity = props.data?.severity ?? "info";
  const color = EDGE_COLORS[severity];
  const sourceVectorX = tx - sx;
  const sourceVectorY = ty - sy;
  const length = Math.hypot(sourceVectorX, sourceVectorY) || 1;
  const midX = sx + sourceVectorX / 2;
  const midY = sy + sourceVectorY / 2;

  const controlOffset = clamp(length * 0.22, 42, 120);
  const sourceControl = {
    x:
      sourcePosition === Position.Left
        ? sx - controlOffset
        : sourcePosition === Position.Right
          ? sx + controlOffset
          : sx,
    y:
      sourcePosition === Position.Top
        ? sy - controlOffset
        : sourcePosition === Position.Bottom
          ? sy + controlOffset
          : sy,
  };
  const targetControl = {
    x:
      targetPosition === Position.Left
        ? tx - controlOffset
        : targetPosition === Position.Right
          ? tx + controlOffset
          : tx,
    y:
      targetPosition === Position.Top
        ? ty - controlOffset
        : targetPosition === Position.Bottom
          ? ty + controlOffset
          : ty,
  };

  const edgePath = `M ${sx} ${sy} C ${sourceControl.x} ${sourceControl.y}, ${targetControl.x} ${targetControl.y}, ${tx} ${ty}`;
  const labelX = (sx + tx + sourceControl.x + targetControl.x) / 4;
  const labelY = (sy + ty + sourceControl.y + targetControl.y) / 4;

  return (
    <>
      <BaseEdge
        interactionWidth={40}
        markerEnd={props.markerEnd}
        path={edgePath}
        style={{
          stroke: color,
          strokeLinecap: "round",
          strokeWidth: props.selected ? 3.25 : 2.5,
          opacity: props.selected ? 1 : 0.9,
        }}
      />
      <circle cx={sx} cy={sy} fill={color} r={3.5} />
      <circle cx={tx} cy={ty} fill={color} r={4} />
      <circle cx={tx} cy={ty} fill="none" opacity={0.45} r={7.5} stroke={color} strokeWidth={1.5} />
      {props.data ? (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-auto absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={`nodrag nopan rounded-full border px-2.5 py-1 text-[10px] font-semibold shadow-lg backdrop-blur-md transition hover:scale-[1.02] ${EDGE_LABEL_STYLES[severity]}`}
                  type="button"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {props.data.label}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 border-border/60 bg-background/95 text-foreground shadow-2xl backdrop-blur-xl">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <div className="text-sm font-semibold">{props.data.label}</div>
                  </div>
                  <div className="text-sm leading-relaxed text-muted-foreground">
                    {props.data.explanation}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70">
                    {severity} significance
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </EdgeLabelRenderer>
      ) : null}
      <path
        d={edgePath}
        fill="none"
        opacity={0.18}
        stroke={color}
        strokeWidth={9}
        strokeLinecap="round"
      />
      <circle cx={midX} cy={midY} fill={color} opacity={0.1} r={16} />
    </>
  );
}

const edgeTypes = {
  floatingEdge: FloatingEdge,
};

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 1280, height: GRAPH_DEFAULT_HEIGHT });

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.max(entry.contentRect.width, 640);
      const nextHeight = Math.max(entry.contentRect.height, 320);

      setSize((current) => {
        if (current.width === nextWidth && current.height === nextHeight) {
          return current;
        }

        return {
          width: nextWidth,
          height: nextHeight,
        };
      });
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}

function GraphFlow({ graph, width, height }: { graph: PatientGraph; width: number; height: number }) {
  const initialElements = useMemo(
    () => createFlowElements(graph, width, height),
    [graph, width, height]
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<GraphFlowNode>(initialElements.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<GraphFlowEdge>(initialElements.edges);
  const nodesInitialized = useNodesInitialized();
  const { fitView, getNodes } = useReactFlow<GraphFlowNode, GraphFlowEdge>();
  const simulationRef = useRef<Simulation<SimulationGraphNode, SimulationGraphLink> | null>(null);
  const layoutFrameRef = useRef<number | null>(null);
  const simulationNodesRef = useRef<Map<string, SimulationGraphNode>>(new Map());

  useEffect(() => {
    setNodes(initialElements.nodes);
    setEdges(initialElements.edges);
  }, [initialElements.edges, initialElements.nodes, setEdges, setNodes]);

  useEffect(() => {
    if (!nodesInitialized || initialElements.nodes.length === 0) {
      return;
    }

    const measuredNodes = getNodes();
    const simulationNodes = measuredNodes.map<SimulationGraphNode>((node) => {
      const width = node.measured?.width ?? node.width ?? NODE_WIDTH;
      const height = node.measured?.height ?? node.height ?? NODE_FALLBACK_HEIGHT;

      return {
        id: node.id,
        type: node.data.type,
        width,
        height,
        x: node.position.x + width / 2,
        y: node.position.y + height / 2,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      };
    });

    simulationNodesRef.current = new Map(simulationNodes.map((node) => [node.id, node]));

    const simulationLinks = initialElements.edges.map<SimulationGraphLink>((edge) => ({
      source: edge.source,
      target: edge.target,
      distance:
        edge.data?.severity === "high"
          ? 180
          : edge.data?.severity === "moderate"
            ? 210
            : edge.data?.severity === "low"
              ? 232
              : 250,
      strength:
        edge.data?.severity === "high"
          ? 0.2
          : edge.data?.severity === "moderate"
            ? 0.16
            : 0.12,
    }));

    simulationRef.current?.stop();

    const simulation = forceSimulation(simulationNodes)
      .force(
        "link",
        forceLink<SimulationGraphNode, SimulationGraphLink>(simulationLinks)
          .id((node) => node.id)
          .distance((link) => link.distance)
          .strength((link) => link.strength)
      )
      .force("charge", forceManyBody<SimulationGraphNode>().strength(-720))
      .force(
        "collision",
        forceCollide<SimulationGraphNode>()
          .radius((node) => Math.max(node.width, node.height) / 2 + 22)
          .strength(0.96)
      )
      .force("center", forceCenter(width / 2, height / 2))
      .force(
        "x",
        forceX<SimulationGraphNode>((node) => getTypeAnchor(node.type, width, height).x).strength(0.1)
      )
      .force(
        "y",
        forceY<SimulationGraphNode>((node) => getTypeAnchor(node.type, width, height).y).strength(0.08)
      )
      .velocityDecay(0.34)
      .alpha(0.9)
      .alphaTarget(0)
      .on("tick", () => {
        if (layoutFrameRef.current !== null) {
          return;
        }

        layoutFrameRef.current = requestAnimationFrame(() => {
          layoutFrameRef.current = null;

          setNodes((currentNodes) =>
            currentNodes.map((node) => {
              const simulationNode = simulationNodesRef.current.get(node.id);

              if (!simulationNode) {
                return node;
              }

              const nodeWidth = node.measured?.width ?? node.width ?? NODE_WIDTH;
              const nodeHeight = node.measured?.height ?? node.height ?? NODE_FALLBACK_HEIGHT;
              const nextX = clamp(
                (simulationNode.x ?? width / 2) - nodeWidth / 2,
                GRAPH_PADDING,
                Math.max(GRAPH_PADDING, width - nodeWidth - GRAPH_PADDING)
              );
              const nextY = clamp(
                (simulationNode.y ?? height / 2) - nodeHeight / 2,
                GRAPH_PADDING,
                Math.max(GRAPH_PADDING, height - nodeHeight - GRAPH_PADDING)
              );

              if (
                Math.abs(node.position.x - nextX) < 0.25 &&
                Math.abs(node.position.y - nextY) < 0.25
              ) {
                return node;
              }

              return {
                ...node,
                position: {
                  x: nextX,
                  y: nextY,
                },
              };
            })
          );
        });
      });

    simulationRef.current = simulation;

    const fitTimer = window.setTimeout(() => {
      void fitView({ duration: 600, padding: 0.2 });
    }, 180);

    return () => {
      window.clearTimeout(fitTimer);
      simulation.stop();
      if (layoutFrameRef.current !== null) {
        cancelAnimationFrame(layoutFrameRef.current);
        layoutFrameRef.current = null;
      }
    };
  }, [fitView, getNodes, height, initialElements.edges, initialElements.nodes.length, nodesInitialized, setNodes, width]);

  useEffect(() => {
    return () => {
      simulationRef.current?.stop();
      if (layoutFrameRef.current !== null) {
        cancelAnimationFrame(layoutFrameRef.current);
      }
    };
  }, []);

  const modeLabel = graph.mode === "recommendation" ? "Recommendation graph" : "Current stack graph";

  return (
    <ReactFlow<GraphFlowNode, GraphFlowEdge>
      className="superstack-graph"
      defaultEdgeOptions={{ type: "floatingEdge" }}
      edgeTypes={edgeTypes}
      edges={edges}
      edgesFocusable
      elementsSelectable
      fitView
      maxZoom={1.6}
      minZoom={0.45}
      nodeTypes={nodeTypes}
      nodes={nodes}
      nodesConnectable={false}
      onEdgesChange={onEdgesChange}
      onNodeDrag={(_, node) => {
        const simulationNode = simulationNodesRef.current.get(node.id);

        if (!simulationNode) {
          return;
        }

        const nodeWidth = node.measured?.width ?? node.width ?? NODE_WIDTH;
        const nodeHeight = node.measured?.height ?? node.height ?? NODE_FALLBACK_HEIGHT;

        simulationNode.fx = node.position.x + nodeWidth / 2;
        simulationNode.fy = node.position.y + nodeHeight / 2;
        simulationRef.current?.alphaTarget(0.12).restart();
      }}
      onNodeDragStart={(_, node) => {
        const simulationNode = simulationNodesRef.current.get(node.id);

        if (!simulationNode) {
          return;
        }

        const nodeWidth = node.measured?.width ?? node.width ?? NODE_WIDTH;
        const nodeHeight = node.measured?.height ?? node.height ?? NODE_FALLBACK_HEIGHT;

        simulationNode.fx = node.position.x + nodeWidth / 2;
        simulationNode.fy = node.position.y + nodeHeight / 2;
        simulationRef.current?.alphaTarget(0.18).restart();
      }}
      onNodeDragStop={(_, node) => {
        const simulationNode = simulationNodesRef.current.get(node.id);

        if (!simulationNode) {
          return;
        }

        simulationNode.fx = null;
        simulationNode.fy = null;
        simulationRef.current?.alpha(0.45).alphaTarget(0).restart();
      }}
      onNodesChange={onNodesChange}
      onPaneClick={() => {
        simulationRef.current?.alpha(0.2).restart();
      }}
      panOnDrag
      proOptions={{ hideAttribution: true }}
      selectionOnDrag={false}
    >
      <Background color="var(--border)" gap={26} size={1} />
      <Controls className="!border-border/60 !bg-background/85 !backdrop-blur-md" showInteractive={false} />
      <MiniMap
        className="!overflow-hidden !rounded-2xl !border !border-border/60 !bg-background/78 !backdrop-blur-md"
        maskColor="transparent"
        nodeBorderRadius={12}
        nodeColor={(node) => TYPE_ACCENTS[(node.data as GraphNodeData).type]}
        pannable
        zoomable
      />

      <Panel position="top-left">
        <div className="max-w-[min(28rem,calc(100vw-8rem))] rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
                {modeLabel}
              </div>
              <div className="mt-1 text-base font-semibold tracking-tight text-foreground">
                {graph.title}
              </div>
              {graph.subtitle ? (
                <div className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {graph.subtitle}
                </div>
              ) : null}
            </div>
            <div className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground">
              {graph.nodes.length} nodes · {graph.edges.length} edges
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(TYPE_LABELS).map(([type, label]) => (
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] ${TYPE_STYLES[type as GraphNodeType]}`}
                key={type}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: TYPE_ACCENTS[type as GraphNodeType] }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>
      </Panel>

      {graph.notes?.length ? (
        <Panel position="bottom-left">
          <div className="max-w-[28rem] rounded-[22px] border border-border/60 bg-background/82 p-4 shadow-xl backdrop-blur-xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
              Notes
            </div>
            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
              {graph.notes.map((note) => (
                <li className="flex gap-2" key={note}>
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/35" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      ) : null}
    </ReactFlow>
  );
}

export function GraphCanvas({ graph }: { graph: PatientGraph }) {
  const [containerRef, size] = useElementSize<HTMLDivElement>();

  return (
    <div
      className="relative h-full min-h-0 w-full overflow-hidden bg-[radial-gradient(circle_at_top,_oklch(1_0_0_/_0.08),_transparent_42%),linear-gradient(180deg,_transparent,_oklch(0_0_0_/_0.02))] dark:bg-[radial-gradient(circle_at_top,_oklch(1_0_0_/_0.05),_transparent_42%),linear-gradient(180deg,_transparent,_oklch(1_0_0_/_0.02))]"
      ref={containerRef}
    >
      <div className="absolute inset-0">
        <ReactFlowProvider>
          <GraphFlow graph={graph} height={size.height} width={size.width} />
        </ReactFlowProvider>
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
