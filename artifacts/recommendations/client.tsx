"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Artifact } from "@/components/chat/create-artifact";
import {
  type RecommendationArtifactPayload,
  recommendationArtifactSchema,
} from "@/lib/recommendations/artifact";

const LEVEL_STYLES: Record<number, { chip: string; section: string }> = {
  0: {
    chip: "border-amber-500/30 bg-amber-500/12 text-amber-800 dark:text-amber-200",
    section: "border-amber-500/20 bg-amber-500/5",
  },
  1: {
    chip: "border-emerald-500/30 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200",
    section: "border-emerald-500/20 bg-emerald-500/5",
  },
  2: {
    chip: "border-teal-500/30 bg-teal-500/12 text-teal-800 dark:text-teal-200",
    section: "border-teal-500/20 bg-teal-500/5",
  },
  3: {
    chip: "border-sky-500/30 bg-sky-500/12 text-sky-800 dark:text-sky-200",
    section: "border-sky-500/20 bg-sky-500/5",
  },
  4: {
    chip: "border-violet-500/30 bg-violet-500/12 text-violet-800 dark:text-violet-200",
    section: "border-violet-500/20 bg-violet-500/5",
  },
  5: {
    chip: "border-rose-500/30 bg-rose-500/12 text-rose-800 dark:text-rose-200",
    section: "border-rose-500/20 bg-rose-500/5",
  },
};

const RELEVANCE_STYLES = {
  highest: "border-cyan-500/30 bg-cyan-500/15 text-cyan-800 dark:text-cyan-200",
  high: "border-sky-500/30 bg-sky-500/15 text-sky-800 dark:text-sky-200",
  moderate:
    "border-zinc-500/20 bg-zinc-500/10 text-zinc-800 dark:text-zinc-200",
  low: "border-zinc-400/15 bg-zinc-500/5 text-zinc-600 dark:text-zinc-300",
} as const;

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function normalizeTierLabel(level: number, label: string) {
  const cleaned = label
    .replace(new RegExp(`^level\\s*${level}\\s*[-—:]?\\s*`, "i"), "")
    .trim();

  return cleaned || `Level ${level}`;
}

function getTierDisplayLabel(level: number) {
  switch (level) {
    case 0:
      return "Diagnostics";
    case 1:
      return "Lifestyle";
    case 2:
      return "Supplements";
    case 3:
      return "Drugs";
    case 4:
      return "Off-label";
    default:
      return "Experimental";
  }
}

