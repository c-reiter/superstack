const PLACEHOLDER_PATIENT_NAME_REGEX = /^New Patient\s+(\d+)$/i;
const LEGACY_PLACEHOLDER_PATIENT_NAME_REGEX = /^New patient$/i;
export function formatNewPatientName(index: number) {
  return `New Patient ${String(index).padStart(2, "0")}`;
}

export function isPlaceholderPatientName(name: string | null | undefined) {
  if (!name) {
    return false;
  }

  return (
    PLACEHOLDER_PATIENT_NAME_REGEX.test(name.trim()) ||
    LEGACY_PLACEHOLDER_PATIENT_NAME_REGEX.test(name.trim())
  );
}

export function getNextPlaceholderPatientName(existingNames: string[]) {
  const usedNumbers = new Set(
    existingNames
      .map((name) => PLACEHOLDER_PATIENT_NAME_REGEX.exec(name.trim())?.[1])
      .filter((value): value is string => Boolean(value))
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isFinite(value) && value > 0)
  );

  let nextNumber = 1;

  while (usedNumbers.has(nextNumber)) {
    nextNumber += 1;
  }

  return formatNewPatientName(nextNumber);
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizePatientDisplayName(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = normalizeWhitespace(
    value.replace(/^["'“”‘’]+|["'“”‘’.,:;\-]+$/g, "")
  );

  if (!normalized || isPlaceholderPatientName(normalized)) {
    return null;
  }

  if (/\d/.test(normalized)) {
    return null;
  }

  return normalized;
}

