import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { generateCurrentPatientGraph } from "@/lib/ai/superstack-graph";
import { getPatientById } from "@/lib/db/queries";
import { getHydratedPatient, savePatientRecord } from "@/lib/superstack/store";
import { emptyPatientProfile } from "@/lib/superstack/types";
import type { ChatMessage } from "@/lib/types";

const patientPatchSchema = z.object({
  name: z.string().optional(),
  summary: z.string().optional(),
  setupComplete: z.boolean().optional(),
  profile: z.any().optional(),
  intakeMessages: z.any().optional(),
  consultMessages: z.any().optional(),
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

  if (
    patient &&
    patient.currentGraph === null &&
    (hasMeaningfulConversation(patient.intakeMessages) ||
      hasMeaningfulConversation(patient.consultMessages) ||
      patient.profile.diagnoses.length > 0 ||
      patient.profile.medications.length > 0 ||
      patient.profile.supplements.length > 0 ||
      patient.profile.labs.length > 0 ||
      patient.profile.symptoms.length > 0)
  ) {
    const currentGraph = await generateCurrentPatientGraph({
      profile: patient.profile,
      intakeMessages: patient.intakeMessages,
      consultMessages: patient.consultMessages,
    });

    const updatedPatient = await savePatientRecord({
      id,
      userId: session.user.id,
      currentGraph,
    });

    return Response.json({ patient: updatedPatient }, { status: 200 });
  }

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

  const patient = await savePatientRecord({
    id,
    userId: session.user.id,
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.summary !== undefined ? { summary: body.summary } : {}),
    ...(body.setupComplete !== undefined
      ? { setupComplete: body.setupComplete }
      : {}),
    ...(body.profile !== undefined
      ? { profile: { ...emptyPatientProfile(), ...body.profile } }
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
