# Refonte UI/UX — Question d'Allaitement

> Direction : **Editorial Premium** — Site de marque personnelle d'experte, pas un template SaaS.
>
> Derniere mise a jour : 2026-02-25

---

## 1. Positionnement & objectifs

### Positionnement
- **Premium mais accessible** — Haut de gamme sans etre elitiste
- **Editorial** — Feel magazine, pas landing page SaaS
- **Autorite personnelle** — Carole Herve est la marque, le site est son extension
- **Mobile-first** — Conception pensee mobile d'abord, adaptee desktop ensuite

### Objectifs de conversion (par priorite)
1. **Vente d'accompagnements en ligne** (ex-formations) — CTA primaire
2. **Prise de rendez-vous** — CTA secondaire, toujours visible
3. **Inscription newsletter / compte** — Conversion douce
4. **Renforcement de l'autorite** — Blog, medias, livres, temoignages
5. **Conversion B2B** — Formations pro pour professionnels

### Audiences cibles
- **B2C (primaire)** : Parents cherchant accompagnement allaitement/lactation
- **B2B light (secondaire)** : Professionnels de sante (formations, ateliers, evenements)

---

## 2. Renommage & taxonomie

| Ancien terme       | Nouveau terme               | Cible | Route                  |
| ------------------- | --------------------------- | ----- | ---------------------- |
| Formations          | Accompagnements en ligne    | B2C   | `/accompagnements`     |
| Evenements (pro)    | Formations                  | B2B   | `/formations`          |
| Consultantes        | (supprime de la nav)        | —     | `/a-propos` ou footer  |
| Evenements (mixte)  | Sous-types : Formation / Atelier / Webinaire | B2B | `/formations` |

---

## 3. Architecture de navigation

### Navigation desktop

```
LOGO | Accompagnements en ligne | Formations | Livres | Medias | Blog | A propos || [Prendre RDV]
```

- **7 liens + 1 CTA** — Dense mais chaque lien a sa raison d'etre
- **CTA "Prendre RDV"** : bouton primaire (rouge), toujours visible (sticky header)
- **Logo** : "Question d'Allaitement" en Noto Serif bold

### Navigation mobile

```
┌─────────────────────────────┐
│ LOGO          [RDV]  [≡]   │
└─────────────────────────────┘
```

- **Barre sticky** avec logo + bouton RDV + hamburger
- Le CTA RDV est TOUJOURS visible en mobile (thumb-friendly, coin droit)
- Menu hamburger → fullscreen overlay avec tous les liens

### Menu mobile ouvert (fullscreen overlay)

```
┌─────────────────────────────┐
│                        [✕]  │
│                              │
│  Accompagnements en ligne    │
│  Formations (Pro)            │
│  Livres                      │
│  Medias & Conferences        │
│  Blog                        │
│  A propos                    │
│                              │
│  ─────────────────────────   │
│  Connexion                   │
│  [Prendre rendez-vous]       │
│  [Creer mon compte]          │
└─────────────────────────────┘
```

### Footer

```
┌──────────────────────────────────────────────────┐
│  LOGO                                            │
│  Tagline courte                                  │
│                                                  │
│  NAVIGATION        LEGAL          SUIVEZ-NOUS    │
│  Accompagnements   Mentions       Instagram      │
│  Formations        Confidentialite Facebook       │
│  Livres            CGV            LinkedIn        │
│  Blog                                            │
│  A propos                                        │
│                                                  │
│  © 2026 Question d'Allaitement                   │
└──────────────────────────────────────────────────┘
```

---

## 4. Design system — "Editorial Premium"

### 4.1 Couleurs (INCHANGEES)

| Token                  | Valeur    | Usage                          |
| ---------------------- | --------- | ------------------------------ |
| `primary-red`          | `#a0283e` | CTAs, accents, liens actifs    |
| `primary-red-dark`     | `#7a1e2f` | Hover states                   |
| `primary-red-light`    | `#c4566a` | Badges, backgrounds legers     |
| `primary-green`        | `#203634` | Texte principal, headers, fond premium |
| `primary-green-light`  | `#2d4a47` | Texte secondaire               |
| `background-beige`     | `#fff8f6` | Background principal           |
| `background-beige-dark`| `#f5ebe8` | Background alternatif          |

### 4.2 Typographie

