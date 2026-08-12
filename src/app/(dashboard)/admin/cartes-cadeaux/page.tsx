import { listConsultationTypesForGiftCards, listGiftCards } from "./actions";
import { IssueGiftCardForm } from "./_components/issue-gift-card-form";
import { RefundGiftCardButton } from "./_components/refund-gift-card-button";
import { ReplaceGiftCardButton } from "./_components/replace-gift-card-button";

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  used: "Utilisée",
  expired: "Expirée",
  cancelled: "Annulée",
};

const REFUND_WINDOW_DAYS = 90;

const formatEuros = (cents: number) => `${(cents / 100).toFixed(2)} €`;

/**
 * Une carte n'est proposable a la procedure post-expiration (§7.6 Exception 2)
 * que si elle est expiree, pas deja close, et dans la fenetre de 90 jours
 * apres `expiresAt`. Verification d'affichage seulement — l'enforcement reel
 * est cote serveur dans `refundExpiredGiftCard`/`replaceExpiredGiftCard`.
 */
const isEligibleForPostExpiryAction = (card: {
  status: string;
  closedReason: "refunded" | "replaced" | null;
  expiresAt: string;
}) => {
  if (card.status !== "expired" || card.closedReason) return false;
  const windowEnd = new Date(card.expiresAt);
  windowEnd.setDate(windowEnd.getDate() + REFUND_WINDOW_DAYS);
  return windowEnd >= new Date();
};

export default async function AdminGiftCardsPage() {
  const [result, consultationTypes] = await Promise.all([
    listGiftCards(),
    listConsultationTypesForGiftCards(),
  ]);
  const cards = result.success ? (result.data ?? []) : [];

  return (
    <main className="p-6">
      <h1 className="mb-6 text-2xl font-semibold">Cartes cadeaux</h1>

      <IssueGiftCardForm
        consultationTypes={consultationTypes.success ? (consultationTypes.data ?? []) : []}
      />

      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="border-b p-2">Code</th>
            <th className="border-b p-2">Type</th>
            <th className="border-b p-2">Statut</th>
            <th className="border-b p-2">Solde</th>
            <th className="border-b p-2">Acheteur</th>
            <th className="border-b p-2">Expire le</th>
            <th className="border-b p-2">Utilisations</th>
            <th className="border-b p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr key={card.id}>
              <td className="border-b p-2 font-mono">{card.code}</td>
              <td className="border-b p-2">{card.type === "amount" ? "Montant" : "Prestation"}</td>
              <td className="border-b p-2">{STATUS_LABELS[card.status] ?? card.status}</td>
              <td className="border-b p-2">
                {card.balanceCents != null ? formatEuros(card.balanceCents) : "—"}
              </td>
              <td className="border-b p-2">{card.buyerName}</td>
              <td className="border-b p-2">
                {new Date(card.expiresAt).toLocaleDateString("fr-FR")}
              </td>
              <td className="border-b p-2">
                {card.redemptions.length === 0 ? (
                  <span className="text-muted-foreground">Aucune</span>
                ) : (
                  <details>
                    <summary className="cursor-pointer">
                      {card.redemptions.length}
                    </summary>
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {card.redemptions.map((r) => (
                        <li key={`${r.redeemedAt}-${r.amountCents}`}>
                          {new Date(r.redeemedAt).toLocaleDateString("fr-FR")} :{" "}
                          {formatEuros(r.amountCents)}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </td>
              <td className="border-b p-2">
                {isEligibleForPostExpiryAction(card) ? (
                  <div className="flex gap-1">
                    <RefundGiftCardButton giftCardId={card.id} />
                    <ReplaceGiftCardButton giftCardId={card.id} />
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {cards.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          Aucune carte cadeau émise pour le moment.
        </p>
      )}
    </main>
  );
}
