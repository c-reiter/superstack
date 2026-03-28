import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

const graphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum([
    "medication",
    "supplement",
    "condition",
    "lab",
    "goal",
    "symptom",
    "recommendation",
    "diagnostic",
  ]),
  subtitle: z.string().optional(),
});

const graphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string(),
  explanation: z.string(),
  severity: z.enum(["info", "low", "moderate", "high"]),
});

const graphSchema = z.object({
  mode: z.enum(["current", "recommendation"]),
  title: z.string(),
  subtitle: z.string().optional(),
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
  notes: z.array(z.string()).optional(),
});

export const createGraph = ({
  dataStream,
}: {
  dataStream: UIMessageStreamWriter<ChatMessage>;
}) =>
  tool({
    description:
      "Open the right-side interaction graph. Include all relevant nodes in scope, but only create edges for real direct clinical relationships or interactions. Unrelated nodes should remain isolated with no edges.",
    inputSchema: z.object({
      graph: graphSchema,
    }),
    execute: async ({ graph }) => {
      const id = `graph-${generateUUID()}`;
      dataStream.write({ type: "data-kind", data: "graph", transient: true });
      dataStream.write({ type: "data-id", data: id, transient: true });
      dataStream.write({ type: "data-title", data: graph.title, transient: true });
      dataStream.write({ type: "data-clear", data: null, transient: true });
      dataStream.write({
        type: "data-graphDelta",
        data: JSON.stringify(graph),
        transient: true,
      });
      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        id,
        title: graph.title,
        mode: graph.mode,
      };
    },
  });