| Element          | Police      | Taille mobile   | Taille desktop  | Weight    |
| ---------------- | ----------- | --------------- | --------------- | --------- |
| H1 (hero)        | Noto Serif  | 36px / 2.25rem  | 72px / 4.5rem   | 700       |
| H2 (sections)    | Noto Serif  | 28px / 1.75rem  | 48px / 3rem     | 700       |
| H3 (sous-titres) | Noto Serif  | 22px / 1.375rem | 30px / 1.875rem | 600       |
| Body             | DM Sans     | 16px / 1rem     | 18px / 1.125rem | 400       |
| Body small       | DM Sans     | 14px / 0.875rem | 16px / 1rem     | 400       |
| Label / meta     | DM Sans     | 12px / 0.75rem  | 14px / 0.875rem | 500 caps  |
| CTA button       | DM Sans     | 16px            | 16px            | 600       |
| Nav links        | DM Sans     | 15px            | 15px            | 500       |

### 4.3 Espacement

- **Sections** : `py-24` minimum mobile, `py-32` desktop (vs py-20 actuel)
- **Entre elements** : `gap-8` a `gap-16` (vs gap-6 actuel)
- **Max-width conteneur** : `max-w-7xl` (1280px), hero peut aller `max-w-screen`
- **Padding horizontal** : `px-5` mobile, `px-8` tablet, `px-16` desktop

### 4.4 Border radius

**CHANGEMENT MAJEUR : radius → 0 partout**

```css
:root {
  --radius: 0px;
}
```

- Cards : angles droits, pas de rounded
- Boutons : angles droits (`rounded-none`)
- Images : angles droits
- Badges : seule exception, leger `rounded-sm` (2px) acceptable
- Inputs : angles droits

### 4.5 Ombres & elevation

- **Pas de shadow sur les cards** au repos
- **Border subtile** (`border border-border`) pour delimiter
- **Hover** : `shadow-lg` + leger translate Y (`hover:-translate-y-0.5`)
- **Sections sur fond sombre (green)** : pas de border, separation par couleur

### 4.6 Animations & micro-interactions

- **Scroll reveal** : elements entrent par le bas avec fade (intersection observer)
- **Hover images** : leger zoom (`scale-[1.02]`) avec overflow hidden
- **Hover liens nav** : underline animee de gauche a droite
- **Transition page** : fade subtil entre les routes
- **Carousel temoignages** : autoplay + swipe mobile
- **Pas de parallax** — ca fait date

---

## 5. Structure Homepage — Section par section

### Section 1 : HERO (above-the-fold)

**Layout** : Asymetrique 55% image / 45% texte (desktop). Stack vertical (mobile).

```
Desktop :
┌────────────────────────────────────────────────────┐
│                                                    │
│  ┌─────────────────┐   L'allaitement,              │
│  │                 │   autrement.                   │
│  │   PHOTO         │                                │
│  │   CAROLE        │   Consultante IBCLC, auteure,  │
│  │   (portrait     │   20+ ans d'expertise au       │
│  │    pro)         │   service de votre allaitement.│
│  │                 │                                │
│  │                 │   [Decouvrir]    [Prendre RDV] │
│  └─────────────────┘                                │
│                                                    │
└────────────────────────────────────────────────────┘

Mobile :
┌──────────────────────┐
│                      │
│  L'allaitement,      │
│  autrement.          │
│                      │
│  Sous-titre court... │
│                      │
│  [Decouvrir]         │
│                      │
│  ┌──────────────┐    │
│  │ PHOTO CAROLE │    │
│  └──────────────┘    │
└──────────────────────┘
```

- **Titre** : Noto Serif, 4.5rem desktop, tres impactant
- **Sous-titre** : DM Sans, description courte de l'expertise
- **CTA primaire** : "Decouvrir les accompagnements" (rouge, plein)
- **CTA secondaire** : "Prendre rendez-vous" (outline)
- **Photo** : Portrait professionnel, traitement premium (pas de border-radius)
- **Background** : beige (`#fff8f6`) propre, pas de blobs decoratifs

### Section 2 : BARRE DE CREDIBILITE (trust bar)

```
┌────────────────────────────────────────────────────┐
│  20+ ans        5 000+           3 livres          │
│  d'experience   consultations    publies           │
│                                                    │
│  IBCLC          Formatrice       Conferences       │
│  certifiee      agrees           internationales   │
└────────────────────────────────────────────────────┘
```

