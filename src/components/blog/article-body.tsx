import { Fragment } from "react";
import { splitSurveyEmbeds } from "@/lib/surveys/embeds";
import { SurveyEmbed } from "@/components/surveys/survey-embed";

type Props = { html: string; className?: string };

/**
 * Rend le corps d'un article en mêlant HTML figé et sondages vivants.
 *
 * Le HTML reste rendu tel quel — il vient de l'éditeur, il est déjà nettoyé à
 * l'écriture. Seuls les emplacements de sondage deviennent des composants
 * clients, qui vont chercher leurs chiffres à chaque visite.
 */
export const ArticleBody = ({ html, className }: Props) => {
  const segments = splitSurveyEmbeds(html);

  return (
    <div className={className}>
      {segments.map((segment, index) => (
        <Fragment key={index}>
          {segment.type === "html" ? (
            <div dangerouslySetInnerHTML={{ __html: segment.html }} />
          ) : (
            <SurveyEmbed slug={segment.slug} mode={segment.mode} />
          )}
        </Fragment>
      ))}
    </div>
  );
};
