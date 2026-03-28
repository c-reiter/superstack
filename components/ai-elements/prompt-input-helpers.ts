import type { FileUIPart } from "ai";

export type PromptInputErrorCode = "max_files" | "max_file_size" | "accept";

export type PromptInputError = {
  code: PromptInputErrorCode;
  message: string;
};

export type PromptInputErrorHandler = (error: PromptInputError) => void;

export type PromptInputAttachment = FileUIPart & { id: string };

const toFileArray = (files: File[] | FileList) => Array.from(files);

const normalizeAcceptPatterns = (accept?: string) =>
  accept
    ?.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean) ?? [];

const matchesAcceptPattern = (file: File, pattern: string) => {
  if (pattern === "*" || pattern === "*/*") {
    return true;
  }

  if (pattern.startsWith(".")) {
    return file.name.toLowerCase().endsWith(pattern);
  }

  if (pattern.endsWith("/*")) {
    return file.type.toLowerCase().startsWith(pattern.slice(0, -1));
  }

  return file.type.toLowerCase() === pattern;
};

export const matchesAccept = (file: File, accept?: string) => {
  const patterns = normalizeAcceptPatterns(accept);

  if (patterns.length === 0) {
    return true;
  }

  return patterns.some((pattern) => matchesAcceptPattern(file, pattern));
};

export const validateAttachmentFiles = ({
  files,
  accept,
  maxFileSize,
  maxFiles,
  currentCount = 0,
  onError,
}: {
  files: File[] | FileList;
  accept?: string;
  maxFileSize?: number;
  maxFiles?: number;
  currentCount?: number;
  onError?: PromptInputErrorHandler;
}) => {
  const incomingFiles = toFileArray(files);

  if (incomingFiles.length === 0) {
    return [];
  }

  const acceptedFiles = incomingFiles.filter((file) => matchesAccept(file, accept));

  if (acceptedFiles.length === 0) {
    onError?.({
      code: "accept",
      message: "No files match the accepted types.",
    });
    return [];
  }

  const sizeValidatedFiles = acceptedFiles.filter((file) =>
    maxFileSize ? file.size <= maxFileSize : true
  );

  if (sizeValidatedFiles.length === 0) {
    onError?.({
      code: "max_file_size",
      message: "All files exceed the maximum size.",
    });
    return [];
  }

  if (typeof maxFiles !== "number") {
    return sizeValidatedFiles;
  }

  const remainingCapacity = Math.max(0, maxFiles - currentCount);
  const limitedFiles = sizeValidatedFiles.slice(0, remainingCapacity);

  if (sizeValidatedFiles.length > remainingCapacity) {
    onError?.({
      code: "max_files",
      message: "Too many files. Some were not added.",
    });
  }

  return limitedFiles;
};

export const createPromptInputAttachments = (
  files: File[] | FileList,
  createId: () => string
): PromptInputAttachment[] =>
  toFileArray(files).map((file) => ({
    filename: file.name,
    id: createId(),
    mediaType: file.type,
    type: "file",
    url: URL.createObjectURL(file),
  }));

export const revokePromptInputAttachments = (
  files: Pick<PromptInputAttachment, "url">[]
) => {
  for (const file of files) {
    if (file.url) {
      URL.revokeObjectURL(file.url);
    }
  }
};

export const convertBlobUrlToDataUrl = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    return await new Promise((resolve) => {
      const reader = new FileReader();

      reader.addEventListener("loadend", () => resolve(reader.result as string));
      reader.addEventListener("error", () => resolve(null));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};
