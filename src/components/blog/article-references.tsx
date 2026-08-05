import { isBlankHtml, withSafeExternalLinks } from "@/lib/blog/references";

type Props = {
  html: string | null;
};

/**
 * Références et sources citées dans l'article.
 *
 * Placée après le corps et le rappel : c'est un appareil de vérification, pas
 * un contenu de lecture. Rendue en petit corps pour cette raison, sans
 * concurrencer la fin de l'article.
 */
export const ArticleReferences = ({ html }: Props) => {
  if (isBlankHtml(html)) return null;

  return (
    <section
      aria-labelledby="article-references-titre"
      className="mt-12 border-t border-primary-green/10 pt-8"
    >
      <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
        Vérifier
      </p>
      <h2
        id="article-references-titre"
        className="mt-2 font-serif text-xl font-bold text-primary-green"
      >
        Références et sources
      </h2>
      <div
        className="prose prose-sm mt-4 max-w-none text-primary-green/70 prose-p:text-primary-green/70 prose-li:text-primary-green/70 prose-a:text-primary-red prose-a:break-words prose-a:no-underline hover:prose-a:underline"
        dangerouslySetInnerHTML={{
          __html: withSafeExternalLinks(html as string),
        }}
      />
    </section>
  );
};
