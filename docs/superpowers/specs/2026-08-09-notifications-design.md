# Notifications utilisateurs et administrateur

Date : 2026-08-09
Statut : validé, prêt pour le plan d'implémentation

## Objectif

Notifier les clientes, les consultantes et l'administration des événements de la
plateforme (rendez-vous, paiements, contenus, alertes internes) via un système
unique, au lieu des deux chemins parallèles actuels.

## Point de départ

L'existant est réel mais anémique :

- Table `notifications` (`supabase/migrations/00036_notifications.sql`) avec une
  contrainte `CHECK (type IN ('booking_confirmed', 'consultant_message', 'admin'))`.
- `createNotification()` dans `src/lib/notifications.ts`, appelé depuis trois
  endroits seulement : `src/lib/stripe/webhooks.ts`,
  `src/app/(dashboard)/espace-consultante/reservations/actions.ts`,
  `src/lib/invoicing/emit.ts`.
- API `src/app/api/notifications/route.ts` : GET des non lues limité à 20,
  POST réservé à l'administration.
- Cloche dans `src/components/layout/header.tsx` : trois items affichés, et
  `markAllRead()` déclenché à l'ouverture du menu.
- Quinze fonctions d'envoi d'email dans `src/lib/emails/send.ts`, un cron unique
  dans `src/app/api/cron/route.ts`, un moteur d'automations dans
  `src/lib/automations/`.

Deux défauts structurants : les emails et les notifications in-app sont deux
chemins qu'aucun code ne coordonne, et l'ouverture du menu marque comme lues des
notifications jamais affichées, sans page d'historique pour les retrouver.

## Décisions

| Sujet | Décision |
|---|---|
| Périmètre canal | In-app et email unifiés derrière un `notify()` unique, avec préférences utilisateur. Web Push reporté en phase 2. |
| Audience du contenu réservé | Segment requêté à l'envoi, pas de modèle de droits en base. À remplacer plus tard. |
| `/replay-lives` ouverte à qui a l'URL | Choix assumé, non modifié par ce chantier. |
| Préférences | Transactionnel et système imposés, marketing désactivable par catégorie et par canal, digest en opt-in. |
| Panneau de la cloche | Liste dense, action affichée seulement quand elle fait gagner du temps, ligne entière cliquable. |
| Historique | Une page par espace, composant de liste partagé. Pas de filtres ni d'archivage en v1. |
| Notifications internes | In-app et email pour la consultante et pour l'administration. |

## Architecture

### Catalogue d'événements

`src/lib/notifications/catalog.ts` : une définition déclarative par événement,
source de vérité unique.

```ts
{
  key: "booking_reminder",
  category: "transactional",     // transactional | marketing | system
  audience: "recipient",         // recipient | role | segment
  channels: ["in_app", "email"],
  title: (d) => `Rappel : consultation demain à ${d.time}`,
  href:  (d) => `/espace-client/reservations/${d.booking_id}`,
  actions: (d) => [{ label: "Ajouter au calendrier", href: ... }], // facultatif
  email: sendBookingReminder,    // réutilise l'existant
}
```

Ajouter un événement revient à ajouter une entrée. Le typage du catalogue donne
l'autocomplétion sur les clés et interdit d'appeler `notify()` avec une clé
inconnue. Aucun email existant n'est réécrit : les fonctions de `send.ts`
deviennent le canal email du catalogue.

### `notify()`

`src/lib/notifications/notify.ts`. Pour chaque destinataire : lecture des
préférences, filtrage des canaux, insertion de la ligne in-app, appel du sender
email.

Contraintes :

- **Ne lève jamais.** Chaque canal est isolé, les échecs sont logués. Un échec
  d'email ne doit pas faire échouer un webhook Stripe.
- **Strictement serveur.** L'insertion chez autrui suppose le client admin
  Supabase, donc server actions, webhooks et cron uniquement. Une action
  déclenchée côté client passe par une server action.

Modules associés : `channels/in-app.ts`, `channels/email.ts`, `preferences.ts`,
`audience.ts` (tranche 2), `channels/push.ts` (phase 2).

