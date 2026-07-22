import type { InvoiceView } from "@/lib/invoicing/invoice-view";

/**
 * Document de facture imprimable, avec toutes les mentions obligatoires d'une
 * facture francaise. Composant serveur : aucune interactivite ici, seul le
 * bouton d'impression est client.
 */
export const InvoiceDocument = ({ view }: { view: InvoiceView }) => (
  <div
    id="invoice-print"
    className="mx-auto max-w-2xl rounded-lg border bg-white p-8 text-sm text-gray-900 shadow-sm print:border-0 print:shadow-none"
  >
    {view.isCancelled && (
      <p className="mb-6 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-center font-semibold uppercase tracking-wide text-destructive">
        {view.documentLabel} annulée
      </p>
    )}

    <div className="flex items-start justify-between">
      <div>
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          {view.documentLabel}
        </h1>
        <p className="mt-1 text-gray-600">N° {view.number}</p>
      </div>
      <p className="text-right text-gray-600">
        Émise le {view.issuedDate}
      </p>
    </div>

    <div className="mt-8 grid grid-cols-2 gap-6">
      <section>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Émettrice
        </h2>
        <p className="font-medium">{view.issuer.legalName}</p>
        {view.issuer.legalForm && (
          <p className="text-gray-600">{view.issuer.legalForm}</p>
        )}
        <p className="whitespace-pre-line text-gray-600">
          {view.issuer.address}
        </p>
        <p className="mt-1 text-gray-600">SIREN : {view.issuer.siren}</p>
        <p className="text-gray-600">
          N° TVA : {view.issuer.vatNumber}
        </p>
      </section>

      <section>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Cliente
        </h2>
        <p className="font-medium">{view.client.name}</p>
        <p className="text-gray-600">{view.client.email}</p>
      </section>
    </div>

    <table className="mt-8 w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-gray-300 text-xs uppercase tracking-wide text-gray-500">
          <th className="py-2">Désignation</th>
          <th className="py-2 text-right">Montant HT</th>
          <th className="py-2 text-right">TVA</th>
          <th className="py-2 text-right">Total TTC</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-gray-200">
          <td className="py-3">{view.description}</td>
          <td className="py-3 text-right">{view.ht}</td>
          <td className="py-3 text-right">{view.vatRateLabel}</td>
          <td className="py-3 text-right">{view.ttc}</td>
        </tr>
      </tbody>
    </table>

    <div className="mt-4 flex justify-end">
      <dl className="w-56 space-y-1">
        <div className="flex justify-between text-gray-600">
          <dt>Total HT</dt>
          <dd>{view.ht}</dd>
        </div>
        <div className="flex justify-between text-gray-600">
          <dt>TVA ({view.vatRateLabel})</dt>
          <dd>{view.vat}</dd>
        </div>
        <div className="flex justify-between border-t border-gray-300 pt-1 font-semibold">
          <dt>Total TTC</dt>
          <dd>{view.ttc}</dd>
        </div>
      </dl>
    </div>

    <p className="mt-10 border-t border-gray-200 pt-4 text-xs text-gray-500">
      TVA acquittée sur les encaissements. En cas de retard de paiement, une
      indemnité forfaitaire pour frais de recouvrement de 40 € est due
      (art. L441-10 du Code de commerce). Pas d&apos;escompte pour paiement
      anticipé.
    </p>
  </div>
);
