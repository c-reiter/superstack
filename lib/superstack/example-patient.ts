import type { ChatMessage } from "@/lib/types";
import type { PatientGraph, PatientProfile, PatientRecord } from "./types";
import { emptyPatientProfile } from "./types";

export const EXAMPLE_PATIENT_ID = "00000000-0000-4000-8000-000000000001";

const EXAMPLE_CREATED_AT = "2026-03-27T14:00:00.000Z";
const EXAMPLE_UPDATED_AT = "2026-03-28T10:30:00.000Z";

function textMessage(
  id: string,
  role: "user" | "assistant",
  text: string,
  createdAt: string
): ChatMessage {
  return {
    id,
    role,
    metadata: { createdAt },
    parts: [
      {
        type: "text",
        text,
      },
    ],
  };
}

export const examplePatientProfile: PatientProfile = {
  ...emptyPatientProfile(),
  displayName: "John Doe",
  demographics: {
    age: "64",
    sex: "Male",
    height: "178 cm",
    weight: "96 kg",
    bodyComposition: "BMI 30.3 kg/m²; central adiposity",
    occupation: "Semi-retired accountant",
  },
  diagnoses: [
    "Hypertension",
    "Type 2 diabetes mellitus",
    "Paroxysmal atrial fibrillation",
    "Heart failure with preserved ejection fraction / chronic lower-extremity edema history",
    "Chronic kidney disease stage 3a",
    "Benign prostatic hyperplasia",
    "Obstructive sleep apnea with inconsistent CPAP adherence",
    "Hyperlipidemia",
  ],
  medicalHistory: [
    "Former smoker, quit ~15 years ago",
    "Remote hospitalization for AF with rapid ventricular response about 2 years ago",
    "Progressive regimen expansion over several years with no recent formal medication simplification review",
    "Chronic bilateral knee osteoarthritis limiting exercise tolerance",
    "Reports easy bruising since adding fish oil and turmeric on top of apixaban",
  ],
  medications: [
    {
      name: "Apixaban",
      dose: "5 mg",
      timing: "twice daily",
      indication: "Atrial fibrillation stroke prevention",
      duration: "~2 years",
    },
    {
      name: "Metoprolol succinate",
      dose: "100 mg",
      timing: "nightly",
      indication: "Rate control / blood pressure",
      duration: "~2 years",
    },
    {
      name: "Lisinopril",
      dose: "20 mg",
      timing: "every morning",
      indication: "Hypertension / renal protection",
      duration: "several years",
    },
    {
      name: "Amlodipine",
      dose: "10 mg",
      timing: "every morning",
      indication: "Hypertension",
      duration: "~18 months",
    },
    {
      name: "Hydrochlorothiazide",
      dose: "25 mg",
      timing: "every morning",
      indication: "Hypertension / edema",
      duration: "several years",
    },
    {
      name: "Metformin XR",
      dose: "1000 mg",
      timing: "twice daily with meals",
      indication: "Type 2 diabetes",
      duration: "several years",
    },
    {
      name: "Empagliflozin",
      dose: "25 mg",
      timing: "every morning",
      indication: "Type 2 diabetes / cardiorenal benefit",
      duration: "~1 year",
    },
    {
      name: "Atorvastatin",
      dose: "40 mg",
      timing: "nightly",
      indication: "Hyperlipidemia",
      duration: "several years",
    },
    {
      name: "Tamsulosin",
      dose: "0.4 mg",
      timing: "nightly",
      indication: "BPH / nocturia",
      duration: "~1 year",
    },
    {
      name: "Sertraline",
      dose: "50 mg",
      timing: "every morning",
      indication: "Anxiety / low mood",
      duration: "~8 months",
    },
    {
      name: "Trazodone",
      dose: "50 mg",
      timing: "at bedtime as needed",
      indication: "Insomnia",
      duration: "intermittent",
    },
  ],
  supplements: [
    {
      name: "Fish oil",
      dose: "2 g",
      timing: "daily",
      indication: "General cardiovascular health",
    },
    {
      name: "Turmeric / curcumin",
      dose: "1000 mg",
      timing: "daily",
      indication: "Joint pain",
    },
    {
      name: "Magnesium glycinate",
      dose: "300 mg",
      timing: "nightly",
      indication: "Sleep / cramps",
    },
    {
      name: "Vitamin D3",
      dose: "2000 IU",
      timing: "daily",
      indication: "General supplementation",
    },
    {
      name: "CoQ10",
      dose: "200 mg",
      timing: "daily",
      indication: "Started after reading about statins",
    },
  ],
  hormones: [],
  peptides: [],
  symptoms: [
    "Fatigue / low stamina",
    "Lightheadedness when standing",
    "Bilateral ankle edema worse in the evening",
    "Nocturia 3-4 times nightly",
    "Poor sleep quality despite trazodone",
    "Exertional dyspnea climbing stairs",
    "Easy bruising",
    "Mild cognitive fog by late afternoon",
    "Constipation",
  ],
  goals: [
    "Reduce polypharmacy burden where reasonable",
    "Clarify medication contributors to fatigue, edema, and orthostasis",
    "Improve sleep and daytime function",
    "Maintain stroke prevention and cardiometabolic risk reduction",
  ],
  vitals: [
    { label: "Blood pressure", value: "118/68 mmHg seated; sometimes ~102 systolic at home" },
    { label: "Resting heart rate", value: "58-64 bpm" },
    { label: "A1c", value: "7.2%" },
    { label: "eGFR", value: "56 mL/min/1.73m²" },
    { label: "Weight", value: "96 kg" },
  ],
  labs: [
    { label: "Creatinine", value: "1.34 mg/dL" },
    { label: "Urine albumin/creatinine ratio", value: "68 mg/g — elevated" },
    { label: "Potassium", value: "3.5 mmol/L — low-normal" },
    { label: "NT-proBNP", value: "412 pg/mL — mildly elevated" },
    { label: "LDL-C", value: "78 mg/dL" },
    { label: "Triglycerides", value: "210 mg/dL — elevated" },
    { label: "Hemoglobin", value: "13.1 g/dL" },
    { label: "B12", value: "298 pg/mL — borderline" },
  ],
  diagnostics: [
    "Echocardiogram last year: preserved EF with mild left atrial enlargement",
    "Sleep study 3 years ago confirming OSA",
    "Medication reconciliation with home bottles still pending",
    "Orthostatic vitals not yet formally documented",
  ],
  familyHistory: [
    "Father had MI in his late 60s",
    "Mother had type 2 diabetes and CKD",
  ],
  lifestyle: {
    activity: "Sedentary baseline; short walks limited by knee pain and fatigue",
    sleep: "Fragmented sleep with nocturia and inconsistent CPAP use",
    diet: "High sodium convenience foods several times per week; moderate carb load",
    alcohol: "1-2 drinks on weekends",
    nicotine: "None currently",
    stress: "Moderate caregiver and financial stress",
    notes: "Usually takes all morning pills together and often adds supplements without checking interactions.",
  },
  notes: [
    "Medication burden is likely contributing to symptom overlap; antihypertensives, diuretic effect, sedative use, OSA, and HFpEF can all confound the fatigue picture.",
    "Bleeding/bruising risk may be amplified by concurrent apixaban, fish oil, and turmeric.",
  ],
  missingInformation: [
    "Recent orthostatic vitals",
    "Actual CPAP adherence data",
    "Frequency of breakthrough atrial fibrillation episodes",
    "Whether trazodone is taken nightly or intermittently",
    "Exact OTC NSAID use for knee pain",
  ],
};