### Modèle de données

`notifications`, modifications :

- La colonne `type` est conservée sous ce nom et stocke désormais la clé
  d'événement du catalogue (`booking_reminder`, `invoice_available`, ...). Sa
  contrainte `CHECK` à trois valeurs est supprimée, sans liste de remplacement en
  base : le catalogue TypeScript est la source de vérité, et les trois valeurs
  historiques sont remappées vers leur clé d'événement par la migration.
- `category` : applique les préférences sans relire le catalogue en SQL.
- `href` : cible du lien profond.
- `actions` (jsonb, nullable) : boutons de l'item, deux maximum. `title`, `href`
  et `actions` sont calculés par le catalogue **au moment de l'insertion** puis
  figés en base, pour qu'une notification ancienne garde son libellé et sa cible
  même si la définition d'événement change ensuite.
- `dedupe_key` avec index unique : idempotence sur `(user_id, event, entity_id)`.
  Indispensable, les deux sources d'événements sont un cron et des webhooks.

`notification_preferences`, nouvelle table : `(user_id, category_key, channel)`
vers `enabled`. Elle ne stocke que **les écarts au défaut**. Le défaut vient de
la définition de catégorie (`DEFAULTS[category][channel]`), ce qui permet au
digest de démarrer à `off` pendant que le reste du marketing démarre à `on`,
sans backfill sur les profils existants.

RLS : lecture et mise à jour de ses propres lignes, écriture réservée au rôle
service, dans la continuité des policies de `00036`.

Ce qu'on ne construit pas : pas de table `events`, pas de file d'attente, pas de
worker. L'insertion in-app est synchrone, l'email part comme aujourd'hui.

### Canaux et préférences

| Catégorie | Exemples | Règle |
|---|---|---|
| `transactional` | Rendez-vous, paiement, facture, accès accompagnement | Canaux imposés, préférences ignorées |
| `system` | Échec de cron, erreur d'automation | Imposés |
| `marketing` | Replay, article, relance, avis, digest | Préférences appliquées, par canal |

Sept catégories visibles par l'utilisateur : rendez-vous, paiements et factures,
accès aux contenus (imposées), nouveaux replays et ressources, articles du blog,
rappels et suivi, résumé hebdomadaire (au choix).

Les emails marketing portent un lien de désinscription vers l'écran de
préférences, en réutilisant le mécanisme de token de la newsletter
(`00060_newsletter_desinscription.sql`), sans en créer un second.

### Ciblage

`resolveAudience(rule)`, trois formes par coût croissant :

1. `{ kind: "recipient", userId }` : cas transactionnel, aucune requête.
2. `{ kind: "role", role }` : alertes internes.
3. `{ kind: "segment", segmentId }` : délègue à l'évaluateur CRM existant de
   `src/app/(dashboard)/espace-consultante/crm/segments/actions.ts`.

Le point 3 absorbe le besoin de segments personnalisés sans créer un second
système de ciblage à côté du CRM. Il demande deux extensions :

- **Conditions non numériques** : `has_tag` (liste d'identifiants) et
  `has_accompagnement` (booléen). L'évaluateur actuel ne connaît que `>=`, `<=`,
  `=`, `!=` sur des nombres, il faut un branchement par type de champ. C'est le
  seul refactor non trivial de la tranche 2.
- **Tags globaux** : `crm_tags.consultant_id` est déjà nullable, mais l'interface
  ne permet pas de créer un tag non rattaché à une consultante.

Garde-fou : tout envoi par segment est plafonné en nombre de destinataires et
journalisé (événement, segment, effectif résolu).

## Interface

### Panneau de la cloche

Liste dense, une ligne par notification, pastille sur les non lues, compteur sur
la cloche. Lecture **par item au clic**, plus un bouton explicite « Tout marquer
comme lu ». Le `markAllRead()` à l'ouverture disparaît.

Bouton d'action affiché **seulement quand il fait gagner du temps** (télécharger,
regarder, reprogrammer). Sinon, la ligne entière reste cliquable et mène au lien
profond. Deux boutons maximum par notification, aucune action destructive dans le
panneau : annuler un rendez-vous se fait sur la page dédiée, avec sa confirmation.

