"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, LayoutList, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ProgressRing } from "@/components/espace-client/progress-ring";
import { BlockRenderer } from "./block-renderer";
import { ProgressToggle } from "./progress-toggle";
import { BlockStep } from "./block-step";
import { BookmarkToggle } from "./bookmark-toggle";
import { CompletionCelebration } from "./completion-celebration";
import { AccompagnementOnboarding } from "./accompagnement-onboarding";
import { ResourcesPanel, type AccompagnementResource } from "./resources-panel";
import { SectionSidebar, type SectionSummary } from "./section-sidebar";

type Block = {
  id: string;
  type: string;
  content: unknown;
  position: number;
};

type Section = {
  id: string;
  title: string;
  position: number;
  accompagnement_blocks: Block[];
};

type AccompagnementReaderProps = {
  accompagnement: { id: string; title: string; description: string | null };
  sections: Section[];
  enrollmentId?: string;
  completedBlockIds: string[];
  bookmarkedBlockIds?: string[];
  resources?: AccompagnementResource[];
  totalBlocks: number;
  completedCount?: number;
  readOnly?: boolean;
  backHref?: string;
};

const ENCOURAGEMENTS = [
  "Bien joué !",
  "Continuez comme ça !",
  "Vous avancez bien.",
  "Joli rythme !",
  "Chaque étape compte.",
];

