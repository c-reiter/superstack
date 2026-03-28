import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
} from "ai";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { allowedModelIds, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { consultPrompt } from "@/lib/ai/superstack-prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createGraph } from "@/lib/ai/tools/create-graph";
import { getPatientById } from "@/lib/db/queries";
import { savePatientRecord } from "@/lib/superstack/store";
import { emptyPatientProfile } from "@/lib/superstack/types";
import type { ChatMessage } from "@/lib/types";

const requestSchema = z.object({
  messages: z.array(z.any()),
  selectedModelId: z.string().optional(),
});

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
  const patient = await getPatientById({ id });

  if (!patient || patient.userId !== session.user.id) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const profile = patient.profile ? JSON.parse(patient.profile) : emptyPatientProfile();
  const modelId =
    body.selectedModelId && allowedModelIds.has(body.selectedModelId)
      ? body.selectedModelId
      : DEFAULT_CHAT_MODEL;
  const uiMessages = body.messages as ChatMessage[];
  const modelMessages = await convertToModelMessages(uiMessages);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model: getLanguageModel(modelId),
        system: consultPrompt(profile),
        messages: modelMessages,
        stopWhen: stepCountIs(6),
        experimental_activeTools: ["createGraph"],
        tools: {
          createGraph: createGraph({ dataStream: writer }),
        },
      });

      writer.merge(result.toUIMessageStream());
    },
    onFinish: async ({ messages: assistantMessages }) => {
      const fullMessages = [...uiMessages, ...(assistantMessages as ChatMessage[])];
      await savePatientRecord({
        id,
        userId: session.user.id,
        consultMessages: fullMessages,
      });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