Rafraîchissement : refetch périodique toutes les 60 secondes. Supabase Realtime
n'est pas retenu en v1, il ouvrirait une websocket par onglet connecté pour un
volume qui ne le justifie pas.

### Historique

Deux pages, `/espace-client/notifications` et
`/espace-consultante/notifications`, chacune dans son gabarit, au-dessus d'un
composant de liste partagé. Le dashboard et l'espace client n'ont ni la même
navigation ni le même chrome ; une route unique finirait par embarquer des
conditions de rôle dans le rendu.

Contenu : tout est conservé, lu ou non, un séparateur entre non lues et lues,
pagination par 20. Ni filtres ni archivage en v1.

### Préférences

Onglet Notifications dans `/espace-client/profil` : une matrice catégorie par
canal. Les catégories imposées sont affichées en lecture seule avec la mention
« toujours envoyé » plutôt que cachées, pour que l'utilisateur voie ce qu'il
recevra. Pas d'écran de préférences côté dashboard en v1 : la consultante et
l'administration ne reçoivent que du transactionnel et du système.

## Robustesse

| Risque | Réponse |
|---|---|
| Webhook rejoué, cron relancé | `dedupe_key` en index unique, conflit ignoré |
| Panne du service d'email | Canaux isolés dans `notify()`, échec logué, action métier préservée |
| Segment mal configuré | Plafond de destinataires et journalisation |
| Contrainte `CHECK` bloquant un nouvel événement | Supprimée dès la première migration. `tsc` et les tests ne voient pas ce type d'erreur, PostgREST rejette à l'exécution |

## Tests

Vitest, specs colocalisés selon la convention existante.

- `notify` : transactionnel qui ignore les préférences, marketing qui les
  respecte canal par canal, échec email qui laisse la notification in-app,
  doublon absorbé par la clé d'idempotence.
- `preferences` : défauts par catégorie, digest à `off` sans ligne en base,
  écart stocké puis relu.
- API : pagination par curseur, lecture par item, 401 sans session, 403 sur la
  notification d'un autre utilisateur.
- Tranche 2 : conditions `has_tag` et `has_accompagnement` dans l'évaluateur de
  segments, cas vides inclus.

## Livraison

**Étape 1, socle.** Migrations, catalogue, `notify()`, API paginée, panneau et
pages d'historique, reprise des trois appels à `createNotification` qui est
supprimé. À l'issue de cette étape, l'application se comporte comme aujourd'hui,
sans la perte d'information du menu.

**Étape 2, tranche 1 transactionnelle.** Client : rendez-vous confirmé, rappel
J-1, rendez-vous annulé ou reprogrammé, paiement reçu, facture disponible, accès
accompagnement ouvert, inscription formation confirmée, rappel formation J-1.
Consultante : nouvelle réservation, annulation client. Administration : achat,
remboursement, échec de paiement, nouvel avis client, échec de cron ou
d'automation. Ce lot n'a ni préférences à respecter ni audience à résoudre, et
les emails correspondants existent déjà.

**Étape 3, tranche 2 audience et marketing.** Préférences, `resolveAudience`,
conditions de segment, tags globaux. Événements : nouveau replay d'atelier,
nouvelle ressource réservée, nouvel article de blog, relance de module en cours,
demande d'avis à J+2, digest hebdomadaire. Les contenus réservés ne sont notifiés
qu'aux ayants droit ; le blog est le seul contenu à audience ouverte.

**Étape 4, tranche 3 pilotage.** Action `send_notification` dans le moteur
d'automations, composer de diffusion ciblée par segment,
`profiles.acquisition_source` renseigné à l'inscription, digest quotidien pour
l'administration.

Chaque étape est livrable seule.

## Hors périmètre

Web Push (phase 2, décidée et reportée), archivage et filtres par catégorie,
modèle de droits d'accès aux contenus réservés, notifications entre clients,
fermeture de `/replay-lives`.
