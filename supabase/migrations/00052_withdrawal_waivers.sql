-- Renonciation au droit de retractation (CGV, article 5).
--
-- Vente a distance a un consommateur : la cliente dispose de quatorze jours
-- pour se retracter. Ce droit ne s'eteint que si elle a demande expressement
-- l'execution anticipee et renonce dans les formes prevues par les articles
-- L221-25 et L221-28 du code de la consommation.
--
-- En cas de litige, **c'est a la plateforme de prouver** que la renonciation a
-- ete recueillie. D'ou cette trace : qui, quand, pour quel achat, et surtout
-- quelle version du texte — sans elle, une reformulation ulterieure rendrait
-- la preuve inutilisable.
--
-- La ligne est ecrite **avant** le paiement, au moment ou la case est cochee.
-- Un panier abandonne laisse donc une renonciation sans achat : sans
-- consequence, et preferable a l'inverse — une prestation executee sans trace.

CREATE TABLE IF NOT EXISTS withdrawal_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- 'booking' ou 'formation' : les deux cas n'ont ni le meme texte ni le meme
  -- fondement legal.
  context TEXT NOT NULL,
  -- Identifiant de la reservation ou de l'accompagnement concerne.
  reference_id UUID NOT NULL,
  text_version TEXT NOT NULL,
  accepted_text TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_waivers_client
  ON withdrawal_waivers (client_id);

CREATE INDEX IF NOT EXISTS idx_withdrawal_waivers_reference
  ON withdrawal_waivers (reference_id);

-- Aucune politique : seul le service role y accede. Ces lignes sont des
-- elements de preuve, elles n'ont pas a etre lisibles par le client.
ALTER TABLE withdrawal_waivers ENABLE ROW LEVEL SECURITY;
