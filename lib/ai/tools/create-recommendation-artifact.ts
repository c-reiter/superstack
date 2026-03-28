import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import { recommendationArtifactSchema } from "@/lib/recommendations/artifact";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

export const createRecommendationArtifact = ({
  dataStream,
}: {
  dataStream: UIMessageStreamWriter<ChatMessage>;
}) =>
  tool({
    description:
      "Open the dedicated tiered recommendation artifact in the right panel. Use this for Level 0-5 clinical plans where Level 0 is required diagnostics, Level 1 lifestyle interventions, Level 2 supplements, Level 3 pharmaceuticals/hormones, Level 4 off-label or last-line pharmaceuticals, and Level 5 experimental options such as peptides, phase 2 drugs, or research chemicals. Every item must include a 1-5 evidenceScore.",
    inputSchema: z.object({
      artifact: recommendationArtifactSchema,
    }),
    execute: ({ artifact }) => {
      const id = `recommendations-${generateUUID()}`;

      dataStream.write({
        type: "data-kind",
        data: "recommendations",
        transient: true,
      });
      dataStream.write({ type: "data-id", data: id, transient: true });
      dataStream.write({
        type: "data-title",
        data: artifact.title,
        transient: true,
      });
      dataStream.write({ type: "data-clear", data: null, transient: true });
      dataStream.write({
        type: "data-recommendationDelta",
        data: JSON.stringify(artifact),
        transient: true,
      });
      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        id,
        title: artifact.title,
      };
    },
  });
