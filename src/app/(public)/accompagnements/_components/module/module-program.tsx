"use client";

import { useState } from "react";
import { FileText, HelpCircle, Sparkles, Video } from "lucide-react";
import { Section } from "../sales/section";
import {
  formatSingleCount,
  type BlockType,
  type ProgramChapter,
} from "./module-program-data";

const BADGES: { key: BlockType; Icon: typeof Video }[] = [
  { key: "video", Icon: Video },
  { key: "download", Icon: FileText },
  { key: "quiz", Icon: HelpCircle },
];

/** Au-dela de ce nombre de chapitres, la liste est repliee. */
const COLLAPSE_THRESHOLD = 8;
const VISIBLE_WHEN_COLLAPSED = 6;

export function ModuleProgram({
  title,
  intro,
  chapters,
}: {
  title: string;
  intro: string;
  chapters: ProgramChapter[];
}) {
  const collapsible = chapters.length > COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(false);
  const visible =
    collapsible && !expanded
      ? chapters.slice(0, VISIBLE_WHEN_COLLAPSED)
      : chapters;
  const hiddenCount = chapters.length - visible.length;

  return (
    <Section id="programme" className="bg-background-beige">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold text-primary-green sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-lg text-primary-green/70">{intro}</p>
      </div>

      <ol className="mx-auto mt-10 max-w-3xl space-y-3">
        {visible.map((chapter, i) => (
          <li
            key={chapter.id}
            className="flex gap-4 rounded-lg border border-primary-green/10 bg-white p-5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-green/10 text-sm font-semibold text-primary-green">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-serif text-base font-semibold text-primary-green">
                  {chapter.title}
                </h3>
                {chapter.recentlyImproved && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-sage/15 px-2 py-0.5 text-[11px] font-medium text-accent-sage">
                    <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                    Contenu amélioré
                  </span>
                )}
              </div>
              {chapter.salesHook && (
                <p className="mt-1 text-sm text-primary-green/70">
                  {chapter.salesHook}
                </p>
              )}
              <ul className="mt-3 flex flex-wrap gap-3 empty:mt-0">
                {BADGES.map(({ key, Icon }) => {
                  const label = formatSingleCount(key, chapter.counts[key]);
                  if (!label) return null;
                  return (
                    <li
                      key={key}
                      className="inline-flex items-center gap-1.5 text-xs text-primary-green/60"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {label}
                    </li>
                  );
                })}
              </ul>
            </div>
          </li>
        ))}
      </ol>

      {collapsible && !expanded && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-md border border-primary-green/20 px-6 py-2.5 text-sm font-medium text-primary-green transition-colors hover:bg-primary-green/5"
          >
            Voir les {hiddenCount} chapitres suivants
          </button>
        </div>
      )}
    </Section>
  );
}
