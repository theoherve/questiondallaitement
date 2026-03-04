# Roadmap Refonte UI/UX — Question d'Allaitement

> Reference : [REDESIGN_SPECS.md](./REDESIGN_SPECS.md)
>
> Derniere mise a jour : 2026-02-25

## Legende

| Symbole | Signification |
| ------- | ------------- |
| ✅      | Termine       |
| 🔶      | En cours      |
| ⬜      | A faire       |

---

## Phase 1 — Fondations design system (1-2 jours)

> Modifier le design system AVANT de toucher aux pages. Tout le reste en depend.

| ID   | Tache                                                                 | Statut | Fichiers concernes                           |
| ---- | --------------------------------------------------------------------- | ------ | -------------------------------------------- |
| R-01 | Passer `--radius` a `0px` dans globals.css                            | ✅     | `globals.css`                                |
| R-02 | Mettre a jour l'echelle typographique (H1 4.5rem, H2 3rem, etc.)      | ✅     | `globals.css`, composants                    |
| R-03 | Augmenter les espacements de section (`py-24`/`py-32`)                | ✅     | `globals.css` (utilitaire `section-padding`) |
| R-04 | Supprimer les ombres par defaut des cards, ajouter border subtile     | ✅     | `card.tsx`                                   |
| R-05 | Ajouter les utilitaires d'animation scroll reveal (intersection obs.) | ✅     | `scroll-reveal.tsx`, `globals.css`           |
| R-06 | Boutons : angles droits, hover states premium                         | ✅     | `button.tsx`                                 |

---

## Phase 2 — Navigation & layout (1-2 jours)

> Restructurer header, footer, navigation mobile.

| ID   | Tache                                                         | Statut | Fichiers concernes                        |
| ---- | ------------------------------------------------------------- | ------ | ----------------------------------------- |
| R-07 | Refonte header desktop : 7 liens + CTA "Prendre RDV" sticky   | ✅     | `header.tsx`, `navigation.ts`             |
| R-08 | Refonte header mobile : logo + CTA RDV + hamburger            | ✅     | `header.tsx`                              |
| R-09 | Menu mobile fullscreen overlay (remplacer Sheet)              | ✅     | `header.tsx` (fullscreen overlay intégré) |
| R-10 | Refonte footer : 3 colonnes, reseaux sociaux, nouveau wording | ✅     | `footer.tsx`                              |
| R-11 | Mise a jour `navigation.ts` avec nouveaux noms et routes      | ✅     | `navigation.ts`                           |

---

## Phase 3 — Homepage refonte complete (3-5 jours)

> Reconstruire la homepage section par section selon les specs.

| ID   | Tache                                                             | Statut | Fichiers concernes                |
| ---- | ----------------------------------------------------------------- | ------ | --------------------------------- |
| R-12 | Hero asymetrique : photo portrait + titre editorial + CTAs        | ✅     | `page.tsx` (public)               |
| R-13 | Barre de credibilite (trust bar) : chiffres cles, fond green      | ✅     | `page.tsx`                        |
| R-14 | Section Accompagnements : grille asymetrique, 3 accompagnements   | ✅     | `page.tsx`, `formation-card.tsx`  |
| R-15 | Carousel temoignages : refonte 6-8 temoignages, autoplay, swipe   | ✅     | `testimonial-carousel.tsx`        |
| R-16 | Section Expertise/A propos : layout editorial avec photo          | ✅     | `page.tsx`                        |
| R-17 | Section Blog/Journal : layout magazine 1 featured + 2 secondaires | ✅     | `page.tsx`                        |
| R-18 | Section Formations Pro (teaser B2B) : fond green, CTA unique      | ✅     | `page.tsx`                        |
| R-19 | Section Newsletter : formulaire inline, nouveau style             | ✅     | `newsletter-form.tsx`, `page.tsx` |
| R-20 | CTA final : section de fermeture sobre                            | ✅     | `page.tsx`                        |
| R-21 | Supprimer les sections obsoletes (How it works, Features grid)    | ✅     | `page.tsx`                        |

---

## Phase 4 — Nouvelles pages (3-4 jours)

> Creer les pages qui n'existent pas encore.

