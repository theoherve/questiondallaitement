# Web Push navigateur

Date : 2026-08-10
Statut : validé, prêt pour le plan d'implémentation

## Objectif

Ajouter un troisième canal de notification, le push navigateur, pour les
événements où une notification différée perd sa valeur : un rappel de rendez-vous,
une annulation de dernière minute.

C'est la phase 2 décidée au lancement du chantier notifications, dont la
condition de reprise était la mise en production de la phase 1. Elle est
remplie : les trois tranches sont fusionnées.

## Point de départ

Les tranches 1 à 3 sont en place : catalogue d'événements, `notify()`,
`resolveAudience()`, préférences par catégorie et par canal, désinscription par
jeton, travaux périodiques, écran de diffusion.

**Aucune infrastructure PWA n'existe** : ni manifeste, ni service worker, ni
dépendance push. Tout est à construire.

## La contrainte qui cadre tout

**Sur iOS, le Web Push n'existe que si le site est installé sur l'écran
d'accueil.** Depuis iOS 16.4, Safari ne délivre de notification qu'aux sites
ajoutés en raccourci. Sur Android et sur ordinateur, un service worker et un
manifeste suffisent.

L'audience étant faite de jeunes mères, majoritairement sur mobile et en France,
une fraction significative ne pourra rien recevoir sans avoir installé le site.

## Décisions

| Sujet | Décision |
|---|---|
| Périmètre | Push sans parcours d'installation. Fonctionne sur Android et ordinateur ; sur iPhone non installé, le canal est simplement absent. |
| iOS | Un **encadré informatif** dans l'écran de préférences, affiché seulement sur iOS et seulement si le site n'est pas déjà lancé depuis l'écran d'accueil. Pas de bannière, pas de popup, pas de relance. |
| Modèle | Le push est un **troisième canal** du modèle existant, pas un interrupteur séparé. |
| Demande d'autorisation | Une seule porte, l'écran de préférences, sur clic délibéré. |
| Déconnexion | Les abonnements de l'appareil **ne sont pas supprimés**. Choix du confort, conséquence assumée. |

## Ce que le push autorise, et ce qu'il active

| Catégorie | Push autorisé | Défaut |
|---|---|---|
| Rendez-vous | oui | activé |
| Accès à vos contenus | oui | activé |
| Alertes internes | oui | activé |
| Nouveaux replays | oui | coupé |
| Rappels et suivi | oui | coupé |
| Annonces de l'équipe | oui | coupé |
| Paiements et factures | **non** | — |
| Articles du blog | **non** | — |
| Résumé hebdomadaire | **non** | — |

Deux principes. **Seules les catégories imposées sont activées par défaut**,
parce qu'elles sont attendues et rares ; tout le reste est un choix explicite.
Et trois catégories **n'autorisent pas le push du tout** : c'est un garde-fou
dans le code, pas seulement un défaut, pour qu'on ne puisse pas décider un jour
de pousser le blog.

## Architecture

### Le push n'a pas besoin d'adaptateur par événement

Contrairement à l'email, qui a un sujet, un gabarit et des variables propres à
chaque cas, un push n'a qu'un titre, un corps et une cible — exactement ce que le
catalogue calcule déjà pour la ligne in-app.

Le canal `push` lit donc `title`, `body` et `href`, et **déclarer `"push"` dans
les canaux d'un événement suffit à l'activer**. Aucune entrée de catalogue à
enrichir, aucune fonction d'envoi à écrire par événement.

### Modèle de données

`push_subscriptions`, une ligne **par navigateur** et non par personne : la même
cliente peut s'abonner depuis son téléphone et son ordinateur, et les deux
doivent sonner.

- `endpoint`, en clé unique : l'identifiant fourni par le navigateur
- `p256dh` et `auth` : les deux clés de chiffrement du navigateur
- `user_agent` : pour que l'utilisatrice reconnaisse ses appareils
- `last_success_at`, `failure_count` : pour le nettoyage

RLS dans la continuité de l'existant : lecture et suppression de ses propres
lignes, écriture par le rôle service.

### Clés VAPID

Publique côté client (`NEXT_PUBLIC_`), privée côté serveur, plus un sujet
`mailto:`. Engendrées une fois et jamais changées : les changer invaliderait tous
les abonnements existants.

### Service worker

Dans `public/sw.js`, servi à la racine. C'est une contrainte du navigateur : un
service worker ne reçoit de push que pour son périmètre, et un fichier servi
depuis `/_next/` ne couvrirait pas le site.

Il reste minuscule — écouter `push`, afficher la notification, ouvrir `href` au
clic. **Pas de mise en cache, pas de mode hors ligne** : ce n'est pas le sujet,
et un cache mal réglé sert des pages périmées.

### Manifeste

Via `src/app/manifest.ts`, la route de métadonnées de Next, plutôt qu'un fichier
statique : nom, couleurs et icônes vivent alors à côté du reste de la
configuration.

### `notify()`