export function parseRecommendationArtifactContent(content: string) {
  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content);
    const result = recommendationArtifactSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function EvidenceScore({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5" aria-label={`${score} of 5 stars`}>
        {Array.from({ length: 5 }, (_, index) => (
          <span
            className={cn(
              "text-sm",
              index < score
                ? "text-amber-500"
                : "text-muted-foreground/30"
            )}
            key={index}
          >
            ★
          </span>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{score}/5</span>
    </div>
  );
}

function RecommendationTable({
  artifact,
}: {
  artifact: RecommendationArtifactPayload;
}) {
  const [activeLevel, setActiveLevel] = useState(artifact.tiers[0]?.level ?? 0);
  const sectionRefs = useRef(new Map<number, HTMLElement | null>());

  const sortedTiers = useMemo(() => {
    const tiersByLevel = new Map<
      number,
      RecommendationArtifactPayload["tiers"][number]
    >();

    for (const tier of [...artifact.tiers].sort((left, right) => left.level - right.level)) {
      const existing = tiersByLevel.get(tier.level);

      if (!existing) {
        tiersByLevel.set(tier.level, {
          ...tier,
          label: normalizeTierLabel(tier.level, tier.label),
        });
        continue;
      }

      tiersByLevel.set(tier.level, {
        ...existing,
        items: [...existing.items, ...tier.items],
      });
    }

    return Array.from(tiersByLevel.values()).sort(
      (left, right) => left.level - right.level
    );
  }, [artifact.tiers]);

  useEffect(() => {
    if (!sortedTiers.some((tier) => tier.level === activeLevel)) {
      setActiveLevel(sortedTiers[0]?.level ?? 0);
    }
  }, [activeLevel, sortedTiers]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const elements = sortedTiers
      .map((tier) => sectionRefs.current.get(tier.level))
      .filter((element): element is HTMLElement => Boolean(element));

    if (elements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);

        if (visibleEntries.length === 0) {
          return;
        }

        const nextEntry = [...visibleEntries].sort((left, right) => {
          const leftDistance = Math.abs(left.boundingClientRect.top);
          const rightDistance = Math.abs(right.boundingClientRect.top);

          return leftDistance - rightDistance;
        })[0];

        const level = Number(nextEntry?.target.getAttribute("data-level"));

        if (!Number.isNaN(level)) {
          setActiveLevel(level);
        }
      },
      {
        rootMargin: "-96px 0px -55% 0px",
        threshold: [0.1, 0.25, 0.5, 0.75],
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, [sortedTiers]);

  return (
    <div className="min-h-full bg-sidebar text-foreground">
      <div className="sticky top-0 z-10 border-b border-border/50 bg-sidebar p-4 backdrop-blur">
        <div className="flex flex-wrap gap-2">
          {sortedTiers.map((tier) => {
            const isActive = activeLevel === tier.level;
            const styles = LEVEL_STYLES[tier.level] ?? LEVEL_STYLES[2];

            return (
              <button
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? styles.chip
                    : "border-border/60 bg-sidebar text-muted-foreground hover:text-foreground"
                )}
                key={tier.level}
                onClick={() => {
                  setActiveLevel(tier.level);
                  sectionRefs.current
                    .get(tier.level)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                type="button"
              >
                Lvl {tier.level} ({getTierDisplayLabel(tier.level)})
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-8 px-4 py-5 pb-20 md:py-6 md:pb-24">
        {sortedTiers.map((tier) => {
          const styles = LEVEL_STYLES[tier.level] ?? LEVEL_STYLES[2];

          return (
            <section
              className="scroll-mt-24 space-y-4"
              key={tier.level}
              data-level={tier.level}
              ref={(element) => {
                sectionRefs.current.set(tier.level, element);
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div
                    className={cn(
                      "inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                      styles.chip
                    )}
                  >
                    Level {tier.level}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
                    {getTierDisplayLabel(tier.level)}
                  </h3>
                  {tier.description ? (
                    <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
                      {tier.description}
                    </p>
                  ) : null}
                </div>
              </div>

              {tier.items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/50 px-4 py-5 text-sm text-muted-foreground">
                  No reasonable recommendations in this level yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl bg-background shadow-sm">
                  <table className="min-w-[980px] w-full border-collapse text-sm">
                    <thead className="bg-background/95">
                      <tr className="border-b border-border/50 text-left align-top">
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Intervention
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Relevance / rationale
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Evidence score
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Cautions / contraindications
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Interaction implications
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Next step
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tier.items.map((item, index) => (
                        <tr
                          className={cn(
                            "border-b border-border/40 align-top",
                            index === tier.items.length - 1 && "border-b-0"
                          )}
                          key={item.id}
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold text-foreground">
                              {item.name}
                            </div>
                            {item.disclaimer ? (
                              <div className="mt-2 rounded-xl border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-sm text-rose-900 dark:text-rose-100">
                                {item.disclaimer}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 leading-6 text-foreground/90">
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize",
                                RELEVANCE_STYLES[item.relevance]
                              )}
                            >
                              {item.relevance}
                            </span>
                            <div className="mt-2 whitespace-pre-wrap">
                              {item.rationale ?? "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3 leading-6 text-foreground/90">
                            <EvidenceScore score={item.evidenceScore} />
                          </td>
                          <td className="px-4 py-3 leading-6 text-foreground/90">
                            {item.cautions?.length ? (
                              <ul className="space-y-1">
                                {item.cautions.map((caution) => (
                                  <li key={caution}>• {caution}</li>
                                ))}
                              </ul>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3 leading-6 text-foreground/90">
                            {item.interactions?.length ? (
                              <ul className="space-y-1">
                                {item.interactions.map((interaction) => (
                                  <li key={interaction}>• {interaction}</li>
                                ))}
                              </ul>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3 leading-6 text-foreground/90">
                            {item.nextStep ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function RecommendationArtifactCanvas({
  artifact,
}: {
  artifact: RecommendationArtifactPayload;
}) {
  return <div className="min-h-full bg-sidebar text-foreground"><RecommendationTable artifact={artifact} /></div>;
}

export const recommendationsArtifact = new Artifact<
  "recommendations",
  Record<string, never>
>({
  kind: "recommendations",
  description:
    "Useful for tiered Level 0-5 diagnostic and intervention boards with jump navigation between levels.",
  initialize: ({ setMetadata }) => {
    setMetadata({});
  },
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === "data-recommendationDelta") {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible: true,
        status: "streaming",
      }));
    }
  },
  content: ({ content }) => {
    const artifact = parseRecommendationArtifactContent(content);

    if (!artifact) {
      return (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
          No recommendation artifact available yet.
        </div>
      );
    }

    return <RecommendationArtifactCanvas artifact={artifact} />;
  },
  actions: [],
  toolbar: [],
});
