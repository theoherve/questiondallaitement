-- Cartes cadeaux phase 2 : rappel avant expiration + procedure de
-- remboursement/prolongation apres expiration (Sec 7.5-7.6). Voir
-- docs/superpowers/specs/2026-08-12-cartes-cadeaux-phase2-design.md.
--
-- Pas de nouvelle valeur sur gift_card_status : une carte close par cette
-- procedure passe a 'cancelled' (deja utilise pour une carte annulee), et
-- closed_reason distingue remboursee vs remplacee.

ALTER TABLE gift_cards ADD COLUMN reminder_sent_at TIMESTAMPTZ;

CREATE TYPE gift_card_closed_reason AS ENUM ('refunded', 'replaced');

ALTER TABLE gift_cards ADD COLUMN closed_reason gift_card_closed_reason;
ALTER TABLE gift_cards ADD COLUMN closed_at TIMESTAMPTZ;
ALTER TABLE gift_cards ADD COLUMN closed_note TEXT;
ALTER TABLE gift_cards ADD COLUMN replaces_gift_card_id UUID REFERENCES gift_cards(id);

CREATE INDEX idx_gift_cards_replaces ON gift_cards(replaces_gift_card_id);

-- closed_at et closed_note doivent aller de pair avec closed_reason : une
-- carte close sans date tracee, ou une date sans raison, serait une
-- incoherence silencieuse indistinguable d'un oubli applicatif.
ALTER TABLE gift_cards ADD CONSTRAINT gift_cards_closed_consistency_chk CHECK (
  (closed_reason IS NULL AND closed_at IS NULL)
  OR (closed_reason IS NOT NULL AND closed_at IS NOT NULL)
);
