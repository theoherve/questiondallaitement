# Résumé de formation — design

Date : 2026-08-06
Périmètre : table `events` (admin `/admin/evenements`, public `/formations/[slug]`)

## Problème

Une page formation n'offre aujourd'hui que deux niveaux de lecture : une description
courte en texte brut dans le bandeau d'en-tête, et un bloc « À propos de cette
formation » en HTML riche, plus bas dans la page. Rien entre les deux. La visiteuse
qui hésite doit soit se contenter d'une phrase, soit dérouler un texte long.

Il manque un niveau intermédiaire : un résumé mis en forme, lisible en trente
secondes, visible sans scroll.

Contrainte supplémentaire découverte pendant le cadrage : `long_description` existe
en base et s'affiche en public, mais **n'est éditable dans aucun écran d'admin**. Le
contenu actuel vient du scraping. Livrer un résumé modifiable au-dessus d'un texte
figé serait incohérent, donc l'édition de `long_description` fait partie du
périmètre.

## Ce qui n'est pas dans le périmètre

- La table `formations` (publique sous `/accompagnements`) — elle a déjà
  `short_description` + `long_description_html` en WYSIWYG.
- Les cartes de la liste `/formations` — le résumé ne les alimente pas.
- L'assainissement du HTML (voir « Sécurité » plus bas).

## Données

Migration `supabase/migrations/00067_event_summary.sql` :

```sql
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS summary_html TEXT;
```

Une colonne, nullable, additive. Aucune reprise sur les événements existants :
l'absence de résumé n'affiche pas le bloc, c'est la règle produit. La colonne peut
rester NULL indéfiniment.

Le type `Event` de `src/types/database.ts` ne déclare ni `long_description` ni
`summary_html`. La page publique accède à `long_description` via un `select("*")`
non typé. On ajoute les deux champs au type :

```ts
long_description: string | null;
summary_html: string | null;
```

Validation, dans `src/validations/events.ts` (`eventSchema`) :

```ts
summary_html: z.string().optional().nullable(),
long_description: z.string().optional().nullable(),
```

Les deux actions serveur `createEvent` et `updateEvent`
(`src/app/(dashboard)/admin/evenements/actions.ts`) écrivent les deux colonnes, en
normalisant la chaîne vide en `null` — un éditeur Tiptap vidé renvoie `<p></p>` ou
`""` selon le chemin, jamais `null`.

## Admin

### Champs d'édition

Un sous-composant `event-content-fields.tsx` porte les deux éditeurs, appelé depuis
`event-form.tsx` à la place du `Textarea` actuel de la description. Motif : le
formulaire fait déjà 19 Ko, et `WysiwygEditor` est non contrôlé (`initialContent` +
`onChange`) là où `event-form` est piloté par un unique `useState`. Isoler le pont
entre les deux modèles évite de disperser cette logique dans un fichier déjà long.

Ordre des champs : Description (textarea, inchangé) → Résumé → À propos.

```tsx
<div className="space-y-2">
  <Label>Résumé (WYSIWYG)</Label>
  <p className="text-xs text-muted-foreground">
    Affiché dans le bandeau d'en-tête, sous la description. Restez bref.
  </p>
  <WysiwygEditor
    initialContent={event?.summary_html ?? ""}
    onChange={(html) => onChange("summary_html", html)}
    placeholder="Ce que la participante retient en 30 secondes…"
  />
</div>
```

Le champ « À propos de cette formation » suit la même forme sur
`long_description`. Composant réutilisé tel quel :
`src/components/editor/wysiwyg-editor.tsx` (novel / Tiptap), déjà employé par
`formation-editor.tsx`. Aucun nouveau code d'éditeur.

### Page d'aperçu

Nouvelle route `/admin/evenements/[id]/preview`, calquée sur
`src/app/(dashboard)/admin/formations/[id]/preview/page.tsx` : lecture via le client
admin pour voir aussi les brouillons, rendu identique à la page publique, garde
`requireAdmin`. Le bouton « Aperçu » d'`event-form` pointe dessus.

