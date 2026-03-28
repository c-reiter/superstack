import { generateObject } from "ai";
import { z } from "zod";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getLanguageModel } from "@/lib/ai/providers";
import { currentGraphEdgeGenerationPrompt } from "@/lib/ai/superstack-prompts";
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

type GraphNodeType = PatientGraph["nodes"][number]["type"];
type GraphEdge = PatientGraph["edges"][number];
type GraphNode = PatientGraph["nodes"][number];

const MAX_CONDITION_NODES = 6;
const MAX_SYMPTOM_NODES = 10;
const MAX_GOAL_NODES = 8;
const MAX_LAB_NODES = 12;
const MAX_DIAGNOSTIC_NODES = 6;

function normalizeText(value: string | undefined) {
  return value?.trim() ?? "";
}

function normalizeForMatch(value: string | undefined) {
  return normalizeText(value).toLowerCase();
}

function createNodeId(type: GraphNodeType, label: string) {
  return `${type}-${label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

function compactNodeLabel(type: GraphNodeType, rawLabel: string) {
  const normalized = normalizeText(rawLabel).replace(/\s+/g, " ");

  if (!normalized) {
    return normalized;
  }

  if (type === "diagnostic" && /whoop wearable data/i.test(normalized)) {
    return "Whoop data";
  }

  const firstSegment = normalized
    .split(/[:;•]| - | — | – |,|\(|\//)
    .map((part) => normalizeText(part))
    .find(Boolean);

  const candidate = firstSegment || normalized;
  const words = candidate.split(/\s+/).filter(Boolean);

  if (words.length <= 6) {
    return candidate;
  }

  const stopWords = new Set([
    "a",
    "an",
    "and",
    "around",
    "by",
    "for",
    "from",
    "in",
    "of",
    "on",
    "per",
    "prior",
    "report",
    "the",
    "to",
    "with",
  ]);

  const filteredWords = words.filter((word, index) => {
    if (index === 0) {
      return true;
    }

    return !stopWords.has(word.toLowerCase());
  });

  return filteredWords.slice(0, 6).join(" ");
}

function buildNodeSubtitle(
  rawLabel: string,
  subtitle?: string,
  shortLabel?: string
) {
  const normalizedRawLabel = normalizeText(rawLabel);
  const normalizedSubtitle = normalizeText(subtitle);
  const normalizedShortLabel = normalizeText(shortLabel);

  if (
    normalizedShortLabel &&
    normalizedRawLabel &&
    normalizedShortLabel !== normalizedRawLabel
  ) {
    return normalizedSubtitle
      ? `${normalizedRawLabel} • ${normalizedSubtitle}`
      : normalizedRawLabel;
  }

  return normalizedSubtitle || undefined;
}

function pick<T>(items: T[], limit: number) {
  return items.slice(0, limit);
}

function isInterestingLab(
  lab: PatientProfile["labs"][number],
  profile: PatientProfile
) {
  const label = normalizeForMatch(lab.label);
  const value = normalizeForMatch(lab.value);
  const notes = normalizeForMatch(lab.notes);
  const text = `${label} ${value} ${notes}`;

  if (
    /(high|low|above|below|elevated|suboptimal|upper limit|borderline|out of range)/.test(
      text
    )
  ) {
    return true;
  }

  if (
    /(ferritin|prolactin|estradiol|vitamin d|25-oh vitamin d|lipoprotein\(a\)|lp\(a\)|apolipoprotein b|apob|tsh|testosterone|shbg|cortisol)/.test(
      label
    )
  ) {
    return true;
  }

  if (
    profile.symptoms.some((symptom) =>
      /(fatigue|energy|hair|sleep|cognitive|brain fog)/.test(
        normalizeForMatch(symptom)
      )
    ) &&
    /(ferritin|prolactin|estradiol|vitamin d|tsh|testosterone)/.test(label)
  ) {
    return true;
  }

  return false;
}

function dedupeNodes(nodes: GraphNode[]) {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    if (seen.has(node.id)) {
      return false;
    }
    seen.add(node.id);
    return true;
  });
}

function makeNode(
  type: GraphNodeType,
  rawLabel: string,
  subtitle?: string
): GraphNode {
  const label = compactNodeLabel(type, rawLabel);
  const resolvedSubtitle = buildNodeSubtitle(rawLabel, subtitle, label);

  return {
    id: createNodeId(type, [rawLabel, subtitle].filter(Boolean).join(" ")),
    label,
    type,
    ...(resolvedSubtitle ? { subtitle: resolvedSubtitle } : {}),
  };
}

function addEdge(
  edges: GraphEdge[],
  source: GraphNode,
  target: GraphNode,
  label: string,
  explanation: string,
  severity: GraphEdge["severity"] = "info"
) {
  const [left, right] = [source.id, target.id].sort();
  const id = `${left}__${right}__${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  if (edges.some((edge) => edge.id === id)) {
    return;
  }

  edges.push({
    id,
    source: source.id,
    target: target.id,
    label,
    explanation,
    severity,
  });
}

function buildNodes(profile: PatientProfile) {
  const conditionLabels = [...profile.diagnoses, ...profile.medicalHistory]
    .map(normalizeText)
    .filter(Boolean);

  const nodes = dedupeNodes([
    ...pick(conditionLabels, MAX_CONDITION_NODES).map((label) =>
      makeNode("condition", label)
    ),
    ...pick(profile.medications, 8).map((item) =>
      makeNode(
        "medication",
        item.name,
        [item.dose, item.timing].filter(Boolean).join(" • ") || item.indication
      )
    ),
    ...pick(profile.supplements, 8).map((item) =>
      makeNode(
        "supplement",
        item.name,
        [item.dose, item.timing].filter(Boolean).join(" • ") || item.indication
      )
    ),
    ...pick(profile.hormones, 6).map((item) =>
      makeNode(
        "medication",
        item.name,
        [item.dose, item.timing].filter(Boolean).join(" • ") || item.indication
      )
    ),
    ...pick(profile.peptides, 6).map((item) =>
      makeNode(
        "supplement",
        item.name,
        [item.dose, item.timing].filter(Boolean).join(" • ") || item.indication
      )
    ),
    ...pick(profile.symptoms, MAX_SYMPTOM_NODES)
      .map(normalizeText)
      .filter(Boolean)
      .map((label) => makeNode("symptom", label)),
    ...pick(profile.goals, MAX_GOAL_NODES)
      .map(normalizeText)
      .filter(Boolean)
      .map((label) => makeNode("goal", label)),
    ...pick(
      profile.labs.filter((lab) => isInterestingLab(lab, profile)),
      MAX_LAB_NODES
    ).map((lab) =>
      makeNode(
        "lab",
        lab.label,
        [lab.value, lab.notes].filter(Boolean).join(" • ")
      )
    ),
    ...pick(profile.diagnostics, MAX_DIAGNOSTIC_NODES)
      .map(normalizeText)
      .filter(Boolean)
      .map((label) => makeNode("diagnostic", label)),
  ]);

  return {
    nodes,
    nodeMap: new Map(nodes.map((node) => [node.id, node])),
  };
}

const graphEdgeListSchema = z.object({
  edges: z.array(graphEdgeSchema),
});

const EDGE_SEVERITY_RANK: Record<GraphEdge["severity"], number> = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
};

