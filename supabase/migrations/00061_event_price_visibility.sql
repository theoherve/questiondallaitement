-- ─── Affichage du prix + nouveaux organismes externes ───────
-- Certaines formations sont planifiees longtemps a l'avance sans
-- tarif arrete. show_price = false masque totalement le bloc prix
-- sur les pages publiques (au lieu d'afficher un 0 trompeur).

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS show_price BOOLEAN NOT NULL DEFAULT true;

-- Typo dans le seed initial : l'organisme s'appelle CFPCO.
UPDATE training_providers
  SET name = 'Le CFPCO', slug = 'cfpco'
  WHERE slug = 'cpfco';

INSERT INTO training_providers (name, slug) VALUES
  ('Clinic Halav', 'clinic-halav')
ON CONFLICT (slug) DO NOTHING;
