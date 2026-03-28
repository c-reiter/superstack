import mammoth from "mammoth";
import type { ChatMessage } from "@/lib/types";

const passthroughMediaTypes = new Set(["application/pdf"]);
const inlineTextMediaTypes = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "text/html",
  "application/xhtml+xml",
]);
const docxMediaTypes = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_INLINE_TEXT_CHARS = 100_000;
const INLINE_HEAD_CHARS = 75_000;
const INLINE_TAIL_CHARS = 25_000;

function isImageMediaType(mediaType: string) {
  return mediaType.startsWith("image/");
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function htmlToText(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/(p|div|section|article|header|footer|aside|h[1-6]|li|tr)>/gi, "\n")
      .replace(/<(li)>/gi, "- ")
      .replace(/<(td|th)>/gi, "\t")
      .replace(/<[^>]+>/g, " ")
      .replace(/\r/g, "")
      .replace(/\t+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \f\v]+/g, " ")
      .trim()
  );
}

function truncateInlineText(text: string) {
  if (text.length <= MAX_INLINE_TEXT_CHARS) {
    return text;
  }

  const omittedChars = text.length - INLINE_HEAD_CHARS - INLINE_TAIL_CHARS;

  return `${text.slice(0, INLINE_HEAD_CHARS)}\n\n[omitted ${omittedChars.toLocaleString()} characters from the middle]\n\n${text.slice(-INLINE_TAIL_CHARS)}`;
}

async function fetchAttachment(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to read attachment: ${response.status}`);
  }

  return response;
}

async function extractAttachmentText(url: string, mediaType: string) {
  const response = await fetchAttachment(url);

  if (inlineTextMediaTypes.has(mediaType)) {
    const rawText = await response.text();
    return mediaType === "text/html" || mediaType === "application/xhtml+xml"
      ? htmlToText(rawText)
      : rawText;
  }

  if (docxMediaTypes.has(mediaType)) {
    const arrayBuffer = await response.arrayBuffer();
    const result = await mammoth.extractRawText({
      buffer: Buffer.from(arrayBuffer),
    });
    return result.value;
  }

  return null;
}

export async function sanitizeMessagesForModel(messages: ChatMessage[]) {
  return Promise.all(
    messages.map(async (message) => {
      const parts = await Promise.all(
        message.parts.map(async (part) => {
          if (part.type !== "file") {
            return part;
          }

          const filename =
            ("filename" in part && part.filename) ||
            ("name" in part && part.name) ||
            "attachment";
          const mediaType =
            ("mediaType" in part && part.mediaType) || "application/octet-stream";

          if (isImageMediaType(mediaType) || passthroughMediaTypes.has(mediaType)) {
            return part;
          }

          try {
            const extractedText = await extractAttachmentText(part.url, mediaType);

            if (extractedText !== null) {
              const normalizedText = extractedText.trim();

              return {
                type: "text" as const,
                text: normalizedText.length > 0
                  ? `Attached file: ${filename}\n\n${truncateInlineText(normalizedText)}`
                  : `Attached file: ${filename} (${mediaType}). The file was empty after text extraction.`,
              };
            }
          } catch {
            return {
              type: "text" as const,
              text: `Attached file: ${filename} (${mediaType}). The content could not be extracted, so ask the user to paste the relevant sections into chat.`,
            };
          }

          return {
            type: "text" as const,
            text: `Attached file: ${filename} (${mediaType}). This file type is not directly supported yet for text extraction. Ask the user to upload PDF, image, DOCX, HTML, TXT, Markdown, CSV, or JSON instead.`,
          };
        })
      );

      return {
        ...message,
        parts,
      };
    })
  );
}
