-- Codes promo initiaux (aout 2026).
--
-- Idempotent : relancable sans creer de doublon, l'index unique porte sur
-- upper(code). Les valeurs restent modifiables depuis le back-office.

INSERT INTO promo_codes
  (code, label, discount_type, discount_value, scope_all,
   min_order_cents, max_per_user, is_active)
VALUES
  ('SUPERMAMAN', NULL, 'percent', 15, true, 0, 1, true),
  ('SAUVEZMESNUITS', NULL, 'percent', 15, true, 0, 1, true),
  ('DECOUVERTE', NULL, 'percent', 15, true, 0, 1, true),
  ('HAPPYMOM', NULL, 'percent', 15, true, 0, 1, true),
  ('CAROLE15', NULL, 'percent', 15, true, 0, 1, true),
  -- Remise fixe : sans plancher de commande, elle viderait la marge d'un
  -- petit produit.
  ('MILKPOWER', NULL, 'fixed_cents', 3000, true, 6000, 1, true),
  ('VILLAGE', 'Reseau partenaire (sage-femme, doula)',
   'percent', 20, true, 0, 1, true),
  -- Offre flash : la fenetre de 24 h se fixe a l'activation, depuis l'admin.
  ('FLASH24', 'Offre flash 24 h — definir la fenetre avant activation',
   'percent', 30, true, 0, 1, false)
ON CONFLICT DO NOTHING;

-- ALLAITEMENT15 : toutes les formations (table events).
INSERT INTO promo_codes
  (code, label, discount_type, discount_value, scope_all, max_per_user, is_active)
VALUES ('ALLAITEMENT15', 'Toutes les formations', 'percent', 15, false, 1, true)
ON CONFLICT DO NOTHING;

INSERT INTO promo_code_targets (promo_code_id, target_type, target_id)
SELECT c.id, 'events_all', NULL
FROM promo_codes c
WHERE c.code = 'ALLAITEMENT15'
  AND NOT EXISTS (
    SELECT 1 FROM promo_code_targets t
    WHERE t.promo_code_id = c.id AND t.target_type = 'events_all'
  );

-- SERENITE : le pack complet. Cible resolue par slug, pour ne pas figer un
-- UUID qui differe entre les environnements.
INSERT INTO promo_codes
  (code, label, discount_type, discount_value, scope_all, max_per_user, is_active)
VALUES ('SERENITE', 'Pack complet', 'percent', 15, false, 1, true)
ON CONFLICT DO NOTHING;

INSERT INTO promo_code_targets (promo_code_id, target_type, target_id)
SELECT c.id, 'formation', f.id
FROM promo_codes c
CROSS JOIN formations f
WHERE c.code = 'SERENITE'
  AND f.slug = 'pack-mon-allaitement-sur-mesure'
  AND NOT EXISTS (
    SELECT 1 FROM promo_code_targets t
    WHERE t.promo_code_id = c.id AND t.target_id = f.id
  );

-- PREMIERSJOURS : -20 EUR pendant les 48 h qui suivent l'achat de n'importe
-- quel evenement.
INSERT INTO promo_codes
  (code, label, discount_type, discount_value, scope_all,
   trigger_delay_hours, max_per_user, is_active)
VALUES ('PREMIERSJOURS', 'Valable 48 h apres l''achat d''un evenement',
        'fixed_cents', 2000, true, 48, 1, true)
ON CONFLICT DO NOTHING;

INSERT INTO promo_code_triggers (promo_code_id, trigger_type, target_id)
SELECT c.id, 'event_purchase', NULL
FROM promo_codes c
WHERE c.code = 'PREMIERSJOURS'
  AND NOT EXISTS (
    SELECT 1 FROM promo_code_triggers t
    WHERE t.promo_code_id = c.id AND t.trigger_type = 'event_purchase'
  );
