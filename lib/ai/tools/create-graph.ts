import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import { patientGraphSchema } from "@/lib/ai/superstack-graph";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

export const createGraph = ({
  dataStream,
}: {
  dataStream: UIMessageStreamWriter<ChatMessage>;
}) =>
  tool({
    description:
      "Open the right-side interaction graph. Include all relevant nodes in scope, but only create edges for real direct clinical relationships or interactions. Unrelated nodes should remain isolated with no edges.",
    inputSchema: z.object({
      graph: patientGraphSchema,
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
