import Image from "next/image";

/**
 * Vignette d'un lien.
 *
 * Les vignettes du site vivent dans /public/liens et passent par next/image.
 * Une URL absolue saisie depuis l'administration, elle, peut pointer vers
 * n'importe quel hôte : next/image lèverait une erreur pour tout domaine absent
 * de `remotePatterns`, et une seule vignette casserait la page entière. Ces
 * URL-là sont donc rendues telles quelles.
 */

type BioThumbnailProps = {
  src: string;
  /** Taille du carré rendu, en pixels. */
  size: number;
  className?: string;
};

export const BioThumbnail = ({ src, size, className }: BioThumbnailProps) => {
  const isLocal = src.startsWith("/");

  if (isLocal) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className={className}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- hôte inconnu, voir plus haut
    <img src={src} alt="" width={size} height={size} loading="lazy" className={className} />
  );
};
