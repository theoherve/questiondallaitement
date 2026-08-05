type Props = {
  title: string | null;
  text: string | null;
};

const DEFAULT_TITLE = "À retenir";

/**
 * Encadré de rappel en fin d'article.
 *
 * Texte simple, pas de HTML : la rédactrice saisit des paragraphes, les sauts de
 * ligne sont respectés tels quels. Un encadré sans contenu n'est pas affiché —
 * la plupart des articles n'en auront pas.
 */
export const ArticleConclusion = ({ title, text }: Props) => {
  const paragraphs = (text ?? "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <section
      aria-labelledby="article-conclusion-titre"
      className="mt-12 border-l-4 border-primary-red bg-accent-peach-soft/60 px-6 py-6 sm:px-8"
    >
      <h2
        id="article-conclusion-titre"
        className="font-serif text-xl font-bold text-primary-green"
      >
        {title?.trim() || DEFAULT_TITLE}
      </h2>
      <div className="mt-3 space-y-3">
        {paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className="whitespace-pre-line text-primary-green/80 leading-relaxed"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
};
