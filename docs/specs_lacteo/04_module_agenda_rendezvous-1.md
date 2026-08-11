# Module 4 — Agenda et rendez-vous

> Voir `00_cadrage_global.md` pour le contexte et les décisions transverses.

Le système de réservation en ligne est déjà codé (Next.js). Ce module ajoute la couche de gestion d'agenda côté praticien(ne) : typologie des consultations, vue multi-praticien, synchronisation externe (obligatoire) et rappels automatiques.

---

## 4.0 Catégories d'événements d'agenda

Au-delà des consultations, l'agenda doit gérer plusieurs catégories d'événements, avec possibilité de créer des catégories personnalisées :

| Catégorie | Usage |
|---|---|
| Consultation | Rendez-vous patiente (lié à une fiche Anamnèse/Suivi) |
| Disponibilité | Créneaux ouverts à la réservation en ligne |
| Atelier | Ateliers/sessions collectives (ex. atelier allaitement en groupe) |
| Réunion | Réunions internes, formations |
| Vacance | Blocage de congés/indisponibilité |
| Anniversaire | Rappel automatique (ex. anniversaire d'un enfant suivi) |
| Autre | Catégorie libre |
| **+ Catégorie personnalisée** | La praticienne peut créer ses propres catégories |

Chaque événement (hors consultation) peut recevoir des notes libres. Les événements créés dans un calendrier externe synchronisé apparaissent avec leur propre couleur ("Calendrier externe").

---

## 4.1 Types de consultation (configurables)

Chaque type de consultation est un objet paramétrable, pas une valeur codée en dur, pour rester évolutif.

| Champ | Type | Détail |
|---|---|---|
| Nom du type | Texte | Ex. "Consultation initiale", "Consultation de suivi" |
| Durée par défaut | Numérique (min) | Modifiable au cas par cas lors de la prise de RDV |
| Lieu | Choix unique, **champ séparé du type** | Cabinet / Domicile du patient / Visio / Téléphone |
| Tarif par défaut | Numérique (€) | Repris en facturation (module Facturation) |
| Couleur d'affichage | Sélecteur couleur | Distinction visuelle dans l'agenda |
| Fiche associée | Choix unique | Détermine si une fiche "Anamnèse Consultation d'allaitement" ou "Consultation de suivi" est proposée à l'ouverture (voir module Anamnèse) |

## 4.2 Vue agenda praticien(ne)

- Vue jour / semaine / mois.
- Multi-agenda coloré par praticien(ne) (cohérent avec le mode multi-praticien retenu dans le cadrage).
- Filtres : par type de consultation, par statut (confirmé, en attente, annulé, terminé).
- Vue consolidée "cabinet" pour un rôle admin, agrégeant tous les agendas.

## 4.3 Synchronisation externe (obligatoire)

**Google Calendar**
- Connexion OAuth2 individuelle par praticien(ne) (pas de compte partagé).
- **Synchronisation bidirectionnelle** : un RDV pris sur le site apparaît dans le Google Calendar personnel, et un événement bloqué manuellement côté Google (indisponibilité personnelle) bloque automatiquement le créneau côté site pour éviter le double-booking.

**Apple iCloud**
- Connexion CalDAV avec **mot de passe d'application** généré depuis le compte iCloud de la praticienne, permettant une synchronisation bidirectionnelle complète (et non un simple flux `.ics` en lecture seule).
- Microsoft Outlook peut être ajouté selon le même principe (OAuth2) si utile pour certain(e)s praticien(ne)s.
- Complémentaire à Google Calendar, pas un remplacement — chaque praticien(ne) connecte le ou les calendriers qu'elle utilise réellement.

**Principe général (à afficher à l'utilisatrice)**
- Les rendez-vous créés dans l'outil sont automatiquement ajoutés au calendrier externe connecté.
- Les disponibilités affichées en réservation en ligne se basent sur le calendrier externe (un événement personnel bloque le créneau).
- La synchronisation est bidirectionnelle sur l'ensemble des connecteurs.

**Gestion des conflits**
- Détection de double-booking entre une réservation en ligne et un événement externe synchronisé.
- Blocage préventif du créneau côté réservation en ligne dès qu'un événement externe occupe ce créneau.

## 4.4 Rappels automatiques

| Élément | Détail |
|---|---|
| Canal | Email a minima ; SMS en option (à trancher — coût par envoi) |
| Timing | Paramétrable, ex. J-2 et J-1 par défaut |
| Contenu | Lien de confirmation / annulation / reprogrammation ; pour une consultation initiale, lien vers le portail patient pour pré-remplir l'Anamnèse avant le RDV |
| Personnalisation | Le contenu du rappel dépend du type de consultation (§4.1) |

## 4.5 Annulation et reprogrammation

- Règles configurables : délai minimum avant annulation gratuite, pénalité éventuelle en cas d'annulation tardive (lié au module Facturation).
- Notification automatique à la praticienne et à la patiente à chaque changement.

## 4.6 Lien avec les fiches de consultation

À l'ouverture de la consultation, la praticienne choisit l'enfant concerné (ou "consultation parent/patiente" sans enfant) puis la fiche à utiliser : "Anamnèse Consultation d'allaitement" ou "Consultation de suivi" (voir module Anamnèse). Ce choix reste flexible au moment de démarrer la consultation, pas figé à la prise de RDV.

## 4.7 Accès secrétariat (rôle restreint)

Distinct du mode multi-praticien retenu dans le cadrage : un accès "secrétariat" permet à une personne tierce (secrétaire, assistante) de **prendre des rendez-vous uniquement**, sans aucun accès aux dossiers patients, consultations ou paramètres. Connexion via une page dédiée (email + mot de passe séparés du compte praticien). Option à activer : autoriser ou non le secrétariat à prendre des RDV nécessitant un paiement en ligne obligatoire (par défaut désactivé — si activé, le RDV est créé mais aucun paiement n'est encaissé via l'outil, à gérer directement avec la patiente).

Ce rôle est complémentaire au mode multi-praticien complet (plusieurs IBCLC partageant les dossiers) déjà retenu pour l'outil de Théo — les deux niveaux d'accès doivent coexister.

---

## Points ouverts

- Canal des rappels : email seul, ou email + SMS (impact coût)
- Politique d'annulation / pénalités (à coordonner avec le module Facturation)
- Gestion des fuseaux horaires pour les téléconsultations, si patientèle hors France
- Portée exacte du rôle "secrétariat" (§4.7) à valider
