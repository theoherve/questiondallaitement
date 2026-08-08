/**
 * Enveloppe commune des sections de page de vente (pack et modules).
 * Extrait de pack-sections.tsx sans modification : padding, largeur maximale
 * et `scroll-mt` pour que les ancres ne passent pas sous le header.
 */
export const Section = ({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <section id={id} className={`scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 ${className}`}>
    <div className="mx-auto max-w-6xl">{children}</div>
  </section>
);