function normalizeModelEdges(nodes: GraphNode[], rawEdges: GraphEdge[]) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const bestEdgeByPair = new Map<string, GraphEdge>();

  for (const edge of rawEdges) {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);

    if (!source || !target || source.id === target.id) {
      continue;
    }

    const pairKey = [source.id, target.id].sort().join("__");
    const existingEdge = bestEdgeByPair.get(pairKey);

    if (
      !existingEdge ||
      EDGE_SEVERITY_RANK[edge.severity] >
        EDGE_SEVERITY_RANK[existingEdge.severity]
    ) {
      bestEdgeByPair.set(pairKey, edge);
    }
  }

  const edges: GraphEdge[] = [];

  for (const edge of bestEdgeByPair.values()) {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);

    if (!source || !target) {
      continue;
    }

    addEdge(edges, source, target, edge.label, edge.explanation, edge.severity);
  }

  return edges;
}

async function buildGraphFromProfile(
  profile: PatientProfile,
  modelId: string
): Promise<PatientGraph> {
  const { nodes } = buildNodes(profile);

  if (nodes.length === 0) {
    return {
      mode: "current",
      title: "Current profile graph",
      subtitle: "No structured graphable profile data available yet.",
      nodes: [],
      edges: [],
      notes: [
        "This graph is generated from the structured patient profile only.",
      ],
    };
  }

  const { object } = await generateObject({
    model: getLanguageModel(modelId),
    prompt: currentGraphEdgeGenerationPrompt({ profile, nodes }),
    schema: graphEdgeListSchema,
  });

  return {
    mode: "current",
    title: "Current profile graph",
    subtitle:
      "Direct relationships inferred from the structured patient profile.",
    nodes,
    edges: normalizeModelEdges(nodes, object.edges),
    notes: [
      "This graph is generated from the structured patient profile only.",
      "Edges reflect clinically meaningful direct relationships or interaction risks rather than cosmetic connectivity.",
    ],
  };
}

export async function generateCurrentPatientGraph({
  profile,
  intakeMessages: _intakeMessages,
  consultMessages: _consultMessages,
  modelId = DEFAULT_CHAT_MODEL,
}: {
  profile: PatientProfile;
  intakeMessages?: ChatMessage[];
  consultMessages?: ChatMessage[];
  modelId?: string;
}): Promise<PatientGraph> {
  try {
    return await buildGraphFromProfile(profile, modelId);
  } catch (error) {
    console.error("Failed to generate current patient graph:", error);

    return {
      mode: "current",
      title: "Current profile graph",
      subtitle:
        "Graph generation failed; retry after more patient data is available.",
      nodes: [],
      edges: [],
      notes: [],
    };
  }
}
