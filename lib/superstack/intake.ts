import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

export function createInitialIntakeMessages(options?: {
  messageId?: string;
  createdAt?: string;
}): ChatMessage[] {
  return [
    {
      id: options?.messageId ?? generateUUID(),
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "Let's start the intake. What's the patient's name, age/sex, main issue, and any key files?",
        },
      ],
      metadata: {
        createdAt: options?.createdAt ?? new Date().toISOString(),
      },
    },
  ];
}
