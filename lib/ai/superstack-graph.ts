import { z } from "zod";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
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

function findNodesByType(nodes: GraphNode[], type: GraphNodeType) {
  return nodes.filter((node) => node.type === type);
}

function nodeMatches(node: GraphNode, pattern: RegExp) {
  return pattern.test(
    normalizeForMatch(
      [node.label, node.subtitle ?? undefined].filter(Boolean).join(" ")
    )
  );
}

function findNodes(
  nodes: GraphNode[],
  types: GraphNodeType | GraphNodeType[],
  pattern: RegExp
) {
  const allowedTypes = new Set(Array.isArray(types) ? types : [types]);
  return nodes.filter(
    (node) => allowedTypes.has(node.type) && nodeMatches(node, pattern)
  );
}

function findFirstNode(
  nodes: GraphNode[],
  type: GraphNodeType,
  pattern: RegExp
) {
  return nodes.find((node) => node.type === type && nodeMatches(node, pattern));
}

function connectIndicationDrivenEdges(
  profile: PatientProfile,
  nodes: GraphNode[],
  edges: GraphEdge[]
) {
  const symptomNodes = findNodesByType(nodes, "symptom");
  const goalNodes = findNodesByType(nodes, "goal");
  const conditionNodes = findNodesByType(nodes, "condition");

  for (const item of [...profile.medications, ...profile.supplements]) {
    const source = nodes.find(
      (node) =>
        normalizeForMatch(node.label) === normalizeForMatch(item.name) &&
        (node.type === "medication" || node.type === "supplement")
    );

    if (!source) {
      continue;
    }

    const indication = normalizeForMatch(item.indication);
    if (!indication) {
      continue;
    }

    for (const target of [...symptomNodes, ...goalNodes, ...conditionNodes]) {
      if (
        indication.includes(normalizeForMatch(target.label)) ||
        normalizeForMatch(target.label).includes(indication)
      ) {
        addEdge(
          edges,
          source,
          target,
          "used for",
          `${source.label} is being used in relation to ${target.label}.`,
          "info"
        );
      }
    }
  }
}

function connectMedicationInteractionEdges(
  nodes: GraphNode[],
  edges: GraphEdge[]
) {
  const stimulantNodes = findNodes(
    nodes,
    ["medication", "supplement"],
    /(ritalin|methylphenidate|concerta|focalin|dexmethylphenidate|adderall|amphetamine|dextroamphetamine|dexamphetamine|vyvanse|lisdexamfetamine|modafinil|armodafinil)/
  );
  const yohimbineNodes = findNodes(
    nodes,
    ["medication", "supplement"],
    /yohimbine/
  );
  const maobNodes = findNodes(
    nodes,
    ["medication", "supplement"],
    /(mao-b|maob|selegiline|rasagiline|safinamide|azilect|eldepryl|zelapar|emsam|xadago)/
  );

  for (const stimulant of stimulantNodes) {
    for (const yohimbine of yohimbineNodes) {
      addEdge(
        edges,
        stimulant,
        yohimbine,
        "interaction risk",
        "This combination can amplify sympathetic tone and may increase heart rate, blood pressure, anxiety, tremor, and insomnia more than either agent alone.",
        "high"
      );
    }

    for (const maob of maobNodes) {
      addEdge(
        edges,
        stimulant,
        maob,
        "interaction risk",
        "A stimulant layered with MAO-B inhibition can increase catecholamine signaling and may raise blood pressure, heart rate, agitation, and insomnia; risk increases if MAO-B selectivity is reduced or exposure is higher.",
        "high"
      );
    }
  }

  for (const yohimbine of yohimbineNodes) {
    for (const maob of maobNodes) {
      addEdge(
        edges,
        yohimbine,
        maob,
        "interaction risk",
        "Yohimbine is sympathomimetic, so combining it with MAO-B inhibition can further amplify adrenergic effects and hypertension risk.",
        "high"
      );
    }
  }
}

