import type { GraphEdge, GraphNode, PatientGraph, PatientProfile } from "./types";

type Concept =
  | "magnesium"
  | "calcium"
  | "iron"
  | "thyroid"
  | "sleep"
  | "palpitations"
  | "blood-pressure"
  | "testosterone"
  | "estradiol"
  | "hematocrit"
  | "prolactin"
  | "vitamin-d"
  | "b12"
  | "folate"
  | "lipids"
  | "glucose"
  | "stress"
  | "fatigue"
  | "anxiety"
  | "caffeine"
  | "stimulant"
  | "creatine";

type NodeWithConcepts = GraphNode & {
  concepts: Set<Concept>;
};

const conceptMatchers: Array<{ concept: Concept; pattern: RegExp }> = [
  { concept: "magnesium", pattern: /magnesium|rbc-magnesium|mg\b/i },
  { concept: "calcium", pattern: /calcium/i },
  { concept: "iron", pattern: /\biron\b|ferritin|anemia|haematin|hematinic/i },
  {
    concept: "thyroid",
    pattern:
      /thyroid|\btsh\b|free t3|free t4|\bft3\b|\bft4\b|reverse t3|tpo|tg-ak|levothyrox|liothyronine/i,
  },
  { concept: "sleep", pattern: /sleep|insomnia|waso|melatonin/i },
  { concept: "palpitations", pattern: /palpitations|tachy|heart rate|\brhr\b/i },
  {
    concept: "blood-pressure",
    pattern: /blood pressure|\bbp\b|hypertension|hypotension/i,
  },
  { concept: "testosterone", pattern: /testosterone|\btrt\b/i },
  { concept: "estradiol", pattern: /estradiol|\be2\b/i },
  { concept: "hematocrit", pattern: /hematocrit|hemoglobin|\bhct\b/i },
  { concept: "prolactin", pattern: /prolactin/i },
  { concept: "vitamin-d", pattern: /vitamin d|25-oh/i },
  { concept: "b12", pattern: /vitamin b12|\bb12\b|cobalamin|methylcobalamin/i },
  { concept: "folate", pattern: /folate|methylfolate/i },
  {
    concept: "lipids",
    pattern: /cholesterol|\bldl\b|\bhdl\b|triglyceride|apob|apoa1|lp\(a\)|lipid/i,
  },
  {
    concept: "glucose",
    pattern: /glucose|hba1c|a1c|insulin|homa-ir|metformin/i,
  },
  { concept: "stress", pattern: /stress|cortisol|\bhrv\b|recovery/i },
  { concept: "fatigue", pattern: /fatigue|low energy|energy|brain fog/i },
  { concept: "anxiety", pattern: /anxiety|hyperhidrosis/i },
  { concept: "caffeine", pattern: /caffeine|coffee/i },
  {
    concept: "stimulant",
    pattern: /stimulant|adderall|amphetamine|methylphenidate|modafinil|vyvanse/i,
  },
  { concept: "creatine", pattern: /creatine|creatinine/i },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function extractConcepts(value: string) {
  const concepts = new Set<Concept>();

  for (const matcher of conceptMatchers) {
    if (matcher.pattern.test(value)) {
      concepts.add(matcher.concept);
    }
  }

  return concepts;
}

function makeNode(
  id: string,
  label: string,
  type: GraphNode["type"],
  subtitle?: string
): NodeWithConcepts {
  return {
    id,
    label,
    type,
    ...(subtitle ? { subtitle } : {}),
    concepts: extractConcepts(`${label} ${subtitle ?? ""}`),
  };
}

function dedupeNodes(nodes: NodeWithConcepts[]) {
  const seen = new Set<string>();

  return nodes.filter((node) => {
    const key = `${node.type}:${normalize(node.label)}:${normalize(node.subtitle ?? "")}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function hasConcept(node: NodeWithConcepts, concept: Concept) {
  return node.concepts.has(concept);
}

function isStackNode(node: NodeWithConcepts) {
  return ["medication", "supplement", "recommendation"].includes(node.type);
}

function isSignalNode(node: NodeWithConcepts) {
  return ["condition", "symptom", "lab", "diagnostic", "goal"].includes(
    node.type
  );
}

function sameAxisEdge(a: NodeWithConcepts, b: NodeWithConcepts): Omit<GraphEdge, "id" | "source" | "target"> | null {
  const sharedConcepts = [...a.concepts].filter((concept) => b.concepts.has(concept));

  if (sharedConcepts.length === 0) {
    return null;
  }

  if (!(isStackNode(a) || isStackNode(b))) {
    return null;
  }

  if (!(isSignalNode(a) || isSignalNode(b))) {
    return null;
  }

  const concept = sharedConcepts[0];
  const labels: Record<Concept, string> = {
    magnesium: "Magnesium axis",
    calcium: "Calcium axis",
    iron: "Iron axis",
    thyroid: "Thyroid axis",
    sleep: "Sleep relevance",
    palpitations: "Cardiac symptom relevance",
    "blood-pressure": "Blood pressure relevance",
    testosterone: "Androgen axis",
    estradiol: "Estrogen axis",
    hematocrit: "Hematology relevance",
    prolactin: "Prolactin axis",
    "vitamin-d": "Vitamin D axis",
    b12: "B12 axis",
    folate: "Folate axis",
    lipids: "Lipid axis",
    glucose: "Metabolic axis",
    stress: "Stress / recovery axis",
    fatigue: "Fatigue relevance",
    anxiety: "Anxiety relevance",
    caffeine: "Stimulant relevance",
    stimulant: "Stimulant relevance",
    creatine: "Creatine / creatinine relevance",
  };

  return {
    label: labels[concept],
    explanation:
      "These two nodes belong to the same clinically relevant axis, so reviewing them together makes sense.",
    severity: "info",
  };
}

function ruleEdge(a: NodeWithConcepts, b: NodeWithConcepts): Omit<GraphEdge, "id" | "source" | "target"> | null {
  const pair = [a, b];
  const has = (concept: Concept) => pair.some((node) => hasConcept(node, concept));

  if (has("magnesium") && has("calcium")) {
    return {
      label: "Absorption timing",
      explanation:
        "Calcium and magnesium can compete for gut absorption when taken together, so timing separation may matter.",
      severity: "moderate",
    };
  }

  if (has("magnesium") && has("thyroid")) {
    return {
      label: "Absorption interaction",
      explanation:
        "Magnesium can reduce thyroid hormone absorption if taken too close together, so spacing doses is usually wise.",
      severity: "moderate",
    };
  }

  if (has("calcium") && has("thyroid")) {
    return {
      label: "Absorption interaction",
      explanation:
        "Calcium can impair thyroid hormone absorption, so these usually need dose separation.",
      severity: "high",
    };
  }

  if (has("iron") && has("thyroid")) {
    return {
      label: "Absorption interaction",
      explanation:
        "Iron can reduce thyroid hormone absorption when taken together, so dosing separation is important.",
      severity: "high",
    };
  }

  if (has("testosterone") && has("estradiol")) {
    return {
      label: "Aromatization",
      explanation:
        "Testosterone can increase estradiol via aromatization, so estradiol levels and symptoms often need monitoring.",
      severity: "moderate",
    };
  }

  if (has("testosterone") && has("hematocrit")) {
    return {
      label: "Erythrocytosis risk",
      explanation:
        "Androgen therapy can raise hematocrit and hemoglobin, so CBC monitoring matters.",
      severity: "high",
    };
  }

  if ((has("stimulant") || has("caffeine")) && has("sleep")) {
    return {
      label: "Sleep disruption",
      explanation:
        "Stimulants and caffeine can worsen sleep onset, sleep quality, or insomnia depending on dose and timing.",
      severity: "moderate",
    };
  }

  if ((has("stimulant") || has("caffeine")) && has("palpitations")) {
    return {
      label: "Possible culprit",
      explanation:
        "Stimulants and caffeine can contribute to palpitations, tachycardia, or a sense of cardiac overstimulation.",
      severity: "high",
    };
  }

  if ((has("stimulant") || has("caffeine")) && has("anxiety")) {
    return {
      label: "Symptom amplification",
      explanation:
        "Stimulants and caffeine can aggravate anxiety, jitteriness, or social overactivation in susceptible patients.",
      severity: "moderate",
    };
  }

  if ((has("stimulant") || has("caffeine")) && has("blood-pressure")) {
    return {
      label: "Pressor effect",
      explanation:
        "Stimulants and caffeine can increase blood pressure and adrenergic tone, especially in sensitive patients.",
      severity: "moderate",
    };
  }

  if (has("thyroid") && has("palpitations")) {
    return {
      label: "Thyroid symptom link",
      explanation:
        "Thyroid over-replacement or thyroid dysfunction can contribute to palpitations and adrenergic symptoms.",
      severity: "moderate",
    };
  }

  if (has("thyroid") && has("sleep")) {
    return {
      label: "Thyroid symptom link",
      explanation:
        "Thyroid dysfunction can affect sleep quality and, if excessive, may contribute to insomnia-like symptoms.",
      severity: "moderate",
    };
  }

  if (has("thyroid") && has("fatigue")) {
    return {
      label: "Thyroid symptom link",
      explanation:
        "Thyroid dysfunction is a common contributor to fatigue and low energy, so this axis deserves attention.",
      severity: "moderate",
    };
  }

  if (has("iron") && has("fatigue")) {
    return {
      label: "Iron-related fatigue",
      explanation:
        "Low iron stores or iron deficiency can contribute meaningfully to fatigue, reduced exercise tolerance, and brain fog.",
      severity: "moderate",
    };
  }

  if (has("prolactin") && has("fatigue")) {
    return {
      label: "Possible contributor",
      explanation:
        "Elevated prolactin can be associated with dopaminergic drag, lower drive, and fatigue-type symptoms depending on context.",
      severity: "moderate",
    };
  }

  if (has("stress") && has("sleep")) {
    return {
      label: "Recovery loop",
      explanation:
        "Stress physiology and poor sleep reinforce each other, so they should be interpreted together.",
      severity: "moderate",
    };
  }

  if (has("stress") && has("fatigue")) {
    return {
      label: "Recovery burden",
      explanation:
        "Chronic stress and under-recovery can drive persistent fatigue even when other labs look acceptable.",
      severity: "moderate",
    };
  }

  if (has("glucose") && has("fatigue")) {
    return {
      label: "Metabolic relevance",
      explanation:
        "Glucose dysregulation or insulin resistance can contribute to fatigue, energy variability, and cognitive drag.",
      severity: "info",
    };
  }

  if (
    (hasConcept(a, "creatine") && hasConcept(b, "creatine")) ||
    (hasConcept(a, "creatine") && b.label.toLowerCase().includes("creatinin")) ||
    (hasConcept(b, "creatine") && a.label.toLowerCase().includes("creatinin"))
  ) {
    return {
      label: "Lab interpretation",
      explanation:
        "Creatine supplementation can raise creatinine without representing kidney injury, so interpretation needs context.",
      severity: "info",
    };
  }

  return sameAxisEdge(a, b);
}

function buildEdges(nodes: NodeWithConcepts[]) {
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < nodes.length; index++) {
    for (let candidateIndex = index + 1; candidateIndex < nodes.length; candidateIndex++) {
      const source = nodes[index];
      const target = nodes[candidateIndex];
      const relationship = ruleEdge(source, target);

      if (!relationship) {
        continue;
      }

      const key = [source.id, target.id].sort().join("::");
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      edges.push({
        id: `${source.id}-${target.id}`,
        source: source.id,
        target: target.id,
        ...relationship,
      });
    }
  }

  return edges;
}

export function buildCurrentProfileGraph(profile: PatientProfile): PatientGraph {
  const nodes = dedupeNodes([
    ...profile.diagnoses.map((item, index) =>
      makeNode(`diag-${index}`, item, "condition")
    ),
    ...profile.medicalHistory.map((item, index) =>
      makeNode(`history-${index}`, item, "condition", "History")
    ),
    ...profile.symptoms.map((item, index) =>
      makeNode(`sym-${index}`, item, "symptom")
    ),
    ...profile.medications.map((item, index) =>
      makeNode(
        `med-${index}`,
        item.name,
        "medication",
        [item.dose, item.timing, item.indication].filter(Boolean).join(" • ") || undefined
      )
    ),
    ...profile.supplements.map((item, index) =>
      makeNode(
        `supp-${index}`,
        item.name,
        "supplement",
        [item.dose, item.timing, item.indication].filter(Boolean).join(" • ") || undefined
      )
    ),
    ...profile.hormones.map((item, index) =>
      makeNode(
        `horm-${index}`,
        item.name,
        "medication",
        [item.dose, item.timing, item.indication].filter(Boolean).join(" • ") || undefined
      )
    ),
    ...profile.peptides.map((item, index) =>
      makeNode(
        `pep-${index}`,
        item.name,
        "recommendation",
        [item.dose, item.timing, item.indication].filter(Boolean).join(" • ") || undefined
      )
    ),
    ...profile.labs.map((item, index) =>
      makeNode(`lab-${index}`, item.label, "lab", item.value)
    ),
    ...profile.vitals.map((item, index) =>
      makeNode(`vital-${index}`, item.label, "diagnostic", item.value)
    ),
    ...profile.diagnostics.map((item, index) =>
      makeNode(`dx-test-${index}`, item, "diagnostic")
    ),
    ...profile.goals.map((item, index) =>
      makeNode(`goal-${index}`, item, "goal")
    ),
  ]);

  return {
    mode: "current",
    title: "Current profile graph",
    subtitle:
      "All current nodes are shown. Edges appear only when there is a plausible direct clinical relationship.",
    nodes: nodes.map(({ concepts: _concepts, ...node }) => node),
    edges: buildEdges(nodes),
    notes: [],
  };
}
