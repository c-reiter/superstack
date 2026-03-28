"use client";

import { useMemo } from "react";
import { Artifact } from "@/components/chat/create-artifact";
import {
  type OpenUIArtifactPayload,
  openUIArtifactSchema,
} from "@/lib/openui/artifact";

const TIER_STYLES: Record<number, { badge: string; section: string }> = {
  0: {
    badge:
      "border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-200",
    section: "border-amber-500/20 bg-amber-500/6",
  },
  1: {
    badge:
      "border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
    section: "border-emerald-500/20 bg-emerald-500/6",
  },
  2: {
    badge: "border-teal-500/30 bg-teal-500/15 text-teal-800 dark:text-teal-200",
    section: "border-teal-500/20 bg-teal-500/6",
  },
  3: {
    badge: "border-sky-500/30 bg-sky-500/15 text-sky-800 dark:text-sky-200",
    section: "border-sky-500/20 bg-sky-500/6",
  },
  4: {
    badge:
      "border-violet-500/30 bg-violet-500/15 text-violet-800 dark:text-violet-200",
    section: "border-violet-500/20 bg-violet-500/6",
  },
  5: {
    badge: "border-rose-500/30 bg-rose-500/15 text-rose-800 dark:text-rose-200",
    section: "border-rose-500/20 bg-rose-500/6",
  },
};

const RELEVANCE_STYLES = {
  highest: "border-cyan-500/30 bg-cyan-500/15 text-cyan-800 dark:text-cyan-200",
  high: "border-sky-500/30 bg-sky-500/15 text-sky-800 dark:text-sky-200",
  moderate:
    "border-zinc-500/20 bg-zinc-500/10 text-zinc-800 dark:text-zinc-200",
  low: "border-zinc-400/15 bg-zinc-500/5 text-zinc-600 dark:text-zinc-300",
} as const;

