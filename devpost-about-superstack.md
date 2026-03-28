# SuperStack

**SuperStack is an AI clinician copilot for complex medication and supplement stacks.** It helps clinicians review a patient’s current stack, surface likely interactions, and rank next-step interventions with a visual interaction graph.

## Inspiration

We built SuperStack around a real healthcare workflow problem: modern patients increasingly combine **prescriptions, supplements, hormones, peptides, and self-directed protocols**. That makes clinical reasoning harder, especially when symptoms may be driven by interactions, redundancy, dosing issues, or missing diagnostic context.

We wanted to build a tool that helps clinicians answer practical questions faster and more clearly:

- What in this stack could explain a symptom?
- Which diagnostics would improve confidence?
- Which interventions are most relevant for this patient?
- How would a new recommendation interact with the current stack?

## What it does

SuperStack is designed as **clinical decision support**, not autonomous diagnosis or prescribing.

A clinician can:

1. **Select or create a patient**
2. **Build or update the patient profile conversationally** through an intake/edit chat
3. **Ask consult questions** in a regular chat interface
4. **Receive tiered recommendations** ranked by relevance
5. **Inspect interactions visually** in a graph showing the current stack and proposed interventions

Recommendations are structured in a way that matches real clinical reasoning:

- **Level 0:** diagnostics needed
- **Level 1:** lifestyle
- **Level 2:** supplements / OTC
- **Level 3:** pharmaceuticals / hormones
- **Level 4:** off-label / last-line approved options
- **Level 5:** experimental / research-only options

This helps the system stay practical and transparent, especially in complex cases involving multiple compounds, symptoms, and goals.

## How we built it

We built SuperStack as a **chat + visual artifact** application.

- **Frontend:** Next.js, TypeScript, Tailwind CSS
- **Graph UI:** React Flow
- **AI workflow:** separate prompting for two distinct modes:
  - **Intake/Edit mode** for gathering and updating patient context
  - **Consult mode** for reasoning from the saved patient profile and generating recommendations

That separation was important because data gathering and clinical consultation are different tasks, and the AI needs to behave differently in each one.

## Challenges

The biggest challenge was balancing **clinical complexity** with **clarity**. Real patient stacks can involve many medications, supplements, conditions, symptoms, and labs. We needed the tool to remain understandable and useful during a live consult.

A second challenge was **trust**. In healthcare, it is not enough to generate plausible suggestions. The system needs to make its reasoning legible, show interactions clearly, and avoid pretending to replace clinician judgment.

## What we learned

We learned that healthcare AI becomes much more useful when it combines:

- structured patient context
- focused consult questions
- transparent recommendation logic
- clear visual explanations

We also learned that the best role for AI here is not to “play doctor,” but to help clinicians think through complicated cases more efficiently and with better visibility into interactions.

## Why it matters

As patient stacks become more complex, clinicians need better tools for reviewing interactions, identifying missing information, and prioritizing safer next steps.

SuperStack’s goal is to make that process **faster, clearer, and more clinically usable**.
