import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { RelatedPostCandidate } from "@/lib/blog/related-posts";
import { cn } from "@/lib/utils";

type Props = {
  posts: RelatedPostCandidate[];
  /**
   * `sidebar` : colonne fixe du desktop, une seule colonne étroite.
   * `inline` : repli sous l'article quand la colonne n'existe pas.
   *
   * Les deux partagent la même densité typographique — c'est justement le titre
   * en taille de titre dans une colonne étroite qui rendait l'ancienne grille
   * illisible.
   */
  variant?: "sidebar" | "inline";
  className?: string;
};

const SuggestionItem = ({ post }: { post: RelatedPostCandidate }) => (
  <li>
    <Link
      href={`/blog/${post.slug}`}
      className="group flex items-start gap-3 rounded-md p-2 -m-2 transition-colors hover:bg-background-beige-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-red"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-accent-peach-soft">
        {post.thumbnail_url && (
          <Image
            src={post.thumbnail_url}
            alt=""
            fill
            sizes="64px"
            className="object-cover"
          />
        )}
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-3 text-sm font-medium leading-snug text-primary-green transition-colors group-hover:text-primary-red">
          {post.title}
        </h3>
        {post.published_at && (
          <p className="mt-1 text-xs text-primary-green/50">
            {format(new Date(post.published_at), "d MMM yyyy", { locale: fr })}
          </p>
        )}
      </div>
    </Link>
  </li>
);

/**
 * Suggestions d'articles liés.
 *
 * Le titre reste en `text-sm` : ces items vivent dans une colonne de 18 rem, et
 * une vignette carrée de 64 px laisse une mesure de texte tenable.
 */
export const ArticleSuggestions = ({
  posts,
  variant = "sidebar",
  className,
}: Props) => {
  if (posts.length === 0) return null;

  // Les deux variantes coexistent dans le DOM (l'une masquée par breakpoint) :
  // un id partagé casserait le lien aria-labelledby.
  const headingId = `suggestions-titre-${variant}`;

  return (
    <aside
      aria-labelledby={headingId}
      className={cn(
        variant === "inline" &&
          "border-t border-primary-green/10 pt-8",
        className,
      )}
    >
      <p className="font-sans text-xs font-medium uppercase tracking-widest text-primary-red">
        À lire aussi
      </p>
      <h2
        id="suggestions-titre-${variant}"
        className="mt-2 font-serif text-lg font-semibold text-primary-green"
      >
        Sur le même sujet
      </h2>
      <ul
        className={cn(
          "mt-5 space-y-4",
          variant === "inline" && "sm:grid sm:grid-cols-2 sm:gap-x-8 sm:space-y-0 sm:gap-y-4",
        )}
      >
        {posts.map((post) => (
          <SuggestionItem key={post.id} post={post} />
        ))}
      </ul>
    </aside>
  );
};
