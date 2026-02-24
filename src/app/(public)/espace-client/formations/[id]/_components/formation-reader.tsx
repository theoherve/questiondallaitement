"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, Circle } from "lucide-react";
import { BlockRenderer } from "./block-renderer";
import { ProgressToggle } from "./progress-toggle";

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
  formation_blocks: Block[];
};

type FormationReaderProps = {
  formation: { id: string; title: string; description: string | null };
  sections: Section[];
  enrollmentId: string;
  completedBlockIds: string[];
  totalBlocks: number;
  completedCount: number;
};

export const FormationReader = ({
  formation,
  sections,
  enrollmentId,
  completedBlockIds: initialCompleted,
  totalBlocks,
  completedCount: initialCompletedCount,
}: FormationReaderProps) => {
  const [activeSection, setActiveSection] = useState(0);
  const [completedIds, setCompletedIds] = useState(new Set(initialCompleted));

  const completedCount = completedIds.size;
  const progressPercent =
    totalBlocks > 0 ? Math.round((completedCount / totalBlocks) * 100) : 0;

  const currentSection = sections[activeSection];

  const handleToggle = (blockId: string, completed: boolean) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (completed) {
        next.add(blockId);
      } else {
        next.delete(blockId);
      }
      return next;
    });
  };

  const getSectionProgress = (section: Section) => {
    const total = section.formation_blocks.length;
    const done = section.formation_blocks.filter((b) =>
      completedIds.has(b.id)
    ).length;
    return { total, done };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link
            href="/espace-client/formations"
            aria-label="Retour"
            tabIndex={0}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="font-serif text-xl font-bold text-primary-green sm:text-2xl">
            {formation.title}
          </h1>
          <div className="mt-1 flex items-center gap-3">
            <div className="h-2 flex-1 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary-red transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {progressPercent}%
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar: section navigation */}
        <nav className="space-y-1 lg:col-span-1" aria-label="Sections">
          {sections.map((section, idx) => {
            const { total, done } = getSectionProgress(section);
            const isActive = idx === activeSection;

            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(idx)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-primary-red/10 font-medium text-primary-red"
                    : "text-primary-green hover:bg-muted"
                }`}
                tabIndex={0}
                aria-label={`Section ${section.title}`}
                aria-current={isActive ? "true" : undefined}
              >
                {done === total && total > 0 ? (
                  <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="flex-1 truncate">{section.title}</span>
                <Badge variant="outline" className="text-[10px]">
                  {done}/{total}
                </Badge>
              </button>
            );
          })}
        </nav>

        {/* Content area */}
        <div className="space-y-6 lg:col-span-3">
          {currentSection && (
            <>
              <h2 className="font-serif text-lg font-semibold text-primary-green">
                {currentSection.title}
              </h2>

              {currentSection.formation_blocks.map((block) => (
                <Card key={block.id}>
                  <CardContent className="pt-6">
                    <BlockRenderer
                      type={block.type}
                      content={block.content}
                    />
                    <div className="mt-4 border-t pt-3">
                      <ProgressToggle
                        enrollmentId={enrollmentId}
                        blockId={block.id}
                        isCompleted={completedIds.has(block.id)}
                        onToggle={handleToggle}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

              {currentSection.formation_blocks.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Cette section ne contient pas encore de contenu.
                  </CardContent>
                </Card>
              )}

              {/* Navigation between sections */}
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
                  disabled={activeSection === 0}
                >
                  ← Section précédente
                </Button>
                <Button
                  onClick={() =>
                    setActiveSection(
                      Math.min(sections.length - 1, activeSection + 1)
                    )
                  }
                  disabled={activeSection === sections.length - 1}
                  className="bg-primary-red hover:bg-primary-red-dark"
                >
                  Section suivante →
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
