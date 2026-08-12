-- notes_internes est réservé à la consultante ; RLS étant contourné par le
-- service role sur le chemin applicatif réel (voir 00095), cette révocation
-- ferme le trou pour tout accès direct PostgREST futur (anon/authenticated).
REVOKE SELECT (notes_internes) ON consultation_notes FROM anon, authenticated;
