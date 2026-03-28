import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { allowedModelIds, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateCurrentPatientGraph } from "@/lib/ai/superstack-graph";
import { getPatientById } from "@/lib/db/queries";
import { getHydratedPatient, savePatientRecord } from "@/lib/superstack/store";

const requestSchema = z
  .object({
    selectedModelId: z.string().optional(),
  })
  .optional();

export async function POST(
  request: Request,
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
  if (!patient) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const body = requestSchema.parse(await request.json().catch(() => ({})));
  const modelId =
    body?.selectedModelId && allowedModelIds.has(body.selectedModelId)
      ? body.selectedModelId
      : DEFAULT_CHAT_MODEL;

  const currentGraph = await generateCurrentPatientGraph({
    profile: patient.profile,
    modelId,
  });

  const updatedPatient = await savePatientRecord({
    id,
    userId: session.user.id,
    currentGraph,
  });

  return Response.json({ patient: updatedPatient }, { status: 200 });
}
