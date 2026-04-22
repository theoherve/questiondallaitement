"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Play, Sparkles } from "lucide-react";
import { ProgressRing } from "./progress-ring";

type Candidate = {
  formationId: string;
  title: string;
  progressPercent: number;
};

type ResumeBannerProps = {
  candidate: Candidate;
};

export const ResumeBanner = ({ candidate }: ResumeBannerProps) => {
  const reduce = useReducedMotion();
  const baseHref = `/espace-client/accompagnements/${candidate.formationId}`;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    try {
      const blockId = localStorage.getItem(
        `qda:lastBlock:${candidate.formationId}`
      );
      if (blockId) {
        e.preventDefault();
        window.location.href = `${baseHref}#block-${blockId}`;
      }
    } catch {
      // ignore — fallback to default Link behavior
    }
  };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl border border-accent-peach-soft bg-linear-to-br from-accent-peach-soft via-background-beige to-accent-honey-soft p-5 shadow-sm sm:p-6"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent-peach/20 blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <ProgressRing
            value={candidate.progressPercent}
            size={72}
            strokeWidth={7}
            indicatorClassName="stroke-primary-red"
            trackClassName="stroke-white/80"
          >
            <span className="text-sm font-bold text-primary-green">
              {candidate.progressPercent}%
            </span>
          </ProgressRing>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary-red">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Reprenez où vous en étiez
            </div>
            <p className="mt-1 font-serif text-lg font-semibold text-primary-green sm:text-xl">
              {candidate.title}
            </p>
          </div>
        </div>
        <Link
          href={baseHref}
          onClick={handleClick}
          tabIndex={0}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-red px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-red"
        >
          <Play className="h-4 w-4 fill-current" aria-hidden />
          Continuer
        </Link>
      </div>
    </motion.div>
  );
};
