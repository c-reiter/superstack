import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { buildExamplePatientRecord } from "@/lib/superstack/example-patient";
import { createPatient, listPatients } from "@/lib/superstack/store";

const createPatientSchema = z.object({
  name: z.string().optional(),
});

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const patients = await listPatients(session.user.id);
  const examplePatient = buildExamplePatientRecord();

  return Response.json(
    {
      patients: [
        examplePatient,
        ...patients.filter((patient) => patient.id !== examplePatient.id),
      ],
    },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { name } = createPatientSchema.parse(body ?? {});

  const patient = await createPatient(session.user.id, name);

  return Response.json({ patient }, { status: 201 });
}