const CELL_TONE_STYLES = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  accent: "font-medium text-cyan-700 dark:text-cyan-300",
  positive: "font-medium text-emerald-700 dark:text-emerald-300",
  caution: "font-medium text-amber-700 dark:text-amber-300",
  danger: "font-medium text-rose-700 dark:text-rose-300",
} as const;

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function parseOpenUIArtifactContent(content: string) {
  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content);
    const result = openUIArtifactSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function TableArtifactView({
  artifact,
}: {
  artifact: Extract<OpenUIArtifactPayload, { view: "table" }>;
}) {
  const rowCountLabel =
    artifact.rows.length === 1 ? "1 row" : `${artifact.rows.length} rows`;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border/60 bg-card/70 px-3 py-1 text-[11px] font-medium text-muted-foreground">
          Table artifact
        </span>
        <span className="rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[11px] text-muted-foreground">
          {rowCountLabel}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/35 shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
              <tr className="border-b border-border/50">
                {artifact.columns.map((column) => (
                  <th
                    className={cn(
                      "px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground",
                      column.align === "center"
                        ? "text-center"
                        : column.align === "right"
                          ? "text-right"
                          : "text-left"
                    )}
                    key={column.id}
                    scope="col"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {artifact.rows.map((row, rowIndex) => {
                const cellMap = new Map(
                  row.cells.map((cell) => [cell.columnId, cell])
                );

                return (
                  <tr
                    className={cn(
                      "border-b border-border/40 align-top transition-colors hover:bg-muted/20",
                      rowIndex === artifact.rows.length - 1 && "border-b-0"
                    )}
                    key={row.id}
                  >
                    {artifact.columns.map((column) => {
                      const cell = cellMap.get(column.id);
                      const tone = cell?.tone ?? "default";

                      return (
                        <td
                          className={cn(
                            "px-4 py-3 leading-6",
                            CELL_TONE_STYLES[tone],
                            column.align === "center"
                              ? "text-center"
                              : column.align === "right"
                                ? "text-right"
                                : "text-left"
                          )}
                          key={column.id}
                        >
                          {cell?.value ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {artifact.notes?.length ? (
        <div className="space-y-2 rounded-2xl border border-border/50 bg-card/35 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Notes
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {artifact.notes.map((note) => (
              <li className="leading-6" key={note}>
                • {note}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function TieredRecommendationsView({
  artifact,
}: {
  artifact: Extract<OpenUIArtifactPayload, { view: "tiered-recommendations" }>;
}) {
  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border/60 bg-card/70 px-3 py-1 text-[11px] font-medium text-muted-foreground">
          OpenUI recommendation artifact
        </span>
        <span className="rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[11px] text-muted-foreground">
          Levels 0–5
        </span>
      </div>

      {artifact.patientSummary ? (
        <div className="rounded-2xl border border-border/50 bg-card/35 p-4 shadow-[var(--shadow-card)]">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Patient context
          </div>
          <div className="mt-2 text-sm leading-6 text-foreground/90">
            {artifact.patientSummary}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {artifact.tiers.map((tier) => {
          const styles = TIER_STYLES[tier.level] ?? TIER_STYLES[2];

          return (
            <section
              className={cn(
                "rounded-3xl border p-4 shadow-[var(--shadow-card)] md:p-5",
                styles.section
              )}
              key={`${tier.level}-${tier.label}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div
                    className={cn(
                      "inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                      styles.badge
                    )}
                  >
                    Level {tier.level}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
                    {tier.label}
                  </h3>
                  {tier.description ? (
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                      {tier.description}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground">
                  {tier.items.length}{" "}
                  {tier.items.length === 1 ? "item" : "items"}
                </div>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {tier.items.map((item) => (
                  <article
                    className="rounded-2xl border border-border/50 bg-background/80 p-4 backdrop-blur"
                    key={item.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="text-base font-semibold text-foreground">
                        {item.name}
                      </div>
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize",
                          RELEVANCE_STYLES[item.relevance]
                        )}
                      >
                        {item.relevance} relevance
                      </span>
                    </div>

                    <div className="mt-3 space-y-3 text-sm leading-6">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Why it fits
                        </div>
                        <div className="mt-1 text-foreground/90">
                          {item.why}
                        </div>
                      </div>

                      {item.rationale ? (
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Mechanism / rationale
                          </div>
                          <div className="mt-1 text-foreground/90">
                            {item.rationale}
                          </div>
                        </div>
                      ) : null}

                      {item.evidence ? (
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Evidence
                          </div>
                          <div className="mt-1 text-foreground/90">
                            {item.evidence}
                          </div>
                        </div>
                      ) : null}

                      {item.cautions?.length ? (
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Cautions
                          </div>
                          <ul className="mt-1 space-y-1 text-foreground/90">
                            {item.cautions.map((caution) => (
                              <li key={caution}>• {caution}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {item.interactions?.length ? (
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Interaction implications
                          </div>
                          <ul className="mt-1 space-y-1 text-foreground/90">
                            {item.interactions.map((interaction) => (
                              <li key={interaction}>• {interaction}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {item.nextStep ? (
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Practical next step
                          </div>
                          <div className="mt-1 text-foreground/90">
                            {item.nextStep}
                          </div>
                        </div>
                      ) : null}

                      {item.disclaimer ? (
                        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-rose-900 text-sm dark:text-rose-100">
                          {item.disclaimer}
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {artifact.notes?.length ? (
        <div className="space-y-2 rounded-2xl border border-border/50 bg-card/35 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Notes
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {artifact.notes.map((note) => (
              <li className="leading-6" key={note}>
                • {note}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function OpenUIArtifactCanvas({
  artifact,
}: {
  artifact: OpenUIArtifactPayload;
}) {
  const content = useMemo(() => {
    if (artifact.view === "table") {
      return <TableArtifactView artifact={artifact} />;
    }

    return <TieredRecommendationsView artifact={artifact} />;
  }, [artifact]);

  return (
    <div className="h-full overflow-y-auto bg-background text-foreground">
      <div className="border-b border-border/50 bg-background/95 px-4 py-4 backdrop-blur md:px-6">
        <div className="text-lg font-semibold tracking-tight">
          {artifact.title}
        </div>
        {artifact.subtitle ? (
          <div className="mt-1 text-sm text-muted-foreground">
            {artifact.subtitle}
          </div>
        ) : null}
      </div>
      {content}
    </div>
  );
}

export const openuiArtifact = new Artifact<"openui", Record<string, never>>({
  kind: "openui",
  description:
    "Useful for structured OpenUI-style artifacts like tables, ranked comparisons, and tiered recommendation boards.",
  initialize: ({ setMetadata }) => {
    setMetadata({});
  },
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === "data-openuiDelta") {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible: true,
        status: "streaming",
      }));
    }
  },
  content: ({ content }) => {
    const artifact = parseOpenUIArtifactContent(content);

    if (!artifact) {
      return (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
          No OpenUI artifact available yet.
        </div>
      );
    }

    return <OpenUIArtifactCanvas artifact={artifact} />;
  },
  actions: [],
  toolbar: [],
});
