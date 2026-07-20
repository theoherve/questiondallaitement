# Protection des templates d'email

> Conception validee le 2026-07-20. Couvre `6-4` et `6-6` de
> [PROD_READINESS.md](../../PROD_READINESS.md).

## Le probleme

Les templates d'email sont editables depuis `/admin/marketing/templates`. Deux
chemins peuvent detruire ce travail sans que personne ne s'en apercoive.

**La suppression n'est pas protegee.** `deleteTemplate` supprime n'importe quelle
ligne. Les sept templates presents sont tous lus par `send.ts` :

| Template | Lu par |
| --- | --- |
| `booking_confirmation` | `sendBookingConfirmation` |
| `booking_cancelled` | `sendBookingCancelled` |
| `booking_reminder` | `sendBookingReminder` |
| `formation_access` | `sendFormationAccess` |
| `welcome` | `sendWelcomeEmail` |
| `password_reset` | `sendPasswordResetEmail` |
| `migration_welcome` | `sendMigrationWelcomeEmail` |

Supprimer l'un d'eux ne provoque aucune erreur visible : la lecture fait un
`.single()` qui renvoie `null`, l'envoi est abandonne, rien n'est journalise. Le
symptome est un email qui ne part plus — constate par une cliente, pas par un log.

**La restauration ecrase sans prevenir.** `restoreDefaultTemplates` fait un `UPDATE`
sur les sept templates a partir de `DEFAULT_TEMPLATE_DESIGNS`. C'est exactement ce
que la regle 6-5 interdit aux migrations (PR #42), mais depuis un bouton de
l'interface. Le garde-fou de #42 n'inspecte que les fichiers de migration.

## Ce qui n'est pas le probleme

L'ecran d'administration existe et fonctionne : liste, edition WYSIWYG,
previsualisation. Rien a construire de ce cote. Cette conception ne cree aucun
ecran, elle ajoute des garde-fous a ce qui existe.

## Conception

### 1. Constante de dependance

`src/lib/emails/required-templates.ts` exporte les noms de templates dont le code
depend, et le type qui en decoule.

```ts
export const REQUIRED_TEMPLATES = [
  "booking_confirmation",
  "booking_cancelled",
  "booking_reminder",
  "formation_access",
  "welcome",
  "password_reset",
  "migration_welcome",
] as const;

export type RequiredTemplate = (typeof REQUIRED_TEMPLATES)[number];
```

`send.ts` type ses lectures avec `RequiredTemplate` plutot qu'avec `string`. Lire un
template absent de la liste devient une erreur de compilation.

**Pourquoi une constante plutot qu'une colonne `is_system` en base** : la dependance
vit dans le code, pas dans les donnees. Une colonne obligerait a se souvenir de la
positionner a chaque nouveau template ; personne ne le fera, et rien ne le signalera.

### 2. Test de coherence

Un garde-fou ne vaut que s'il ne peut pas se desynchroniser. `required-templates.spec.ts`
verifie deux directions :

- **Code → constante** : tout nom de template litteral passe a la fonction de lecture
  de `send.ts` figure dans `REQUIRED_TEMPLATES`. Detecte l'ajout d'un `sendX()` qui
  lit un template non protege.
- **Constante → base** : chaque nom de `REQUIRED_TEMPLATES` existe en base. Detecte un
  template requis absent, quelle qu'en soit la cause.

Le detecteur est lui-meme teste, comme celui de #42 : il doit trouver des noms dans un
extrait representatif, sinon il serait vert en ne regardant rien.

### 3. Suppression protegee

`deleteTemplate` charge le nom avant de supprimer et refuse si ce nom est requis :

> « `booking_confirmation` ne peut pas etre supprime : l'email de confirmation de
> reservation en depend. Pour changer son contenu, modifiez-le. »

Le message nomme ce qui casserait — pas « suppression interdite », qui laisserait
chercher pourquoi. Les templates marketing crees par Carole restent supprimables.

### 4. Restauration explicite

Deux changements sur `restoreDefaultTemplates` :

- **Confirmation nommant les cibles.** La boite de dialogue liste les templates qui
  seront ecrases, et le fait qu'une edition manuelle sera perdue. Aujourd'hui le
  bouton agit immediatement.
- **Restauration unitaire.** Chaque ligne de la liste offre « restaurer le design par
  defaut » pour ce template seul. Le besoin reel — « j'ai casse un template, je veux
  revenir en arriere » — ne justifie pas d'ecraser les six autres.

L'action groupee reste disponible, mais cesse d'etre le seul moyen d'atteindre le
besoin unitaire.

## Portee des tests

| Objet | Test |
| --- | --- |
| Constante synchronisee avec `send.ts` | unitaire, scan du source |
| Constante synchronisee avec la base | unitaire, lecture reelle |
| Suppression d'un template requis refusee | unitaire, action mockee |
| Suppression d'un template marketing autorisee | unitaire |
| Restauration unitaire ne touche qu'une ligne | unitaire |

Aucun test navigateur : ces regles sont des invariants de logique metier, et la suite
N2 est deja lente. La confirmation cote interface est verifiee a la main.

## Ce que cette conception ne couvre pas

**L'email de conflit de creneau** (PR #41) reste a brancher. Le remboursement
automatique part, la cliente n'est pas prevenue. Ce travail suppose un nouveau
template `booking_slot_conflict` — qui devra etre ajoute a `REQUIRED_TEMPLATES` et
cree par migration en insertion seule, conformement a 6-5. C'est la suite immediate,
volontairement laissee hors de cette conception pour que les garde-fous soient en
place avant d'ajouter un huitieme template.

**La journalisation des templates manquants.** Aujourd'hui un template absent
provoque un abandon silencieux. Les garde-fous rendent ce cas beaucoup moins probable
mais ne le suppriment pas : une suppression directe en base reste possible. Ajouter un
log a la lecture serait utile mais releve d'un autre sujet — l'observabilite des
envois d'email — non traite ici.
