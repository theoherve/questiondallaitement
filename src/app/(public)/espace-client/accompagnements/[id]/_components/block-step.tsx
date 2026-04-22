"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type BlockStepProps = {
  blockId: string;
  formationId: string;
  index: number;
  total: number;
  isCompleted: boolean;
  children: React.ReactNode;
};

export const BlockStep = ({
  blockId,
  formationId,
  index,
  total,
  isCompleted,
  children,
}: BlockStepProps) => {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const isLast = index === total - 1;

  const [prevCompleted, setPrevCompleted] = useState(isCompleted);
  const [isOpen, setIsOpen] = useState(!isCompleted);

  if (prevCompleted !== isCompleted) {
    setPrevCompleted(isCompleted);
    setIsOpen(!isCompleted);
  }

  useEffect(() => {
    if (!ref.current || typeof window === "undefined") return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
            try {
              localStorage.setItem(`qda:lastBlock:${formationId}`, blockId);
            } catch {
              // storage unavailable — silently ignore
            }
          }
        }
      },
      { threshold: [0.4] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [blockId, formationId]);

  return (
    <motion.article
      ref={ref}
      id={`block-${blockId}`}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.2) }}
      className="relative flex gap-4"
    >
      {/* Stepper rail */}
      <div
        className="relative flex w-8 shrink-0 flex-col items-center sm:w-10"
        aria-hidden
      >
        <div
          className={cn(
            "z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-card text-[11px] font-bold transition-colors sm:h-8 sm:w-8",
            isCompleted
              ? "border-accent-sage bg-accent-sage text-primary-green"
              : "border-primary-red/40 text-primary-red"
          )}
        >
          {isCompleted ? (
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          ) : (
            index + 1
          )}
        </div>
        {!isLast && (
          <div
            className={cn(
              "mt-1 w-0.5 flex-1 rounded-full transition-colors",
              isCompleted ? "bg-accent-sage/60" : "bg-border"
            )}
          />
        )}
      </div>

      <div className="min-w-0 flex-1 pb-6">
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.div
              key="expanded"
              initial={reduce ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={`Replier l'étape ${index + 1}`}
                tabIndex={0}
                className={cn(
                  "absolute right-2 top-2 z-10 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground shadow-sm transition-all backdrop-blur",
                  "hover:border-primary-red/40 hover:text-primary-red",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-red"
                )}
              >
                <ChevronUp className="h-3 w-3" aria-hidden />
              </button>
              {children}
            </motion.div>
          ) : (
            <motion.button
              key="collapsed"
              type="button"
              onClick={() => setIsOpen(true)}
              aria-expanded={false}
              aria-label={`Revoir l'étape ${index + 1}`}
              tabIndex={0}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "group flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-red",
                isCompleted
                  ? "border-accent-sage/40 bg-accent-sage-soft/50 hover:border-accent-sage hover:bg-accent-sage-soft"
                  : "border-border bg-card hover:border-primary-red/40 hover:bg-background-beige-dark/40"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  isCompleted
                    ? "bg-accent-sage text-primary-green"
                    : "border-2 border-primary-red/40 bg-card text-[11px] font-bold text-primary-red"
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                ) : (
                  index + 1
                )}
              </span>
              <span className="flex-1 text-sm font-medium text-primary-green">
                Étape {index + 1}
                {isCompleted ? " — terminée" : ""}
              </span>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Cliquer pour {isCompleted ? "revoir" : "ouvrir"}
              </span>
              <ChevronDown
                className="h-4 w-4 text-muted-foreground transition-transform group-hover:text-primary-red"
                aria-hidden
              />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
};
