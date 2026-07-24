/**
 * Mention statique du paiement fractionne. Klarna est propose automatiquement
 * dans le Checkout Stripe (dynamic payment methods) des qu'il est active cote
 * Dashboard et que le montant est eligible ; ce texte l'annonce en amont, sur
 * la page produit, pour rassurer avant le clic. Purement informatif : il ne
 * declenche rien et n'a pas besoin d'etre conditionne au montant — si Klarna
 * n'est pas eligible, le Checkout affiche simplement la carte seule.
 */
export const KlarnaNote = () => {
  return (
    <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden="true"
        className="inline-block rounded-sm bg-[#FFB3C7] px-1.5 py-0.5 text-[10px] font-semibold text-black"
      >
        Klarna
      </span>
      Payez en 3× ou 4× au moment du paiement
    </p>
  );
};
