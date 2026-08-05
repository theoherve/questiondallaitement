-- ─── Fin d'article : rappel, sources, suggestions epinglees ──
-- Trois besoins editoriaux qui vivent tous a l'echelle d'un article, donc
-- quatre colonnes plutot qu'une table : jamais interrogees dans l'autre sens,
-- jamais plus d'une valeur par article.
--
-- Toutes facultatives : les articles deja publies restent valides sans reprise.
-- Un encadre vide n'est pas affiche, c'est la regle produit — la colonne peut
-- donc rester NULL indefiniment.

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS conclusion_title TEXT,
  ADD COLUMN IF NOT EXISTS conclusion_text TEXT,
  ADD COLUMN IF NOT EXISTS references_html TEXT,
  -- Articles mis en avant a la main, dans l'ordre de saisie. Les emplacements
  -- restants sont completes automatiquement a l'affichage (meme categorie,
  -- tags communs, puis recents), donc trois suffisent.
  ADD COLUMN IF NOT EXISTS related_post_ids UUID [] NOT NULL DEFAULT '{}';

-- Garde-fou cote base : le formulaire limite deja a 3, mais les actions
-- serveur acceptent n'importe quel appelant admin.
ALTER TABLE blog_posts
  DROP CONSTRAINT IF EXISTS blog_posts_related_post_ids_max;

ALTER TABLE blog_posts
  ADD CONSTRAINT blog_posts_related_post_ids_max
  CHECK (array_length(related_post_ids, 1) IS NULL OR array_length(related_post_ids, 1) <= 3);

COMMENT ON COLUMN blog_posts.conclusion_title IS 'Titre de l''encadre de conclusion. NULL ou vide : « A retenir » est utilise a l''affichage.';
COMMENT ON COLUMN blog_posts.conclusion_text IS 'Texte simple de l''encadre de conclusion. Vide : l''encadre n''est pas affiche.';
COMMENT ON COLUMN blog_posts.references_html IS 'References et sources en HTML. Vide : la section n''est pas affichee.';
COMMENT ON COLUMN blog_posts.related_post_ids IS 'Jusqu''a 3 articles epingles, ordre de saisie conserve.';
