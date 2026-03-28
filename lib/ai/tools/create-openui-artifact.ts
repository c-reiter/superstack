import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import { openUIArtifactSchema } from "@/lib/openui/artifact";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

export const createOpenUIArtifact = ({
  dataStream,
}: {
  dataStream: UIMessageStreamWriter<ChatMessage>;
}) =>
  tool({
    description:
      "Open a structured OpenUI-style artifact in the right panel. Use for tables, matrices, ranked comparisons, or Level 0-5 recommendation boards when a visual artifact would make the answer clearer.",
    inputSchema: z.object({
      artifact: openUIArtifactSchema,
    }),
    execute: ({ artifact }) => {
      const id = `openui-${generateUUID()}`;

      dataStream.write({ type: "data-kind", data: "openui", transient: true });
      dataStream.write({ type: "data-id", data: id, transient: true });
      dataStream.write({
        type: "data-title",
        data: artifact.title,
        transient: true,
      });
      dataStream.write({ type: "data-clear", data: null, transient: true });
      dataStream.write({
        type: "data-openuiDelta",
        data: JSON.stringify(artifact),
        transient: true,
      });
      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        id,
        title: artifact.title,
        view: artifact.view,
      };
    },
  });
