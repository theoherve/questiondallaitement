# Feature flag — Mode "formations en ligne only" (front)

**Date:** 2026-07-22
**Branche:** feat/legal-mentions (base main)

## Objectif

Pouvoir basculer le site public en mode **formations / accompagnements en ligne uniquement** via un
feature flag, en désactivant proprement toute la partie **réservation de rendez-vous**. Quand le flag
est actif, la réservation doit **disparaître totalement** côté front (nav, CTA, cards, route directe)
sans casser la mise en page, et les CTA orientés RDV sont remplacés par des CTA formations.

## Décisions

- **Pilotage : variable d'environnement** (choix utilisateur). Pas de toggle DB/admin.
  - Le repo a déjà un pattern DB (`platform_settings` / `maintenance_mode`) — non retenu ici :
    bascule rare, un redéploiement est acceptable.
- **Comportement OFF : la réservation disparaît totalement**, CTA remplacés, front intact.
- **Route `/reserver` en direct : `redirect("/accompagnements")`** (UX douce, garde le visiteur).
- **Cards services "Cabinet" + "Téléconsultation" (home) : masquées** (filtrées de la grille).

## Nom du flag

`NEXT_PUBLIC_BOOKING_ENABLED`

- Préfixe `NEXT_PUBLIC_` obligatoire : lu à la fois côté client (`header.tsx` est `"use client"`)
  et côté serveur (home, page reserver). Inliné au build.
- **Sémantique positive + défaut sûr** : booking **activé** sauf si la valeur vaut exactement `"false"`.
  Var absente → comportement actuel inchangé (aucune régression sur les envs existants).
- Mode formations-only : `NEXT_PUBLIC_BOOKING_ENABLED=false`.

## Architecture

### Source de vérité unique — `src/config/features.ts` (nouveau)

```ts
export const features = {
  bookingEnabled: process.env.NEXT_PUBLIC_BOOKING_ENABLED !== "false",
} as const;
```

Un seul module, importé partout. Aucun `process.env` dispersé dans les composants.

### Points de consommation

| # | Lieu | Fichier | Ligne(s) | Action quand `bookingEnabled === false` |
|---|------|---------|----------|------------------------------------------|
| 1 | Route `/reserver` | `src/app/(public)/reserver/page.tsx` | haut du composant (après L14) | `if (!features.bookingEnabled) redirect("/accompagnements");` |
| 2 | Nav header desktop | `src/components/layout/header.tsx` | ~231 | Lien "Prendre RDV" enveloppé dans `{features.bookingEnabled && ...}` |
| 3 | Nav header mobile (icône) | `src/components/layout/header.tsx` | ~242 | idem (masqué) |
| 4 | Nav header menu mobile | `src/components/layout/header.tsx` | ~367 | idem (masqué) |
| 5 | CTA hero home (secondaire) | `src/app/(public)/page.tsx` | 226-233 | Bouton outline "Prendre rendez-vous" (`/reserver`) masqué. Le CTA primaire L221 pointe déjà vers `/accompagnements` → reste. |
| 6 | CTA home bas de page | `src/app/(public)/page.tsx` | ~808 | "Prendre rendez-vous" remplacé par CTA "Découvrir les accompagnements" → `/accompagnements` |
| 7 | Cards services home | `src/app/(public)/page.tsx` | SERVICES L97-121 | Entrées `href: "/reserver"` (Cabinet L107, Téléconsultation L119) filtrées de la liste rendue. Grid se recompose sur les cards restantes (Accompagnement en ligne, Formations Pro). |

### Non touché

- `src/middleware.ts` : `/reserver` reste whitelisté public — la page se redirige elle-même (#1).
- Back-office admin `(dashboard)/admin/reservation/*` : hors périmètre (front only).
- API routes Stripe / webhooks : inchangées.
- Footer : aucun lien `/reserver`.

## Data flow

```
NEXT_PUBLIC_BOOKING_ENABLED (env, build-time)
        │  inliné au build
        ▼
src/config/features.ts  →  features.bookingEnabled: boolean
        │
        ├─ reserver/page.tsx      → redirect() si false
        ├─ header.tsx (client)    → rend/masque liens RDV
        └─ page.tsx (home)        → masque cards + remplace/masque CTA
```

## Gestion d'erreur / cas limites

- **Var absente / vide** → `!== "false"` = `true` → booking activé (défaut sûr).
- **Valeurs autres que "false"** (ex. `0`, `off`) → traitées comme activé. Convention documentée :
  seule la string exacte `"false"` désactive. Ajouter la note dans `.env.example`.
- **Lien direct `/reserver` en mode OFF** → redirect 307 vers `/accompagnements`, pas de 404.
- **Pas de trou de grille** : les cards masquées sont filtrées avant `.map`, pas rendues vides.

## Tests

- `src/config/features.ts` : test unitaire de la logique du flag (Vitest) —
  `undefined` / `"false"` / `"true"` / valeur arbitraire → booléen attendu.
- (Composants : couverture manuelle suffisante vu la simplicité ; pas de test d'intégration
  Next requis pour ce périmètre.)

## Doc / config

- Ajouter `NEXT_PUBLIC_BOOKING_ENABLED` à `.env.example` avec commentaire :
  `# "false" = mode formations en ligne uniquement (désactive la réservation de RDV côté front)`.

## Hors périmètre (YAGNI)

- Toggle admin en base.
- Désactivation côté back-office / API.
- i18n des messages (site mono-locale FR).
