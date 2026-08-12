# Fiche de consultation structurée légère — Design

## Contexte

Chantier issu de l'analyse initiale des specs concurrentes "Lactéo" (`docs/specs_lacteo/`), identifié comme top priorité restante après la fermeture du module dossier famille + courbes de poids (PR #92, 2026-08-12). Voir `docs/specs_lacteo/01_module_anamnese_fiches_consultation-1.md` pour la spec complète Lactéo (2 fiches Initiale/Suivi, ~12 sections cliniques détaillées, upload webcam, EPDS, courrier de transmission structuré).

Le besoin exprimé pour ce site (usage solo de Carole, pas de multi-praticien) est une version délibérément plus légère : une fiche unique motif/antécédents/observation/conclusion, rattachée à un enfant ou à la mère, sans les sections cliniques exhaustives ni le courrier de transmission de la version complète Lactéo. Ces éléments écartés restent dans `docs/specs_lacteo/01_module_anamnese_fiches_consultation-1.md` si une V2 plus riche est un jour souhaitée.

## Décisions de cadrage

- **Fiche unique**, pas de distinction Initiale/Suivi. Le panneau "consultations précédentes" en bas de fiche donne le rappel de contexte sans dupliquer de champs.
- **Antécédents** : 4 cases à cocher (médicaux, chirurgicaux, allergies, traitements en cours) chacune avec un texte libre optionnel associé — pas les ~9 champs cliniques détaillés de Lactéo.
- **Rattachée à un booking existant** (RDV de l'agenda) : date/type de consultation hérités automatiquement. Une fiche par booking (contrainte unique).
- **Enfant concerné** choisi à l'ouverture (liste des enfants du dossier famille, ou "consultation parent seule" → `child_id` NULL). Modifiable à tout moment, comme le reste de la fiche.
- **Visible côté client** (portail patient), en lecture seule, dès la V1 — cohérent avec le "portail patient complet" du cadrage global Lactéo (`docs/specs_lacteo/00_cadrage_global-1.md`).
- **Statut brouillon/publié** : la fiche existe en `draft` (consultante seule) jusqu'à publication explicite. Seules les fiches `published` sont visibles côté client.
- **Notes internes** : champ séparé, jamais transmis à la patiente, quel que soit le statut.
- **Modifiable sans limite**, même après publication — pas de verrouillage. L'historique de versions (traçabilité) est un chantier séparé, déjà identifié dans le backlog (`crm_notes` actuellement en UPDATE sans trace) ; cette fiche suit le même choix pour l'instant.
- **Explicitement hors scope** : courrier de transmission, upload photo webcam, échelle EPDS, distinction Initiale/Suivi, champs cliniques détaillés (chirurgie mammaire par type d'incision, etc.).

## Modèle de données

Nouvelle table `consultation_notes`, migration suivante dans `supabase/migrations/`, sur le pattern de `children`/`weight_measurements` (`00094_children_weight_measurements.sql`).

```sql
CREATE TABLE consultation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id),
  consultant_id UUID NOT NULL REFERENCES consultants(id),
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,

  motif TEXT NOT NULL,

  antecedents_medicaux BOOLEAN NOT NULL DEFAULT false,
  antecedents_medicaux_detail TEXT,
  antecedents_chirurgicaux BOOLEAN NOT NULL DEFAULT false,
  antecedents_chirurgicaux_detail TEXT,
  allergies BOOLEAN NOT NULL DEFAULT false,
  allergies_detail TEXT,
  traitements_en_cours BOOLEAN NOT NULL DEFAULT false,
  traitements_en_cours_detail TEXT,

  observation TEXT NOT NULL,
  conclusion TEXT NOT NULL,

  notes_internes TEXT,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consultation_notes_client ON consultation_notes(client_id);
CREATE INDEX idx_consultation_notes_child ON consultation_notes(child_id);

CREATE TRIGGER consultation_notes_updated_at
  BEFORE UPDATE ON consultation_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

`client_id` et `consultant_id` sont dénormalisés depuis `bookings` (même logique que `bookings` lui-même vis-à-vis de `profiles`/`consultants`), pour que les policies RLS n'aient pas à remonter par jointure sur chaque lecture.

**RLS** :

```sql
ALTER TABLE consultation_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY consultation_notes_select_own_published ON consultation_notes
  FOR SELECT USING (client_id = auth.uid() AND status = 'published');

CREATE POLICY consultation_notes_select_admin ON consultation_notes
  FOR SELECT USING (is_admin());
```

Aucune policy d'écriture pour le client (jamais de création/modification côté client). Les écritures consultante passent par le service role via server actions, comme pour `children`/`weight_measurements` — RLS ne contraint donc que les lectures côté client.

## Server actions

Toutes dans `src/app/(dashboard)/espace-consultante/crm/actions.ts`, appliquant le principe déjà retenu sur ce module (voir mémoire `server-actions-parametre-autorisation-attaquable`) : **jamais de paramètre représentant un contrôle d'autorisation déjà effectué**. Chaque action revérifie elle-même la relation consultante/booking en interne.

- `getConsultationNoteForBooking(bookingId)` — vérifie que `booking.consultant_id = user.id`, retourne la fiche ou `null`.
- `upsertConsultationNote(bookingId, fields)` — même vérification interne. Upsert sur `booking_id` (contrainte unique). Ne modifie jamais `status` ; une fiche créée/modifiée par cette action reste ou repasse en `draft` uniquement si elle ne l'était pas déjà — en pratique l'upsert ne touche pas la colonne `status`, donc une fiche publiée reste publiée tant qu'on ne passe pas explicitement par `unpublishConsultationNote`.
- `publishConsultationNote(bookingId)` — vérifie la relation, vérifie que `motif`/`observation`/`conclusion` sont non vides (garde-fou anti-publication de fiche creuse), passe `status = 'published'`, fixe `published_at = now()`.
- `unpublishConsultationNote(bookingId)` — vérifie la relation, repasse `status = 'draft'`.
- `getConsultationNotesForFamilyDossier(clientId)` — action composite pour le panneau "consultations précédentes", même esprit que `getFamilyDossierForContact` : une seule vérification de relation, retourne toutes les fiches (brouillons + publiées) du client, groupées ou triées par date, pour affichage groupé sans requêtes répétées par booking.

Côté espace client, nouvelle action dans le module dossier famille client (ou fichier dédié) :

- `getPublishedConsultationNotesForClient()` — utilise l'utilisateur courant (`auth.uid()`) comme seul filtre, ne prend aucun `clientId` en paramètre (rien à falsifier). Sélectionne explicitement les colonnes non-internes (`notes_internes` absent du `select`, pas filtré après coup en JS) et où `status = 'published'`.

## UI — CRM (consultante)

- Sur la page CRM contact (`crm/[clientId]/page.tsx`) et/ou depuis un booking passé dans l'agenda : bouton "Ouvrir la fiche de consultation".
- Formulaire : sélecteur enfant (liste des enfants du dossier famille + option "Consultation parent seule"), motif (textarea obligatoire), 4 blocs antécédents (checkbox + textarea conditionnel qui n'apparaît que si coché), observation (textarea obligatoire), conclusion (textarea obligatoire), notes internes (textarea, encart visuellement distinct "réservé, jamais visible de la patiente").
- Bouton "Enregistrer" → `upsertConsultationNote`, reste en `draft`.
- Bouton "Publier" séparé, avec confirmation explicite ("La patiente pourra voir cette fiche") → `publishConsultationNote`. Une fois publiée : bandeau "Publiée le [date]" + bouton "Repasser en brouillon" (`unpublishConsultationNote`).
- Panneau "Consultations précédentes" : fiches (brouillons + publiées) de l'enfant/mère concerné(e), triées par date décroissante, consultables en lecture rapide sans changer d'écran.

## UI — espace client

- Sur la fiche enfant (module dossier famille existant) ou la fiche mère : nouvel onglet/section "Consultations", listant uniquement les fiches **publiées**, triées par date décroissante.
- Affichage lecture seule : motif, antécédents cochés (avec détail), observation, conclusion. `notes_internes` absent de la réponse serveur — jamais chargé côté client.
- Aucune action d'édition côté client sur cette V1.

## Tests

TDD (Vitest), en cohérence avec le reste du module CRM :

- Chaque action (`getConsultationNoteForBooking`, `upsertConsultationNote`, `publishConsultationNote`, `unpublishConsultationNote`, `getConsultationNotesForFamilyDossier`) revérifie la relation consultante/booking en interne — test qu'un `bookingId` n'appartenant pas à la consultante courante est rejeté, sans paramètre de contournement possible.
- Publication refusée si `motif`, `observation` ou `conclusion` est vide.
- `upsertConsultationNote` appelé plusieurs fois sur le même `booking_id` : upsert réel, pas d'erreur de contrainte unique.
- Query client (`getPublishedConsultationNotesForClient`) : test explicite que `notes_internes` n'apparaît jamais dans la réponse, et qu'une fiche `draft` n'est jamais retournée (y compris en tentant de cibler son id).
- `child_id` NULL accepté et modifiable après coup sans effet de bord côté client (si l'enfant lié change, l'historique affiché bascule en conséquence — comportement voulu).
- RLS : test qu'un client A ne peut pas lire, via une requête Supabase directe, une fiche publiée appartenant au client B.

## Hors scope (explicitement écarté pour cette V1)

- Distinction fiche Initiale / Suivi.
- Champs cliniques détaillés de la spec Lactéo complète (chirurgie mammaire par type d'incision, échelle EPDS, examen clinique détaillé mère/nouveau-né, etc.).
- Upload/prise de photo webcam.
- Courrier de transmission structuré vers des référents externes.
- Historique de versions / traçabilité des modifications (chantier séparé, déjà identifié dans le backlog pour `crm_notes` — pourra couvrir `consultation_notes` dans un second temps).
- Verrouillage de la fiche après publication.
