"use client";

import { CheckCircle2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressRing } from "@/components/espace-client/progress-ring";

export type SectionSummary = {
  id: string;
  title: string;
  total: number;
  done: number;
};

type SectionSidebarProps = {
  sections: SectionSummary[];
  activeIdx: number;
  onSelect: (idx: number) => void;
  className?: string;
};

export const SectionSidebar = ({
  sections,
  activeIdx,
  onSelect,
  className,
}: SectionSidebarProps) => {
  return (
    <nav className={cn("space-y-1.5", className)} aria-label="Sections">
      {sections.map((section, idx) => {
        const isActive = idx === activeIdx;
        const percent =
          section.total > 0
            ? Math.round((section.done / section.total) * 100)
            : 0;
        const isComplete = section.total > 0 && section.done === section.total;
        const isEmpty = section.total === 0;

        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(idx)}
            aria-current={isActive ? "true" : undefined}
            aria-label={`Section ${section.title}, ${section.done} sur ${section.total} étapes`}
            tabIndex={0}
            className={cn(
              "group flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all",
              isActive
                ? "border-primary-red/30 bg-accent-peach-soft/60 shadow-sm"
                : "border-transparent hover:border-border hover:bg-background-beige-dark/40"
            )}
          >
            {isEmpty ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background-beige-dark">
                <Lock
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden
                />
              </div>
            ) : (
              <ProgressRing
                value={percent}
                size={40}
                strokeWidth={4}
                indicatorClassName={cn(
                  isComplete ? "stroke-accent-sage" : "stroke-primary-red"
                )}
                trackClassName="stroke-background-beige-dark"
              >
                {isComplete ? (
                  <CheckCircle2
                    className="h-4 w-4 text-accent-sage"
                    aria-hidden
                  />
                ) : (
                  <span className="text-[10px] font-bold text-primary-green">
                    {percent}
                  </span>
                )}
              </ProgressRing>
            )}
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "truncate text-sm font-medium",
                  isActive ? "text-primary-red" : "text-primary-green"
                )}
              >
                {section.title}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {isEmpty
                  ? "Section vide"
                  : `${section.done}/${section.total} étapes`}
              </div>
            </div>
          </button>
        );
      })}
    </nav>
  );
};
