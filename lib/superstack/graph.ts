import type { PatientGraph } from "./types";

export function hasRenderableGraph(graph: PatientGraph | null | undefined) {
  return Boolean(graph && graph.nodes.length >= 0 && graph.edges.length >= 0);
}
