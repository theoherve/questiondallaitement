import { tz } from "@date-fns/tz";

/**
 * Fuseau de reference des formations.
 *
 * Les horaires sont stockes en UTC et toutes les sessions se tiennent en
 * France. Formates sans consigne, ils suivent le fuseau de la machine qui
 * rend la page : le navigateur d'une visiteuse parisienne donne 9 h 00, le
 * serveur de production, regle sur UTC, donne 8 h 00 pour la meme session.
 *
 * Le rendu initial venant du serveur, c'est cette seconde heure qui
 * s'affichait — fausse, et differente apres hydratation.
 *
 * A passer en option `in` de toutes les fonctions date-fns qui touchent a une
 * date de formation :
 *
 *   format(new Date(formation.starts_at), "HH'h'mm", { locale: fr, in: PARIS })
 */
export const PARIS = tz("Europe/Paris");
