# Pages de vente des 8 accompagnements-modules

**Date :** 2026-08-08
**Statut :** Design validé, prêt pour plan d'implémentation
**Périmètre :** les 8 accompagnements de `MODULE_ORDER`. Le pack est refactoré à iso-rendu, sa copy n'est pas touchée.

## 1. Objectif

Les 8 modules sont aujourd'hui rendus par la fiche produit générique de
`src/app/(public)/accompagnements/[slug]/page.tsx` (lignes 179-343) : un badge, la
`long_description_html` importée de Wix, une liste de sections cliquable et une sidebar prix.
Aucune structure de persuasion.

Le pack, lui, a reçu une page de vente long-form en juillet 2026
(voir `2026-07-23-pack-sales-page-design.md`). On étend ce traitement aux 8 modules, en
adaptant la structure : le pack vend une couverture globale, un module vend **un moment précis
de la vie d'une mère**.

## 2. Contraintes

- Aucun changement d'architecture technique. Next.js 16 App Router, Tailwind v4, shadcn/radix,
  Supabase, Stripe Checkout via `PurchaseButton` → `purchaseAccompagnement`.
- URL inchangées : `/accompagnements/<slug>`. Aucun redirect, aucun lien à migrer.
- Charte existante conservée. Aucun token de marque nouveau.
- Typographie visiteur : pas de tiret cadratin (règle de projet).

## 3. État réel du contenu en base

Relevé depuis `supabase/seed_formations_content.sql` (import Wix). Le contenu va être refait,
mais la volumétrie et la nature des blocs resteront du même ordre.

| Slug | Chapitres | Vidéos | Prix |
|---|---|---|---|
| `mon-bebe-ne-fait-pas-ses-nuits` | 15 | 210 | 97 € |
| `mon-allaitement-des-premiers-jours` | 7 | 21 | 75 € |
| `mon-allaitement-au-fil-des-mois` | 6 | 25 | 75 € |
| `je-reprends-une-activite-professionnelle` | 6 | 17 | 75 € |
| `je-souhaite-sevrer-mon-bebe` | 6 | 18 | 75 € |
| `je-me-prepare-a-allaiter` | 5 | 14 | 75 € |
| `la-diversification-de-mon-bebe-allaite` | 5 | 15 | 75 € |
| `les-urgences-allaitement` | 4 | 5 | 27 € |

Deux conséquences pour le design :

