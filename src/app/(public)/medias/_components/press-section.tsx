"use client";

import { useState } from "react";
import { ExternalLink, Newspaper, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRESS_CATEGORIES,
  PRESS_ARTICLES,
  type PressArticle,
} from "../_data/press-articles";

const INITIAL_VISIBLE = 8;

export function PressSection() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [expanded, setExpanded] = useState(false);

  const filtered =
    activeCategory === "all"
      ? PRESS_ARTICLES
      : PRESS_ARTICLES.filter((a) => a.category === activeCategory);

  const visible = expanded ? filtered : filtered.slice(0, INITIAL_VISIBLE);
  const hasMore = filtered.length > INITIAL_VISIBLE;

  return (
    <div>
      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {PRESS_CATEGORIES.map((cat) => {
          const count =
            cat.id === "all"
              ? PRESS_ARTICLES.length
              : PRESS_ARTICLES.filter((a) => a.category === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setExpanded(false);
              }}
              className={cn(
                "cursor-pointer rounded-full border px-4 py-2 font-sans text-sm transition-all duration-200",
                activeCategory === cat.id
                  ? "border-primary-red bg-primary-red/10 font-medium text-primary-red"
                  : "border-primary-green/15 text-primary-green/60 hover:border-primary-green/30 hover:text-primary-green/80"
              )}
            >
              {cat.label}
              <span className="ml-1.5 text-xs opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Articles list */}
      <div className="mt-8 divide-y divide-primary-green/8">
        {visible.map((article, i) => (
          <PressArticleRow key={`${article.title}-${i}`} article={article} />
        ))}
      </div>

      {/* Show more */}
      {hasMore && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-6 flex cursor-pointer items-center gap-2 font-sans text-sm font-medium text-primary-red transition-colors hover:text-primary-red-dark"
        >
          <ChevronDown className="h-4 w-4" />
          Voir les {filtered.length - INITIAL_VISIBLE} autres articles
        </button>
      )}

      {expanded && hasMore && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-6 flex cursor-pointer items-center gap-2 font-sans text-sm font-medium text-primary-green/50 transition-colors hover:text-primary-green/70"
        >
          <ChevronDown className="h-4 w-4 rotate-180" />
          Réduire
        </button>
      )}
    </div>
  );
}

function PressArticleRow({ article }: { article: PressArticle }) {
  const content = (
    <div className="flex items-start gap-4 py-4">
      <Newspaper
        className="mt-0.5 h-4 w-4 shrink-0 text-primary-green/25"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-medium text-primary-green/80 sm:text-base">
          {article.title}
        </p>
        <p className="mt-1 font-sans text-xs text-primary-green/45">
          {article.source}
        </p>
      </div>
      {article.href && (
        <ExternalLink
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-green/20"
          aria-hidden
        />
      )}
    </div>
  );

  if (article.href) {
    return (
      <a
        href={article.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block transition-colors hover:bg-primary-red/3"
      >
        {content}
      </a>
    );
  }

  return <div>{content}</div>;
}