Un canal `push` à côté des deux autres, isolé dans son `try/catch`. Il lit les
abonnements du destinataire et envoie à chacun. Un endpoint qui répond `404` ou
`410` est **supprimé sur-le-champ** : c'est ainsi que le protocole signale un
abonnement mort, et les garder ferait grossir la table de déchets qui échoueront
à chaque envoi.

Une dépendance nouvelle, `web-push`, côté serveur, sur le runtime Node.

## Interface

### Abonnement

Une seule porte : l'écran de préférences de `/espace-client/profil`. La colonne
« Sur le téléphone » y apparaît, **désactivée et grisée tant que l'appareil n'est
pas abonné**, avec au-dessus un bouton « Activer sur cet appareil ».

C'est le seul moment où le navigateur demande l'autorisation, et il est déclenché
par un clic délibéré. Une demande surgie sans geste préalable se fait refuser
massivement, et **un refus est définitif** : le navigateur ne redemandera plus,
seule l'utilisatrice peut revenir en arrière dans ses réglages.

### Trois états, trois affichages

L'autorisation n'est pas un booléen, elle vaut `default`, `granted` ou `denied`.

- Non demandée : le bouton d'activation.
- Accordée : la colonne active, et la liste des appareils abonnés.
- Refusée : une phrase expliquant que le blocage se lève dans les réglages du
  navigateur, sinon l'utilisatrice clique en boucle sur un bouton inerte.

### Liste des appareils

Sous la matrice : `user_agent` abrégé, date, et un bouton pour désabonner chacun.
Sans elle, un ancien téléphone continue de recevoir et personne ne sait pourquoi.

C'est aussi le remède au choix du confort à la déconnexion : sur un ordinateur
partagé, les notifications continuent de s'afficher après déconnexion jusqu'à ce
que quelqu'un désabonne cet appareil, ce qui se fait depuis n'importe quelle
session.

### Encadré d'installation

Dans le même écran, affiché **seulement quand il sert** : sur iOS, et seulement
si le site n'est pas déjà lancé depuis l'écran d'accueil. Deux tests côté client
suffisent à le savoir. Trois lignes expliquent le geste : Partager, puis « Sur
l'écran d'accueil ».

Pas de bannière, pas de fermeture à mémoriser, pas de relance. Sur Android et sur
ordinateur, il n'apparaît jamais.

### Affichage de la matrice à trois colonnes

Seules les cinq catégories optionnelles portent des bascules, les imposées
n'en ont pas. Sous 640 pixels, la ligne par catégorie devient un bloc empilé.

## Robustesse

| Risque | Réponse |
|---|---|
| Abonnement mort, navigateur réinstallé ou cache vidé | `404` ou `410` supprime la ligne immédiatement |
| Un abonnement en échec bloque les autres | Chaque envoi est isolé, comme les canaux de `notify()` |
| Clés VAPID absentes en production | Le canal se désactive et logue, il ne lève pas. Une notification in-app ne doit pas échouer parce que le push est mal configuré |
| Service worker mis en cache | Aucun cache déclaré, fichier minuscule |
| Charge utile trop grosse | Titre et corps tronqués avant envoi |

## Tests

Vitest, environnement `node`, donc aucun test de composant.

- `channels/push.ts` : envoi à plusieurs abonnements, suppression sur `410`,
  isolation d'un échec, absence de clés qui n'empêche rien
- `notify()` : le canal `push` respecte les préférences comme les autres, et
  n'est jamais ajouté par une préférence quand l'événement ne le déclare pas
- `resolveChannels` : les trois catégories qui n'autorisent pas le push ne
  peuvent pas le voir apparaître
- Server actions d'abonnement : refus sans session, un même endpoint enregistré
  deux fois ne crée qu'une ligne

**Ne se teste pas ici** : l'autorisation du navigateur, l'affichage réel de la
notification, le geste d'installation iOS. Cela se vérifie à la main, sur un vrai
téléphone. C'est le seul lot du chantier où un simulateur ne suffit pas.

## Livraison

**Étape 1, socle sans interface.** Table, clés VAPID, service worker, manifeste,
canal dans `notify()`, avec les tests. À l'issue de cette étape, rien ne change
pour personne : aucun abonnement n'existe, donc aucun push ne part.

**Étape 2, interface.** Bouton d'activation, colonne dans la matrice, liste
d'appareils, encadré iOS.

## Hors périmètre

- **Parcours d'installation PWA** : pas de bannière, pas de tunnel, pas de
  mesure de conversion. Seul l'encadré informatif existe. À rouvrir si le nombre
  d'abonnés le justifie.
- **Synchronisation d'un abonnement entre appareils** : chaque navigateur
  s'abonne pour lui-même.
- **Invitation à s'abonner ailleurs que dans les préférences.**
- **Relance de qui a refusé** : le refus est définitif côté navigateur, insister
  n'y changerait rien.
- **Mode hors ligne et mise en cache** : le service worker ne sert qu'au push.
- **Suppression des abonnements à la déconnexion** : choix du confort, arbitrage
  assumé, la liste des appareils est le remède.
