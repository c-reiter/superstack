import { z } from "zod";

export const recommendationItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  relevance: z
    .enum(["highest", "high", "moderate", "low"])
    .optional()
    .default("moderate"),
  why: z.string(),
  rationale: z.string().nullable().optional(),
  evidence: z.string().nullable().optional(),
  evidenceScore: z.number().int().min(1).max(5),
  cautions: z.array(z.string()).nullable().optional(),
  interactions: z.array(z.string()).nullable().optional(),
  nextStep: z.string().nullable().optional(),
  disclaimer: z.string().nullable().optional(),
});

export const recommendationTierSchema = z.object({
  level: z.number().int().min(0).max(5),
  label: z.string(),
  description: z.string().nullable().optional(),
  items: z.array(recommendationItemSchema),
});

export const recommendationArtifactSchema = z.object({
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  patientSummary: z.string().nullable().optional(),
  tiers: z.array(recommendationTierSchema),
});

export type RecommendationArtifactPayload = z.infer<
  typeof recommendationArtifactSchema
>;
