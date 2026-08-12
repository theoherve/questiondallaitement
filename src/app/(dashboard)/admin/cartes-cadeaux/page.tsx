import { listGiftCards } from "./actions";

export default async function AdminGiftCardsPage() {
  const result = await listGiftCards();
  const cards = result.success ? (result.data ?? []) : [];

  return (
    <main className="p-6">
      <h1 className="mb-6 text-2xl font-semibold">Cartes cadeaux</h1>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="border-b p-2">Code</th>
            <th className="border-b p-2">Type</th>
            <th className="border-b p-2">Statut</th>
            <th className="border-b p-2">Solde</th>
            <th className="border-b p-2">Acheteur</th>
            <th className="border-b p-2">Expire le</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr key={card.id}>
              <td className="border-b p-2 font-mono">{card.code}</td>
              <td className="border-b p-2">{card.type === "amount" ? "Montant" : "Prestation"}</td>
              <td className="border-b p-2">{card.status}</td>
              <td className="border-b p-2">
                {card.balanceCents != null ? `${(card.balanceCents / 100).toFixed(2)} €` : "—"}
              </td>
              <td className="border-b p-2">{card.buyerName}</td>
              <td className="border-b p-2">
                {new Date(card.expiresAt).toLocaleDateString("fr-FR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
