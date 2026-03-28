import type { VisibilityType } from "@/components/chat/visibility-selector";
import { generateCurrentPatientGraph } from "@/lib/ai/superstack-graph";
import {
  createPatient as createPatientRow,
  getMessagesByChatId,
  getPatientById,
  getPatientsByUserId,
  replaceMessagesByChatId,
  saveChat,
  updateChatTitleById,
  updatePatientById,
} from "@/lib/db/queries";
import type { DBMessage, Patient as DbPatient } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { getNextPlaceholderPatientName } from "./naming";
import {
  emptyPatientProfile,
  type PatientGraph,
  type PatientProfile,
  type PatientRecord,
} from "./types";

function safeParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function safeParseGraph(value: string | null | undefined): PatientGraph | null {
  const parsed = safeParse<PatientGraph | null>(value, null);

  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as PatientGraph).nodes) &&
    Array.isArray((parsed as PatientGraph).edges)
  ) {
    return parsed as PatientGraph;
  }

  return null;
}

function buildPatientChatTitle(name: string, mode: "intake" | "consult") {
  return `${name} · ${mode === "intake" ? "Intake" : "Consult"}`;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function toDbMessages({
  chatId,
  messages,
}: {
  chatId: string;
  messages: ChatMessage[];
}): DBMessage[] {
  return messages.map((message, index) => ({
    id: isUuid(message.id) ? message.id : generateUUID(),
    chatId,
    role: message.role,
    parts: message.parts,
    attachments: [],
    createdAt: message.metadata?.createdAt
      ? new Date(message.metadata.createdAt)
      : new Date(Date.now() + index),
  }));
}

async function hydratePatientWithMessages(
  patient: DbPatient
): Promise<PatientRecord> {
  const intakeMessages = patient.intakeChatId
    ? convertToUIMessages(
        await getMessagesByChatId({ id: patient.intakeChatId })
      )
    : safeParse<ChatMessage[]>(patient.intakeMessages, []);
  const consultMessages = patient.consultChatId
    ? convertToUIMessages(
        await getMessagesByChatId({ id: patient.consultChatId })
      )
    : safeParse<ChatMessage[]>(patient.consultMessages, []);

  return {
    id: patient.id,
    name: patient.name,
    summary: patient.summary,
    setupComplete: patient.setupComplete,
    profile: safeParse<PatientProfile>(patient.profile, emptyPatientProfile()),
    currentGraph: safeParseGraph(patient.currentGraph),
    intakeMessages,
    consultMessages,
    createdAt: patient.createdAt.toISOString(),
    updatedAt: patient.updatedAt.toISOString(),
  };
}

async function ensurePatientChats(patient: DbPatient) {
  let nextPatient = patient;
  const legacyIntakeMessages = safeParse<ChatMessage[]>(
    patient.intakeMessages,
    []
  );
  const legacyConsultMessages = safeParse<ChatMessage[]>(
    patient.consultMessages,
    []
  );

  let intakeChatId = patient.intakeChatId;
  if (!intakeChatId) {
    intakeChatId = generateUUID();
    await saveChat({
      id: intakeChatId,
      userId: patient.userId,
      title: buildPatientChatTitle(patient.name, "intake"),
      visibility: "private" satisfies VisibilityType,
    });

    await replaceMessagesByChatId({
      chatId: intakeChatId,
      messages: toDbMessages({
        chatId: intakeChatId,
        messages: legacyIntakeMessages,
      }),
    });
  }

  let consultChatId = patient.consultChatId;
  if (!consultChatId) {
    consultChatId = generateUUID();
    await saveChat({
      id: consultChatId,
      userId: patient.userId,
      title: buildPatientChatTitle(patient.name, "consult"),
      visibility: "private" satisfies VisibilityType,
    });

    await replaceMessagesByChatId({
      chatId: consultChatId,
      messages: toDbMessages({
        chatId: consultChatId,
        messages: legacyConsultMessages,
      }),
    });
  }

  const shouldClearLegacyColumns =
    patient.intakeMessages !== "[]" || patient.consultMessages !== "[]";

  if (
    !patient.intakeChatId ||
    !patient.consultChatId ||
    shouldClearLegacyColumns
  ) {
    const updatedPatient = await updatePatientById({
      id: patient.id,
      userId: patient.userId,
      updates: {
        intakeChatId,
        consultChatId,
        ...(shouldClearLegacyColumns
          ? { intakeMessages: "[]", consultMessages: "[]" }
          : {}),
      },
    });

    if (updatedPatient) {
      nextPatient = updatedPatient;
    }
  }

  return nextPatient;
}

export function hydratePatient(patient: DbPatient): PatientRecord {
  return {
    id: patient.id,
    name: patient.name,
    summary: patient.summary,
    setupComplete: patient.setupComplete,
    profile: safeParse<PatientProfile>(patient.profile, emptyPatientProfile()),
    currentGraph: safeParseGraph(patient.currentGraph),
    intakeMessages: [],
    consultMessages: [],
    createdAt: patient.createdAt.toISOString(),
    updatedAt: patient.updatedAt.toISOString(),
  };
}

export async function listPatients(userId: string) {
  const patients = await getPatientsByUserId({ userId });
  return Promise.all(
    patients.map(async (patient) =>
      hydratePatient(await ensurePatientChats(patient))
    )
  );
}

export async function getHydratedPatient(id: string) {
  const patient = await getPatientById({ id });
  if (!patient) {
    return null;
  }

  return hydratePatientWithMessages(await ensurePatientChats(patient));
}

export async function createPatient(userId: string, name?: string) {
  const resolvedName =
    name?.trim() ||
    getNextPlaceholderPatientName(
      (await getPatientsByUserId({ userId })).map((patient) => patient.name)
    );
  const intakeChatId = generateUUID();
  const consultChatId = generateUUID();

  await Promise.all([
    saveChat({
      id: intakeChatId,
      userId,
      title: buildPatientChatTitle(resolvedName, "intake"),
      visibility: "private",
    }),
    saveChat({
      id: consultChatId,
      userId,
      title: buildPatientChatTitle(resolvedName, "consult"),
      visibility: "private",
    }),
  ]);

  const patient = await createPatientRow({
    userId,
    name: resolvedName,
    summary: "",
    setupComplete: false,
    profile: JSON.stringify(emptyPatientProfile()),
    currentGraph: JSON.stringify(null),
    intakeChatId,
    consultChatId,
    intakeMessages: JSON.stringify([]),
    consultMessages: JSON.stringify([]),
  });

  return getHydratedPatient(patient.id);
}

export async function savePatientRecord({
  id,
  userId,
  name,
  summary,
  setupComplete,
  profile,
  currentGraph,
  intakeMessages,
  consultMessages,
}: {
  id: string;
  userId: string;
  name?: string;
  summary?: string;
  setupComplete?: boolean;
  profile?: PatientProfile;
  currentGraph?: PatientGraph | null;
  intakeMessages?: ChatMessage[];
  consultMessages?: ChatMessage[];
}) {
  const existingPatient = await getPatientById({ id });

  if (!existingPatient || existingPatient.userId !== userId) {
    return null;
  }

  const patientWithChats = await ensurePatientChats(existingPatient);
  const resolvedName = name ?? patientWithChats.name;

  const updated = await updatePatientById({
    id,
    userId,
    updates: {
      ...(name !== undefined ? { name } : {}),
      ...(summary !== undefined ? { summary } : {}),
      ...(setupComplete !== undefined ? { setupComplete } : {}),
      ...(profile !== undefined ? { profile: JSON.stringify(profile) } : {}),
      ...(currentGraph !== undefined
        ? { currentGraph: JSON.stringify(currentGraph) }
        : {}),
    },
  });

  if (!updated) {
    return null;
  }

  await Promise.all([
    patientWithChats.intakeChatId && intakeMessages !== undefined
      ? replaceMessagesByChatId({
          chatId: patientWithChats.intakeChatId,
          messages: toDbMessages({
            chatId: patientWithChats.intakeChatId,
            messages: intakeMessages,
          }),
        })
      : Promise.resolve(),
    patientWithChats.consultChatId && consultMessages !== undefined
      ? replaceMessagesByChatId({
          chatId: patientWithChats.consultChatId,
          messages: toDbMessages({
            chatId: patientWithChats.consultChatId,
            messages: consultMessages,
          }),
        })
      : Promise.resolve(),
    name !== undefined && patientWithChats.intakeChatId
      ? updateChatTitleById({
          chatId: patientWithChats.intakeChatId,
          title: buildPatientChatTitle(resolvedName, "intake"),
        })
      : Promise.resolve(),
    name !== undefined && patientWithChats.consultChatId
      ? updateChatTitleById({
          chatId: patientWithChats.consultChatId,
          title: buildPatientChatTitle(resolvedName, "consult"),
        })
      : Promise.resolve(),
  ]);

  return getHydratedPatient(updated.id);
}

const demoPatientSeeds: Array<{
  name: string;
  summary: string;
  profile: PatientProfile;
}> = [
  {
    name: "Demo — bvFTD case",
    summary:
      "62M bvFTD with apathy, disinhibition, executive dysfunction, and progressive language decline",
    profile: {
      ...emptyPatientProfile(),
      displayName: "bvFTD demo patient",
      demographics: {
        age: "62",
        sex: "Male",
      },
      diagnoses: [
        "Behavioral variant frontotemporal dementia (bvFTD)",
        "Progressive language impairment / possible overlapping PPA phenotype",
      ],
      medicalHistory: [
        "Approx. 2 years of progressive language decline",
        "No aggressive behavior reported in recent years",
        "No broad OCD-spectrum behaviors aside from repetitive speech",
      ],
      symptoms: [
        "Severe apathy / loss of initiative",
        "Disinhibition / social boundary loss",
        "Executive dysfunction",
        "Progressive speech impairment",
        "Stereotyped / repetitive language",
      ],
      goals: [
        "Clarify workup and therapeutic strategy",
        "Support function and daily participation",
        "Improve communication support planning",
      ],
      diagnostics: [
        "Genetic testing: C9orf72, GRN, MAPT, APOE",
        "Volumetric MRI with FreeSurfer",
        "FDG-PET",
        "Amyloid-PET if differential remains unclear",
        "Serum or CSF NfL",
      ],
      notes: [
        "Clinical picture from treatment protocol suggests left frontotemporal predominance.",
      ],
      missingInformation: [
        "Current medications and supplements",
        "Current vitals and safety issues",
        "Caregiver priorities and ADL status",
        "Recent imaging and biomarker results",
      ],
    },
  },
  {
    name: "Claudio Reiter — performance case",
    summary:
      "24M founder with fatigue, cognitive underperformance, hair loss, stress load, and multiple biomarker flags",
    profile: {
      ...emptyPatientProfile(),
      displayName: "Claudio Reiter",
      demographics: {
        age: "24",
        sex: "Male",
        height: "182 cm",
        weight: "83 kg",
        bodyComposition: "BMI 25.1 kg/m²",
        occupation: "Startup founder working 60–70 hours/week",
      },
      medicalHistory: [
        "High cognitive demand with chronic under-recovery",
        "Suboptimal diet with low fruit and vegetable intake",
        "Limited structured exercise",
      ],
      symptoms: [
        "Chronic fatigue / low energy",
        "Subjective cognitive underperformance",
        "Advanced hair loss for age",
        "Nail biting and skin picking around fingers",
        "Tic-like blinking and shoulder movements",
        "Situational hyperhidrosis / social anxiety features",
        "Periorbital dark circles",
        "Intermittent bloating",
      ],
      goals: [
        "Improve energy and recovery",
        "Reach higher cognitive performance",
        "Stabilize hair loss",
        "Improve autonomic resilience and conditioning",
      ],
      vitals: [
        { label: "Nighttime HRV", value: "47 ms" },
        { label: "Resting heart rate", value: "68 bpm" },
        { label: "Average sleep", value: "6h 40m" },
        { label: "Weekly cardio time", value: "1h 49m" },
      ],
      labs: [
        { label: "Prolactin", value: "18.2 ng/mL — high" },
        { label: "Lp(a)", value: "59.6 nmol/L — elevated" },
        { label: "Estradiol", value: "50 pg/mL — high" },
        { label: "Ferritin", value: "44 ng/mL — functionally low" },
        { label: "TSH", value: "2.20 µIU/mL" },
        { label: "Testosterone", value: "~655 ng/dL, down from ~758" },
        { label: "Vitamin D", value: "30.3 ng/mL — suboptimal" },
        { label: "Boron", value: "15.09 µg/L — low" },
        { label: "ApoB", value: "79 mg/dL" },
      ],
      familyHistory: ["Not clearly documented in the source report"],
      lifestyle: {
        activity: "Severely insufficient cardiovascular training",
        sleep: "Measured sleep well below perceived 8 hours",
        diet: "Low produce intake, occasional highly processed foods",
        stress: "High chronic work stress with likely sympathetic dominance",
      },
      notes: [
        "Source report frames elevated prolactin, estradiol burden, ferritin, sleep debt, low HRV, and deconditioning as key drivers.",
      ],
      missingInformation: [
        "Current medications and supplements",
        "Full thyroid panel incl. fT3/fT4/reverse T3/antibodies",
        "Detailed GI history and triggers for bloating",
        "Family history, fertility goals, and exact current stack",
      ],
    },
  },
];

export async function ensureDemoPatients(userId: string) {
  const existingPatients = await getPatientsByUserId({ userId });
  const existingNames = new Set(
    existingPatients.map((patient) => patient.name)
  );

  for (const seed of demoPatientSeeds) {
    if (existingNames.has(seed.name)) {
      continue;
    }

    const currentGraph = await generateCurrentPatientGraph({
      profile: seed.profile,
      intakeMessages: [],
      consultMessages: [],
    });

    await createPatientRow({
      userId,
      name: seed.name,
      summary: seed.summary,
      setupComplete: true,
      profile: JSON.stringify(seed.profile),
      currentGraph: JSON.stringify(currentGraph),
      intakeMessages: JSON.stringify([]),
      consultMessages: JSON.stringify([]),
    });
  }
}
