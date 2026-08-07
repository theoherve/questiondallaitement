/**
 * Repartition du produit d'un accompagnement entre proprietaire et
 * collaboratrices.
 *
 * Contexte : jusqu'ici, l'achat etait une charge destination versant tout le
 * net a la proprietaire, apres quoi la plateforme virait la part des
 * collaboratrices **de son propre solde**. Mesure en mode test : soit le
 * virement echouait faute de fonds (`balance_insufficient`, echec ecrit dans
 * `audit_logs` que personne ne lit), soit il passait et la plateforme perdait
 * 1040 centimes par vente sur un accompagnement a 99 €.
 *
 * Desormais, une vente avec collaboratrices est encaissee par la plateforme,
 * qui vire ensuite chaque part en citant la charge source. Ce module calcule
 * ces parts ; il ne parle pas a Stripe, pour rester verifiable a l'unite.
 */

export type Collaborator = {
  consultantId: string;
  revenueShare: number;
};

export type RevenuePart = {
  consultantId: string;
  amountCents: number;
};

export const splitAccompagnementRevenue = ({
  amountCents,
  platformFeeCents,
  ownerId,
  collaborators,
}: {
  amountCents: number;
  platformFeeCents: number;
  ownerId: string;
  collaborators: Collaborator[];
}): RevenuePart[] => {
  const totalShare = collaborators.reduce(
    (sum, c) => sum + Number(c.revenueShare),
    0,
  );

  if (totalShare > 100) {
    throw new Error(
      `La somme des parts collaboratrices atteint ${totalShare} %, au-dela de 100 %.`,
    );
  }

  const netCents = amountCents - platformFeeCents;

  const parts: RevenuePart[] = [];
  let distributed = 0;

  for (const collaborator of collaborators) {
    const amount = Math.round(
      netCents * (Number(collaborator.revenueShare) / 100),
    );
    if (amount <= 0) continue;
    parts.push({ consultantId: collaborator.consultantId, amountCents: amount });
    distributed += amount;
  }

  // La proprietaire prend le reste plutot qu'un pourcentage calcule : les
  // arrondis se logent ici, et la somme des virements ne peut jamais depasser
  // la charge — ce que Stripe refuserait sur le dernier virement.
  const ownerAmount = netCents - distributed;
  if (ownerAmount > 0) {
    parts.push({ consultantId: ownerId, amountCents: ownerAmount });
  }

  return parts;
};
