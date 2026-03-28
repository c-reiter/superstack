import { isPlaceholderPatientName } from "./naming";

export function buildInitialIntakeSystemInstruction(patientName?: string) {
  const resolvedName =
    patientName && !isPlaceholderPatientName(patientName)
      ? patientName
      : null;

  return [
    "Send the first intake reply now.",
    resolvedName
      ? `Start with a warm greeting using the patient's name: ${resolvedName}.`
      : "Start with a warm greeting.",
    "Keep it to 1-2 short sentences.",
    "Do not mention brevity or talk about the style of the response.",
    'Ask one simple opening question that helps intake start immediately.',
    'Offer a tiny menu like symptoms, current meds, or files if helpful.',
    "Do not mention that this instruction came from the system.",
  ].join(" ");
}
