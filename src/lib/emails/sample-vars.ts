/**
 * Valeurs d'exemple des variables de template, pour l'apercu et l'email de
 * test : elles evitent d'afficher des `{{var}}` bruts et donnent un rendu
 * lisible, proche d'un vrai envoi.
 */
export const SAMPLE_EMAIL_VARS: Record<string, string> = {
  client_name: "Marie Dupont",
  consultant_name: "Carole Hervé",
  date: "samedi 25 avril 2026",
  time: "14h30",
  accompagnement_title: "Les bases de l'allaitement",
  accompagnement_url: "https://example.com/formations",
  dashboard_url: "https://example.com/espace-client",
  reset_url: "https://example.com/reset?token=abc",
  verification_url: "https://example.com/verify?token=abc",
  refund_info: "Votre paiement a été remboursé sur votre compte.",
  formation_title: "Atelier portage bébé",
  formation_date: "lundi 3 mai 2026",
  formation_time: "10h00",
  formation_location: "En ligne (Zoom)",
  zoom_join_url: "https://zoom.us/j/123456789",
  replay_url: "https://example.com/replay-lives",
  email: "exemple@question-allaitement.fr",
  first_name: "Marie",
  last_name: "Dupont",
};