export const AccompagnementReader = ({
  accompagnement,
  sections,
  enrollmentId,
  completedBlockIds: initialCompleted,
  bookmarkedBlockIds = [],
  resources = [],
  totalBlocks,
  readOnly = false,
  backHref = "/espace-client/accompagnements",
}: AccompagnementReaderProps) => {
  const [activeSection, setActiveSection] = useState(0);
  const [completedIds, setCompletedIds] = useState(
    () => new Set(initialCompleted)
  );
  const [bookmarkedIds, setBookmarkedIds] = useState(
    () => new Set(bookmarkedBlockIds)
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const reduce = useReducedMotion();

  const completedCount = completedIds.size;
  const progressPercent =
    totalBlocks > 0 ? Math.round((completedCount / totalBlocks) * 100) : 0;

  const sectionSummaries: SectionSummary[] = useMemo(
    () =>
      sections.map((section) => ({
        id: section.id,
        title: section.title,
        total: section.accompagnement_blocks.length,
        done: section.accompagnement_blocks.filter((b) => completedIds.has(b.id))
          .length,
      })),
    [sections, completedIds]
  );

  const currentSection = sections[activeSection];

  const handleToggle = (blockId: string, completed: boolean) => {
    const wasIn = completedIds.has(blockId);
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (completed) next.add(blockId);
      else next.delete(blockId);
      return next;
    });

    if (readOnly || !completed || wasIn) return;

    const newCount = completedIds.size + 1;

    if (newCount === totalBlocks) {
      setCelebrationOpen(true);
      return;
    }

    const section = sections.find((s) =>
      s.accompagnement_blocks.some((b) => b.id === blockId)
    );
    if (section) {
      const sectionDoneNow =
        section.accompagnement_blocks.filter(
          (b) => b.id === blockId || completedIds.has(b.id)
        ).length;
      if (
        section.accompagnement_blocks.length > 0 &&
        sectionDoneNow === section.accompagnement_blocks.length
      ) {
        toast.success(`Section « ${section.title} » terminée`, {
          description: "Une étape de plus derrière vous.",
          icon: <PartyPopper className="h-4 w-4" aria-hidden />,
        });
        return;
      }
    }

    if (newCount > 0 && newCount % 3 === 0) {
      const msg =
        ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
      toast.success(msg, {
        description: `${newCount}/${totalBlocks} étapes complétées`,
      });
    }
  };

  const handleBookmarkToggle = (blockId: string, bookmarked: boolean) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (bookmarked) next.add(blockId);
      else next.delete(blockId);
      return next;
    });
  };

  const selectSection = (idx: number) => {
    setActiveSection(idx);
    setDrawerOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({
        top: 0,
        behavior: reduce ? "auto" : "smooth",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header — back + title + global progress */}
      <header className="flex flex-col gap-4 rounded-3xl bg-linear-to-br from-background-beige-dark/60 via-background-beige to-accent-peach-soft/60 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="rounded-full bg-card shadow-sm hover:bg-background-beige"
        >
          <Link href={backHref} aria-label="Retour" tabIndex={0}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-red">
            Accompagnement
          </p>
          <h1 className="mt-1 truncate font-serif text-xl font-bold text-primary-green sm:text-2xl">
            {accompagnement.title}
          </h1>
          {totalBlocks > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {completedCount}/{totalBlocks} étapes complétées
            </p>
          )}
        </div>
        {totalBlocks > 0 && (
          <ProgressRing
            value={progressPercent}
            size={72}
            strokeWidth={7}
            ariaLabel={`Progression ${progressPercent}%`}
          >
            <span className="font-serif text-lg font-bold text-primary-green">
              {progressPercent}%
            </span>
          </ProgressRing>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-border/50 bg-card p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-2 px-2 pt-1">
              <LayoutList className="h-4 w-4 text-primary-red" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-green">
                Sommaire
              </span>
            </div>
            <SectionSidebar
              sections={sectionSummaries}
              activeIdx={activeSection}
              onSelect={selectSection}
            />
            {resources.length > 0 && (
              <div className="mt-3 border-t border-border/50 pt-3">
                <ResourcesPanel resources={resources} accompagnementId={accompagnement.id} />
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0">
          {/* Mobile sommaire trigger */}
          <div className="mb-4 lg:hidden">
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between rounded-2xl border-border/60 bg-card"
                >
                  <span className="flex items-center gap-2">
                    <LayoutList className="h-4 w-4 text-primary-red" />
                    {currentSection?.title ?? "Sommaire"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {activeSection + 1}/{sections.length}
                  </span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[85vw] max-w-sm overflow-y-auto bg-background-beige"
              >
                <SheetHeader className="border-b border-border/50">
                  <SheetTitle className="flex items-center gap-2 font-serif text-primary-green">
                    <LayoutList
                      className="h-4 w-4 text-primary-red"
                      aria-hidden
                    />
                    Sommaire
                  </SheetTitle>
                </SheetHeader>
                <div className="space-y-4 p-4">
                  <SectionSidebar
                    sections={sectionSummaries}
                    activeIdx={activeSection}
                    onSelect={selectSection}
                  />
                  {resources.length > 0 && (
                    <div className="border-t border-border/50 pt-3">
                      <ResourcesPanel resources={resources} accompagnementId={accompagnement.id} />
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <AnimatePresence mode="wait">
            {currentSection && (
              <motion.section
                key={currentSection.id}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-serif text-xl font-semibold text-primary-green sm:text-2xl">
                    {currentSection.title}
                  </h2>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    Section {activeSection + 1}/{sections.length}
                  </span>
                </div>

                {currentSection.accompagnement_blocks.length > 0 ? (
                  <div>
                    {currentSection.accompagnement_blocks.map((block, idx) => (
                      <BlockStep
                        key={block.id}
                        blockId={block.id}
                        accompagnementId={accompagnement.id}
                        index={idx}
                        total={currentSection.accompagnement_blocks.length}
                        isCompleted={completedIds.has(block.id)}
                      >
                        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                          <BlockRenderer
                            type={block.type}
                            content={block.content}
                            accompagnementId={accompagnement.id}
                            blockId={block.id}
                          />
                          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                            <div className="flex items-center gap-2">
                              <ProgressToggle
                                enrollmentId={enrollmentId}
                                blockId={block.id}
                                isCompleted={completedIds.has(block.id)}
                                onToggle={handleToggle}
                                readOnly={readOnly}
                              />
                              <BookmarkToggle
                                enrollmentId={enrollmentId}
                                blockId={block.id}
                                isBookmarked={bookmarkedIds.has(block.id)}
                                onToggle={handleBookmarkToggle}
                                readOnly={readOnly}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Étape {idx + 1} sur{" "}
                              {currentSection.accompagnement_blocks.length}
                            </span>
                          </div>
                        </div>
                      </BlockStep>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-background-beige py-10 text-center text-sm text-muted-foreground">
                    Cette section ne contient pas encore de contenu.
                  </div>
                )}

                {/* Bottom nav */}
                <div className="flex items-center justify-between gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() =>
                      selectSection(Math.max(0, activeSection - 1))
                    }
                    disabled={activeSection === 0}
                    className="rounded-2xl"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Section précédente</span>
                    <span className="sm:hidden">Précédent</span>
                  </Button>
                  <Button
                    onClick={() =>
                      selectSection(
                        Math.min(sections.length - 1, activeSection + 1)
                      )
                    }
                    disabled={activeSection === sections.length - 1}
                    className="rounded-2xl bg-primary-red hover:bg-primary-red-dark"
                  >
                    <span className="hidden sm:inline">Section suivante</span>
                    <span className="sm:hidden">Suivant</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </div>

      <CompletionCelebration
        open={celebrationOpen}
        onOpenChange={setCelebrationOpen}
        accompagnementTitle={accompagnement.title}
      />

      <AccompagnementOnboarding
        enrollmentId={enrollmentId}
        accompagnementTitle={accompagnement.title}
        hasProgress={initialCompleted.length > 0}
        readOnly={readOnly}
      />
    </div>
  );
};
