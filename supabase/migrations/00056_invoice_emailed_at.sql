-- Facturation (3/3b) — envoi de la facture a la cliente.
--
-- `emailed_at` distingue une facture deja envoyee d'une facture a envoyer.
-- Il rend l'envoi automatique idempotent : a l'emission, on n'envoie que si la
-- colonne est nulle, puis on l'horodate. Une redelivery Stripe retombe donc sur
-- une facture deja envoyee et ne redouble pas le mail ; a l'inverse, si le
-- premier envoi a echoue (colonne restee nulle), la redelivery le retente.
--
-- Le renvoi manuel par la consultante, lui, envoie toujours et met la colonne a
-- jour — d'ou une simple date, pas un booleen.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMPTZ;
