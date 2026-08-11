# Bandeau d'annonce temporaire

Date : 2026-08-11
Statut : validé, prêt pour le plan d'implémentation

## Objectif

Permettre à l'administration de publier un bandeau d'annonce temporaire
(nouveau site, promotion, événement...) visible sur tout le site public,
sans déploiement — configurable depuis l'admin.

## Décisions

| Sujet | Décision |
|---|---|
| Portée | Toutes les pages publiques, pas seulement la home. |
| Contenu | Message texte + lien optionnel (URL + libellé). |
| Fermeture visiteur | Croix de fermeture, mémorisée en `localStorage`. La clé de mémorisation dépend du contenu du message : si l'admin change le texte, le bandeau réapparaît même pour un visiteur qui avait fermé l'ancien. |
| Planification | Toggle actif/inactif manuel, + dates de début/fin optionnelles pour une désactivation automatique (ex. fin de promo). |
| Style | Un seul style neutre/marque, pas de variantes de couleur par type de message. |
| Position | Bandeau fin au-dessus du header, sur toutes les pages publiques. |
| Stockage | Réutilise `platform_settings` (clé JSONB unique), pattern identique à `email_branding`. Pas de nouvelle table. |

## Architecture

### Base de données

Pas de nouvelle table. Nouvelle clé dans `platform_settings`, migration
`supabase/migrations/000XX_announcement_banner.sql` :

```sql
INSERT INTO platform_settings (key, value) VALUES (
  'announcement_banner',
  jsonb_build_object(
    'enabled', false,
    'message', '',
    'link_url', NULL,
    'link_label', '',
    'start_date', NULL,
    'end_date', NULL
  )
)
ON CONFLICT (key) DO NOTHING;
```

### Store (lecture/écriture)

`src/lib/announcement-banner/store.ts`, calqué sur
`src/lib/emails/branding-store.ts` :

- `getAnnouncementBanner()` : lit `platform_settings` clé `announcement_banner`,
  parse via un schéma Zod (`src/validations/announcement-banner.ts`), retourne
  une valeur par défaut désactivée en cas d'erreur (une panne de lecture ne
  doit jamais casser le rendu des pages publiques).
- `isAnnouncementBannerActive(banner)` : fonction pure, `enabled &&
  (!start_date || now >= start_date) && (!end_date || now <= end_date)`.
- `saveAnnouncementBanner(data)` : `upsert` sur `platform_settings`
  (`onConflict: "key"`), même pattern que `saveEmailBranding`.

Pas de cache mémoire (contrairement à l'email branding) : le bandeau est lu
une fois par requête de page publique via le layout, et `revalidatePath("/")`
suffit à propager un changement immédiatement après sauvegarde admin.

### Admin

- Nouvelle section dans `src/app/(dashboard)/admin/parametres/`, à côté de
  `email-branding-form.tsx` : `_components/announcement-banner-form.tsx`.
  Champs : toggle actif, message (texte), lien (URL + libellé, optionnels),
  date de début / date de fin (optionnelles, `type="date"`).
- Server actions `getAnnouncementBannerSettings` /
  `updateAnnouncementBannerSettings` dans
  `src/app/(dashboard)/admin/parametres/actions.ts` (ou fichier dédié
  `announcement-banner-actions.ts` si `actions.ts` devient trop chargé),
  protégées par le même `requireAdmin()` que le reste de la page. Appelle
  `saveAnnouncementBanner`, puis `revalidatePath("/admin/parametres")` et
  `revalidatePath("/")`.
- Entrée d'audit `announcement_banner_updated` dans `audit_logs`, cohérent
  avec `platform_settings_updated` et `email_branding_updated`.

### Public

- `src/components/layout/announcement-banner.tsx` : composant client.
  Reçoit `message`, `linkUrl`, `linkLabel` en props depuis le layout serveur.
  Calcule une clé de dismissal `announcement-banner-dismissed:<hash(message)>`
  (hash simple, pas besoin de cryptographique) stockée dans `localStorage`.
  Si la clé est présente, ne rend rien. Sinon affiche le bandeau fin avec
  croix de fermeture (au clic : écrit la clé, masque le bandeau).
- `src/app/(public)/layout.tsx` : appelle `getAnnouncementBanner()` en
  parallèle des autres données de layout (`Promise.all`), calcule
  `isAnnouncementBannerActive`, et rend `<AnnouncementBanner />`
  au-dessus de `<Header />` uniquement si actif et hors mode maintenance.
- Style neutre/marque : classes Tailwind cohérentes avec la palette du site
  (pas de nouvelle variante de couleur), bandeau fin sur une ligne, texte +
  lien optionnel + croix de fermeture à droite.

### Tests

- `store.spec.ts` : `isAnnouncementBannerActive` (cas désactivé, sans dates,
  avant/après start_date, avant/après end_date, les deux bornes).
- `actions.spec.ts` pour les server actions admin : garde `requireAdmin`,
  validation Zod, `revalidatePath` appelé.
- Test du composant `AnnouncementBanner` : rendu si non fermé, masqué si
  clé de dismissal présente pour le message courant, réapparition si le
  message change.

## Hors périmètre

- Pas de variantes de couleur/type (info / promo / urgent).
- Pas de bandeaux multiples simultanés (un seul bandeau actif à la fois).
- Pas de ciblage par audience (maman / pro) ni par page spécifique.
- Pas d'historique des bandeaux passés dans l'admin.
