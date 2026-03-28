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
import { allowedModelIds, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { intakePrompt, patientProfileSchema, profileUpdatePrompt } from "@/lib/ai/superstack-prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { getPatientById } from "@/lib/db/queries";
import { savePatientRecord } from "@/lib/superstack/store";
import { emptyPatientProfile } from "@/lib/superstack/types";
import type { ChatMessage } from "@/lib/types";

const requestSchema = z.object({
  messages: z.array(z.any()),
  selectedModelId: z.string().optional(),
});

const inlineTextMediaTypes = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

async function readAttachmentText(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to read attachment: ${response.status}`);
  }

  return response.text();
}

async function sanitizeMessagesForModel(messages: ChatMessage[]) {
  return Promise.all(
    messages.map(async (message) => {
      const parts = await Promise.all(
        message.parts.map(async (part) => {
          if (part.type !== "file") {
            return part;
          }

          const filename =
            ("filename" in part && part.filename) ||
            ("name" in part && part.name) ||
            "attachment";
          const mediaType =
            ("mediaType" in part && part.mediaType) || "application/octet-stream";

          if (mediaType.startsWith("image/") || mediaType === "application/pdf") {
            return part;
          }

          if (inlineTextMediaTypes.has(mediaType)) {
            try {
              const fileText = await readAttachmentText(part.url);
              const truncatedText = fileText.length > 12000
                ? `${fileText.slice(0, 12000)}\n\n[truncated]`
                : fileText;

              return {
                type: "text" as const,
                text: `Attached file: ${filename}\n\n${truncatedText}`,
              };
            } catch {
              return {
                type: "text" as const,
                text: `Attached file: ${filename} (${mediaType}). The content could not be extracted, so ask the user to paste the relevant sections into chat.`,
              };
            }
          }

          return {
            type: "text" as const,
            text: `Attached file: ${filename} (${mediaType}).`,
          };
        })
      );

      return {
        ...message,
        parts,
      };
    })
  );
}

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
    profile.diagnoses.length ? `Dx: ${profile.diagnoses.slice(0, 3).join(", ")}` : null,
    profile.medications.length
      ? `Meds: ${profile.medications.slice(0, 3).map((item) => item.name).join(", ")}`
      : null,
    profile.supplements.length
      ? `Supps: ${profile.supplements.slice(0, 3).map((item) => item.name).join(", ")}`
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

  const profile = patient.profile ? JSON.parse(patient.profile) : emptyPatientProfile();
  const modelId =
    body.selectedModelId && allowedModelIds.has(body.selectedModelId)
      ? body.selectedModelId
      : DEFAULT_CHAT_MODEL;
  const uiMessages = body.messages as ChatMessage[];
  const sanitizedMessages = await sanitizeMessagesForModel(uiMessages);
  const modelMessages = await convertToModelMessages(sanitizedMessages);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model: getLanguageModel(modelId),
        system: intakePrompt(profile),
        messages: modelMessages,
        stopWhen: stepCountIs(4),
      });

      writer.merge(result.toUIMessageStream());
    },
    onFinish: async ({ messages: assistantMessages }) => {
      const fullMessages = [...uiMessages, ...(assistantMessages as ChatMessage[])];
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

      await savePatientRecord({
        id,
        userId: session.user.id,
        name: updatedProfile.displayName || patient.name,
        summary: summarizeProfile(updatedProfile),
        profile: updatedProfile,
        intakeMessages: fullMessages,
      });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