1. Les compteurs justifient le prix sans argumentaire. Ils sont affichés en haut de page.
2. Beaucoup de titres de chapitres sont déjà formulés en douleur cliente (« Comment remédier à
   mes crevasses ? », « J'ai mal », « Je veux plus de lait », « Je suis inquiète pour mon bébé »).
   Ils sont affichés tels quels, sans réécriture marketing.

## 4. Approche retenue

**Un template piloté par contenu**, pas 8 pages sur-mesure.

Les primitives visuelles du pack sont extraites vers `_components/sales/`, partagées entre le
pack et les modules. Un composant `ModuleSalesPage` compose les sections ; le texte de chaque
module vit dans un fichier sérialisable dédié.

Alternatives écartées :
- *8 pages sur-mesure* : duplication ×8 de toute évolution.
- *Template avec slots d'override React* : souplesse dont aucun des 8 modules n'a besoin
  aujourd'hui. Les sections optionnelles suffisent pour le cas « urgences ».

### Arborescence

```
src/app/(public)/accompagnements/_components/
  sales/                      primitives partagées (extraites de pack/)
    section.tsx               wrapper : fond alterné + ScrollReveal
    sales-hero.tsx
    sales-faq.tsx
    sales-side-cta.tsx
    sales-pricing.tsx
    sales-instructor.tsx
    sales-testimonials.tsx
  module/
    module-sales-page.tsx     orchestrateur (server component)
    module-sections.tsx       sections propres au module
    module-program.tsx        programme lu en DB + sales_hook
    pack-upsell.tsx
    content/
      types.ts                type ModuleContent
      shared.ts               défauts communs
      <slug>.ts               × 8
      index.ts                MODULE_CONTENT: Record<slug, ModuleContent>
  pack/                       consomme sales/*, garde pack-content.ts
```

Le refactor du pack vers `sales/` se fait **en premier et à iso-rendu** : c'est du code en
production qui fonctionne. Aucune modification de `pack-content.ts`.

`ScrollReveal` (`@/components/public/scroll-reveal`) est réutilisé tel quel.

## 5. Structure de page

Ordre par défaut. Les sections marquées *optionnelle* peuvent être absentes du fichier de
contenu d'un module ; elles ne sont alors pas rendues.

| # | Section | Contenu | Source |
|---|---|---|---|
| 1 | Hero | accent `MODULE_ACCENTS`, eyebrow, H1 = promesse, sous-titre, prix, CTA `ctaLabelFor`, 3 réassurances | contenu + DB |
| 2 | Barre de preuve | « 15 chapitres · 210 vidéos · accès à vie » | DB |
| 3 | Le problème *(optionnelle)* | 4-6 points spécifiques au moment du module | contenu |
| 4 | Pourquoi les conseils habituels ne suffisent pas *(optionnelle)* | 2 paragraphes + 3 bullets | contenu |
| 5 | Programme | chapitres DB, badges de type de bloc, `sales_hook` | DB |
| 6 | Ce qui devient possible | scénarios de transformation | contenu |
| 7 | C'est pour vous si / ce n'est pas pour vous si | 2 colonnes | contenu |
| 8 | À quel moment | timeline des 8 modules, courant surligné | `MODULE_ORDER` |
| 9 | Comment ça marche | 3 étapes | shared |
| 10 | Votre consultante | bio + credentials | DB + shared |
| 11 | Témoignages *(optionnelle)* | placeholders balisés | contenu |
| 12 | Tarif | prix, inclus, garantie, CTA | DB + shared |
| 13 | Upsell pack | « les 7 autres pour X € de plus » | calculé DB |
| 14 | FAQ | communes + spécifiques au module | shared + contenu |
| 15 | CTA final | rappel + CTA | contenu |

`sales-side-cta` (carte flottante desktop, apparaît au scroll) est réutilisé avec les mêmes
ancres, adaptées aux ids présents.

**Variante courte pour `les-urgences-allaitement`** (27 €, 4 chapitres) : sections 3, 4 et 11
absentes du fichier de contenu. Le parcours est 1-2-5-6-7-8-9-10-12-13-14-15. Une cliente en
douleur aiguë n'a pas besoin de six paragraphes avant le remède.

### Section 7 — dis-qualification

Deux colonnes explicites. Sur un produit ciblé, dire à qui le module ne s'adresse pas augmente
la conversion des bons profils et réduit les demandes de remboursement.

### Section 8 — maillage interne

La timeline liste les 8 modules dans l'ordre chronologique de `MODULE_ORDER`, surligne le module
courant et lie vers les 7 autres plus le pack. Chaque page de vente devient un point d'entrée
vers le reste du catalogue. Bénéfice SEO et navigation, sans contenu supplémentaire à rédiger.

### Section 13 — upsell pack

Delta calculé en base, sur le modèle de `savingsCents`
(`pack-sales-page.tsx` lignes 70-78) : prix du pack moins prix du module courant. Le bloc est
masqué si le delta n'est pas favorable ou si le pack n'est pas publié.

## 6. Programme (section 5)

- Chapitres réels lus depuis `accompagnement_sections`, triés par `position`, numérotés.
- Titres DB affichés tels quels.
- Compteur de blocs par `block_type` (`video`, `download`, `text`, `image`, `quiz`) avec icône.
- `sales_hook` rendu en sous-texte discret quand il est rempli ; rien sinon.
- Au-delà de 8 chapitres, les 6 premiers sont visibles et le reste se déplie (cas du sommeil,
  15 chapitres).
- Les chapitres ne sont pas cliquables : c'est une page de vente, pas un sommaire de cours.

## 7. Migration `sales_hook`

`supabase/migrations/00079_accompagnement_section_sales_hook.sql` :

```sql
ALTER TABLE accompagnement_sections ADD COLUMN sales_hook text;
```

Nullable, aucun backfill : la page fonctionne avec la colonne vide. Le champ est ajouté à
`admin/accompagnements/_components/section-editor.tsx` et propagé dans les actions serveur de
`admin/accompagnements/actions.ts` qui écrivent `accompagnement_sections`.

Ce choix (colonne DB plutôt que map dans le fichier de contenu) est motivé par la refonte de
contenu à venir : une accroche indexée sur le titre de chapitre disparaîtrait silencieusement au
premier renommage.

## 8. Routage et données

Dans `accompagnements/[slug]/page.tsx` :

- `slug === PACK_SLUG` → `PackSalesPage` (inchangé)
- `slug ∈ MODULE_ORDER` → `ModuleSalesPage`
- sinon → fiche générique actuelle, conservée comme filet pour un accompagnement futur

La requête existante gagne `sales_hook` sur les sections et récupère, en plus, le prix du pack
pour l'upsell. `long_description_html` n'est plus rendu sur ces 8 pages : la page de vente le
remplace.

Tout est server-rendered sauf la carte flottante, l'accordéon FAQ et le dépliage du programme.

## 9. Type de contenu

```ts
type ModuleContent = {
  hero: { eyebrow: string; titleOverride: string; subtitle: string; reassurances: string[] };
  problem?: { title: string; intro: string; points: string[] };
  promise?: { title: string; paragraphs: string[]; bullets: string[] };
  program: { title: string; intro: string };
  outcomes: { title: string; items: string[] };
  fit: { title: string; forYou: string[]; notForYou: string[] };
  moment: { title: string; intro: string };
  testimonials?: { title: string; items: { quote: string; author: string; detail: string }[] };
  pricing: { title: string; subtitle: string };
  faq: { items: { q: string; a: string }[] };   // spécifiques ; les communes viennent de shared
  finalCta: { title: string; subtitle: string; ctaLabel: string };
};
```

`shared.ts` porte ce qui ne varie pas : les 3 étapes de « comment ça marche », les réassurances
par défaut, la liste des inclus, la garantie, les FAQ communes, le fallback de bio consultante.
Les 8 fichiers ne contiennent que le spécifique.

## 10. Copy

Rédigée dans le ton du pack : clinique, fondée sur l'observation, non culpabilisante. Chaque
module est ancré sur son moment et ses douleurs propres, sans recyclage d'un module à l'autre.

Deux catégories de texte sont des placeholders à remplacer avant mise en ligne, balisés
`// PLACEHOLDER` :

- Les témoignages, spécifiques à chaque module (les vrais verbatims seront fournis ensuite).
- La garantie « satisfait ou remboursé sous 14 jours », reprise du pack sur décision explicite.
  Elle y porte déjà un commentaire `PLACEHOLDER JURIDIQUE` : la mention de rétractation avait été
  retirée du tunnel d'achat, et cette promesse rouvre le risque de remboursement sur un contenu
  numérique à accès immédiat. La reprendre sur 8 pages de plus élargit ce risque. Formulation à
  faire valider.

## 11. Tests

Vitest sur le calcul pur, pas sur le rendu :

- delta de prix de l'upsell pack, y compris le cas où le bloc doit être masqué ;
- compteurs de blocs par `block_type` ;
- repli quand un module n'a aucune section publiée.

## 12. Hors périmètre

- Vrais témoignages et validation juridique de la garantie.
- Tracking et A/B testing.
- Refonte du contenu pédagogique lui-même.
- La fiche générique conservée pour les slugs hors `MODULE_ORDER` n'est pas améliorée.

## 13. Critères de succès

- Les 8 pages rendent la structure long-form ; le pack est visuellement inchangé après refactor.
- URL et tunnel de paiement identiques.
- Le programme reflète la base : refaire le contenu met les pages à jour sans toucher au code.
- `sales_hook` éditable depuis le back-office, page correcte quand il est vide.
- Aucun token de marque nouveau ; mobile-first.
- Les placeholders sont trouvables par recherche textuelle avant mise en ligne.