| ID   | Tache                                                                 | Statut | Fichiers concernes                   |
| ---- | --------------------------------------------------------------------- | ------ | ------------------------------------ |
| R-22 | Page `/livres` : vitrine des livres publies (couvertures, liens)      | ✅     | `src/app/(public)/livres/page.tsx`   |
| R-23 | Page `/medias` : portfolio medias (TV, podcasts, presse, conferences) | ✅     | `src/app/(public)/medias/page.tsx`   |
| R-24 | Page `/a-propos` : bio editoriale longue de Carole                    | ✅     | `src/app/(public)/a-propos/page.tsx` |
| R-25 | Renommer route `/formations` → `/accompagnements` (B2C)               | ✅     | Routing, liens, nav, sitemap         |
| R-26 | Adapter `/evenements` → `/formations` (B2B pro)                       | ✅     | Routing, liens, nav, sitemap         |
| R-27 | Redirect 301 des anciennes routes vers les nouvelles                  | ✅     | `next.config.ts`                     |

---

## Phase 5 — Refonte pages existantes (3-4 jours)

> Appliquer le nouveau design system aux pages existantes.

| ID   | Tache                                                             | Statut | Fichiers concernes              |
| ---- | ----------------------------------------------------------------- | ------ | ------------------------------- |
| R-28 | Page `/accompagnements` (listing) : nouveau style cards, grille   | ⬜     | Refonte page formations listing |
| R-29 | Page `/accompagnements/[slug]` : layout editorial, sidebar sticky | ⬜     | Refonte page formation detail   |
| R-30 | Page `/formations` (B2B listing) : cards evenements pro           | ⬜     | Refonte page evenements         |
| R-31 | Page `/blog` : layout magazine, article featured                  | ⬜     | Refonte page blog listing       |
| R-32 | Page `/blog/[slug]` : typographie editoriale, espacement          | ⬜     | Refonte page blog detail        |
| R-33 | Page `/reserver` : adapter wizard au nouveau design system        | ⬜     | Composants booking              |
| R-34 | Pages auth (connexion, inscription) : adapter au nouveau style    | ⬜     | Pages auth                      |

---

## Phase 6 — Mobile & polish (2-3 jours)

> Finitions mobile-first, animations, performance.

| ID   | Tache                                                    | Statut | Fichiers concernes |
| ---- | -------------------------------------------------------- | ------ | ------------------ |
| R-35 | Audit mobile complet : chaque section, chaque page       | ⬜     | Global             |
| R-36 | Animations scroll reveal sur toutes les sections         | ⬜     | Global             |
| R-37 | Hover states premium sur tous les elements interactifs   | ⬜     | Global             |
| R-38 | Optimisation images (next/image, formats, lazy loading)  | ⬜     | Global             |
| R-39 | Test accessibilite (contraste, focus, aria, nav clavier) | ⬜     | Global             |
| R-40 | Test performance (Lighthouse, Core Web Vitals)           | ⬜     | Global             |

---

## Phase 7 — Donnees & contenu (en parallele)

> A fournir par Carole / toi — necessaire pour que le site ait du contenu reel.

| ID   | Tache                                                            | Statut | Responsable |
| ---- | ---------------------------------------------------------------- | ------ | ----------- |
| C-01 | Photo portrait pro pour le hero                                  | ⬜     | Carole      |
| C-02 | Photo secondaire (en consultation) pour section A propos         | ⬜     | Carole      |
| C-03 | Chiffres cles a confirmer (annees, consultations, etc.)          | ⬜     | Carole      |
| C-04 | 6-8 temoignages reels pour le carousel                           | ⬜     | Carole      |
| C-05 | Liste des livres publies (titre, editeur, ISBN, liens achat)     | ⬜     | Carole      |
| C-06 | Liste des apparitions medias (liens, dates, supports)            | ⬜     | Carole      |
| C-07 | Bio longue pour la page A propos                                 | ⬜     | Carole      |
| C-08 | Titre hero definitif (proposition : "L'allaitement, autrement.") | ⬜     | Carole      |
| C-09 | Liens reseaux sociaux (Instagram, Facebook, LinkedIn)            | ⬜     | Carole      |

---

## Estimation globale

| Phase                      | Duree estimee    |
| -------------------------- | ---------------- |
| Phase 1 — Design system    | 1-2 jours        |
| Phase 2 — Navigation       | 1-2 jours        |
| Phase 3 — Homepage         | 3-5 jours        |
| Phase 4 — Nouvelles pages  | 3-4 jours        |
| Phase 5 — Pages existantes | 3-4 jours        |
| Phase 6 — Polish           | 2-3 jours        |
| **Total**                  | **~13-20 jours** |

> Phase 7 (contenu) est en parallele et ne bloque pas le dev si on utilise du placeholder.
