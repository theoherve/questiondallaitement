# Mega-menu au survol de « Accompagnements en ligne »

**Date :** 2026-07-23
**Statut :** validé (concept 1 retenu)

## Objectif

Au survol de l'entrée « Accompagnements en ligne » du header desktop, ouvrir un
panneau qui présente le pack en vedette + les modules, pour donner envie dès le
survol (effet « préquel »). Rendre l'exploration attractive et fluide.

## Concept retenu — Éditorial vedette + grille

- **Gauche** : carte vedette du pack (fond dégradé vert de marque, accroche,
  prix, CTA « Découvrir »). Badge « Le plus choisi ».
- **Droite** : grille des modules individuels (vignette + titre + prix), ordonnés
  selon `MODULE_ORDER`.
- **Pied** : lien « Voir tous les accompagnements → » vers `/accompagnements`.

## Décisions

1. **Chargement : préchargement au montage.** Le layout public (server component)
   fetch la liste et la passe au `Header` en prop. Ouverture instantanée au
   survol, aucun spinner.
2. **Mobile : lien simple.** Pas de survol sur tactile → l'entrée reste un simple
   lien vers `/accompagnements` dans le menu plein écran (pas d'accordéon).
3. **Panneau sans pictogramme.** À l'intérieur du panneau, aucune icône
   décorative : seules les vraies vignettes photo (`thumbnail_url`) sont
   affichées ; repli en aplat dégradé si absente.
4. **Indépendant du feature flag booking.** Le contenu du panneau est la liste
   complète des `formations` publiées, comme la page `/accompagnements`.

## Architecture

- `src/config/accompagnements.ts` (nouveau) — centralise `PACK_SLUG`,
  `MODULE_ORDER` (aujourd'hui dupliqués dans la page et la home) + une table
  `MODULE_ACCENTS` (dégradé + icône lucide de repli quand pas de `thumbnail_url`).
- `src/lib/accompagnements/nav-preview.ts` (nouveau) — `getAccompagnementsNavPreview()` :
  requête Supabase minimale (`title, slug, short_description, thumbnail_url,
  price_cents, currency`), publiée + non supprimée. Retourne
  `{ pack, modules }` typés et sérialisables, ordonnés par `MODULE_ORDER`.
  En cas d'erreur → `{ pack: null, modules: [] }` (le header dégrade en simple lien).
- `src/components/layout/accompagnements-mega-menu.tsx` (nouveau, client) — le
  trigger (Link vers `/accompagnements`) + le panneau au survol. Intention de
  survol (délais ouverture/fermeture), ouverture au focus clavier, fermeture sur
  Échap et changement de route, `prefers-reduced-motion` respecté (framer-motion).
- `src/components/layout/header.tsx` — nouvelle prop `accompagnements` ; l'entrée
  `/accompagnements` du nav desktop devient le mega-menu, les autres restent des
  `Link`. Mobile : accordéon dépliable pour cette entrée.
- `src/app/(public)/layout.tsx` — fetch `getAccompagnementsNavPreview()` et passe
  au `Header`.

## Accessibilité / qualité

- Le trigger reste un vrai lien vers `/accompagnements` (clic = navigation).
- `aria-expanded` sur le trigger, panneau atteignable au clavier, `Échap` ferme,
  focus visible.
- Fallback gracieux si données vides (simple lien, pas de panneau).
- Vignettes : `next/image` si `thumbnail_url`, sinon dégradé + icône.

## Hors périmètre

- Pas de refonte de la page `/accompagnements` ni de la home (juste dédup des
  constantes `PACK_SLUG` / `MODULE_ORDER`).
- Pas de nouveau composant shadcn `navigation-menu` (implémentation ciblée).
