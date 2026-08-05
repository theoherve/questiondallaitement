/**
 * Libellés de CTA par accompagnement.
 *
 * Un bouton d'achat parle de la transformation attendue, pas du mécanisme de
 * compte (« Se connecter pour acheter »). La mention technique reste en
 * sous-texte sous le bouton.
 */
export const ACCOMPAGNEMENT_CTA_LABELS: Record<string, string> = {
  "je-me-prepare-a-allaiter": "Je me prépare sereinement",
  "mon-allaitement-des-premiers-jours": "Je pose des bases solides",
  "mon-allaitement-au-fil-des-mois": "Je retrouve un allaitement apaisé",
  "je-reprends-une-activite-professionnelle": "Je prépare ma reprise sereinement",
  "la-diversification-de-mon-bebe-allaite": "Je diversifie en toute confiance",
  "je-souhaite-sevrer-mon-bebe": "Je sèvre en douceur et en confiance",
  "mon-bebe-ne-fait-pas-ses-nuits": "Je comprends ce qui empêche mon enfant de dormir",
  "les-urgences-allaitement": "Je soulage la douleur maintenant",
  "pack-mon-allaitement-sur-mesure": "Je rejoins « Mon Allaitement Sur Mesure »",
};

export const ctaLabelFor = (slug: string) => ACCOMPAGNEMENT_CTA_LABELS[slug];
