-- Socle du systeme de notifications unifie.
--
-- Jusqu'ici la table portait un CHECK a trois valeurs et les emails vivaient
-- dans un chemin separe de l'in-app, qu'aucun code ne coordonnait. Le catalogue
-- TypeScript (src/lib/notifications/catalog.ts) devient la source de verite des
-- types d'evenement : garder une liste en base imposerait une migration a
-- chaque nouvel evenement, et PostgREST rejetterait a l'execution ce que ni tsc
-- ni les tests ne voient.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Categorie, pour appliquer les preferences sans relire le catalogue en SQL.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'transactional'
    CHECK (category IN ('transactional', 'marketing', 'system'));

-- Cible du lien profond, et boutons d'action de l'item. Les deux sont calcules
-- par le catalogue a l'insertion puis figes : une notification ancienne doit
-- garder son libelle et sa cible meme si la definition change ensuite.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS href TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actions JSONB;

-- Idempotence : les deux sources d'evenements sont un cron et des webhooks
-- Stripe, tous deux rejouables. Index partiel : une notification sans cle de
-- deduplication reste toujours inserable.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dedupe_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe_key
  ON notifications(dedupe_key) WHERE dedupe_key IS NOT NULL;

-- Remap des valeurs historiques vers leur cle d'evenement du catalogue.
-- 'booking_confirmed' et 'consultant_message' sont deja des cles, seul 'admin'
-- change de nom.
UPDATE notifications SET type = 'admin_message' WHERE type = 'admin';
