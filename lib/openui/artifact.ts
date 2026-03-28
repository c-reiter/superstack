import { z } from "zod";

export const openUITableCellSchema = z.object({
  columnId: z.string(),
  value: z.string(),
  tone: z
    .enum(["default", "muted", "accent", "positive", "caution", "danger"])
    .nullable()
    .optional(),
});

export const openUITableColumnSchema = z.object({
  id: z.string(),
  label: z.string(),
  align: z.enum(["left", "center", "right"]).optional().default("left"),
});

export const openUITableRowSchema = z.object({
  id: z.string(),
  label: z.string().nullable().optional(),
  cells: z.array(openUITableCellSchema),
});

export const openUIRecommendationItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  relevance: z
    .enum(["highest", "high", "moderate", "low"])
    .optional()
    .default("moderate"),
  why: z.string(),
  rationale: z.string().nullable().optional(),
  evidence: z.string().nullable().optional(),
  cautions: z.array(z.string()).nullable().optional(),
  interactions: z.array(z.string()).nullable().optional(),
  nextStep: z.string().nullable().optional(),
  disclaimer: z.string().nullable().optional(),
});

export const openUIRecommendationTierSchema = z.object({
  level: z.number().int().min(0).max(5),
  label: z.string(),
  description: z.string().nullable().optional(),
  items: z.array(openUIRecommendationItemSchema),
});

const openUIArtifactBaseSchema = z.object({
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  notes: z.array(z.string()).nullable().optional(),
});

export const openUITableArtifactSchema = openUIArtifactBaseSchema.extend({
  view: z.literal("table"),
  columns: z.array(openUITableColumnSchema),
  rows: z.array(openUITableRowSchema),
});

export const openUITieredRecommendationsArtifactSchema =
  openUIArtifactBaseSchema.extend({
    view: z.literal("tiered-recommendations"),
    patientSummary: z.string().nullable().optional(),
    tiers: z.array(openUIRecommendationTierSchema),
  });

export const openUIArtifactSchema = z.discriminatedUnion("view", [
  openUITableArtifactSchema,
  openUITieredRecommendationsArtifactSchema,
]);

export type OpenUIArtifactPayload = z.infer<typeof openUIArtifactSchema>;
