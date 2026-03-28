import { tool } from "ai";
import { z } from "zod";
import { getPatientById } from "@/lib/db/queries";
import { normalizePatientDisplayName } from "@/lib/superstack/naming";
import { savePatientRecord } from "@/lib/superstack/store";
import { emptyPatientProfile } from "@/lib/superstack/types";

export const setPatientName = ({
  patientId,
  userId,
}: {
  patientId: string;
  userId: string;
}) =>
  tool({
    description:
      "Set or correct the patient's real full name as soon as it becomes clearly known from the conversation or extracted file content. Use this immediately when the patient name is stated. Do not use placeholder names.",
    inputSchema: z.object({
      name: z.string().min(1).describe("The patient's real full name"),
    }),
    execute: async ({ name }) => {
      const normalizedName = normalizePatientDisplayName(name);

      if (!normalizedName) {
        return {
          success: false,
          reason: "Invalid or placeholder patient name.",
        };
      }

      const patient = await getPatientById({ id: patientId });

      if (!patient || patient.userId !== userId) {
        return {
          success: false,
          reason: "Patient not found.",
        };
      }

      const profile = patient.profile
        ? { ...emptyPatientProfile(), ...JSON.parse(patient.profile) }
        : emptyPatientProfile();

      await savePatientRecord({
        id: patientId,
        userId,
        name: normalizedName,
        profile: {
          ...profile,
          displayName: normalizedName,
        },
      });

      return {
        success: true,
        name: normalizedName,
      };
    },
  });