export const exampleIntakeMessages: ChatMessage[] = [
  textMessage(
    "00000000-0000-4000-8000-000000000101",
    "assistant",
    "Hi — let's build John Doe's chart. What are the main diagnoses, current medications or supplements, and the symptoms that are driving this consult?",
    "2026-03-27T14:00:00.000Z"
  ),
  textMessage(
    "00000000-0000-4000-8000-000000000102",
    "user",
    "John Doe is a 64-year-old man. Main issues are hypertension, type 2 diabetes, paroxysmal AF, CKD stage 3a, BPH, OSA, hyperlipidemia and chronic edema. Symptoms right now are fatigue, ankle swelling, lightheadedness on standing, nocturia, poor sleep and some brain fog. Meds: apixaban 5 mg BID, metoprolol succinate 100 mg nightly, lisinopril 20 mg qAM, amlodipine 10 mg qAM, hydrochlorothiazide 25 mg qAM, metformin XR 1000 mg BID, empagliflozin 25 mg daily, atorvastatin 40 mg nightly, tamsulosin 0.4 mg nightly, sertraline 50 mg daily, trazodone 50 mg PRN bedtime. Supplements are fish oil 2 g, turmeric 1000 mg, magnesium glycinate 300 mg, vitamin D3 2000 IU and CoQ10 200 mg.",
    "2026-03-27T14:01:10.000Z"
  ),
  textMessage(
    "00000000-0000-4000-8000-000000000103",
    "assistant",
    "Good start. I want the data that matters for polypharmacy review: recent BP/HR, renal function, A1c, any bleeding or bruising, sleep/CPAP adherence, edema timing, and whether the lightheadedness is positional or random.",
    "2026-03-27T14:01:45.000Z"
  ),
  textMessage(
    "00000000-0000-4000-8000-000000000104",
    "user",
    "BP in clinic was 118/68, sometimes around 102 systolic at home, pulse usually 58-64. eGFR 56, creatinine 1.34, UACR 68 mg/g, potassium 3.5, A1c 7.2, NT-proBNP 412, LDL 78, triglycerides 210, hemoglobin 13.1, B12 borderline around 298. He bruises easily. Edema is worse by evening. Lightheadedness is mostly when standing up. Sleep is fragmented; he has known OSA but CPAP use is inconsistent. Nocturia is 3-4 times a night.",
    "2026-03-27T14:03:02.000Z"
  ),
  textMessage(
    "00000000-0000-4000-8000-000000000105",
    "assistant",
    "Any other clinically useful context: exercise tolerance, weight/body habitus, diet/sodium, alcohol, smoking, AF history, and anything else he self-started such as OTC pain meds or supplements?",
    "2026-03-27T14:03:40.000Z"
  ),
  textMessage(
    "00000000-0000-4000-8000-000000000106",
    "user",
    "He is 178 cm and 96 kg, fairly sedentary because of knee OA, gets short of breath on stairs, and eats more convenience food than he should so sodium is probably high. Former smoker, quit 15 years ago, drinks 1-2 drinks on weekends. He usually takes all morning pills together. AF with RVR put him in the hospital about 2 years ago, otherwise no recent admissions. He also says constipation and late-day cognitive fog are bothering him. No hormone or peptide use.",
    "2026-03-27T14:04:51.000Z"
  ),
  textMessage(
    "00000000-0000-4000-8000-000000000107",
    "assistant",
    "Understood. At this point the chart is coherent enough for consult mode. Biggest likely review domains are antihypertensive burden / orthostasis, edema contributors such as amlodipine and HFpEF physiology, sleep fragmentation with poor CPAP adherence, and additive bleeding risk from apixaban plus fish oil and turmeric.",
    "2026-03-27T14:05:32.000Z"
  ),
];

