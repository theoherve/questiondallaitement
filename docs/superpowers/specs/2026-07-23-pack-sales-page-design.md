# Page de vente du pack — refonte structure « Ascend »

**Date :** 2026-07-23
**Statut :** Design validé, prêt pour plan d'implémentation
**Périmètre :** Page de vente du pack `pack-essentiel-allaitement` (accompagnements en ligne uniquement).

## 1. Objectif

Transformer la page du pack — aujourd'hui rendue par le template générique `formations/[slug]`
(orienté événement : dates, places restantes, présentiel) — en une véritable page de vente
long-form suivant la structure de persuasion de la page de référence
[maelanefaure.fr/ascend](https://maelanefaure.fr/ascend).

**Priorité : la structure.** On adapte le flow de persuasion d'Ascend, pas son identité visuelle.

## 2. Contraintes (non négociables)

- **Pas de changement d'architecture technique.** Stack conservée : Next.js 16 App Router,
  Tailwind v4, framer-motion, shadcn/radix, Stripe, Supabase.
- **Charte existante conservée.** On réutilise les tokens de marque déjà en place
  (`--color-primary-red` `#a0283e`, `--color-primary-green` `#203634`,
  `--color-background-beige` `#fff8f6`, accents peach/sage/honey, `font-serif` = Noto Serif).
  On **n'adopte pas** la palette marron/rose du document source (rebranding hors périmètre).
- **Tunnel de paiement inchangé.** On conserve le flux actuel :
  `RegisterButton` → server action `registerForEvent` → **redirection Stripe Checkout**.
  Pas de Stripe Elements embarqué (ce serait un changement d'architecture).
  Le paiement 3x/4x reste géré par la configuration Stripe Checkout, pas par le code.
- **CRM inchangé.** L'intégration existante (route `api/brevo/sync`) reste telle quelle.

## 3. Hors périmètre (reportés en v2)

- Pop-up exit-intent + capture email de secours.
- Scripts de tracking (GTM / GA4 / Meta Pixel).
- Migration de la palette de marque vers les couleurs du document source.

Ces éléments sont des features indépendantes, traitables séparément après la structure.

## 4. Approche retenue

**Special-case dans `formations/[slug]`.** Quand `slug === PACK_SLUG`
(`pack-essentiel-allaitement`), la page rend un composant dédié `<PackSalesPage>` au lieu du
template événement générique. Les autres formations restent inchangées.

- URL `/formations/pack-essentiel-allaitement` **inchangée** → les CTA existants de la home
  continuent de fonctionner.
- Aucune nouvelle route, aucun redirect, aucune migration de lien.
- La logique riche est isolée dans son propre arbre de composants.

Alternatives écartées :
- *Nouvelle route `/pack`* : casse les liens existants, nécessite des redirects.
- *Enrichir le template générique pour toutes les formations* : les autres événements sont
  pilotés par date/places/présentiel ; les alourdir serait inapproprié.

## 5. Structure des sections (Ascend → pack allaitement)

Composants modulaires sous `src/app/(public)/formations/_components/pack/`, mobile-first.

| # | Section | Contenu | Source |
|---|---------|---------|--------|
| 1 | **Hero** | Titre serif, sous-titre, prix, CTA rouge, réassurance (IBCLC + accès immédiat en vert) | event DB |
| 2 | **Le problème** | Le flou / les galères d'allaitement | placeholder |
| 3 | **La promesse** | La transformation visée | placeholder |
| 4 | **Contenu du pack** | Grid des 8 modules réels (icônes + accents existants `MODULE_ACCENTS`) | DB (`MODULE_ORDER`) |
| 5 | **Comment ça marche** | Accès immédiat, à vie, à ton rythme | placeholder |
| 6 | **Pour qui / tu te reconnais** | Scénarios de reconnaissance | placeholder |
| 7 | **Ta formatrice** | Bio IBCLC (consultante liée à l'event) | DB + placeholder |
| 8 | **Témoignages** | Grid, badges « vérifié » en vert | placeholder |
| 9 | **Tarif** | Prix rouge, 3x/4x sans frais, garantie, CTA → flux Stripe actuel | event DB + `RegisterButton` |
| 10 | **FAQ** | Accordéons animés | placeholder |
| 11 | **CTA final** | Rappel bénéfices + CTA | — |

**Éléments transverses :**
- **Header sticky** avec CTA « Rejoindre le pack » apparaissant au scroll (transparence/blur subtil).
- **Menu d'ancrage** : Programme / Témoignages / FAQ.
- **Animations au scroll** : fade-in + remontée des blocs via framer-motion (déjà installé),
  ou Intersection Observer léger.

## 6. Découpage en composants

Chaque section = un composant isolé, une responsabilité, testable indépendamment.

- `PackSalesPage` (server) — orchestre le fetch et compose les sections.
- `PackHero`, `PackProblem`, `PackPromise`, `PackModules`, `PackHowItWorks`,
  `PackForWho`, `PackInstructor`, `PackTestimonials`, `PackPricing`, `PackFaq`, `PackFinalCta`.
- `PackStickyHeader` (client) — CTA flottant + ancres.
- `PackFaq` (client) — accordéons (radix Accordion existant).
- Wrappers d'animation (client) — `Reveal`/`FadeIn` réutilisable.
- `pack-content.ts` — contenu placeholder co-localisé (textes problème/promesse/pour qui/
  témoignages/FAQ/bio), 100 % sérialisable, facile à remplacer par les vrais textes ensuite.

## 7. Flux de données

`PackSalesPage` (server component) :
1. Fetch de l'`event` pack (requête existante : `events` + `consultants`/`profiles`).
2. Fetch des 8 events modules par slug (`MODULE_ORDER`), triés via `sortByModuleOrder`.
3. Passe les données aux sections. Le contenu éditorial vient de `pack-content.ts`.
4. Le paiement réutilise `RegisterButton` tel quel (inchangé).

Tout est rendu côté serveur, sauf : wrappers d'animation, accordéon FAQ, header sticky (client).

## 8. Contenu placeholder

Contenu placeholder crédible et cohérent avec le secteur (allaitement, IBCLC, accompagnement
en ligne). Les 8 modules affichés sont **réels** (depuis la DB). Les textes des sections
narratives (problème, promesse, témoignages, FAQ, bio) sont des placeholders réalistes,
remplaçables ultérieurement par les vrais textes sans toucher à la structure.

## 9. Critères de succès

- La page pack rend la structure long-form complète ; les autres formations sont inchangées.
- URL et flux de paiement identiques à aujourd'hui.
- Aucun token de marque nouveau introduit ; cohérence visuelle avec le reste du site.
- Animations au scroll fluides, header sticky fonctionnel, FAQ en accordéon.
- Mobile-first : rendu correct de mobile à desktop.
- Contenu placeholder isolé dans un fichier dédié, trivialement remplaçable.
