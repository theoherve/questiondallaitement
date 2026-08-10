# Formulaire de contact et gestion admin

Date : 2026-08-10
Statut : validé, prêt pour le plan d'implémentation

## Objectif

Permettre à un visiteur de contacter l'administration depuis le site public via
un formulaire, et donner à l'administration une section dédiée pour consulter
ces messages et recontacter la personne.

## Décisions

| Sujet | Décision |
|---|---|
| Champs formulaire | Nom, email (obligatoire), sujet, message. Tous requis. |
| Accès | Page publique `/contact`, aucune authentification requise. Si le visiteur est connecté, le message est rattaché à son `user_id`. |
| Réponse admin | Pas d'envoi depuis l'app. Bouton "Répondre" = lien `mailto:` pré-rempli (destinataire + sujet `Re: ...`). Pas d'historique de réponse stocké. |
| Alerte admin | Notification in-app uniquement, via le système `notify()` existant (pas d'email). |
| Statuts | Trois états : `nouveau`, `lu`, `traite`. Passage à `lu` automatique à l'ouverture du détail ; passage à `traite` manuel. |
| Anti-spam | Honeypot (champ caché ignoré des humains) + rate limit par IP via `src/lib/rate-limit.ts` existant. |
| Emplacement admin | Nouvelle entrée top-level `/admin/contact` dans la sidebar, section "Personnes". |

## Architecture

### Base de données

Nouvelle migration `supabase/migrations/00088_contact_messages.sql` :

```sql
create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'nouveau'
    check (status in ('nouveau', 'lu', 'traite')),
  user_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

RLS : insert ouvert à `anon`/`authenticated` (formulaire public) ; select/update
réservés au rôle admin (cohérent avec les autres tables admin-only du projet).
Un trigger `updated_at` réutilise le pattern déjà en place ailleurs si présent,
sinon mise à jour explicite dans la server action.

### Formulaire public

- Page `src/app/(public)/contact/page.tsx`, ajoutée à `publicNav`
  (`src/config/navigation.ts`).
- Composant client de formulaire avec validation basique (email, champs requis)
  et champ honeypot caché (ex: `website`, style `display:none` + `tabIndex=-1`).
- Server action `submitContactMessage` (`src/app/(public)/contact/actions.ts`) :
  1. Rejette silencieusement si le honeypot est rempli (retourne un succès
     factice pour ne pas renseigner un bot).
  2. Vérifie le rate limit par IP via `checkRateLimit` (ou équivalent existant
     dans `src/lib/rate-limit.ts`).
  3. Valide les champs (nom/email/sujet/message non vides, email au format
     valide).
  4. Insère la ligne dans `contact_messages`, avec `user_id` rempli si un
     utilisateur est authentifié (`getSessionUser()`).
  5. Appelle `notify("contact_message_received", await getRoleRecipients("admin"), { name, email, subject, contactMessageId }, { dedupeId: contactMessageId })`.
  6. Retourne un `ActionResult` de succès/erreur, pattern déjà en place dans les
     autres server actions du projet.

### Catalogue de notification

Nouvel événement dans `src/lib/notifications/catalog.ts` :

```ts
{
  key: "contact_message_received",
  category: "system",
  audience: "role",
  channels: ["in_app"],
  title: (d) => `Nouveau message de contact : ${d.name}`,
  href: (d) => `/admin/contact/${d.contactMessageId}`,
}
```

Aucun changement requis côté cloche/UI (`notification-bell.tsx`,
`notification-list.tsx`) : l'événement suit le chemin générique existant.

### Section admin

- `src/app/(dashboard)/admin/contact/page.tsx` : liste des messages, triée par
  `created_at desc`, filtrable par statut (nouveau/lu/traité), colonnes
  nom/email/sujet/extrait/statut/date.
- `src/app/(dashboard)/admin/contact/[id]/page.tsx` : détail du message.
  Passage automatique en `lu` au chargement si le statut était `nouveau`.
  Bouton "Marquer comme traité" (action serveur). Bouton "Répondre" en lien
  `mailto:{email}?subject=Re: {subject}`.
- `src/app/(dashboard)/admin/contact/actions.ts` : `markAsRead`,
  `markAsTreated`, protégées par `requireAdmin()` (pattern identique à
  `admin/marketing/messages/actions.ts`), tests `actions.spec.ts` associés.
- Entrée nav dans `adminNav` (`src/config/navigation.ts`), section
  `personnes`, avant ou après "Consultantes".

### Tests

- `actions.spec.ts` pour la server action publique : honeypot rejeté, rate
  limit déclenché, validation des champs, insertion + appel `notify` mocké.
- `actions.spec.ts` pour les actions admin : garde `requireAdmin`, transitions
  de statut.

## Hors périmètre

- Pas d'envoi d'email de réponse depuis l'app (mailto uniquement).
- Pas d'email de notification à l'admin (in-app uniquement).
- Pas d'historique des réponses envoyées.
- Pas de pièces jointes sur le formulaire.
