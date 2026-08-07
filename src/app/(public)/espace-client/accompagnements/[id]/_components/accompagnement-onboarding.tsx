"use client";

import { useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BookmarkCheck,
  CalendarClock,
  CircleCheckBig,
  HandHeart,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type AccompagnementOnboardingProps = {
  enrollmentId?: string;
  accompagnementTitle: string;
  hasProgress: boolean;
  readOnly?: boolean;
};

const STORAGE_PREFIX = "qda:welcomed:";

const subscribeNoop = () => () => {};

const STEPS = [
  {
    icon: HandHeart,
    title: "Avancez à votre rythme",
    description:
      "Tout est sauvegardé automatiquement — revenez quand vous en avez besoin.",
  },
  {
    icon: CircleCheckBig,
    title: "Cochez vos étapes terminées",
    description:
      "Suivez votre progression étape par étape pour ne rien manquer.",
  },
  {
    icon: BookmarkCheck,
    title: "Gardez vos favoris à portée",
    description:
      "Marquez les passages utiles pour les retrouver en un clin d'œil.",
  },
  {
    icon: CalendarClock,
    title: "Échangez quand vous voulez",
    description:
      "Une question ? Prenez rendez-vous avec une consultante à tout moment.",
  },
];

export const AccompagnementOnboarding = ({
  enrollmentId,
  accompagnementTitle,
  hasProgress,
  readOnly = false,
}: AccompagnementOnboardingProps) => {
  const [dismissed, setDismissed] = useState(false);
  const reduce = useReducedMotion();

  const shouldShow = useSyncExternalStore(
    subscribeNoop,
    () => {
      if (readOnly || !enrollmentId || hasProgress) return false;
      try {
        return (
          localStorage.getItem(`${STORAGE_PREFIX}${enrollmentId}`) !== "true"
        );
      } catch {
        return false;
      }
    },
    () => false
  );

  const open = shouldShow && !dismissed;

  const handleClose = () => {
    if (enrollmentId) {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${enrollmentId}`, "true");
      } catch {
        // ignore
      }
    }
    setDismissed(true);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent className="overflow-hidden rounded-3xl border-accent-peach-soft bg-linear-to-br from-background-beige via-accent-cream to-accent-peach-soft/70 p-0 sm:max-w-lg">
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent-peach/20 blur-3xl"
          aria-hidden
        />
        <div className="relative p-6 sm:p-8">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary-red">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Bienvenue
            </div>
            <DialogTitle className="font-serif text-2xl font-bold text-primary-green sm:text-3xl">
              Prêt·e à commencer ?
            </DialogTitle>
            <DialogDescription className="text-balance text-sm text-muted-foreground sm:text-base">
              Voici quelques repères pour profiter pleinement de{" "}
              <span className="font-medium text-primary-green">
                {accompagnementTitle}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <ul className="mt-6 space-y-3">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <motion.li
                  key={step.title}
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + idx * 0.07 }}
                  className="flex items-start gap-3 rounded-2xl border border-border/40 bg-card/80 p-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-peach-soft">
                    <Icon
                      className="h-4 w-4 text-primary-red"
                      aria-hidden
                    />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-primary-green">
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </ul>

          <Button
            onClick={handleClose}
            className="mt-6 w-full rounded-2xl bg-primary-red hover:bg-primary-red-dark"
          >
            Commencer mon parcours
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