export const exampleConsultMessages: ChatMessage[] = [
  textMessage(
    "00000000-0000-4000-8000-000000000201",
    "user",
    "Which parts of John Doe's current stack are most likely contributing to fatigue, orthostatic symptoms, edema, and bruising?",
    "2026-03-28T09:10:00.000Z"
  ),
  textMessage(
    "00000000-0000-4000-8000-000000000202",
    "assistant",
    "Top contributors are cumulative blood-pressure lowering and volume effects (metoprolol + lisinopril + amlodipine + hydrochlorothiazide + tamsulosin + empagliflozin) layered onto borderline low home pressures, plus trazodone/OSA for fatigue and cognitive drag. For edema, amlodipine is a leading medication culprit, though HFpEF physiology and sodium intake still matter. For bruising, apixaban is primary, but fish oil and turmeric are plausible amplifiers. I'd formally document orthostatic vitals, reconcile exact OTC use, and review whether trazodone and the supplements are providing enough benefit to justify the downside.",
    "2026-03-28T09:11:10.000Z"
  ),
  textMessage(
    "00000000-0000-4000-8000-000000000203",
    "user",
    "What should we review first if the goal is to simplify polypharmacy without compromising stroke prevention or diabetes control?",
    "2026-03-28T09:12:05.000Z"
  ),
  textMessage(
    "00000000-0000-4000-8000-000000000204",
    "assistant",
    "First-pass simplification review: 1) confirm the necessity and timing of trazodone, turmeric, fish oil, and CoQ10; 2) assess whether amlodipine dose is worsening edema enough to justify de-intensification or substitution; 3) check whether low BP / orthostasis argues for antihypertensive simplification before adding more symptom-directed drugs; 4) keep apixaban and core diabetes/cardiorenal therapy protected unless new contraindications emerge. The next high-yield step is a structured med reconciliation with orthostatics, edema review, CPAP adherence, and an explicit risk-benefit conversation for each nonessential adjunct.",
    "2026-03-28T09:13:00.000Z"
  ),
];