function connectKnownClinicalEdges(nodes: GraphNode[], edges: GraphEdge[]) {
  const hairLoss = findFirstNode(nodes, "symptom", /hair loss/);
  const fatigue = findFirstNode(nodes, "symptom", /(fatigue|low energy)/);
  const cognition = findFirstNode(nodes, "symptom", /(cognitive|brain fog)/);
  const sleepGoal = findFirstNode(nodes, "goal", /(sleep|recovery)/);
  const cardioGoal = findFirstNode(nodes, "goal", /(cardiovascular|cardio)/);
  const hairGoal = findFirstNode(nodes, "goal", /hair loss|address hair loss/);

  const minoxidil = findFirstNode(nodes, "medication", /minoxidil/);
  const magnesium = findFirstNode(nodes, "supplement", /magnesium/);
  const apigenin = findFirstNode(nodes, "supplement", /apigenin/);
  const vitaminD = findFirstNode(nodes, "supplement", /vitamin d/);

  const ferritin = findFirstNode(nodes, "lab", /ferritin/);
  const prolactin = findFirstNode(nodes, "lab", /prolactin/);
  const estradiol = findFirstNode(nodes, "lab", /estradiol/);
  const vitaminDLab = findFirstNode(
    nodes,
    "lab",
    /(25-oh vitamin d|vitamin d)/
  );
  const lpa = findFirstNode(nodes, "lab", /(lipoprotein\(a\)|lp\(a\))/);

  if (minoxidil && hairLoss) {
    addEdge(
      edges,
      minoxidil,
      hairLoss,
      "targets",
      "Topical minoxidil is being used to address hair loss.",
      "info"
    );
  }

  if (minoxidil && hairGoal) {
    addEdge(
      edges,
      minoxidil,
      hairGoal,
      "supports goal",
      "Minoxidil directly relates to the goal of improving hair loss.",
      "info"
    );
  }

  if (magnesium && sleepGoal) {
    addEdge(
      edges,
      magnesium,
      sleepGoal,
      "may support",
      "Magnesium is commonly used in support of sleep quality and recovery.",
      "low"
    );
  }

  if (apigenin && sleepGoal) {
    addEdge(
      edges,
      apigenin,
      sleepGoal,
      "may support",
      "Apigenin is often used as a sleep-support supplement.",
      "low"
    );
  }

  if (vitaminD && vitaminDLab) {
    addEdge(
      edges,
      vitaminD,
      vitaminDLab,
      "addresses",
      "Vitamin D supplementation directly relates to the measured vitamin D level.",
      "info"
    );
  }

  if (ferritin && fatigue) {
    addEdge(
      edges,
      ferritin,
      fatigue,
      "may contribute",
      "Low or functionally low ferritin can contribute to fatigue and low energy.",
      "moderate"
    );
  }

  if (ferritin && hairLoss) {
    addEdge(
      edges,
      ferritin,
      hairLoss,
      "may contribute",
      "Lower iron stores can be relevant to ongoing hair shedding or poor hair recovery.",
      "moderate"
    );
  }

  if (prolactin && fatigue) {
    addEdge(
      edges,
      prolactin,
      fatigue,
      "may contribute",
      "Elevated prolactin can be relevant when fatigue and low drive are present.",
      "moderate"
    );
  }

  if (prolactin && cognition) {
    addEdge(
      edges,
      prolactin,
      cognition,
      "may contribute",
      "Prolactin elevation can be part of the hormonal context behind reduced motivation or cognitive underperformance.",
      "low"
    );
  }

  if (estradiol && hairLoss) {
    addEdge(
      edges,
      estradiol,
      hairLoss,
      "hormonal context",
      "Estradiol is part of the endocrine context worth reviewing when hair loss and other hormone-linked symptoms are present.",
      "low"
    );
  }

  if (vitaminDLab && fatigue) {
    addEdge(
      edges,
      vitaminDLab,
      fatigue,
      "may contribute",
      "Suboptimal vitamin D status can be relevant to low energy and recovery complaints.",
      "low"
    );
  }

  if (lpa && cardioGoal) {
    addEdge(
      edges,
      lpa,
      cardioGoal,
      "risk marker",
      "Elevated lipoprotein(a) is relevant to long-term cardiovascular risk reduction goals.",
      "moderate"
    );
  }
}

function buildGraphFromProfile(profile: PatientProfile): PatientGraph {
  const { nodes } = buildNodes(profile);
  const edges: GraphEdge[] = [];

  connectIndicationDrivenEdges(profile, nodes, edges);
  connectMedicationInteractionEdges(nodes, edges);
  connectKnownClinicalEdges(nodes, edges);

  return {
    mode: "current",
    title: "Current profile graph",
    subtitle:
      "Direct relationships derived from the structured patient profile.",
    nodes,
    edges,
    notes: [
      "This graph is generated from the structured patient profile only.",
      "Only direct or clearly relevant clinical relationships are connected; isolated nodes are expected.",
    ],
  };
}

export function generateCurrentPatientGraph({
  profile,
  intakeMessages: _intakeMessages,
  consultMessages: _consultMessages,
  modelId: _modelId = DEFAULT_CHAT_MODEL,
}: {
  profile: PatientProfile;
  intakeMessages?: ChatMessage[];
  consultMessages?: ChatMessage[];
  modelId?: string;
}): Promise<PatientGraph> {
  try {
    return Promise.resolve(buildGraphFromProfile(profile));
  } catch (error) {
    console.error("Failed to generate current patient graph:", error);

    return Promise.resolve({
      mode: "current",
      title: "Current profile graph",
      subtitle:
        "Graph generation failed; retry after more patient data is available.",
      nodes: [],
      edges: [],
      notes: [],
    });
  }
}
