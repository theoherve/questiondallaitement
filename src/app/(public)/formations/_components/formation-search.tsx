"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { matchesFormationSearch } from "@/lib/formations/search";

const MAX_SUGGESTIONS = 6;

type SuggestionItem = { id: string; slug: string; title: string };

type Props = {
  formations: SuggestionItem[];
  value: string;
  onChange: (value: string) => void;
};

export const FormationSearch = ({ formations, value, onChange }: Props) => {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const suggestions = useMemo(() => {
    if (!value.trim()) return [];
    return formations
      .filter((f) => matchesFormationSearch(f.title, value))
      .slice(0, MAX_SUGGESTIONS);
  }, [formations, value]);

  const goToSuggestion = (item: SuggestionItem) => {
    setIsOpen(false);
    router.push(`/formations/${item.slug}`);
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node | null)) {
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = suggestions[highlightedIndex];
      if (item) goToSuggestion(item);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} onBlur={handleBlur} className="relative mb-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-green/40" />
        <Input
          type="text"
          role="combobox"
          aria-expanded={isOpen && suggestions.length > 0}
          aria-controls="formation-search-listbox"
          aria-activedescendant={
            isOpen && suggestions[highlightedIndex]
              ? `formation-search-option-${suggestions[highlightedIndex].id}`
              : undefined
          }
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setHighlightedIndex(0);
            setIsOpen(true);
          }}
          onFocus={() => value.trim() && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher une formation..."
          className="rounded-full border-primary-green/15 bg-white pl-9 pr-9 shadow-sm"
        />
        {value && (
          <button
            type="button"
            aria-label="Effacer la recherche"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-green/40 hover:text-primary-green"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && value.trim() && (
        <ul
          id="formation-search-listbox"
          role="listbox"
          className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-primary-green/10 bg-white shadow-lg"
        >
          {suggestions.length > 0 ? (
            suggestions.map((item, index) => (
              <li key={item.id} role="option" aria-selected={index === highlightedIndex}>
                <button
                  type="button"
                  id={`formation-search-option-${item.id}`}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => goToSuggestion(item)}
                  className={`block w-full truncate px-4 py-2.5 text-left text-sm transition-colors ${
                    index === highlightedIndex
                      ? "bg-primary-green/10 text-primary-green"
                      : "text-primary-green/80"
                  }`}
                >
                  {item.title}
                </button>
              </li>
            ))
          ) : (
            <li className="px-4 py-2.5 text-sm text-primary-green/50">
              Aucune formation trouvée
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
