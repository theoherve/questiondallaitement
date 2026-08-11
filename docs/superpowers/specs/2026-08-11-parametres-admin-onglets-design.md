# Refonte page Paramètres admin : onglets + nouveaux réglages

Date : 2026-08-11

## Contexte

La page `/admin/parametres` est aujourd'hui un formulaire plat unique découpé en 3 blocs empilés verticalement : Plateforme (`settings-form.tsx`), Email branding (`email-branding-form.tsx`), Bandeau d'annonce (`announcement-banner-form.tsx`). Tous les trois lisent/écrivent dans la table `platform_settings` (clé/valeur JSONB, voir `supabase/migrations/00009_audit_and_settings.sql`).

Par ailleurs, plusieurs valeurs "métier" sont codées en dur dans `src/config/*.ts` et `src/lib/resend/client.ts` alors qu'elles s'apparentent à des réglages plateforme ajustables sans déploiement : adresse email d'expédition, liens réseaux sociaux (dupliqués et incohérents entre deux fichiers), email de contact/OG image par défaut, et le feature flag `bookingEnabled` (piloté uniquement par variable d'env).

Ce spec couvre uniquement l'enrichissement de la page Paramètres. Aucune autre section admin n'est modifiée. Le mega menu Livres et le rapatriement de `newsletter_memo_url` (géré depuis Admin > Marketing > Newsletter) sont explicitement hors périmètre.

## Objectif

1. Réorganiser la page en onglets pour absorber davantage de contenu sans surcharger le scroll.
2. Ajouter 4 nouveaux réglages pilotables, en réutilisant le pattern `platform_settings` déjà en place.

## Structure des onglets

Composant `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` de `src/components/ui/tabs.tsx` (shadcn/Radix, variante `line`), state client (pas de sous-routes, tout reste sur `/admin/parametres`).

1. **Plateforme** — inchangé : `default_commission_rate`, `cancellation_threshold_hours`, `cancellation_penalty_rate`, `platform_name`, `maintenance_mode`
2. **Email** — fusion de l'existant (branding : logo, header, footer, bandeau promo email) + nouveau : adresse expéditeur (`from_address`) et nom affiché (`from_name`)
3. **Bandeau d'annonce** — inchangé
4. **SEO & Identité** (nouveau) — email de contact public, image OG par défaut
5. **Réseaux sociaux** (nouveau) — Instagram, TikTok, LinkedIn
6. **Feature flags** (nouveau) — toggle `booking_enabled`

## Data model

Nouvelles clés dans `platform_settings` (même table, même pattern que `email_branding` / `announcement_banner`) :

| Clé | Champs | Défauts migrés depuis |
|---|---|---|
| `email_sender` | `from_address: string`, `from_name: string` | `src/lib/resend/client.ts` (`DEFAULT_FROM`) |
| `seo_defaults` | `contact_email: string`, `og_image_url: string \| null` | `src/config/site.ts` (`contactEmail`, `ogImage`) |
| `social_links` | `instagram_url: string \| null`, `tiktok_url: string \| null`, `linkedin_url: string \| null` | `src/config/navigation.ts` (`socialLinks`) — source retenue en cas de conflit avec `src/config/site.ts.links.instagram`, car c'est celle affichée en production sur le footer |
| `feature_flags` | `booking_enabled: boolean` | `src/config/features.ts` (`NEXT_PUBLIC_BOOKING_ENABLED`) |

`email_branding` (existant) : aucun changement de schéma, juste regroupé dans le même onglet UI que `email_sender`.

## Migration SQL

Nouvelle migration `supabase/migrations/000XX_settings_extra.sql`, même forme que `00070_email_branding.sql` / `00092_announcement_banner.sql` : `INSERT INTO platform_settings (key, value) VALUES (...) ON CONFLICT (key) DO NOTHING`, avec les valeurs actuelles en dur comme seed.

## Code consommateur à adapter

Nécessaire pour que les réglages soient réellement pilotables (pas une extension de périmètre — ce sont les seuls points de lecture concernés) :

- `src/lib/resend/client.ts` : lit `email_sender` via un store dédié (pattern `branding-store.ts`, cache TTL), fallback sur l'env var `RESEND_FROM_EMAIL`/valeur en dur si la clé n'existe pas encore (déploiement avant migration, environnements de dev sans DB seedée).
- `src/config/site.ts` / `src/config/navigation.ts` : les usages de `contactEmail`, `ogImage`, `socialLinks` basculent sur une lecture `seo_defaults` / `social_links`, avec le même fallback en dur.
- `src/config/features.ts` : `bookingEnabled` lit `feature_flags.booking_enabled`, fallback sur l'env var existante si la clé est absente.

Chaque store expose une fonction serveur simple (`getEmailSender()`, `getSeoDefaults()`, `getSocialLinks()`, `getFeatureFlags()`), utilisable en Server Component / Server Action, avec cache en mémoire à courte durée (même TTL que `branding-store.ts`) pour éviter une requête DB à chaque rendu.

## Formulaires

4 nouveaux composants dans `src/app/(dashboard)/admin/parametres/_components/` : `feature-flags-form.tsx`, `seo-defaults-form.tsx`, `social-links-form.tsx`, et fusion de l'expéditeur dans `email-branding-form.tsx` (ou composant `email-sender-form.tsx` rendu dans le même `TabsContent`).

Même pattern que l'existant : schéma Zod dans `src/validations/`, server action dédiée (`getXxx`/`updateXxx`), `useActionState` + toast de confirmation, log dans `audit_logs` comme le fait déjà `settings-form.tsx` (`actions.ts:106`).

## Validation / erreurs

- URLs réseaux sociaux et image OG : Zod `url()`, champs optionnels (vide = lien non affiché).
- Email expéditeur et email de contact : Zod `email()`. Si le domaine de l'email expéditeur diffère du domaine vérifié dans Resend, avertissement non bloquant affiché dans le formulaire (pas de vérification API Resend en v1, juste un message informatif statique).
- Feature flags : toggle booléen simple, pas de validation complémentaire.

## Tests

Tests unitaires Vitest :
- Schémas Zod des 4 nouveaux formulaires (cas valides/invalides).
- Stores : lecture de la valeur en base, et fallback quand la clé est absente (même suite de tests que `branding-store.spec.ts` si elle existe, sinon nouveau fichier par store).

## Hors périmètre (rappel explicite)

- Mega menu Livres : reste en dur dans `src/config/books.ts`, non traité ici.
- `newsletter_memo_url` : reste géré depuis Admin > Marketing > Newsletter, non rapatrié.
- Textes newsletter (`src/config/newsletter.ts`), CTA par accompagnement, sondages avancés : jugés trop éditoriaux/hors scope pour cette itération.
