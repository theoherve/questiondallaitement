# Dossier famille (enfant) + Courbes de poids OMS — Design

Date : 2026-08-11
Statut : approuvé (brainstorming)

## Contexte

Analyse des specs concurrentes "Lactéo" (`docs/specs_lacteo/02_module_dossier_famille-1.md`,
`03_module_courbes_de_poids-1.md`) comparées à l'existant du site. Décision : construire une
version light adaptée à une seule consultante active (Carole), sans les raffinements
multi-praticien / coparentalité / alertes cliniques automatiques présents dans les specs
sources.

Priorité choisie parmi le top 8 identifié : modules "dossier famille" + "courbes de poids"
en premier (forte valeur perçue, effort modéré, prérequis pour les modules suivants
anamnèse/notes).

## Décisions validées

- Un profil client (`profiles`) peut avoir 0..N enfants (jumeaux, fratrie).
- Saisie des infos enfant : côté client (espace-client) **et** côté consultante (CRM).
- Saisie des pesées : côté client **et** côté consultante, avec distinction visuelle de
  la source (domicile vs consultation).
- Consentement RGPD santé : réutilise le champ existant `profiles.gdpr_consent_at`
  (pas de nouveau consentement dédié). Mention explicite ajoutée à la politique de
  confidentialité.
- Données de référence OMS : fichier statique dans le repo (pas de table Supabase),
  aucune dépendance externe.
- Graphique : recharts (déjà présent dans le projet), style aligné sur la charte
  graphique existante.

## 1. Modèle de données

```sql
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('M', 'F')),
  is_premature BOOLEAN NOT NULL DEFAULT false,
  gestational_age_weeks INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE weight_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  weight_grams INT NOT NULL,
  measured_at DATE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('home', 'consultation')),
  recorded_by UUID NOT NULL REFERENCES profiles(id),
  consultant_id UUID REFERENCES consultants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- Pas de table "famille" séparée : `parent_id` direct sur `children` suffit, cohérent
  avec le refus de la notion coparentalité/famille distincte des specs sources.
- RLS `children` : client accède à ses propres lignes (`parent_id = auth.uid()`) ;
  consultante accède aux enfants de ses clients, même pattern de jointure que
  `crm_notes` (client lié via booking/CRM à la consultante).
- RLS `weight_measurements` : même logique via `child_id → children.parent_id`.
- `gestational_age_weeks` stocké pour un usage futur (âge corrigé) mais non utilisé en
  V1 (le graphique utilise l'âge chronologique).

## 2. Gate consentement

Aucune nouvelle table/champ. Les formulaires de création d'enfant (client et CRM)
vérifient `profiles.gdpr_consent_at IS NOT NULL` avant d'autoriser la création. Si absent :
message + lien vers acceptation des CGU. La politique de confidentialité
(`src/app/(public)/politique-de-confidentialite/page.tsx`) est mise à jour avec une
mention explicite sur les données de santé de l'enfant.

## 3. UI espace-client (parent)

- Nouvel onglet "Mes enfants" dans `src/app/(public)/espace-client/`.
- Liste des enfants : carte avec prénom, âge calculé, sexe, badge "prématuré" si
  applicable. Bouton "Ajouter un enfant".
- Formulaire enfant : prénom, date de naissance, sexe, case "né prématurément" →
  si cochée, champ semaines de grossesse.
- Page détail enfant : courbe de poids + bouton "Ajouter une pesée" (poids + date,
  `source='home'`, `recorded_by=auth.uid()`).
- Le client peut supprimer une pesée qu'il a saisie mais ne peut plus la modifier après
  J+1 (anti-falsification a posteriori). La consultante peut tout éditer/supprimer.

## 4. UI CRM (consultante)

- Nouvelle section "Enfants" dans la fiche client existante du CRM, au même niveau que
  les notes/tags.
- Liste des enfants du client, accès à la même courbe de poids qu'en espace-client, en
  lecture + ajout de pesée (`source='consultation'`, `consultant_id` renseigné,
  `recorded_by` = consultante).
- La consultante peut créer/éditer/supprimer un enfant (utile si le parent ne l'a pas
  encore renseigné lui-même).
- Aucune nouvelle permission/rôle : accès conditionné aux mêmes règles RLS que
  `crm_notes` (consultante liée au client via booking/CRM).

## 5. Composant courbe (recharts + OMS)

- Données de référence : fichier statique (`src/lib/growth-charts/who-weight-for-age.ts`
  ou `.json`) contenant les tables LMS OMS 0-24 mois, séparées garçon/fille,
  poids-pour-âge.
- Fonction `getPercentileWeight(ageInDays, sex, percentile)` calcule les bandes de
  percentile (P3, P15, P50, P85, P97) via la formule LMS standard OMS.
- Composant `WeightChart` (recharts `ComposedChart`) : bandes de percentile en zones
  colorées en arrière-plan (`Area`), courbe de l'enfant en ligne + points (plein =
  consultation, contour = domicile).
- Axe X = âge en jours/mois depuis `birth_date` (pas de date calendaire) ; axe Y = poids
  en grammes/kg.
- Palette et style alignés sur le design system existant du site — pas de nouvelle
  palette custom.
- Pas d'alerte automatique, pas de z-score affiché. Note fixe sous le graphique :
  "Ces courbes sont indicatives et ne remplacent pas un avis médical."

## 6. Hors périmètre (exclu explicitement)

- Notion "famille"/coparentalité, visibilité conditionnelle de l'historique maternel.
- Alertes cliniques automatiques (perte de poids, cassure de courbe, stagnation).
- Âge corrigé pour prématurés dans le calcul de percentile (donnée stockée, pas utilisée
  en V1).
- Export PDF de la courbe, partage avec pédiatre.
- Nouveau rôle "secrétariat" (décision séparée, reportée).
- Fiche d'anamnèse clinique complète, module notes versionnées (modules suivants du
  top 8, hors de ce design).

## Points de risque restants

- Hébergement Supabase non-HDS pour données de santé mineur : accepté comme risque
  assumé par décision utilisateur (2026-08-11), pas de blocage technique, mention légale
  à intégrer mais pas de validation juridique préalable exigée.
- Row-Level Security : `children`/`weight_measurements` doivent répliquer exactement le
  pattern d'accès `crm_notes` — à vérifier en implémentation qu'aucune fuite croisée
  entre consultantes n'est possible si le site passe un jour multi-praticien.
