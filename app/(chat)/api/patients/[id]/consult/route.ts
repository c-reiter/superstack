import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type ToolChoice,
} from "ai";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { sanitizeMessagesForModel } from "@/lib/ai/attachments";
import { allowedModelIds, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getLanguageModel } from "@/lib/ai/providers";
import { consultPrompt } from "@/lib/ai/superstack-prompts";
import { createGraph } from "@/lib/ai/tools/create-graph";
import { createOpenUIArtifact } from "@/lib/ai/tools/create-openui-artifact";
import { createRecommendationArtifact } from "@/lib/ai/tools/create-recommendation-artifact";
import { getPatientById } from "@/lib/db/queries";
import {
  examplePatientProfile,
  isExamplePatientId,
} from "@/lib/superstack/example-patient";
import { savePatientRecord } from "@/lib/superstack/store";
import { emptyPatientProfile } from "@/lib/superstack/types";
import type { ChatMessage } from "@/lib/types";

const requestSchema = z.object({
  messages: z.array(z.any()),
  selectedModelId: z.string().optional(),
});

function getMessageText(message: ChatMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function getLatestUserMessageText(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message?.role === "user") {
      return getMessageText(message);
    }
  }

  return "";
}

function shouldForceRecommendationArtifact(input: string) {
  const normalized = input.toLowerCase();

  return /\b(level\s*0|level\s*1|level\s*2|level\s*3|level\s*4|level\s*5|intervention|interventions|recommend|recommendation|recommendations|treatment|treatments|therapy|therapies|protocol|plan|options|next\s+step|next\s+steps|what\s+should\s+(?:i|we)\s+do|lifestyle|supplement|supplements|otc|pharmaceutical|pharmaceuticals|hormone|hormones|off-label|experimental)\b/.test(
    normalized
  );
}

export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = requestSchema.parse(await request.json());
  const isExamplePatient = isExamplePatientId(id);
  const patient = isExamplePatient ? null : await getPatientById({ id });

  if (!isExamplePatient && (!patient || patient.userId !== session.user.id)) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const profile = isExamplePatient
    ? examplePatientProfile
    : patient?.profile
      ? JSON.parse(patient.profile)
      : emptyPatientProfile();
  const modelId =
    body.selectedModelId && allowedModelIds.has(body.selectedModelId)
      ? body.selectedModelId
      : DEFAULT_CHAT_MODEL;
  const uiMessages = body.messages as ChatMessage[];
  const sanitizedMessages = await sanitizeMessagesForModel(uiMessages);
  const modelMessages = await convertToModelMessages(sanitizedMessages);
  const latestUserMessageText = getLatestUserMessageText(uiMessages);
  const shouldCreateRecommendationArtifact = shouldForceRecommendationArtifact(
    latestUserMessageText
  );
  const systemPrompt = shouldCreateRecommendationArtifact
    ? `${consultPrompt(profile)}

For this specific answer, you must call createRecommendationArtifact before your final prose response.

Artifact requirements for this answer:
- title the artifact around the user's clinical question
- include Level 0 through Level 5, even if some levels are intentionally empty
- scope the plan tightly to the problems, symptoms, or goals explicitly requested in this conversation
- do not include interventions for unrelated diagnoses, symptoms, or optimization goals just because they exist elsewhere in the saved profile
- if the user asked about only one problem or goal, keep all levels focused on that one problem or goal
- use these exact level meanings:
  - Level 0 — Required diagnostics
  - Level 1 — Lifestyle interventions
  - Level 2 — Supplements
  - Level 3 — Pharmaceuticals / hormones
  - Level 4 — Off-label or last-line pharmaceuticals
  - Level 5 — Experimental options such as peptides, phase 2 drugs, or research chemicals
- sort items within each level by relevance to this patient and current request
- use the artifact for the detailed recommendations, cautions, interactions, and next steps
- every item must include an evidenceScore from 1 to 5
- if a level has no reasonable options yet, leave the items array empty instead of inventing content
- for Level 5 items, include a strong research-only disclaimer on each applicable item

Response requirements after the artifact:
- do not dump the full Level 0-5 board again as long plain text
- keep the chat reply short and high-signal
- summarize only the top priorities, key risks, and what to do first in 2-5 bullets or a very short paragraph`
    : consultPrompt(profile);
  const activeTools: Array<
    "createGraph" | "createOpenUIArtifact" | "createRecommendationArtifact"
  > = shouldCreateRecommendationArtifact
    ? ["createRecommendationArtifact"]
    : ["createGraph", "createOpenUIArtifact", "createRecommendationArtifact"];
  const toolChoice: ToolChoice<{
    createGraph: ReturnType<typeof createGraph>;
    createOpenUIArtifact: ReturnType<typeof createOpenUIArtifact>;
    createRecommendationArtifact: ReturnType<typeof createRecommendationArtifact>;
  }> = shouldCreateRecommendationArtifact
    ? { type: "tool", toolName: "createRecommendationArtifact" }
    : "auto";

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const result = streamText({
        model: getLanguageModel(modelId),
        system: systemPrompt,
        messages: modelMessages,
        stopWhen: stepCountIs(6),
        experimental_activeTools: activeTools,
        toolChoice,
        tools: {
          createGraph: createGraph({ dataStream: writer }),
          createOpenUIArtifact: createOpenUIArtifact({ dataStream: writer }),
          createRecommendationArtifact: createRecommendationArtifact({
            dataStream: writer,
          }),
        },
      });

      writer.merge(result.toUIMessageStream());
    },
    onFinish: async ({ messages: assistantMessages }) => {
      if (isExamplePatient) {
        return;
      }

      const fullMessages = [
        ...uiMessages,
        ...(assistantMessages as ChatMessage[]),
      ];
      await savePatientRecord({
        id,
        userId: session.user.id,
        consultMessages: fullMessages,
      });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
