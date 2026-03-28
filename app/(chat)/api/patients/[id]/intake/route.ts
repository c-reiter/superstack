import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateObject,
  stepCountIs,
  streamText,
} from "ai";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { sanitizeMessagesForModel } from "@/lib/ai/attachments";
import { allowedModelIds, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getLanguageModel } from "@/lib/ai/providers";
import {
  intakePrompt,
  patientProfileSchema,
  profileUpdatePrompt,
} from "@/lib/ai/superstack-prompts";
import { setPatientName } from "@/lib/ai/tools/set-patient-name";
import { getPatientById } from "@/lib/db/queries";
import { normalizePatientDisplayName } from "@/lib/superstack/naming";
import { savePatientRecord } from "@/lib/superstack/store";
import { emptyPatientProfile } from "@/lib/superstack/types";
import type { ChatMessage } from "@/lib/types";

const requestSchema = z.object({
  messages: z.array(z.any()),
  selectedModelId: z.string().optional(),
});

function stringifyConversation(messages: ChatMessage[]) {
  return messages
    .map((message) => {
      const text = message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n");

      return `${message.role.toUpperCase()}: ${text}`;
    })
    .join("\n\n");
}

function summarizeProfile(profile: z.infer<typeof patientProfileSchema>) {
  const summaryParts = [
    profile.diagnoses.length
      ? `Dx: ${profile.diagnoses.slice(0, 3).join(", ")}`
      : null,
    profile.medications.length
      ? `Meds: ${profile.medications
          .slice(0, 3)
          .map((item) => item.name)
          .join(", ")}`
      : null,
    profile.supplements.length
      ? `Supps: ${profile.supplements
          .slice(0, 3)
          .map((item) => item.name)
          .join(", ")}`
      : null,
    profile.symptoms.length
      ? `Symptoms: ${profile.symptoms.slice(0, 3).join(", ")}`
      : null,
  ].filter(Boolean);

  return summaryParts.join(" • ");
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
  const patient = await getPatientById({ id });

  if (!patient || patient.userId !== session.user.id) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const profile = patient.profile
    ? JSON.parse(patient.profile)
    : emptyPatientProfile();
  const modelId =
    body.selectedModelId && allowedModelIds.has(body.selectedModelId)
      ? body.selectedModelId
      : DEFAULT_CHAT_MODEL;
  const uiMessages = body.messages as ChatMessage[];
  const sanitizedMessages = await sanitizeMessagesForModel(uiMessages);
  const modelMessages = await convertToModelMessages(sanitizedMessages);

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const result = streamText({
        model: getLanguageModel(modelId),
        system: intakePrompt(profile),
        messages: modelMessages,
        stopWhen: stepCountIs(4),
        experimental_activeTools: ["setPatientName"],
        tools: {
          setPatientName: setPatientName({
            patientId: id,
            userId: session.user.id,
          }),
        },
      });

      writer.merge(result.toUIMessageStream());
    },
    onFinish: async ({ messages: assistantMessages }) => {
      const fullMessages = [
        ...uiMessages,
        ...(assistantMessages as ChatMessage[]),
      ];
      const fullMessagesForProfile = [
        ...sanitizedMessages,
        ...(assistantMessages as ChatMessage[]),
      ];

      const profileResult = await generateObject({
        model: getLanguageModel(modelId),
        schema: patientProfileSchema,
        prompt: profileUpdatePrompt({
          existingProfile: profile,
          messages: stringifyConversation(fullMessagesForProfile),
        }),
      });

      const updatedProfile = profileResult.object;
      const latestPatient = await getPatientById({ id });
      const latestProfile = latestPatient?.profile
        ? { ...emptyPatientProfile(), ...JSON.parse(latestPatient.profile) }
        : emptyPatientProfile();
      const resolvedDisplayName =
        normalizePatientDisplayName(updatedProfile.displayName) ??
        normalizePatientDisplayName(latestProfile.displayName) ??
        normalizePatientDisplayName(profile.displayName);
      const resolvedProfile = {
        ...updatedProfile,
        ...(resolvedDisplayName ? { displayName: resolvedDisplayName } : {}),
      };

      await savePatientRecord({
        id,
        userId: session.user.id,
        ...(resolvedDisplayName ? { name: resolvedDisplayName } : {}),
        summary: summarizeProfile(resolvedProfile),
        profile: resolvedProfile,
        intakeMessages: fullMessages,
      });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
