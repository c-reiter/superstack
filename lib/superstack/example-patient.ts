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
  "mode": "current",
  "title": "Current profile graph",
  "subtitle": "Direct relationships inferred from the structured patient profile.",
  "nodes": [
    {
      "id": "condition-hypertension",
      "label": "Hypertension",
      "type": "condition"
    },
    {
      "id": "condition-type-2-diabetes-mellitus",
      "label": "Type 2 diabetes mellitus",
      "type": "condition"
    },
    {
      "id": "condition-paroxysmal-atrial-fibrillation",
      "label": "Paroxysmal atrial fibrillation",
      "type": "condition"
    },
    {
      "id": "condition-heart-failure-with-preserved-ejection-fraction-chronic-lower-extremity-edema-history",
      "label": "Heart failure with preserved ejection fraction",
      "type": "condition",
      "subtitle": "Heart failure with preserved ejection fraction / chronic lower-extremity edema history"
    },
    {
      "id": "condition-chronic-kidney-disease-stage-3a",
      "label": "Chronic kidney disease stage 3a",
      "type": "condition"
    },
    {
      "id": "condition-benign-prostatic-hyperplasia",
      "label": "Benign prostatic hyperplasia",
      "type": "condition"
    },
    {
      "id": "medication-apixaban-5-mg-twice-daily",
      "label": "Apixaban",
      "type": "medication",
      "subtitle": "5 mg • twice daily"
    },
    {
      "id": "medication-metoprolol-succinate-100-mg-nightly",
      "label": "Metoprolol succinate",
      "type": "medication",
      "subtitle": "100 mg • nightly"
    },
    {
      "id": "medication-lisinopril-20-mg-every-morning",
      "label": "Lisinopril",
      "type": "medication",
      "subtitle": "20 mg • every morning"
    },
    {
      "id": "medication-amlodipine-10-mg-every-morning",
      "label": "Amlodipine",
      "type": "medication",
      "subtitle": "10 mg • every morning"
    },
    {
      "id": "medication-hydrochlorothiazide-25-mg-every-morning",
      "label": "Hydrochlorothiazide",
      "type": "medication",
      "subtitle": "25 mg • every morning"
    },
    {
      "id": "medication-metformin-xr-1000-mg-twice-daily-with-meals",
      "label": "Metformin XR",
      "type": "medication",
      "subtitle": "1000 mg • twice daily with meals"
    },
    {
      "id": "medication-empagliflozin-25-mg-every-morning",
      "label": "Empagliflozin",
      "type": "medication",
      "subtitle": "25 mg • every morning"
    },
    {
      "id": "medication-atorvastatin-40-mg-nightly",
      "label": "Atorvastatin",
      "type": "medication",
      "subtitle": "40 mg • nightly"
    },
    {
      "id": "supplement-fish-oil-2-g-daily",
      "label": "Fish oil",
      "type": "supplement",
      "subtitle": "2 g • daily"
    },
    {
      "id": "supplement-turmeric-curcumin-1000-mg-daily",
      "label": "Turmeric",
      "type": "supplement",
      "subtitle": "Turmeric / curcumin • 1000 mg • daily"
    },
    {
      "id": "supplement-magnesium-glycinate-300-mg-nightly",
      "label": "Magnesium glycinate",
      "type": "supplement",
      "subtitle": "300 mg • nightly"
    },
    {
      "id": "supplement-vitamin-d3-2000-iu-daily",
      "label": "Vitamin D3",
      "type": "supplement",
      "subtitle": "2000 IU • daily"
    },
    {
      "id": "supplement-coq10-200-mg-daily",
      "label": "CoQ10",
      "type": "supplement",
      "subtitle": "200 mg • daily"
    },
    {
      "id": "symptom-fatigue-low-stamina",
      "label": "Fatigue",
      "type": "symptom",
      "subtitle": "Fatigue / low stamina"
    },
    {
      "id": "symptom-lightheadedness-when-standing",
      "label": "Lightheadedness when standing",
      "type": "symptom"
    },
    {
      "id": "symptom-bilateral-ankle-edema-worse-in-the-evening",
      "label": "Bilateral ankle edema worse evening",
      "type": "symptom",
      "subtitle": "Bilateral ankle edema worse in the evening"
    },
    {
      "id": "symptom-nocturia-3-4-times-nightly",
      "label": "Nocturia 3-4 times nightly",
      "type": "symptom"
    },
    {
      "id": "symptom-poor-sleep-quality-despite-trazodone",
      "label": "Poor sleep quality despite trazodone",
      "type": "symptom"
    },
    {
      "id": "symptom-exertional-dyspnea-climbing-stairs",
      "label": "Exertional dyspnea climbing stairs",
      "type": "symptom"
    },
    {
      "id": "symptom-easy-bruising",
      "label": "Easy bruising",
      "type": "symptom"
    },
    {
      "id": "symptom-mild-cognitive-fog-by-late-afternoon",
      "label": "Mild cognitive fog by late afternoon",
      "type": "symptom"
    },
    {
      "id": "symptom-constipation",
      "label": "Constipation",
      "type": "symptom"
    },
    {
      "id": "goal-reduce-polypharmacy-burden-where-reasonable",
      "label": "Reduce polypharmacy burden where reasonable",
      "type": "goal"
    },
    {
      "id": "goal-clarify-medication-contributors-to-fatigue-edema-and-orthostasis",
      "label": "Clarify medication contributors to fatigue",
      "type": "goal",
      "subtitle": "Clarify medication contributors to fatigue, edema, and orthostasis"
    },
    {
      "id": "goal-improve-sleep-and-daytime-function",
      "label": "Improve sleep and daytime function",
      "type": "goal"
    },
    {
      "id": "goal-maintain-stroke-prevention-and-cardiometabolic-risk-reduction",
      "label": "Maintain stroke prevention cardiometabolic risk reduction",
      "type": "goal",
      "subtitle": "Maintain stroke prevention and cardiometabolic risk reduction"
    },
    {
      "id": "lab-b12-298-pg-ml-borderline",
      "label": "B12",
      "type": "lab",
      "subtitle": "298 pg/mL — borderline"
    },
    {
      "id": "lab-triglycerides-210-mg-dl-elevated",
      "label": "Triglycerides",
      "type": "lab",
      "subtitle": "210 mg/dL — elevated"
    },
    {
      "id": "lab-nt-probnp-412-pg-ml-mildly-elevated",
      "label": "NT-proBNP",
      "type": "lab",
      "subtitle": "412 pg/mL — mildly elevated"
    },
    {
      "id": "lab-potassium-3-5-mmol-l-low-normal",
      "label": "Potassium",
      "type": "lab",
      "subtitle": "3.5 mmol/L — low-normal"
    },
    {
      "id": "lab-urine-albumin-creatinine-ratio-68-mg-g-elevated",
      "label": "Urine albumin",
      "type": "lab",
      "subtitle": "Urine albumin/creatinine ratio • 68 mg/g — elevated"
    },
    {
      "id": "diagnostic-echocardiogram-last-year-preserved-ef-with-mild-left-atrial-enlargement",
      "label": "Echocardiogram last year",
      "type": "diagnostic",
      "subtitle": "Echocardiogram last year: preserved EF with mild left atrial enlargement"
    },
    {
      "id": "diagnostic-sleep-study-3-years-ago-confirming-osa",
      "label": "Sleep study 3 years ago confirming",
      "type": "diagnostic",
      "subtitle": "Sleep study 3 years ago confirming OSA"
    },
    {
      "id": "diagnostic-medication-reconciliation-with-home-bottles-still-pending",
      "label": "Medication reconciliation home bottles still pending",
      "type": "diagnostic",
      "subtitle": "Medication reconciliation with home bottles still pending"
    },
    {
      "id": "diagnostic-orthostatic-vitals-not-yet-formally-documented",
      "label": "Orthostatic vitals not yet formally documented",
      "type": "diagnostic"
    }
  ],
  "edges": [
    {
      "id": "condition-paroxysmal-atrial-fibrillation__medication-apixaban-5-mg-twice-daily__stroke-prevention",
      "source": "medication-apixaban-5-mg-twice-daily",
      "target": "condition-paroxysmal-atrial-fibrillation",
      "label": "stroke prevention",
      "explanation": "Anticoagulation is being used to reduce thromboembolic stroke risk from atrial fibrillation.",
      "severity": "high"
    },
    {
      "id": "medication-apixaban-5-mg-twice-daily__symptom-easy-bruising__bleeding-risk",
      "source": "medication-apixaban-5-mg-twice-daily",
      "target": "symptom-easy-bruising",
      "label": "bleeding risk",
      "explanation": "Apixaban commonly increases bruising and minor bleeding tendency.",
      "severity": "high"
    },
    {
      "id": "medication-apixaban-5-mg-twice-daily__supplement-fish-oil-2-g-daily__additive-bleeding",
      "source": "supplement-fish-oil-2-g-daily",
      "target": "medication-apixaban-5-mg-twice-daily",
      "label": "additive bleeding",
      "explanation": "Fish oil may modestly increase bleeding tendency when combined with an anticoagulant.",
      "severity": "moderate"
    },
    {
      "id": "medication-apixaban-5-mg-twice-daily__supplement-turmeric-curcumin-1000-mg-daily__additive-bleeding",
      "source": "supplement-turmeric-curcumin-1000-mg-daily",
      "target": "medication-apixaban-5-mg-twice-daily",
      "label": "additive bleeding",
      "explanation": "Turmeric can increase bleeding tendency and may amplify bruising risk with apixaban.",
      "severity": "moderate"
    },
    {
      "id": "supplement-fish-oil-2-g-daily__symptom-easy-bruising__bruise-contributor",
      "source": "supplement-fish-oil-2-g-daily",
      "target": "symptom-easy-bruising",
      "label": "bruise contributor",
      "explanation": "Fish oil may be contributing to the reported easy bruising, especially in the current stack.",
      "severity": "moderate"
    },
    {
      "id": "supplement-turmeric-curcumin-1000-mg-daily__symptom-easy-bruising__bruise-contributor",
      "source": "supplement-turmeric-curcumin-1000-mg-daily",
      "target": "symptom-easy-bruising",
      "label": "bruise contributor",
      "explanation": "Turmeric is a plausible contributor to bruising in this anticoagulated patient.",
      "severity": "moderate"
    },
    {
      "id": "medication-metoprolol-succinate-100-mg-nightly__symptom-fatigue-low-stamina__fatigue-effect",
      "source": "medication-metoprolol-succinate-100-mg-nightly",
      "target": "symptom-fatigue-low-stamina",
      "label": "fatigue effect",
      "explanation": "Beta-blockade can reduce exercise tolerance and contribute to fatigue or low stamina.",
      "severity": "moderate"
    },
    {
      "id": "medication-metoprolol-succinate-100-mg-nightly__symptom-lightheadedness-when-standing__orthostasis",
      "source": "medication-metoprolol-succinate-100-mg-nightly",
      "target": "symptom-lightheadedness-when-standing",
      "label": "orthostasis",
      "explanation": "Metoprolol can lower heart rate and blood pressure, worsening lightheadedness on standing.",
      "severity": "moderate"
    },
    {
      "id": "condition-hypertension__medication-metoprolol-succinate-100-mg-nightly__lowers-bp",
      "source": "medication-metoprolol-succinate-100-mg-nightly",
      "target": "condition-hypertension",
      "label": "lowers BP",
      "explanation": "Metoprolol contributes to blood pressure control.",
      "severity": "info"
    },
    {
      "id": "condition-paroxysmal-atrial-fibrillation__medication-metoprolol-succinate-100-mg-nightly__rate-control",
      "source": "medication-metoprolol-succinate-100-mg-nightly",
      "target": "condition-paroxysmal-atrial-fibrillation",
      "label": "rate control",
      "explanation": "Metoprolol is being used for ventricular rate control in atrial fibrillation.",
      "severity": "high"
    },
    {
      "id": "condition-hypertension__medication-lisinopril-20-mg-every-morning__lowers-bp",
      "source": "medication-lisinopril-20-mg-every-morning",
      "target": "condition-hypertension",
      "label": "lowers BP",
      "explanation": "Lisinopril is used for blood pressure reduction.",
      "severity": "info"
    },
    {
      "id": "condition-type-2-diabetes-mellitus__medication-lisinopril-20-mg-every-morning__renal-protection",
      "source": "medication-lisinopril-20-mg-every-morning",
      "target": "condition-type-2-diabetes-mellitus",
      "label": "renal protection",
      "explanation": "ACE inhibition is commonly used in diabetes to help reduce kidney risk, especially with albuminuria.",
      "severity": "moderate"
    },
    {
      "id": "condition-chronic-kidney-disease-stage-3a__medication-lisinopril-20-mg-every-morning__albuminuria-benefit",
      "source": "medication-lisinopril-20-mg-every-morning",
      "target": "condition-chronic-kidney-disease-stage-3a",
      "label": "albuminuria benefit",
      "explanation": "Lisinopril can help reduce proteinuria and slow CKD progression when tolerated.",
      "severity": "moderate"
    },
    {
      "id": "lab-urine-albumin-creatinine-ratio-68-mg-g-elevated__medication-lisinopril-20-mg-every-morning__reduces-albuminuria",
      "source": "medication-lisinopril-20-mg-every-morning",
      "target": "lab-urine-albumin-creatinine-ratio-68-mg-g-elevated",
      "label": "reduces albuminuria",
      "explanation": "Elevated urine albumin is a direct treatment target for ACE inhibitor therapy.",
      "severity": "moderate"
    },
    {
      "id": "medication-lisinopril-20-mg-every-morning__symptom-lightheadedness-when-standing__bp-lowering",
      "source": "medication-lisinopril-20-mg-every-morning",
      "target": "symptom-lightheadedness-when-standing",
      "label": "BP lowering",
      "explanation": "ACE inhibitor effect can contribute to low blood pressure symptoms in a tightly controlled patient.",
      "severity": "moderate"
    },
    {
      "id": "condition-hypertension__medication-amlodipine-10-mg-every-morning__lowers-bp",
      "source": "medication-amlodipine-10-mg-every-morning",
      "target": "condition-hypertension",
      "label": "lowers BP",
      "explanation": "Amlodipine contributes to antihypertensive control.",
      "severity": "info"
    },
    {
      "id": "medication-amlodipine-10-mg-every-morning__symptom-bilateral-ankle-edema-worse-in-the-evening__causes-edema",
      "source": "medication-amlodipine-10-mg-every-morning",
      "target": "symptom-bilateral-ankle-edema-worse-in-the-evening",
      "label": "causes edema",
      "explanation": "Amlodipine commonly causes dose-related peripheral ankle edema.",
      "severity": "high"
    },
    {
      "id": "medication-amlodipine-10-mg-every-morning__symptom-lightheadedness-when-standing__bp-lowering",
      "source": "medication-amlodipine-10-mg-every-morning",
      "target": "symptom-lightheadedness-when-standing",
      "label": "BP lowering",
      "explanation": "Amlodipine can contribute to orthostatic symptoms when blood pressure runs low.",
      "severity": "moderate"
    },
    {
      "id": "condition-hypertension__medication-hydrochlorothiazide-25-mg-every-morning__lowers-bp",
      "source": "medication-hydrochlorothiazide-25-mg-every-morning",
      "target": "condition-hypertension",
      "label": "lowers BP",
      "explanation": "Hydrochlorothiazide contributes to blood pressure control.",
      "severity": "info"
    },
    {
      "id": "medication-hydrochlorothiazide-25-mg-every-morning__symptom-lightheadedness-when-standing__volume-depletion",
      "source": "medication-hydrochlorothiazide-25-mg-every-morning",
      "target": "symptom-lightheadedness-when-standing",
      "label": "volume depletion",
      "explanation": "Diuretic effect can reduce intravascular volume and worsen orthostatic lightheadedness.",
      "severity": "high"
    },
    {
      "id": "lab-potassium-3-5-mmol-l-low-normal__medication-hydrochlorothiazide-25-mg-every-morning__lowers-potassium",
      "source": "medication-hydrochlorothiazide-25-mg-every-morning",
      "target": "lab-potassium-3-5-mmol-l-low-normal",
      "label": "lowers potassium",
      "explanation": "Thiazide diuretics commonly lower potassium; this may explain the low-normal value.",
      "severity": "moderate"
    },
    {
      "id": "medication-hydrochlorothiazide-25-mg-every-morning__symptom-nocturia-3-4-times-nightly__diuretic-effect",
      "source": "medication-hydrochlorothiazide-25-mg-every-morning",
      "target": "symptom-nocturia-3-4-times-nightly",
      "label": "diuretic effect",
      "explanation": "Daytime diuresis can still worsen urinary frequency and contribute to nocturia in some patients.",
      "severity": "low"
    },
    {
      "id": "condition-type-2-diabetes-mellitus__medication-metformin-xr-1000-mg-twice-daily-with-meals__glucose-control",
      "source": "medication-metformin-xr-1000-mg-twice-daily-with-meals",
      "target": "condition-type-2-diabetes-mellitus",
      "label": "glucose control",
      "explanation": "Metformin is being used to improve glycemic control in type 2 diabetes.",
      "severity": "high"
    },
    {
      "id": "lab-b12-298-pg-ml-borderline__medication-metformin-xr-1000-mg-twice-daily-with-meals__b12-lowering",
      "source": "medication-metformin-xr-1000-mg-twice-daily-with-meals",
      "target": "lab-b12-298-pg-ml-borderline",
      "label": "B12 lowering",
      "explanation": "Long-term metformin use can reduce B12 absorption and contribute to a borderline level.",
      "severity": "moderate"
    },
    {
      "id": "lab-b12-298-pg-ml-borderline__symptom-fatigue-low-stamina__possible-contributor",
      "source": "lab-b12-298-pg-ml-borderline",
      "target": "symptom-fatigue-low-stamina",
      "label": "possible contributor",
      "explanation": "Borderline B12 can contribute to fatigue, though it may not be the only cause here.",
      "severity": "low"
    },
    {
      "id": "lab-b12-298-pg-ml-borderline__symptom-mild-cognitive-fog-by-late-afternoon__possible-contributor",
      "source": "lab-b12-298-pg-ml-borderline",
      "target": "symptom-mild-cognitive-fog-by-late-afternoon",
      "label": "possible contributor",
      "explanation": "Borderline B12 status can contribute to cognitive slowing or brain fog.",
      "severity": "low"
    },
    {
      "id": "condition-type-2-diabetes-mellitus__medication-empagliflozin-25-mg-every-morning__glucose-control",
      "source": "medication-empagliflozin-25-mg-every-morning",
      "target": "condition-type-2-diabetes-mellitus",
      "label": "glucose control",
      "explanation": "Empagliflozin supports glycemic control in type 2 diabetes.",
      "severity": "high"
    },
    {
      "id": "condition-heart-failure-with-preserved-ejection-fraction-chronic-lower-extremity-edema-history__medication-empagliflozin-25-mg-every-morning__hf-benefit",
      "source": "medication-empagliflozin-25-mg-every-morning",
      "target": "condition-heart-failure-with-preserved-ejection-fraction-chronic-lower-extremity-edema-history",
      "label": "HF benefit",
      "explanation": "Empagliflozin has evidence for heart failure benefit, including HFpEF populations.",
      "severity": "moderate"
    },
    {
      "id": "condition-chronic-kidney-disease-stage-3a__medication-empagliflozin-25-mg-every-morning__renal-benefit",
      "source": "medication-empagliflozin-25-mg-every-morning",
      "target": "condition-chronic-kidney-disease-stage-3a",
      "label": "renal benefit",
      "explanation": "Empagliflozin has cardiorenal protective benefit in CKD when kidney function allows use.",
      "severity": "moderate"
    },
    {
      "id": "medication-empagliflozin-25-mg-every-morning__symptom-lightheadedness-when-standing__volume-loss",
      "source": "medication-empagliflozin-25-mg-every-morning",
      "target": "symptom-lightheadedness-when-standing",
      "label": "volume loss",
      "explanation": "SGLT2-related osmotic diuresis can worsen orthostatic symptoms, especially with other BP-lowering drugs.",
      "severity": "moderate"
    },
    {
      "id": "medication-empagliflozin-25-mg-every-morning__symptom-nocturia-3-4-times-nightly__osmotic-diuresis",
      "source": "medication-empagliflozin-25-mg-every-morning",
      "target": "symptom-nocturia-3-4-times-nightly",
      "label": "osmotic diuresis",
      "explanation": "Increased urinary glucose and diuresis can contribute to urinary frequency and nocturia.",
      "severity": "moderate"
    },
    {
      "id": "medication-empagliflozin-25-mg-every-morning__medication-hydrochlorothiazide-25-mg-every-morning__additive-diuresis",
      "source": "medication-empagliflozin-25-mg-every-morning",
      "target": "medication-hydrochlorothiazide-25-mg-every-morning",
      "label": "additive diuresis",
      "explanation": "Together these can increase volume depletion, orthostasis, and urinary frequency.",
      "severity": "high"
    },
    {
      "id": "goal-maintain-stroke-prevention-and-cardiometabolic-risk-reduction__medication-atorvastatin-40-mg-nightly__risk-reduction",
      "source": "medication-atorvastatin-40-mg-nightly",
      "target": "goal-maintain-stroke-prevention-and-cardiometabolic-risk-reduction",
      "label": "risk reduction",
      "explanation": "Statin therapy directly supports ASCVD risk reduction in this high-risk patient.",
      "severity": "high"
    },
    {
      "id": "goal-maintain-stroke-prevention-and-cardiometabolic-risk-reduction__lab-triglycerides-210-mg-dl-elevated__residual-risk",
      "source": "lab-triglycerides-210-mg-dl-elevated",
      "target": "goal-maintain-stroke-prevention-and-cardiometabolic-risk-reduction",
      "label": "residual risk",
      "explanation": "Elevated triglycerides indicate persistent cardiometabolic risk despite current therapy.",
      "severity": "moderate"
    },
    {
      "id": "goal-maintain-stroke-prevention-and-cardiometabolic-risk-reduction__lab-urine-albumin-creatinine-ratio-68-mg-g-elevated__vascular-risk",
      "source": "lab-urine-albumin-creatinine-ratio-68-mg-g-elevated",
      "target": "goal-maintain-stroke-prevention-and-cardiometabolic-risk-reduction",
      "label": "vascular risk",
      "explanation": "Albuminuria is a marker of ongoing renal and cardiovascular risk that directly informs this goal.",
      "severity": "moderate"
    },
    {
      "id": "condition-paroxysmal-atrial-fibrillation__goal-maintain-stroke-prevention-and-cardiometabolic-risk-reduction__stroke-risk",
      "source": "condition-paroxysmal-atrial-fibrillation",
      "target": "goal-maintain-stroke-prevention-and-cardiometabolic-risk-reduction",
      "label": "stroke risk",
      "explanation": "Atrial fibrillation is a key driver of stroke-prevention strategy.",
      "severity": "high"
    },
    {
      "id": "condition-type-2-diabetes-mellitus__goal-maintain-stroke-prevention-and-cardiometabolic-risk-reduction__cardiometabolic-risk",
      "source": "condition-type-2-diabetes-mellitus",
      "target": "goal-maintain-stroke-prevention-and-cardiometabolic-risk-reduction",
      "label": "cardiometabolic risk",
      "explanation": "Diabetes materially increases cardiovascular and renal risk and is central to this goal.",
      "severity": "high"
    },
    {
      "id": "condition-chronic-kidney-disease-stage-3a__goal-maintain-stroke-prevention-and-cardiometabolic-risk-reduction__renal-risk",
      "source": "condition-chronic-kidney-disease-stage-3a",
      "target": "goal-maintain-stroke-prevention-and-cardiometabolic-risk-reduction",
      "label": "renal risk",
      "explanation": "CKD is a major cardiovascular risk amplifier and affects medication safety.",
      "severity": "high"
    },
    {
      "id": "condition-heart-failure-with-preserved-ejection-fraction-chronic-lower-extremity-edema-history__goal-maintain-stroke-prevention-and-cardiometabolic-risk-reduction__hf-risk",
      "source": "condition-heart-failure-with-preserved-ejection-fraction-chronic-lower-extremity-edema-history",
      "target": "goal-maintain-stroke-prevention-and-cardiometabolic-risk-reduction",
      "label": "HF risk",
      "explanation": "HFpEF drives symptoms, hospitalization risk, and cardiometabolic management priorities.",
      "severity": "high"
    },
    {
      "id": "condition-hypertension__goal-maintain-stroke-prevention-and-cardiometabolic-risk-reduction__bp-risk",
      "source": "condition-hypertension",
      "target": "goal-maintain-stroke-prevention-and-cardiometabolic-risk-reduction",
      "label": "BP risk",
      "explanation": "Hypertension is a core modifiable contributor to stroke and cardiovascular risk.",
      "severity": "high"
    },
    {
      "id": "condition-heart-failure-with-preserved-ejection-fraction-chronic-lower-extremity-edema-history__diagnostic-echocardiogram-last-year-preserved-ef-with-mild-left-atrial-enlargement__supports-diagnosis",
      "source": "diagnostic-echocardiogram-last-year-preserved-ef-with-mild-left-atrial-enlargement",
      "target": "condition-heart-failure-with-preserved-ejection-fraction-chronic-lower-extremity-edema-history",
      "label": "supports diagnosis",
      "explanation": "Preserved EF helps support the HFpEF phenotype in the right clinical context.",
      "severity": "moderate"
    },
    {
      "id": "condition-paroxysmal-atrial-fibrillation__diagnostic-echocardiogram-last-year-preserved-ef-with-mild-left-atrial-enlargement__la-enlargement",
      "source": "diagnostic-echocardiogram-last-year-preserved-ef-with-mild-left-atrial-enlargement",
      "target": "condition-paroxysmal-atrial-fibrillation",
      "label": "LA enlargement",
      "explanation": "Left atrial enlargement is structurally relevant to atrial fibrillation burden and recurrence risk.",
      "severity": "moderate"
    },
    {
      "id": "diagnostic-sleep-study-3-years-ago-confirming-osa__goal-improve-sleep-and-daytime-function__sleep-driver",
      "source": "diagnostic-sleep-study-3-years-ago-confirming-osa",
      "target": "goal-improve-sleep-and-daytime-function",
      "label": "sleep driver",
      "explanation": "Confirmed OSA is a direct driver of fragmented sleep and daytime dysfunction.",
      "severity": "high"
    },
    {
      "id": "goal-improve-sleep-and-daytime-function__symptom-poor-sleep-quality-despite-trazodone__primary-barrier",
      "source": "symptom-poor-sleep-quality-despite-trazodone",
      "target": "goal-improve-sleep-and-daytime-function",
      "label": "primary barrier",
      "explanation": "Poor sleep quality directly opposes the stated goal of better sleep and daytime function.",
      "severity": "high"
    },
    {
      "id": "goal-improve-sleep-and-daytime-function__symptom-nocturia-3-4-times-nightly__sleep-disruption",
      "source": "symptom-nocturia-3-4-times-nightly",
      "target": "goal-improve-sleep-and-daytime-function",
      "label": "sleep disruption",
      "explanation": "Repeated nocturnal urination is a direct cause of fragmented sleep.",
      "severity": "high"
    },
    {
      "id": "goal-improve-sleep-and-daytime-function__symptom-fatigue-low-stamina__daytime-impairment",
      "source": "symptom-fatigue-low-stamina",
      "target": "goal-improve-sleep-and-daytime-function",
      "label": "daytime impairment",
      "explanation": "Fatigue is a direct daytime consequence relevant to this goal.",
      "severity": "high"
    },
    {
      "id": "goal-improve-sleep-and-daytime-function__symptom-mild-cognitive-fog-by-late-afternoon__daytime-impact",
      "source": "symptom-mild-cognitive-fog-by-late-afternoon",
      "target": "goal-improve-sleep-and-daytime-function",
      "label": "daytime impact",
      "explanation": "Cognitive fog is a direct marker of impaired daytime function.",
      "severity": "moderate"
    },
    {
      "id": "condition-heart-failure-with-preserved-ejection-fraction-chronic-lower-extremity-edema-history__symptom-exertional-dyspnea-climbing-stairs__dyspnea-cause",
      "source": "condition-heart-failure-with-preserved-ejection-fraction-chronic-lower-extremity-edema-history",
      "target": "symptom-exertional-dyspnea-climbing-stairs",
      "label": "dyspnea cause",
      "explanation": "HFpEF commonly causes exertional shortness of breath from elevated filling pressures.",
      "severity": "high"
    },
    {
      "id": "condition-heart-failure-with-preserved-ejection-fraction-chronic-lower-extremity-edema-history__symptom-bilateral-ankle-edema-worse-in-the-evening__edema-cause",
      "source": "condition-heart-failure-with-preserved-ejection-fraction-chronic-lower-extremity-edema-history",
      "target": "symptom-bilateral-ankle-edema-worse-in-the-evening",
      "label": "edema cause",
      "explanation": "Heart failure can contribute to dependent lower-extremity edema.",
      "severity": "high"
    },
    {
      "id": "condition-heart-failure-with-preserved-ejection-fraction-chronic-lower-extremity-edema-history__lab-nt-probnp-412-pg-ml-mildly-elevated__supports-congestion",
      "source": "lab-nt-probnp-412-pg-ml-mildly-elevated",
      "target": "condition-heart-failure-with-preserved-ejection-fraction-chronic-lower-extremity-edema-history",
      "label": "supports congestion",
      "explanation": "Mildly elevated NT-proBNP supports a heart-failure/congestion signal in context.",
      "severity": "moderate"
    },
    {
      "id": "lab-nt-probnp-412-pg-ml-mildly-elevated__symptom-exertional-dyspnea-climbing-stairs__congestion-marker",
      "source": "lab-nt-probnp-412-pg-ml-mildly-elevated",
      "target": "symptom-exertional-dyspnea-climbing-stairs",
      "label": "congestion marker",
      "explanation": "An elevated natriuretic peptide can align with dyspnea related to cardiac filling pressure or congestion.",
      "severity": "moderate"
    },
    {
      "id": "condition-benign-prostatic-hyperplasia__symptom-nocturia-3-4-times-nightly__urinary-obstruction",
      "source": "condition-benign-prostatic-hyperplasia",
      "target": "symptom-nocturia-3-4-times-nightly",
      "label": "urinary obstruction",
      "explanation": "BPH is a common direct contributor to nocturia.",
      "severity": "high"
    },
    {
      "id": "goal-clarify-medication-contributors-to-fatigue-edema-and-orthostasis__medication-metoprolol-succinate-100-mg-nightly__review-target",
      "source": "goal-clarify-medication-contributors-to-fatigue-edema-and-orthostasis",
      "target": "medication-metoprolol-succinate-100-mg-nightly",
      "label": "review target",
      "explanation": "Metoprolol is a plausible contributor to fatigue and orthostatic symptoms.",
      "severity": "moderate"
    },
    {
      "id": "goal-clarify-medication-contributors-to-fatigue-edema-and-orthostasis__medication-amlodipine-10-mg-every-morning__review-target",
      "source": "goal-clarify-medication-contributors-to-fatigue-edema-and-orthostasis",
      "target": "medication-amlodipine-10-mg-every-morning",
      "label": "review target",
      "explanation": "Amlodipine is a strong candidate contributor to ankle edema and possibly low-BP symptoms.",
      "severity": "high"
    },
    {
      "id": "goal-clarify-medication-contributors-to-fatigue-edema-and-orthostasis__medication-hydrochlorothiazide-25-mg-every-morning__review-target",
      "source": "goal-clarify-medication-contributors-to-fatigue-edema-and-orthostasis",
      "target": "medication-hydrochlorothiazide-25-mg-every-morning",
      "label": "review target",
      "explanation": "Hydrochlorothiazide may contribute to orthostasis, nocturia, and low potassium.",
      "severity": "high"
    },
    {
      "id": "goal-clarify-medication-contributors-to-fatigue-edema-and-orthostasis__medication-lisinopril-20-mg-every-morning__review-target",
      "source": "goal-clarify-medication-contributors-to-fatigue-edema-and-orthostasis",
      "target": "medication-lisinopril-20-mg-every-morning",
      "label": "review target",
      "explanation": "Lisinopril may be part of cumulative blood-pressure lowering contributing to orthostasis.",
      "severity": "moderate"
    },
    {
      "id": "goal-clarify-medication-contributors-to-fatigue-edema-and-orthostasis__medication-empagliflozin-25-mg-every-morning__review-target",
      "source": "goal-clarify-medication-contributors-to-fatigue-edema-and-orthostasis",
      "target": "medication-empagliflozin-25-mg-every-morning",
      "label": "review target",
      "explanation": "Empagliflozin can add diuresis and worsen lightheadedness or nocturia.",
      "severity": "moderate"
    },
    {
      "id": "diagnostic-orthostatic-vitals-not-yet-formally-documented__goal-clarify-medication-contributors-to-fatigue-edema-and-orthostasis__needed-data",
      "source": "diagnostic-orthostatic-vitals-not-yet-formally-documented",
      "target": "goal-clarify-medication-contributors-to-fatigue-edema-and-orthostasis",
      "label": "needed data",
      "explanation": "Formal orthostatic vitals are directly needed to evaluate medication-related orthostasis.",
      "severity": "high"
    },
    {
      "id": "diagnostic-medication-reconciliation-with-home-bottles-still-pending__goal-reduce-polypharmacy-burden-where-reasonable__required-review",
      "source": "diagnostic-medication-reconciliation-with-home-bottles-still-pending",
      "target": "goal-reduce-polypharmacy-burden-where-reasonable",
      "label": "required review",
      "explanation": "Accurate reconciliation is necessary before meaningful deprescribing or simplification.",
      "severity": "high"
    },
    {
      "id": "diagnostic-medication-reconciliation-with-home-bottles-still-pending__goal-clarify-medication-contributors-to-fatigue-edema-and-orthostasis__required-review",
      "source": "diagnostic-medication-reconciliation-with-home-bottles-still-pending",
      "target": "goal-clarify-medication-contributors-to-fatigue-edema-and-orthostasis",
      "label": "required review",
      "explanation": "Medication/supplement verification is essential to identify true contributors to symptoms.",
      "severity": "high"
    },
    {
      "id": "goal-reduce-polypharmacy-burden-where-reasonable__medication-apixaban-5-mg-twice-daily__high-value-therapy",
      "source": "medication-apixaban-5-mg-twice-daily",
      "target": "goal-reduce-polypharmacy-burden-where-reasonable",
      "label": "high-value therapy",
      "explanation": "Apixaban has clear stroke-prevention value, so it is generally a poor deprescribing target absent a new contraindication.",
      "severity": "moderate"
    },
    {
      "id": "goal-reduce-polypharmacy-burden-where-reasonable__medication-empagliflozin-25-mg-every-morning__high-value-therapy",
      "source": "medication-empagliflozin-25-mg-every-morning",
      "target": "goal-reduce-polypharmacy-burden-where-reasonable",
      "label": "high-value therapy",
      "explanation": "Empagliflozin carries meaningful cardiorenal benefit, so simplification should weigh this benefit carefully.",
      "severity": "moderate"
    },
    {
      "id": "goal-reduce-polypharmacy-burden-where-reasonable__medication-lisinopril-20-mg-every-morning__high-value-therapy",
      "source": "medication-lisinopril-20-mg-every-morning",
      "target": "goal-reduce-polypharmacy-burden-where-reasonable",
      "label": "high-value therapy",
      "explanation": "Lisinopril supports blood pressure, albuminuria, and kidney-risk management, making it relatively high-yield.",
      "severity": "moderate"
    },
    {
      "id": "goal-reduce-polypharmacy-burden-where-reasonable__medication-atorvastatin-40-mg-nightly__high-value-therapy",
      "source": "medication-atorvastatin-40-mg-nightly",
      "target": "goal-reduce-polypharmacy-burden-where-reasonable",
      "label": "high-value therapy",
      "explanation": "Atorvastatin is a foundational cardiometabolic risk-reduction therapy and not an obvious deprescribing target.",
      "severity": "moderate"
    },
    {
      "id": "goal-reduce-polypharmacy-burden-where-reasonable__supplement-fish-oil-2-g-daily__deprescribe-candidate",
      "source": "supplement-fish-oil-2-g-daily",
      "target": "goal-reduce-polypharmacy-burden-where-reasonable",
      "label": "deprescribe candidate",
      "explanation": "Given bruising and uncertain net benefit in this context, fish oil is a reasonable simplification target.",
      "severity": "moderate"
    },
    {
      "id": "goal-reduce-polypharmacy-burden-where-reasonable__supplement-turmeric-curcumin-1000-mg-daily__deprescribe-candidate",
      "source": "supplement-turmeric-curcumin-1000-mg-daily",
      "target": "goal-reduce-polypharmacy-burden-where-reasonable",
      "label": "deprescribe candidate",
      "explanation": "Turmeric adds bleeding-risk complexity and is a reasonable candidate for stack simplification.",
      "severity": "moderate"
    },
    {
      "id": "condition-chronic-kidney-disease-stage-3a__lab-urine-albumin-creatinine-ratio-68-mg-g-elevated__kidney-damage",
      "source": "condition-chronic-kidney-disease-stage-3a",
      "target": "lab-urine-albumin-creatinine-ratio-68-mg-g-elevated",
      "label": "kidney damage",
      "explanation": "Albuminuria is a direct marker of ongoing kidney injury in CKD and diabetes.",
      "severity": "high"
    }
  ],
  "notes": [
    "This graph is generated from the structured patient profile only.",
    "Edges reflect clinically meaningful direct relationships or interaction risks rather than cosmetic connectivity."
  ]
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

export function isExamplePatientRecord(patient: {
  name: string;
  summary: string;
}) {
  return patient.name === "John Doe" && patient.summary === examplePatientSummary;
}
