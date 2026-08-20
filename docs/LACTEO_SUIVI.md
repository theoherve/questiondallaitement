# Suivi du chantier Lactéo

> Document de reprise. Dernière mise à jour : 2026-08-20 (après merge du module 03 — alertes courbes de poids).
> Objectif : pouvoir reprendre ce chantier à partir de ce seul fichier, sans avoir à reconstituer l'historique des sessions précédentes.

## 1. Contexte

"Lactéo" est le nom d'une plateforme concurrente dont les specs ont été analysées (`docs/specs_lacteo/00_cadrage_global-1.md` à `07_module_cartes_cadeaux-1.md`, 8 fichiers) pour identifier des fonctionnalités à porter sur ce site. Le portage n'est **pas** une copie fidèle : le produit cible une seule consultante en lactation active (Carole), pas un cabinet multi-praticien avec personnel administratif — chaque module a été volontairement allégé par rapport à la spec source, et certains éléments de la spec ont été explicitement écartés comme non pertinents pour ce contexte (voir §3, "Décisions actées").

**Principe de lecture de ce document :** un module marqué "livré" ne veut *jamais* dire "toute la spec Lactéo est couverte" — ça veut dire "le périmètre cadré en brainstorming avec l'utilisateur est fini". L'écart avec la spec source complète est documenté module par module en §2.

## 2. État par module

| # | Module | Statut | Écart principal avec la spec source |
|---|--------|--------|--------------------------------------|
| 00 | Cadrage global | Partiel | Pas de notion de "cabinet" multi-praticien |
| 01 | Anamnèse / fiches de consultation | Partiel (allégé) | Version très simplifiée par rapport à la spec |
| 02 | Dossier famille | Partiel (plus limité que "livré" ne le laisse penser) | Pas d'entité Famille/Grossesse/Parent |
| 03 | Courbes de poids | **Alertes automatiques livrées le 2026-08-20** | Gap produit sur `birth_weight_grams` (voir détail) |
| 04 | Agenda / rendez-vous | Partiel — le plus gros écart structurel | **Sync calendrier externe absente** (bloc obligatoire du cadrage) |
| 05 | Prise de notes | Partiel | Traçabilité faite, plusieurs manques fonctionnels |
| 06 | Facturation / paiements | Partiel | **Intégration Pennylane jamais commencée** |
| 07 | Cartes cadeaux | **Couvert** (phases 1+2) | Reste des paramètres produit seulement |

### 00 — Cadrage global

