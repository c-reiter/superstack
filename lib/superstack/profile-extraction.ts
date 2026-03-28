import { convertToModelMessages, generateObject } from "ai";
import type { z } from "zod";
import { sanitizeMessagesForModel } from "@/lib/ai/attachments";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getLanguageModel } from "@/lib/ai/providers";
import {
  patientProfileSchema,
  profileUpdateSystemPrompt,
} from "@/lib/ai/superstack-prompts";
import type {
  KeyValueItem,
  PatientProfile,
  StackItem,
} from "@/lib/superstack/types";
import type { ChatMessage } from "@/lib/types";

function stripSystemMessages(messages: ChatMessage[]) {
  return messages.filter((message) => message.role !== "system");
}

function filterProfileRelevantMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .map((message) => ({
      ...message,
      parts: message.parts.filter((part) => {
        if (part.type === "file") {
          return true;
        }

        return part.type === "text" && part.text.trim().length > 0;
      }),
    }))
    .filter((message) => message.parts.length > 0);
}

export function profileHasStructuredClinicalContent(profile: PatientProfile) {
  return Boolean(
    profile.demographics.age ||
      profile.demographics.sex ||
      profile.demographics.height ||
      profile.demographics.weight ||
      profile.demographics.bodyComposition ||
      profile.demographics.occupation ||
      profile.diagnoses.length ||
      profile.medicalHistory.length ||
      profile.medications.length ||
      profile.supplements.length ||
      profile.hormones.length ||
      profile.peptides.length ||
      profile.symptoms.length ||
      profile.goals.length ||
      profile.vitals.length ||
      profile.labs.length ||
      profile.diagnostics.length ||
      profile.familyHistory.length ||
      profile.lifestyle.activity ||
      profile.lifestyle.sleep ||
      profile.lifestyle.diet ||
      profile.lifestyle.alcohol ||
      profile.lifestyle.nicotine ||
      profile.lifestyle.stress ||
      profile.lifestyle.notes
  );
}

function normalizeNullableString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeStackItems(
  items: Array<{
    name: string;
    dose: string | null;
    timing: string | null;
    indication: string | null;
    duration: string | null;
    notes: string | null;
  }>
): StackItem[] {
  return items
    .map((item) => ({
      name: item.name.trim(),
      ...(normalizeNullableString(item.dose)
        ? { dose: normalizeNullableString(item.dose) }
        : {}),
      ...(normalizeNullableString(item.timing)
        ? { timing: normalizeNullableString(item.timing) }
        : {}),
      ...(normalizeNullableString(item.indication)
        ? { indication: normalizeNullableString(item.indication) }
        : {}),
      ...(normalizeNullableString(item.duration)
        ? { duration: normalizeNullableString(item.duration) }
        : {}),
      ...(normalizeNullableString(item.notes)
        ? { notes: normalizeNullableString(item.notes) }
        : {}),
    }))
    .filter((item) => item.name.length > 0);
}

function normalizeKeyValueItems(
  items: Array<{
    label: string;
    value: string;
    notes: string | null;
  }>
): KeyValueItem[] {
  return items
    .map((item) => ({
      label: item.label.trim(),
      value: item.value.trim(),
      ...(normalizeNullableString(item.notes)
        ? { notes: normalizeNullableString(item.notes) }
        : {}),
    }))
    .filter((item) => item.label.length > 0 && item.value.length > 0);
}

function normalizeGeneratedPatientProfile(
  profile: z.infer<typeof patientProfileSchema>
): PatientProfile {
  return {
    ...(normalizeNullableString(profile.displayName)
      ? { displayName: normalizeNullableString(profile.displayName) }
      : {}),
    demographics: {
      ...(normalizeNullableString(profile.demographics.age)
        ? { age: normalizeNullableString(profile.demographics.age) }
        : {}),
      ...(normalizeNullableString(profile.demographics.sex)
        ? { sex: normalizeNullableString(profile.demographics.sex) }
        : {}),
      ...(normalizeNullableString(profile.demographics.height)
        ? { height: normalizeNullableString(profile.demographics.height) }
        : {}),
      ...(normalizeNullableString(profile.demographics.weight)
        ? { weight: normalizeNullableString(profile.demographics.weight) }
        : {}),
      ...(normalizeNullableString(profile.demographics.bodyComposition)
        ? {
            bodyComposition: normalizeNullableString(
              profile.demographics.bodyComposition
            ),
          }
        : {}),
      ...(normalizeNullableString(profile.demographics.occupation)
        ? {
            occupation: normalizeNullableString(
              profile.demographics.occupation
            ),
          }
        : {}),
    },
    diagnoses: profile.diagnoses.map((item) => item.trim()).filter(Boolean),
    medicalHistory: profile.medicalHistory
      .map((item) => item.trim())
      .filter(Boolean),
    medications: normalizeStackItems(profile.medications),
    supplements: normalizeStackItems(profile.supplements),
    hormones: normalizeStackItems(profile.hormones),
    peptides: normalizeStackItems(profile.peptides),
    symptoms: profile.symptoms.map((item) => item.trim()).filter(Boolean),
    goals: profile.goals.map((item) => item.trim()).filter(Boolean),
    vitals: normalizeKeyValueItems(profile.vitals),
    labs: normalizeKeyValueItems(profile.labs),
    diagnostics: profile.diagnostics.map((item) => item.trim()).filter(Boolean),
    familyHistory: profile.familyHistory
      .map((item) => item.trim())
      .filter(Boolean),
    lifestyle: {
      ...(normalizeNullableString(profile.lifestyle.activity)
        ? { activity: normalizeNullableString(profile.lifestyle.activity) }
        : {}),
      ...(normalizeNullableString(profile.lifestyle.sleep)
        ? { sleep: normalizeNullableString(profile.lifestyle.sleep) }
        : {}),
      ...(normalizeNullableString(profile.lifestyle.diet)
        ? { diet: normalizeNullableString(profile.lifestyle.diet) }
        : {}),
      ...(normalizeNullableString(profile.lifestyle.alcohol)
        ? { alcohol: normalizeNullableString(profile.lifestyle.alcohol) }
        : {}),
      ...(normalizeNullableString(profile.lifestyle.nicotine)
        ? { nicotine: normalizeNullableString(profile.lifestyle.nicotine) }
        : {}),
      ...(normalizeNullableString(profile.lifestyle.stress)
        ? { stress: normalizeNullableString(profile.lifestyle.stress) }
        : {}),
      ...(normalizeNullableString(profile.lifestyle.notes)
        ? { notes: normalizeNullableString(profile.lifestyle.notes) }
        : {}),
    },
    notes: profile.notes.map((item) => item.trim()).filter(Boolean),
    missingInformation: profile.missingInformation
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

export async function extractPatientProfileFromMessages({
  existingProfile,
  messages,
  modelId = DEFAULT_CHAT_MODEL,
}: {
  existingProfile: PatientProfile;
  messages: ChatMessage[];
  modelId?: string;
}) {
  const relevantMessages = filterProfileRelevantMessages(
    stripSystemMessages(messages)
  );

  if (relevantMessages.length === 0) {
    return existingProfile;
  }

  const sanitizedMessages = await sanitizeMessagesForModel(relevantMessages);
  const modelMessages = await convertToModelMessages(sanitizedMessages);

  const { object } = await generateObject({
    model: getLanguageModel(modelId),
    system: profileUpdateSystemPrompt({ existingProfile }),
    messages: modelMessages,
    schema: patientProfileSchema,
  });

  return normalizeGeneratedPatientProfile(object);
}
