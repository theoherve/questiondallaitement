"use client";

import { useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { motion, useReducedMotion } from "framer-motion";
import { PartyPopper, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { features } from "@/config/features";

type CompletionCelebrationProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accompagnementTitle: string;
};

const BRAND_COLORS = ["#a0283e", "#c4566a", "#f0b8a8", "#a8c4a0", "#e8c98a"];

const fireConfetti = () => {
  const defaults = {
    spread: 80,
    ticks: 120,
    gravity: 0.9,
    scalar: 0.9,
    colors: BRAND_COLORS,
  };

  confetti({
    ...defaults,
    particleCount: 60,
    origin: { x: 0.2, y: 0.8 },
    angle: 60,
  });
  confetti({
    ...defaults,
    particleCount: 60,
    origin: { x: 0.8, y: 0.8 },
    angle: 120,
  });
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 80,
      origin: { x: 0.5, y: 0.7 },
      startVelocity: 35,
    });
  }, 250);
};

export const CompletionCelebration = ({
  open,
  onOpenChange,
  accompagnementTitle,
}: CompletionCelebrationProps) => {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open || reduce) return;
    fireConfetti();
  }, [open, reduce]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-3xl border-accent-peach-soft bg-linear-to-br from-background-beige via-accent-peach-soft/40 to-accent-honey-soft/60 p-0 sm:max-w-lg">
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent-honey/30 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-accent-peach/30 blur-3xl"
          aria-hidden
        />

        <div className="relative p-6 sm:p-8">
          <DialogHeader className="space-y-3 text-center sm:text-center">
            <motion.div
              initial={reduce ? false : { scale: 0.6, rotate: -15, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 14,
                delay: 0.1,
              }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-card shadow-lg"
            >
              <PartyPopper
                className="h-8 w-8 text-primary-red"
                strokeWidth={1.8}
                aria-hidden
              />
            </motion.div>

            <DialogTitle className="font-serif text-2xl font-bold text-primary-green sm:text-3xl">
              Félicitations !
            </DialogTitle>
            <DialogDescription className="text-balance text-base text-muted-foreground">
              Vous avez terminé{" "}
              <span className="font-semibold text-primary-red">
                {accompagnementTitle}
              </span>
              . Prenez un instant pour savourer le chemin parcouru.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-card/70 px-4 py-3 text-sm text-primary-green">
            <Sparkles
              className="h-4 w-4 shrink-0 text-accent-honey"
              aria-hidden
            />
            <span>
              Les consultantes sont là si vous voulez échanger de vive voix.
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            {features.bookingEnabled && (
              <Button
                asChild
                className="flex-1 rounded-2xl bg-primary-red hover:bg-primary-red-dark"
              >
                <Link href="/reserver" tabIndex={0}>
                  Prendre un rendez-vous
                </Link>
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              className="flex-1 rounded-2xl border-primary-green/30"
            >
              <Link href="/espace-client/accompagnements" tabIndex={0}>
                Voir mes accompagnements
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