### Sécurité

Le rendu passe par `dangerouslySetInnerHTML`. C'est le motif déjà en place pour
`long_description` et pour les articles de blog, et aucun assainisseur n'existe dans
le dépôt. On reste cohérent avec l'existant plutôt que d'introduire une exception :
la surface d'écriture est réservée aux administratrices. Point signalé, périmètre
non élargi.

## Rendu public

Le résumé s'affiche dans le bandeau d'en-tête de
`src/app/(public)/formations/[slug]/page.tsx`, entre la description courte et la
ligne date / durée / formatrice.

```tsx
{event.summary_html && (
  <div
    className="mt-5 max-w-2xl border-l-2 border-primary-red/60 pl-4
               text-[0.95rem] leading-relaxed text-white/70
               [&_p]:mb-2 [&_p:last-child]:mb-0
               [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
               [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1
               [&_strong]:font-semibold [&_strong]:text-white
               [&_em]:not-italic [&_em]:text-accent-honey-soft
               [&_a]:underline [&_a]:underline-offset-2
               [&_h2]:hidden [&_h3]:hidden"
    dangerouslySetInnerHTML={{ __html: event.summary_html }}
  />
)}
```

Trois choix de forme, et leurs raisons :

- **Filet vertical rouge plutôt qu'une carte.** Le bandeau est déjà une surface
  pleine ; un encadré à l'intérieur produirait une boîte dans une boîte. Le filet
  marque la hiérarchie sans ajouter de fond.
- **`em` en miel, sans italique.** Sur le vert foncé, un italique blanc décroche à
  la lecture. Le miel joue le rôle que tient le rouge en zone claire.
- **Titres neutralisés.** L'éditeur autorise H1 à H3 ; un titre dans le bandeau
  entrerait en concurrence avec le `h1` de la page. On les masque au rendu plutôt
  que de brider la barre d'outils, qui reste partagée avec les autres écrans.

Le reste de la page ne bouge pas : bandeau d'accroche, tuiles de points forts,
section « À propos », formatrice, et colonne latérale collante avec le prix, les
informations pratiques et l'appel à l'action.

Longueur : aucune limite technique. Le cadrage `max-w-2xl` et la mention d'aide dans
l'admin portent la contrainte éditoriale.

## Référencement

`generateMetadata` ne sélectionne aujourd'hui que `title, description,
thumbnail_url`. On y ajoute `summary_html`, et la description devient :

```ts
const metaDescription = data.description ?? truncate(stripHtml(data.summary_html), 155);
```

Deux utilitaires en TypeScript pur dans `src/lib/html/strip.ts` :

- `stripHtml(html: string | null): string` — retrait des balises, décodage des
  entités courantes, espaces normalisés.
- `truncate(text: string, max: number): string | undefined` — coupe sur un mot
  entier et suffixe une ellipse. Renvoie `undefined` si le texte est vide, pour ne
  jamais produire de balise `description` vide.

## Tests

- `stripHtml` et sa troncature : balises imbriquées, entités, coupe sur mot entier,
  entrée nulle ou vide.
- `updateEvent` et `createEvent` : `summary_html` et `long_description` persistés ;
  chaîne vide et `<p></p>` normalisés en `null`.
- `eventSchema` : les deux champs restent facultatifs, un événement sans résumé
  valide.

Pas de test de rendu de page : le dépôt n'en a pas pour les pages publiques et cette
fonctionnalité n'est pas le bon endroit pour créer la convention.

## Ordre de livraison

1. Migration, type `Event`, schéma Zod, actions serveur.
2. `stripHtml` et son test, puis `generateMetadata`.
3. `event-content-fields.tsx` et son intégration dans `event-form.tsx`.
4. Rendu du résumé dans le bandeau public.
5. Page d'aperçu admin.

Chaque étape est livrable seule. Après la première, la colonne existe et reste
vide ; après la troisième, le contenu est saisissable et déjà visible.
