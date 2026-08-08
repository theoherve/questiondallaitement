-- Migration 00074: nouvel organisme de formation
--
-- Meme forme que les organismes deja presents (EDBN, CFPCO...) : nom et slug,
-- le logo et le site restent facultatifs.
INSERT INTO training_providers (name, slug) VALUES
  ('Breastfeeding Conferences', 'breastfeeding-conferences')
ON CONFLICT (slug) DO NOTHING;
