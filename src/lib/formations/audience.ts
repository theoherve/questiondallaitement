import type { AudienceFilter, FormationAudienceGroup } from "@/config/formation-audience";

/**
 * Une session `both` reste toujours visible : elle vise les deux publics,
 * la masquer sous un filtre precis reviendrait a la retirer d'une vue ou
 * elle a sa place.
 */
export const matchesAudienceFilter = (
  audienceGroup: FormationAudienceGroup,
  filter: AudienceFilter,
): boolean => {
  if (filter === "all") return true;
  if (audienceGroup === "both") return true;
  return audienceGroup === filter;
};
