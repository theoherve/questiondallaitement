# Cahier des charges — Espace professionnel & suivi patient IBCLC
## 00. Cadrage global

**Site :** formation-allaitement.com
**Statut :** document de référence, un fichier par module
**Dernière mise à jour :** août 2026

---

## 1. Contexte et objectifs

Le système de réservation est déjà développé (Next.js). Ce cahier des charges spécifie les modules complémentaires nécessaires pour construire un outil de gestion et de suivi IBCLC de niveau professionnel, inspiré de Lactéo, avec un **portail patient complet**.

## 2. Périmètre fonctionnel

| # | Module | Statut |
|---|---|---|
| 1 | Anamnèse — Fiches de consultation | ✅ Spécifié |
| 2 | Dossier famille | ✅ Spécifié |
| 3 | Courbes de poids OMS | ✅ Spécifié |
| 4 | Agenda et rendez-vous | ✅ Spécifié |
| 5 | Prise de notes | ✅ Spécifié |
| 6 | Facturation et paiements | ✅ Spécifié |
| 7 | Cartes cadeaux | ✅ Spécifié |

## 3. Décisions de cadrage validées

| Sujet | Décision |
|---|---|
| Utilisateurs | **Multi-praticien** dès le lancement — gestion de rôles/permissions dès la conception (praticien(ne) principal(e), collaborateurs, accès admin, accès secrétariat restreint) |
| Accès patient | **Portail patient complet** — les mères se connectent pour consulter dossier famille, courbes, documents, factures |
| Stack technique | **Next.js** (existant) — réservation déjà codée |
| Hébergement des données | **Supabase, confirmé** (voir section 4) |
| Synchronisation agenda | **Google Calendar + Apple iCloud (CalDAV) obligatoires**, Microsoft Outlook en option (détaillé dans le module Agenda) |
| Historique maternel / fratries | Visibilité **au cas par cas**, via une bascule dédiée (voir module Dossier famille) — pas de règle unique automatique |
| Courbes de poids | Générées **automatiquement dès qu'une donnée de poids existe** (première pesée en consultation ou saisie manuelle) |

## 4. Hébergement des données — décision finale

**Décision : on reste sur Supabase.**

Supabase n'est pas certifié HDS (Hébergeur de Données de Santé) à ce jour (vérifié août 2026), et le statut IBCLC n'est pas une profession réglementée en France, ce qui laisse une zone grise sur l'applicabilité stricte de l'obligation légale HDS. Le choix de rester sur Supabase implique de compenser par un RGPD renforcé :

- Chiffrement au repos et en transit (Supabase le fait par défaut, à vérifier/documenter)
- Minimisation des données collectées dans les fiches de consultation
- Consentement RGPD explicite et horodaté (prévu dans la fiche Anamnèse)
- Durée de conservation définie et purge automatique après ce délai
- DPA (Data Processing Agreement) signé avec Supabase
- Politique d'accès stricte (RLS — Row Level Security — par praticien(ne) et par famille)

⚠️ Recommandation : faire valider ce choix par un juriste RGPD/santé avant la mise en production, même si le développement peut démarrer sur cette base.

## 5. Accès au dépôt de code

**Statut : mis de côté pour l'instant.** Les modules sont spécifiés de façon indépendante de l'implémentation existante (fonctionnel + modèle de données), sans supposer une structure de code précise. Si l'architecture technique doit être calée plus précisément sur l'existant, deux options restent possibles : partager le chemin d'un dossier local, ou l'URL d'un dépôt public.

## 6. Lactéo comme référence

L'ensemble des modules a été enrichi et validé par une exploration directe de l'espace Lactéo utilisé par Théo (dashboard, fiche patiente, formulaires Anamnèse/Grossesse/Enfant, Agenda, Paramètres, Facturation, ainsi que l'interface bêta "Espace v2" de l'écran de consultation). Les apports structurants de cette exploration sont intégrés directement dans chaque module concerné :

- Une consultation peut concerner la mère seule, sans enfant précis (ex. mastite) — pas systématiquement liée à un enfant (module Anamnèse).
- Entité "Grossesse" distincte de "Enfant", avec coordonnées du co-parent — répond au besoin de gestion au cas par cas de la coparentalité (module Dossier famille).
- Âge corrigé pour les prématurés, indispensable pour une lecture correcte des courbes de poids (modules Dossier famille et Courbes de poids).
- Rôle "Secrétariat" (réservation seule, aucun accès dossier), complémentaire au mode multi-praticien complet (module Agenda).
- Facturation intégrable directement dans l'écran de consultation, paiement en ligne via Stripe Connect, mentions légales précises (pénalité de retard, exonération TVA, identifiants professionnels), recherche automatique par SIRET (module Facturation).
- Documents attachables par consultation avec support vidéo, et un champ "Lieu" du rendez-vous incluant le téléphone en plus de Cabinet/Domicile/Visio (modules Anamnèse et Agenda).
- Carte cadeau applicable aussi bien à la réservation qu'à la création d'une facture (modules Facturation et Cartes cadeaux).
- Le compte-rendu généré par IA observé dans l'interface bêta de Lactéo a été examiné puis **écarté** : le courrier de transmission reste une rédaction entièrement manuelle (module Anamnèse §1.3).

## 7. Points ouverts transverses

- Validation juridique du choix d'hébergement Supabase (section 4)
- Accès au dépôt de code (section 5)
- Seuils cliniques des courbes de poids à valider (voir module Courbes de poids)
- Interface exacte de la bascule de visibilité de l'historique maternel (voir module Dossier famille)
