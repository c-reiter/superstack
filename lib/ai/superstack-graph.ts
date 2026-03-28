import { generateText } from "ai";
import { z } from "zod";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getLanguageModel } from "@/lib/ai/providers";
import type { PatientGraph, PatientProfile } from "@/lib/superstack/types";
import type { ChatMessage } from "@/lib/types";

export const graphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum([
    "medication",
    "supplement",
    "condition",
    "lab",
    "goal",
    "symptom",
    "recommendation",
    "diagnostic",
  ]),
  subtitle: z.string().nullable(),
});

export const graphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string(),
  explanation: z.string(),
  severity: z.enum(["info", "low", "moderate", "high"]),
});

export const patientGraphSchema = z.object({
  mode: z.enum(["current", "recommendation"]),
  title: z.string(),
  subtitle: z.string().nullable(),
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
  notes: z.array(z.string()).nullable(),
});

function stringifyMessages(messages: ChatMessage[]) {
  return messages
    .map((message) => {
      const content = message.parts
        .map((part) => {
          if (part.type === "text") {
            return part.text;
          }
          if (part.type === "file") {
            return `[attachment: ${part.filename ?? part.mediaType ?? "file"}]`;
          }
          return null;
        })
        .filter(Boolean)
        .join("\n");

      return `${message.role.toUpperCase()}: ${content}`;
    })
    .join("\n\n");
}

export async function generateCurrentPatientGraph({
  profile,
  intakeMessages,
  consultMessages,
  modelId = DEFAULT_CHAT_MODEL,
}: {
  profile: PatientProfile;
  intakeMessages: ChatMessage[];
  consultMessages: ChatMessage[];
  modelId?: string;
}): Promise<PatientGraph> {
  try {
    const { text } = await generateText({
      model: getLanguageModel(modelId),
      system: `You are generating the current interaction graph for SuperStack.

Rules:
- Use the actual patient data and the whole chat history.
- Include all clinically relevant current nodes from the patient profile when they may matter to clinician reasoning: conditions, symptoms, medications, supplements, hormones, peptides, labs, vitals, diagnostics, and goals.
- It is fine for some nodes to be isolated.
- Create edges only for real direct clinical relationships, interactions, monitoring relationships, causal relevance, or meaningful symptom/lab links.
- Never create fake context edges just to make the graph denser.
- If two nodes are unrelated, do not connect them.
- Edge explanations must be plain-language and specific to the pair.
- Keep node labels short.
- Use mode "current".
- Title must be "Current profile graph".
- Subtitle should briefly say that the graph only shows direct clinical relationships.
- Always include subtitle, node subtitle, and notes keys. Use null when absent.
- Output valid JSON only. No markdown fences, no prose.`,
      prompt: `PATIENT PROFILE\n${JSON.stringify(profile, null, 2)}\n\nINTAKE HISTORY\n${stringifyMessages(
        intakeMessages
      )}\n\nCONSULT HISTORY\n${stringifyMessages(consultMessages)}`,
    });

    const parsedJson = JSON.parse(text);
    const object = patientGraphSchema.parse(parsedJson);

    return {
      mode: object.mode,
      title: object.title,
      ...(object.subtitle ? { subtitle: object.subtitle } : {}),
      nodes: object.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        type: node.type,
        ...(node.subtitle ? { subtitle: node.subtitle } : {}),
      })),
      edges: object.edges,
      ...(object.notes ? { notes: object.notes } : { notes: [] }),
    };
  } catch (error) {
    console.error("Failed to generate current patient graph:", error);

    return {
      mode: "current",
      title: "Current profile graph",
      subtitle: "Graph generation failed; retry after more patient data is available.",
      nodes: [],
      edges: [],
      notes: [],
    };
  }
}
