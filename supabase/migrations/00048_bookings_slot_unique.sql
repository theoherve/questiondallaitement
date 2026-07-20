-- Empeche qu'un meme creneau soit vendu deux fois.
--
-- Une verification applicative ne suffit pas : entre le SELECT qui constate que
-- le creneau est libre et l'INSERT qui le reserve, une autre transaction peut
-- s'intercaler. Deux clientes payant le meme creneau en parallele passaient
-- toutes les deux. Seule une contrainte en base ferme la fenetre.
--
-- Index partiel : une reservation annulee libere son creneau, et un no_show
-- comme un completed appartiennent au passe. Seules 'pending' et 'confirmed'
-- occupent reellement le creneau.
--
-- Le webhook Stripe reconnait cette contrainte par son nom pour distinguer un
-- double booking (-> remboursement) d'une redelivery Stripe (-> ignorer) :
-- voir SLOT_CONSTRAINT dans src/lib/stripe/webhooks.ts.

CREATE UNIQUE INDEX IF NOT EXISTS bookings_consultant_slot_unique
  ON bookings (consultant_id, starts_at)
  WHERE status IN ('pending', 'confirmed');
