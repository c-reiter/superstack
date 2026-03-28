import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { allowedModelIds, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateCurrentPatientGraph } from "@/lib/ai/superstack-graph";
import { getPatientById } from "@/lib/db/queries";
import { normalizePatientDisplayName } from "@/lib/superstack/naming";
import { extractPatientProfileFromMessages } from "@/lib/superstack/profile-extraction";
import { getHydratedPatient, savePatientRecord } from "@/lib/superstack/store";
import {
  emptyPatientProfile,
  type PatientProfile,
} from "@/lib/superstack/types";
import type { ChatMessage } from "@/lib/types";

const patientPatchSchema = z.object({
  name: z.string().optional(),
  summary: z.string().optional(),
  setupComplete: z.boolean().optional(),
  profile: z.any().optional(),
  intakeMessages: z.any().optional(),
  consultMessages: z.any().optional(),
  selectedModelId: z.string().optional(),
});

function hasMeaningfulConversation(messages: ChatMessage[]) {
  return messages.some(
    (message) =>
      message.role === "user" &&
      message.parts.some(
        (part) =>
          (part.type === "text" && part.text.trim().length > 0) ||
          part.type === "file"
      )
  );
}

function summarizeProfile(profile: PatientProfile) {
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const rawPatient = await getPatientById({ id });

  if (!rawPatient || rawPatient.userId !== session.user.id) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const patient = await getHydratedPatient(id);

  return Response.json({ patient }, { status: 200 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = patientPatchSchema.parse(await request.json());
  const { id } = await params;
  const hydratedPatient = await getHydratedPatient(id);

  if (!hydratedPatient) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const modelId =
    body.selectedModelId && allowedModelIds.has(body.selectedModelId)
      ? body.selectedModelId
      : DEFAULT_CHAT_MODEL;

  const baseProfile =
    body.profile !== undefined
      ? {
          ...emptyPatientProfile(),
          ...hydratedPatient.profile,
          ...body.profile,
        }
      : hydratedPatient.profile;

  if (body.setupComplete === true) {
    if (!hasMeaningfulConversation(hydratedPatient.intakeMessages)) {
      return Response.json(
        { error: "cannot_finish_without_intake_data" },
        { status: 400 }
      );
    }

    try {
      const extractedProfile = await extractPatientProfileFromMessages({
        existingProfile: baseProfile,
        messages: hydratedPatient.intakeMessages,
        modelId,
      });
      const resolvedDisplayName =
        normalizePatientDisplayName(extractedProfile.displayName) ??
        normalizePatientDisplayName(body.name) ??
        normalizePatientDisplayName(hydratedPatient.profile.displayName) ??
        hydratedPatient.name;
      const resolvedProfile = {
        ...extractedProfile,
        ...(resolvedDisplayName ? { displayName: resolvedDisplayName } : {}),
      };
      const currentGraph = await generateCurrentPatientGraph({
        profile: resolvedProfile,
        intakeMessages: hydratedPatient.intakeMessages,
        consultMessages:
          body.consultMessages !== undefined
            ? body.consultMessages
            : hydratedPatient.consultMessages,
        modelId,
      });

      const patient = await savePatientRecord({
        id,
        userId: session.user.id,
        ...(resolvedDisplayName ? { name: resolvedDisplayName } : {}),
        ...(body.summary !== undefined
          ? { summary: body.summary }
          : { summary: summarizeProfile(resolvedProfile) }),
        setupComplete: true,
        profile: resolvedProfile,
        currentGraph,
        ...(body.intakeMessages !== undefined
          ? { intakeMessages: body.intakeMessages }
          : {}),
        ...(body.consultMessages !== undefined
          ? { consultMessages: body.consultMessages }
          : {}),
      });

      if (!patient) {
        return Response.json({ error: "not_found" }, { status: 404 });
      }

      return Response.json({ patient }, { status: 200 });
    } catch (error) {
      console.error("Failed to finalize patient setup:", error);
      return Response.json(
        { error: "failed_to_finalize_patient_setup" },
        { status: 500 }
      );
    }
  }

  const patient = await savePatientRecord({
    id,
    userId: session.user.id,
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.summary !== undefined ? { summary: body.summary } : {}),
    ...(body.setupComplete !== undefined
      ? { setupComplete: body.setupComplete }
      : {}),
    ...(body.profile !== undefined
      ? {
          profile: {
            ...emptyPatientProfile(),
            ...hydratedPatient.profile,
            ...body.profile,
          },
        }
      : {}),
    ...(body.intakeMessages !== undefined
      ? { intakeMessages: body.intakeMessages }
      : {}),
    ...(body.consultMessages !== undefined
      ? { consultMessages: body.consultMessages }
      : {}),
  });

  if (!patient) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json({ patient }, { status: 200 });
}