export const examplePatientSummary =
  "64M with HTN, T2DM, AF, CKD3a, OSA, BPH, edema, fatigue, orthostasis, nocturia, and substantial polypharmacy including anticoagulation plus supplements.";

export const examplePatientCurrentGraph: PatientGraph = {
  mode: "current",
  title: "Current profile graph",
  subtitle: "Direct relationships inferred from the structured patient profile.",
  nodes: [
    {
      id: "condition-af",
      label: "Atrial fibrillation",
      type: "condition",
      subtitle: "Paroxysmal; prior RVR hospitalization",
    },
    {
      id: "condition-ckd3a",
      label: "CKD stage 3a",
      type: "condition",
      subtitle: "eGFR 56 mL/min/1.73m² • UACR elevated",
    },
    {
      id: "condition-osa",
      label: "Obstructive sleep apnea",
      type: "condition",
      subtitle: "Known diagnosis • inconsistent CPAP use",
    },
    {
      id: "condition-hfpef",
      label: "HFpEF / edema history",
      type: "condition",
      subtitle: "Preserved EF • chronic lower-extremity edema",
    },
    {
      id: "lab-b12",
      label: "Borderline B12",
      type: "lab",
      subtitle: "298 pg/mL",
    },
    {
      id: "symptom-fatigue",
      label: "Fatigue",
      type: "symptom",
    },
    {
      id: "symptom-orthostasis",
      label: "Orthostatic lightheadedness",
      type: "symptom",
    },
    {
      id: "symptom-edema",
      label: "Ankle edema",
      type: "symptom",
    },
    {
      id: "symptom-nocturia",
      label: "Nocturia",
      type: "symptom",
    },
    {
      id: "goal-simplify",
      label: "Reduce polypharmacy burden",
      type: "goal",
    },
    {
      id: "diagnostic-orthostatics",
      label: "Orthostatic vitals",
      type: "diagnostic",
      subtitle: "Not yet formally documented",
    },
    {
      id: "diagnostic-cpap",
      label: "CPAP adherence review",
      type: "diagnostic",
      subtitle: "Download / nightly use assessment",
    },
    {
      id: "med-apixaban",
      label: "Apixaban",
      type: "medication",
      subtitle: "5 mg BID",
    },
    {
      id: "med-metoprolol",
      label: "Metoprolol succinate",
      type: "medication",
      subtitle: "100 mg nightly",
    },
    {
      id: "med-lisinopril",
      label: "Lisinopril",
      type: "medication",
      subtitle: "20 mg qAM",
    },
    {
      id: "med-amlodipine",
      label: "Amlodipine",
      type: "medication",
      subtitle: "10 mg qAM",
    },
    {
      id: "med-hctz",
      label: "Hydrochlorothiazide",
      type: "medication",
      subtitle: "25 mg qAM",
    },
    {
      id: "med-empagliflozin",
      label: "Empagliflozin",
      type: "medication",
      subtitle: "25 mg daily",
    },
    {
      id: "med-metformin",
      label: "Metformin XR",
      type: "medication",
      subtitle: "1000 mg BID",
    },
    {
      id: "med-tamsulosin",
      label: "Tamsulosin",
      type: "medication",
      subtitle: "0.4 mg nightly",
    },
    {
      id: "med-trazodone",
      label: "Trazodone",
      type: "medication",
      subtitle: "50 mg PRN bedtime",
    },
    {
      id: "supp-fishoil",
      label: "Fish oil",
      type: "supplement",
      subtitle: "2 g daily",
    },
    {
      id: "supp-turmeric",
      label: "Turmeric / curcumin",
      type: "supplement",
      subtitle: "1000 mg daily",
    },
  ],
  edges: [
    {
      id: "edge-apixaban-af",
      source: "med-apixaban",
      target: "condition-af",
      label: "stroke prevention",
      explanation:
        "Apixaban is a core protective therapy here because the atrial fibrillation itself carries embolic stroke risk. This is one of the agents that should generally be protected during simplification unless bleeding risk, procedures, or a change in AF strategy clearly alter the balance.",
      severity: "info",
    },
    {
      id: "edge-apixaban-fishoil",
      source: "med-apixaban",
      target: "supp-fishoil",
      label: "additive bleeding risk",
      explanation:
        "Fish oil is not a formal anticoagulant, but in a patient already on apixaban it can still add to the overall bruising and bleeding picture. The point is less a dramatic interaction and more a cumulative polypharmacy effect: if bruising is clinically relevant, lower-value adjuncts like this deserve a direct risk-benefit review.",
      severity: "moderate",
    },
    {
      id: "edge-apixaban-turmeric",
      source: "med-apixaban",
      target: "supp-turmeric",
      label: "bleeding amplifier",
      explanation:
        "Turmeric or curcumin can plausibly amplify bruising and minor bleeding in a patient already anticoagulated with apixaban. In polypharmacy review this matters because the supplement may feel benign, but it can still increase the clinical nuisance and uncertainty around bleeding tolerance without providing a clearly essential benefit.",
      severity: "moderate",
    },
    {
      id: "edge-metoprolol-fatigue",
      source: "med-metoprolol",
      target: "symptom-fatigue",
      label: "may contribute",
      explanation:
        "Metoprolol can be an important contributor to fatigue, lower exercise tolerance, and late-day sluggishness, particularly when resting heart rate is already in the high-50s to low-60s. It may still be appropriate for AF rate control, but it sits high on the list of medications that can make the overall regimen feel heavier than any single drug would suggest.",
      severity: "moderate",
    },
    {
      id: "edge-amlodipine-edema",
      source: "med-amlodipine",
      target: "symptom-edema",
      label: "common culprit",
      explanation:
        "Amlodipine is a leading medication cause of peripheral edema and is especially relevant because the swelling worsens later in the day. In this case the edema may be multifactorial, but amlodipine deserves explicit scrutiny before reflexively layering on additional edema treatments.",
      severity: "high",
    },
    {
      id: "edge-hfpef-edema",
      source: "condition-hfpef",
      target: "symptom-edema",
      label: "also contributes",
      explanation:
        "The edema is not necessarily medication-only. HFpEF physiology and volume handling can still be part of the baseline problem, which is why the graph keeps both the disease process and the drug effect visible rather than forcing a single explanation.",
      severity: "moderate",
    },
    {
      id: "edge-hctz-orthostasis",
      source: "med-hctz",
      target: "symptom-orthostasis",
      label: "volume-related",
      explanation:
        "Hydrochlorothiazide can contribute to orthostatic symptoms through volume contraction and electrolyte effects, especially when the patient already runs low-normal pressures at home. In polypharmacy terms it may be reasonable alone, but it becomes more consequential when combined with several other BP-lowering or diuretic-like agents.",
      severity: "moderate",
    },
    {
      id: "edge-empagliflozin-orthostasis",
      source: "med-empagliflozin",
      target: "symptom-orthostasis",
      label: "volume effect",
      explanation:
        "Empagliflozin has real cardiorenal value, but it can still nudge patients toward volume depletion, urinary frequency, and lightheadedness when layered onto diuretics and multiple antihypertensives. This is exactly the sort of beneficial drug whose downsides only become obvious once the rest of the regimen is considered around it.",
      severity: "moderate",
    },
    {
      id: "edge-tamsulosin-orthostasis",
      source: "med-tamsulosin",
      target: "symptom-orthostasis",
      label: "positional hypotension",
      explanation:
        "Tamsulosin can materially worsen postural dizziness, particularly in older adults already taking several blood-pressure-lowering medications. It is often tolerated in isolation, but here it likely participates in a cumulative orthostatic burden rather than acting as a single dramatic cause.",
      severity: "moderate",
    },
    {
      id: "edge-hctz-empagliflozin",
      source: "med-hctz",
      target: "med-empagliflozin",
      label: "cumulative volume loss",
      explanation:
        "Hydrochlorothiazide and empagliflozin can work in the same direction with respect to volume depletion, nocturia, and orthostatic symptoms. The issue is not that the combination is forbidden, but that in a symptomatic patient the total physiologic load from both agents may exceed the apparent burden of either one alone.",
      severity: "high",
    },
    {
      id: "edge-metoprolol-tamsulosin",
      source: "med-metoprolol",
      target: "med-tamsulosin",
      label: "orthostasis stack-up",
      explanation:
        "Metoprolol and tamsulosin can stack in a clinically meaningful way when the patient already reports low systolic readings and postural lightheadedness. This kind of interaction is best understood as cumulative hemodynamic drag from the whole regimen rather than a classic binary drug-drug contraindication.",
      severity: "moderate",
    },
    {
      id: "edge-lisinopril-ckd",
      source: "med-lisinopril",
      target: "condition-ckd3a",
      label: "renoprotective but monitor",
      explanation:
        "Lisinopril is directionally helpful for CKD with albuminuria, so it should not be framed as simple excess. The practical point is that renal function, potassium, and blood pressure need to be interpreted in the context of the rest of the regimen before reducing or escalating anything.",
      severity: "info",
    },
    {
      id: "edge-metformin-b12",
      source: "med-metformin",
      target: "lab-b12",
      label: "can lower B12",
      explanation:
        "Long-term metformin use can contribute to borderline or frank B12 deficiency, which becomes relevant when fatigue or cognitive fog are part of the presentation. This is an example of a highly useful foundational drug that still creates downstream monitoring obligations in an older patient with a crowded medication list.",
      severity: "low",
    },
    {
      id: "edge-b12-fatigue",
      source: "lab-b12",
      target: "symptom-fatigue",
      label: "possible contributor",
      explanation:
        "Borderline B12 is unlikely to explain the full symptom burden on its own, but it is plausible background noise in the fatigue and cognitive-fog story. In a polypharmacy case, modest abnormalities like this matter because they can be masked by attributing everything to medications alone.",
      severity: "low",
    },
    {
      id: "edge-osa-fatigue",
      source: "condition-osa",
      target: "symptom-fatigue",
      label: "major non-drug driver",
      explanation:
        "Inconsistent CPAP use means OSA remains a strong non-pharmacologic explanation for fatigue, poor sleep, and cognitive drag. This matters because it prevents over-assigning the entire symptom burden to medications and keeps the review balanced between regimen simplification and untreated physiology.",
      severity: "high",
    },
    {
      id: "edge-osa-nocturia",
      source: "condition-osa",
      target: "symptom-nocturia",
      label: "sleep fragmentation loop",
      explanation:
        "OSA can worsen nocturia and sleep fragmentation through repeated arousal, sympathetic activation, and hormonal signaling changes overnight. If CPAP adherence is poor, adding more sedative or urinary medications without addressing the sleep driver risks increasing treatment burden without solving the root problem.",
      severity: "moderate",
    },
    {
      id: "edge-trazodone-fatigue",
      source: "med-trazodone",
      target: "symptom-fatigue",
      label: "next-day sedation",
      explanation:
        "Trazodone may help sleep onset, but in an older patient with OSA, polypharmacy, and morning lightheadedness it can also add next-day sedation and cognitive slowing. That makes it a classic medication to revisit early during deprescribing discussions, especially if the underlying sleep disorder remains undertreated.",
      severity: "moderate",
    },
    {
      id: "edge-diagnostic-orthostatics",
      source: "diagnostic-orthostatics",
      target: "symptom-orthostasis",
      label: "high-yield check",
      explanation:
        "Formal orthostatic vitals are a high-yield next step because they can quickly distinguish vague fatigue from a reproducible hemodynamic problem. In this patient they would help decide whether the first move should be regimen simplification rather than adding still more symptom-directed treatment.",
      severity: "info",
    },
    {
      id: "edge-diagnostic-cpap",
      source: "diagnostic-cpap",
      target: "condition-osa",
      label: "clarifies driver",
      explanation:
        "A CPAP adherence review is disproportionately useful because it helps separate medication toxicity from undertreated sleep apnea. Without that information, the clinician risks compensating for an untreated physiologic driver by progressively complicating the regimen.",
      severity: "info",
    },
    {
      id: "edge-goal-simplify",
      source: "goal-simplify",
      target: "med-amlodipine",
      label: "candidate review target",
      explanation:
        "Because amlodipine may be worsening edema while overall blood pressure is already fairly soft, it is one of the more logical candidates for structured simplification review. It is not automatically wrong therapy, but it has a symptom profile that may be misread as new disease and thereby trigger prescribing cascades.",
      severity: "info",
    },
  ],
  notes: [
    "This example graph is precomputed for the shared John Doe demonstration patient.",
    "It emphasizes polypharmacy, cumulative hemodynamic effects, bleeding amplification from supplements, and non-drug contributors such as untreated OSA.",
  ],
};

export function buildExamplePatientRecord(): PatientRecord {
  return {
    id: EXAMPLE_PATIENT_ID,
    name: "John Doe",
    summary: examplePatientSummary,
    setupComplete: true,
    profile: examplePatientProfile,
    currentGraph: examplePatientCurrentGraph,
    intakeMessages: exampleIntakeMessages,
    consultMessages: exampleConsultMessages,
    createdAt: EXAMPLE_CREATED_AT,
    updatedAt: EXAMPLE_UPDATED_AT,
  };
}

export function isExamplePatientId(id: string) {
  return id === EXAMPLE_PATIENT_ID;
}
