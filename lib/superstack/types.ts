import { createInitialIntakeMessages } from "@/lib/superstack/intake";
import type { ChatMessage } from "@/lib/types";

export type StackItem = {
  name: string;
  dose?: string;
  timing?: string;
  indication?: string;
  duration?: string;
  notes?: string;
};

export type KeyValueItem = {
  label: string;
  value: string;
  notes?: string;
};

export type PatientProfile = {
  displayName?: string;
  demographics: {
    age?: string;
    sex?: string;
    height?: string;
    weight?: string;
    bodyComposition?: string;
    occupation?: string;
  };
  diagnoses: string[];
  medicalHistory: string[];
  medications: StackItem[];
  supplements: StackItem[];
  hormones: StackItem[];
  peptides: StackItem[];
  symptoms: string[];
  goals: string[];
  vitals: KeyValueItem[];
  labs: KeyValueItem[];
  diagnostics: string[];
  familyHistory: string[];
  lifestyle: {
    activity?: string;
    sleep?: string;
    diet?: string;
    alcohol?: string;
    nicotine?: string;
    stress?: string;
    notes?: string;
  };
  notes: string[];
  missingInformation: string[];
};

export type PatientRecord = {
  id: string;
  name: string;
  summary: string;
  setupComplete: boolean;
  profile: PatientProfile;
  currentGraph: PatientGraph | null;
  intakeMessages: ChatMessage[];
  consultMessages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export type GraphNode = {
  id: string;
  label: string;
  type:
    | "medication"
    | "supplement"
    | "condition"
    | "lab"
    | "goal"
    | "symptom"
    | "recommendation"
    | "diagnostic";
  subtitle?: string;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  explanation: string;
  severity: "info" | "low" | "moderate" | "high";
};

export type PatientGraph = {
  mode: "current" | "recommendation";
  title: string;
  subtitle?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  notes?: string[];
};

export const emptyPatientProfile = (): PatientProfile => ({
  demographics: {},
  diagnoses: [],
  medicalHistory: [],
  medications: [],
  supplements: [],
  hormones: [],
  peptides: [],
  symptoms: [],
  goals: [],
  vitals: [],
  labs: [],
  diagnostics: [],
  familyHistory: [],
  lifestyle: {},
  notes: [],
  missingInformation: [],
});

export const emptyPatientRecord = (id: string): PatientRecord => ({
  id,
  name: "New Patient 01",
  summary: "",
  setupComplete: false,
  profile: emptyPatientProfile(),
  currentGraph: null,
  intakeMessages: createInitialIntakeMessages(),
  consultMessages: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