- **Fond** : `primary-green` (#203634) — rupture visuelle forte
- **Texte** : beige/blanc
- **Chiffres** : Noto Serif gros (3rem), labels DM Sans small caps
- **Layout** : 3 ou 6 colonnes desktop, 2 colonnes mobile (scroll horizontal possible)
- **Pas de cards** : juste de la typo, sobre et autorite

### Section 3 : ACCOMPAGNEMENTS EN LIGNE (produit principal)

```
Desktop (grille asymetrique) :
┌────────────────────────────────────────────────────┐
│  ACCOMPAGNEMENTS                                   │
│  EN LIGNE              Des parcours complets...    │
│                                                    │
│  ┌──────────────────────┐  ┌──────────────────┐    │
│  │                      │  │                  │    │
│  │   ACCOMP. 1          │  │   ACCOMP. 2      │    │
│  │   (grande card)      │  │   (card moyenne)  │    │
│  │                      │  │                  │    │
│  │                      │  ├──────────────────┤    │
│  │                      │  │   ACCOMP. 3      │    │
│  │                      │  │   (card moyenne)  │    │
│  └──────────────────────┘  └──────────────────┘    │
│                                                    │
│              [Voir tous les accompagnements →]      │
└────────────────────────────────────────────────────┘
```

- **Grille** : 1 grande + 2 empilees (pas de 3-colonnes egal)
- **Cards** : image plein cadre en haut, titre, prix, CTA — angles droits
- **Animation** : cards entrent en fade-up au scroll
- **Mobile** : scroll horizontal des cards (carousel)

### Section 4 : TEMOIGNAGES (carousel)

```
┌────────────────────────────────────────────────────┐
│  Fond beige-dark                                   │
│                                                    │
│        "Carole a transforme notre allaitement.     │
│         Son expertise et sa bienveillance nous     │
│         ont permis de surmonter nos difficultes."  │
│                                                    │
│         — Marie D., maman de 2 enfants             │
│                                                    │
│           ● ○ ○ ○ ○ ○                              │
│                                                    │
└────────────────────────────────────────────────────┘
```

- **6 a 8 temoignages** en carousel
- **Layout** : une citation a la fois, grande typo Noto Serif italic
- **Autoplay** lent (5s) + swipe mobile + fleches desktop
- **Dots indicators** en bas
- **Fond** : `background-beige-dark` pour contraste subtil
- **Pas de photos de clients** (respect vie privee) — initiales ou rien

### Section 5 : EXPERTISE / A PROPOS (section editoriale)

```
Desktop :
┌────────────────────────────────────────────────────┐
│                                                    │
│   Une expertise              ┌──────────────────┐  │
│   reconnue.                  │                  │  │
│                              │  PHOTO CAROLE    │  │
│   Consultante IBCLC depuis   │  (en situation,  │  │
│   plus de 20 ans, Carole     │  pas le meme     │  │
│   Herve accompagne les       │  que le hero)    │  │
│   familles...                │                  │  │
│                              └──────────────────┘  │
│   [En savoir plus →]                               │
│                                                    │
└────────────────────────────────────────────────────┘
```

- **Asymetrique inversee** : texte a gauche, photo a droite (inverse du hero)
- **Objectif** : humaniser, creer la confiance, renforcer l'autorite
- **CTA** : lien vers `/a-propos`
- **Photo** : differente du hero — en consultation, naturelle

### Section 6 : BLOG / MAGAZINE (editorial)

```
Desktop :
┌────────────────────────────────────────────────────┐
│  LE JOURNAL                                        │
│                                                    │
│  ┌────────────────────────┐  ┌──────────────────┐  │
│  │                        │  │  Article 2        │  │
│  │   Article 1 (featured) │  │  Titre + date     │  │
│  │   Grande image          │  │  Image            │  │
│  │   Titre                 │  ├──────────────────┤  │
│  │   Extrait              │  │  Article 3        │  │
│  │                        │  │  Titre + date     │  │
│  │                        │  │  Image            │  │
│  └────────────────────────┘  └──────────────────┘  │
│                                                    │
│              [Lire le journal →]                    │
└────────────────────────────────────────────────────┘
```

- **Nomme "Le Journal"** ou "Blog" — nom a confirmer
- **Layout magazine** : 1 article featured large + 2 plus petits
- **Chaque card** : image, categorie (badge), titre, date, extrait
- **CTA** : vers `/blog`

### Section 7 : FORMATIONS PRO (teaser B2B)

```
┌────────────────────────────────────────────────────┐
│  Fond primary-green                                │
│                                                    │
│  Vous etes                                         │
│  professionnel de sante ?                          │
│                                                    │
│  Formations, ateliers et webinaires                │
│  pour developper votre expertise.                  │
│                                                    │
│  [Decouvrir les formations →]                      │
│                                                    │
└────────────────────────────────────────────────────┘
```

- **Section sobre** sur fond vert fonce
- **Message direct** pour le B2B
- **CTA unique** vers `/formations`
- **Pas de listing complet** — juste un teaser avec redirect

### Section 8 : NEWSLETTER

```
┌────────────────────────────────────────────────────┐
│                                                    │
│  Restez informee                                   │
│                                                    │
│  Ressources, articles et actualites —              │
│  sans discours culpabilisant.                      │
│                                                    │
│  [ votre@email.com          ] [S'inscrire]         │
│                                                    │
└────────────────────────────────────────────────────┘
```

- **Layout simple**, sobre
- **Formulaire inline** (email + bouton)
- **Fond** : `background-beige-dark`

### Section 9 : CTA FINAL

```
┌────────────────────────────────────────────────────┐
│                                                    │
│  Prete a commencer ?                               │
│                                                    │
│  [Decouvrir les accompagnements]  [Prendre RDV]    │
│                                                    │
└────────────────────────────────────────────────────┘
```

- **Rappel des 2 CTAs principaux**
- **Fond** : beige ou green selon le contraste avec la section precedente
- **Sobre**, pas de fioritures

---

## 6. Pages secondaires — Direction

### /accompagnements (ex /formations)
- Hero simple avec titre + sous-titre
- Grille d'accompagnements (2 colonnes desktop, 1 mobile)
- Filtres possibles par thematique
- Cards avec image, titre, prix, CTA

### /accompagnements/[slug]
- Layout editorial : grande image hero, contenu structure
- Sidebar sticky avec prix + CTA achat
- Sections : description, programme, temoignages, FAQ

### /formations (ex /evenements - B2B)
- Listing des evenements pro (formations, ateliers, webinaires)
- Filtres par type
- Cards avec date, lieu, places restantes, prix

### /livres
- Page vitrine avec les livres publies
- Pour chaque livre : couverture, resume, liens d'achat (Amazon, Fnac, etc.)
- Pas de vente directe sur le site

### /medias
- Portfolio : apparitions TV, podcasts, presse, conferences
- Layout grille ou timeline
- Liens vers les medias externes
- Renforce la credibilite

### /blog
- Layout magazine : article featured + grille
- Filtres par categorie
- Pagination ou infinite scroll
- Chaque article : image, titre, date, categorie, extrait

### /a-propos
- Page longue editorial sur Carole
- Bio, parcours, certifications, valeurs
- Photos professionnelles
- Chiffres cles

### /reserver
- Wizard de reservation (deja existant)
- Adapter le style au nouveau design system (radius 0, etc.)

---

## 7. Responsive breakpoints

| Breakpoint | Largeur | Usage                        |
| ---------- | ------- | ---------------------------- |
| Mobile     | < 640px | Design principal (mobile-first) |
| Tablet     | 640-1024px | Adaptations intermediaires  |
| Desktop    | > 1024px | Layout complet              |
| Wide       | > 1280px | Max-width conteneur         |

---

## 8. Principes UX

1. **Reduire la charge cognitive** — Pas plus de 2 CTAs par section
2. **Parcours clairs** : Decouvrir → Apprendre → Acheter → S'inscrire
3. **Preuve sociale tot** — Barre de credibilite juste apres le hero
4. **Repetition CTA intelligente** — RDV visible partout sans etre intrusif
5. **Thumb-friendly mobile** — Zones de tap > 44px, CTA dans la zone du pouce
6. **Contenu > decoration** — Pas de blobs, illustrations ou ornements inutiles
7. **Performance** — Images optimisees (next/image), lazy loading, pas de JS inutile

---

## 9. Stack technique (inchange)

- **Framework** : Next.js 16 (App Router)
- **Styling** : Tailwind CSS v4 + shadcn/ui
- **Backend** : Supabase (DB + Auth)
- **Paiements** : Stripe
- **Emails** : Resend
- **Fonts** : DM Sans + Noto Serif (Google Fonts)
- **Icons** : Lucide React

---

## 10. Ce qui change vs l'existant

| Aspect              | Avant                          | Apres                            |
| ------------------- | ------------------------------ | -------------------------------- |
| Radius              | 0.625rem (arrondi)             | 0px (angles droits)              |
| Hero                | Centre, generique              | Asymetrique, photo portrait      |
| Typo H1             | 3rem-3.75rem                   | 4.5rem+ desktop                  |
| Espacement sections | py-20 (80px)                   | py-24 a py-32 (96-128px)         |
| Navigation          | 3 liens                        | 7 liens + CTA sticky             |
| Blog                | Absent de la nav               | Dans la nav + section homepage   |
| Temoignages         | Section basique                | Carousel 6-8 temoignages         |
| Personal branding   | Absent                         | Hero + section dediee + trust bar|
| B2B                 | Melange avec B2C               | Section et nav separees          |
| Nommage             | Formations / Evenements        | Accompagnements / Formations     |
| Livres              | Inexistant                     | Nouvelle page                    |
| Medias              | Inexistant                     | Nouvelle page                    |
| Ombres cards        | shadow-sm par defaut           | Pas d'ombre, border subtile      |
| Grilles             | 3-colonnes symetriques         | Asymetriques, magazine-like      |