Pas de notion de "cabinet" multi-praticien (site mono-consultante). Points ouverts §7 de la spec (validation HDS, seuils cliniques, bascule de visibilité de l'historique maternel) tous encore ouverts — non traités, pas de décision prise.

### 01 — Anamnèse / fiches de consultation

**Livré** le 2026-08-12 (table `consultation_notes`, migrations `00095`/`00096`). Version volontairement allégée : fiche unique (pas de split Initiale/Suivi), 4 blocs à cocher + détail libre pour les antécédents (pas les ~9 champs cliniques détaillés de la spec), statut brouillon/publié, rattachée à un `booking_id` et optionnellement à un enfant.

**Manque vs spec complète** : sections détaillées §A-L (histoire gynéco-obstétricale, examen clinique mère/nouveau-né, EPDS, consentement RGPD horodaté+signé), fiche "suivi" distincte de la fiche initiale, photo webcam en direct, courrier de transmission, documents joints multi-format.

**Décisions actées, ne pas re-proposer sans raison** :
- Fiche unique, pas Initiale/Suivi.
- `notes_internes` jamais transmis à la patiente.
- Modifiable sans limite même après publication (pas de verrouillage).
- **Rôle "secrétariat restreint" de la spec (§00/§04) : abandonné définitivement**, pas un report. Carole gère elle-même son secrétariat ; si elle embauche un jour, ce serait une nouvelle décision produit (probablement un rôle "collaborateur" simple, pas la reconstruction du modèle Lactéo). Ne plus le lister comme backlog.

**Trouvé et corrigé en revue finale** : le commentaire de migration affirmant "RLS = filet de sécurité" était trompeur (les server actions passent par le service role, qui contourne RLS) — un `REVOKE SELECT (notes_internes)` a été ajouté en défense en profondeur. `upsertConsultationNote` ne vérifiait pas que `child_id` appartient au client du booking — corrigé.

### 02 — Dossier famille (+ courbes de poids, base)

**Livré** le 2026-08-12 (migration `00094`, table `children` + `weight_measurements`), fermé par une seconde PR (#92) le même jour qui a traité 5 points mineurs déférés (redesign du graphique, tolérance de date, message d'erreur, tests, dédoublonnage d'une requête).

**Plus limité que "livré" ne le laisse penser** : pas d'entité "Famille", "Grossesse" ni "Parent" distinctes — `children.client_id` pointe directement sur le profil. Pas de bascule de visibilité de l'historique maternel, pas de fusion de doublons, pas de vue famille unifiée multi-enfants.

**Ce qui existe** : enfant + pesées côté espace-client et côté CRM consultante, suppression des deux côtés, export RGPD à jour, RLS durcie, graphique avec bandes de percentile empilées (P3-P15-P50-P85-P97), médiane visible, distinction domicile/consultation.

### 03 — Courbes de poids : alertes automatiques

**Livré et mergé sur `main` le 2026-08-20** (14 commits, merge local — pas de PR pour ce chantier, décision explicite de l'utilisateur). Design : `docs/superpowers/specs/2026-08-20-alertes-courbes-poids-design.md`. Plan : `docs/superpowers/plans/2026-08-20-alertes-courbes-poids.md`. 9 tâches en subagent-driven development + 1 fix wave après revue finale de branche. Suite de tests : 1131/1131 verts.

**5 règles cliniques implémentées** (`src/lib/growth-charts/weight-alerts.ts`), seuils codés en dur (pas d'écran de paramétrage), validés tels quels par l'utilisateur en brainstorming :

| Règle | Déclenchement | Niveau |
|---|---|---|
| Perte de poids — vigilance | Perte ≥7 % du poids de naissance, avant J14 | Vigilance |
| Perte de poids — alerte | Perte ≥10 % du poids de naissance, tout âge | Alerte |
| Non-reprise à J14 | Poids de naissance jamais retrouvé par une mesure à J≥14 | Vigilance (définitive — voir décisions) |
| Cassure de courbe | **Chute** ≥2 couloirs de percentile OMS entre deux mesures (unidirectionnel) | Alerte |
| Stagnation pondérale | Gain moyen &lt;15 g/jour sur 3 mesures après J14 | Vigilance |

Âge corrigé (prématurés, `is_premature`/`gestational_age_weeks`) utilisé uniquement pour cassure de courbe et stagnation — les règles de perte/non-reprise restent en âge réel. Alertes calculées par une fonction pure, jamais persistées comme état ; déclenchement en temps réel à chaque pesée (pas de cron) via le socle de notifications interne existant ; visibles **back-office uniquement**, jamais côté espace client.

**Décisions prises pendant l'exécution (au-delà du brainstorming initial), à ne pas re-proposer** :
- `no_regain_j14` est **définitive** : une fois le poids de naissance retrouvé à J≥14, la règle ne se redéclenche jamais pour cet enfant, même en cas de rechute ultérieure (les autres règles — perte, stagnation — couvrent ce cas).
- `curve_break` est **unidirectionnel** (une chute, pas un écart dans les deux sens) — une remontée après une perte ne doit jamais déclencher une fausse alerte.
- Le panel back-office déduplique par règle (garde la plus récente) et affiche la date de la mesure déclenchante.
- La mention "aide à la décision, pas un diagnostic" est présente à la fois dans le panel et dans le corps de la notification.

**Gap produit connu, non corrigé (hors périmètre du design approuvé)** : `birth_weight_grams` n'est saisissable qu'à la création de la fiche enfant côté espace client (`createChild`). **Aucun formulaire de saisie/édition côté back-office consultante**, aucun rattrapage sur les fiches existantes (décision explicite du design — pas de migration de données). Conséquence concrète : `loss_vigilance`, `loss_alert` et `no_regain_j14` (3 des 5 règles) resteront silencieuses pour toute fiche créée avant ce module ou sans ce champ rempli par la mère. Seules `curve_break` et `stagnation` restent actives dans tous les cas. **Prochaine étape suggérée si ce module est repris** : ajouter un champ éditable sur la fiche enfant côté back-office consultante.

**Point de vigilance clinique à faire trancher par Carole avant mise en production réelle (pas un bug, une limite du modèle)** : `curve_break` "snappe" chaque mesure vers le couloir de percentile OMS le plus proche parmi `[3, 15, 50, 85, 97]`. Aux extrêmes de la distribution (ex. chute de P15 à très en dessous de P3), la règle est aveugle car les bandes extrêmes ne sont pas bornées — elle est en fait la plus sensible au milieu de la distribution et la moins sensible aux effondrements les plus graves. À faire valider par Carole si le rôle d'aide à la décision est pris au pied de la lettre.

**Reste, non traité** : affichage en z-scores (alternative aux couloirs de percentile), contexte de pesée (habillé/déshabillé, avant/après tétée).

### 04 — Agenda / rendez-vous

**Partiel, le plus gros écart structurel du backlog.** Le moteur de réservation (`bookings`, disponibilités récurrentes, types de consultation, rappel J-1) est solide et couvre une bonne partie de la spec — mais la couche "agenda praticien" à proprement parler manque presque entièrement :

- **Synchronisation Google Calendar / CalDAV absente** — seul un export `.ics` unidirectionnel existe côté client (`src/lib/calendar/ics.ts`), alors que la sync est **explicitement obligatoire** au cadrage global §00.
- Pas de vue calendaire jour/semaine/mois (liste à onglets seulement, `espace-consultante/reservations`).
- Pas de catégories d'agenda internes (Atelier/Réunion/Vacance/Anniversaire/Autre) — la table `events` existante est pour du marketing public, pas de l'agenda interne.
- Pas de détection de double-booking avec un calendrier externe (impossible sans la sync).
- Rôle "secrétariat" strict : **abandonné, ne pas reproposer** (voir §01 et mémoire `role-secretariat-restreint-abandonne`).

**C'est le chantier n°2 dans l'ordre de priorité convenu avec l'utilisateur** (après les alertes courbes de poids, avant Pennylane) — mais un cadrage dédié est nécessaire avant de coder : c'est un chantier neuf (OAuth2/CalDAV par praticien), sans code de départ à reprendre.

### 05 — Prise de notes

**Traçabilité livrée** le 2026-08-12 (`crm_notes_history`, trigger `BEFORE UPDATE`, append-only — suppression retirée). Corrigé en revue finale : RLS manquante sur la table d'historique, policy de delete encore active malgré le retrait applicatif.

**Manque vs spec** : rattachement à un enfant spécifique (seulement `client_id` aujourd'hui), tags cliniques liés aux notes (le `crm_tags` existant est un système CRM général, pas lié aux notes), visibilité obligatoire interne/portail patient, rappel associé (date + texte), note strictement privée par praticien, timeline unifiée + recherche full-text.

### 06 — Facturation / paiements

**Partiel.** Numérotation atomique/immuabilité, règlements manuels, export CSV et relances impayés livrés le 2026-08-12 (migration `00099_manual_invoices_and_settlements.sql`, module `export-csv-relances`).

**Décisions actées** : relance manuelle (pas de cascade automatique) ; IBAN/BIC stockés en clair (déjà imprimés en clair sur le PDF envoyé) ; export CSV simple, pas de FEC ; TVA à taux unique 20 %, pas de double régime ; "en retard" calculé à l'affichage, jamais stocké.

**Manque vs spec** : TVA multi-taux par ligne, identifiants pro IBCLC/ADELI affichés sur facture, mention légale pénalité de retard, recherche SIRET auto (API Sirene), devis, export FEC, préfixe de numérotation configurable, **intégration Pennylane jamais commencée** (aucune trace dans le code — chantier neuf, sans code de départ à reprendre).

**Leçon technique importante pour tout futur travail sur `create_invoice`/`correct_invoice`** : un `CREATE OR REPLACE FUNCTION` réécrit à partir d'une ancienne version peut annuler silencieusement des fixes de migrations intermédiaires jamais touchées par la branche en cours — invisible en revue tâche par tâche. Avant de remplacer une de ces fonctions, lister tous ses ancêtres (`grep CREATE OR REPLACE FUNCTION create_invoice supabase/migrations/*.sql`) et vérifier que chaque apport intermédiaire est bien présent dans la nouvelle version. Deux régressions de ce type ont déjà été trouvées et corrigées sur ce module (idempotence de lookup de facture, colonnes `promo_code`/`discount_cents`/`gross_amount_ttc_cents`).

**C'est le chantier n°3 dans l'ordre de priorité convenu** — le moins urgent des trois, gain de temps administratif pour une seule praticienne active, mais effort d'intégration externe complet.

### 07 — Cartes cadeaux

**Couvert** (phases 1 et 2, PR #93 et #94, toutes deux mergées). Réutilise le pipeline `payments`/`invoices` existant, ledger append-only (`gift_card_redemptions`), redemption atomique via fonction SQL `SECURITY DEFINER`.

**Décisions actées** : pas de case de rétractation légale (même traitement que les formations, voir §3) ; réservation payée 100 % par carte cadeau ne crée aucune ligne `payments` ; délai de recours après expiration 90 jours ; aucun frais de gestion sur remboursement exceptionnel ; carte de remplacement (prolongation) valable 9 mois ; contact dédié = adresse existante ; rappel avant expiration = un seul envoi 30 jours avant échéance ; remboursement exceptionnel = virement manuel par Carole hors app, aucun appel Stripe ; carte émise manuellement à titre gracieux → remboursement bloqué mais prolongation toujours autorisée.

**Reste** : uniquement des paramètres produit (liste exacte des montants prédéfinis), pas de code manquant.

**Limites connues, non bloquantes** : `REVOKE EXECUTE` sur `redeem_gift_card()` jamais testé en conditions réelles (Docker indisponible en session, à vérifier au premier déploiement) ; carte "prestation" cumulée avec un code promo débite le solde en entier même si le prix réduit était inférieur ; pas de ligne "remise carte cadeau" explicite sur la facture.

## 3. Décisions transverses actées (ne pas reproposer)

- **Rôle "secrétariat restreint"** (spec §00/§04) : abandonné définitivement, pas un report. Carole gère son propre secrétariat.
- **Rétractation légale (14 jours)** : retirée pour les formations/accompagnements en ligne et pour les cartes cadeaux — risque légal accepté explicitement par l'utilisateur après avertissement. Reste intacte uniquement pour la réservation de consultation (`/reserver`).
- **Pas de synchronisation calendrier**, en dehors de l'export `.ics` — reste le chantier n°2 du backlog, pas encore cadré.

## 4. Ordre de priorité convenu pour la suite

1. ~~**Alertes automatiques sur les courbes de poids** (module 03)~~ — **fait, mergé le 2026-08-20.**
2. **Synchronisation calendrier externe** (module 04) — obligatoire au cadrage global, chantier neuf (OAuth2/CalDAV par praticien), à cadrer par une session de brainstorming dédiée avant de coder.
3. **Intégration Pennylane** (module 06) — le moins urgent des trois, chantier neuf sans code de départ.

## 5. Notes de méthode pour la suite du chantier

- Chaque module a suivi le même processus : brainstorming de cadrage (trancher les seuils/décisions produit avec l'utilisateur) → design doc (`docs/superpowers/specs/`) → plan TDD (`docs/superpowers/plans/`) → exécution en subagent-driven development (un sous-agent par tâche, revue à chaque tâche, revue finale sur toute la branche). À reproduire pour les modules 04 et 06.
- Avant de considérer un module "fini", vérifier l'écart avec la spec source complète (`docs/specs_lacteo/`) — un module "livré" dans une mémoire de session correspond souvent à une version volontairement réduite, pas à la couverture intégrale de la spec.
- Risque de sécurité récurrent à surveiller sur ce projet : ne jamais ajouter à une server action exportée un paramètre optionnel qui représente "un contrôle d'autorisation déjà fait" (ex. un booléen "relation vérifiée") — toute fonction exportée d'un fichier `"use server"` est un endpoint appelable avec des arguments arbitraires. Préférer fusionner en une action composite qui fait le contrôle une seule fois en interne.
- `pnpm test`/`npx vitest run` depuis la racine du repo principal peut faire remonter de faux échecs venant d'autres worktrees actifs sous `.claude/worktrees/` — relancer avec `--exclude '.claude/**'` pour avoir le vrai signal avant de traiter un échec comme une régression.
