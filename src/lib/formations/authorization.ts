import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Qui a le droit de modifier le contenu d'un accompagnement.
 *
 * `getSupabaseAndUser` ne verifie que l'authentification et rend un client
 * admin qui contourne les RLS : sans controle explicite, les actions du module
 * formations acceptaient n'importe quel identifiant de section ou de bloc et
 * laissaient donc modifier — ou supprimer — le contenu d'une autre consultante.
 *
 * La regle suit ce que l'espace consultante affiche : proprietaire, ou
 * collaboratrice declaree sur la formation. `formation_collaborators` n'a pas
 * de niveau de permission, la collaboration est binaire.
 */

/**
 * Le client Supabase reel plutot qu'un sous-ensemble ecrit a la main : decrire
 * la chaine de query soi-meme fait exploser l'inference de TypeScript
 * (« Type instantiation is excessively deep ») au contact des generiques de la
 * lib. Les tests passent un double, via un cast.
 */
type Reader = SupabaseClient;

export const canEditFormation = async (
  supabase: Reader,
  formationId: string,
  userId: string,
): Promise<boolean> => {
  const { data: owned } = await supabase
    .from("formations")
    .select("id")
    .eq("id", formationId)
    .eq("consultant_id", userId)
    .maybeSingle();

  if (owned) return true;

  const { data: collaboration } = await supabase
    .from("formation_collaborators")
    .select("formation_id")
    .eq("formation_id", formationId)
    .eq("consultant_id", userId)
    .maybeSingle();

  return !!collaboration;
};

export const canEditSection = async (
  supabase: Reader,
  sectionId: string,
  userId: string,
): Promise<boolean> => {
  // Deux requetes plutot qu'un embed PostgREST : deux relations peuvent
  // exister entre les memes tables, et l'embed repond alors PGRST201 — un
  // echec qui, ici, se lirait comme un refus d'acces.
  const { data: section } = await supabase
    .from("formation_sections")
    .select("formation_id")
    .eq("id", sectionId)
    .maybeSingle();

  const formationId = (section as { formation_id?: string } | null)
    ?.formation_id;
  if (!formationId) return false;

  return canEditFormation(supabase, formationId, userId);
};

export const canEditBlock = async (
  supabase: Reader,
  blockId: string,
  userId: string,
): Promise<boolean> => {
  const { data: block } = await supabase
    .from("formation_blocks")
    .select("section_id")
    .eq("id", blockId)
    .maybeSingle();

  const sectionId = (block as { section_id?: string } | null)?.section_id;
  if (!sectionId) return false;

  return canEditSection(supabase, sectionId, userId);
};
