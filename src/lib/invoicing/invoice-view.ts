/**
 * Modele d'affichage d'une facture : formatage des montants, du taux et de la
 * date pour le document imprimable. Fonction pure, testee.
 */

export type InvoiceRecord = {
  number: string;
  issued_at: string;
  type: "accompagnement" | "booking" | "formation";
  currency: string;
  vat_rate: number;
  amount_ht_cents: number;
  amount_vat_cents: number;
  amount_ttc_cents: number;
  description: string;
  client_name: string;
  client_email: string;
  issuer_legal_name: string;
  issuer_address: string;
  issuer_siren: string;
  issuer_vat_number: string;
  issuer_legal_form: string | null;
  status: string;
  document_type?: string;
  promo_code?: string | null;
  discount_cents?: number | null;
  gross_amount_ttc_cents?: number | null;
};

const CURRENCY_CODES: Record<string, string> = { eur: "EUR" };

export const formatMoneyCents = (cents: number, currency: string): string => {
  const code = CURRENCY_CODES[currency.toLowerCase()] ?? currency.toUpperCase();
  const formatted = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: code,
  }).format(cents / 100);
  // fr-FR intercale une espace insecable (fine ou normale selon l'ICU) : on la
  // normalise en espace ordinaire pour un rendu et des tests stables.
  return formatted.replace(/ | /g, " ");
};

const formatVatRate = (rate: number): string =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(rate)} %`;

const formatIssuedDate = (iso: string): string =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    // Facture francaise : date calee sur le fuseau de l'emettrice, pas sur UTC.
    timeZone: "Europe/Paris",
  }).format(new Date(iso));

export type InvoiceView = {
  number: string;
  issuedDate: string;
  description: string;
  vatRateLabel: string;
  ht: string;
  vat: string;
  ttc: string;
  isCancelled: boolean;
  isCreditNote: boolean;
  /** Titre du document : « Facture » ou « Avoir ». */
  documentLabel: string;
  /** Ligne de remise, absente si la vente s'est faite au prix plein. */
  discount?: { label: string; gross: string; amount: string };
  client: { name: string; email: string };
  issuer: {
    legalName: string;
    address: string;
    siren: string;
    vatNumber: string;
    legalForm: string | null;
  };
};

export const buildInvoiceView = (record: InvoiceRecord): InvoiceView => ({
  number: record.number,
  issuedDate: formatIssuedDate(record.issued_at),
  description: record.description,
  vatRateLabel: formatVatRate(record.vat_rate),
  ht: formatMoneyCents(record.amount_ht_cents, record.currency),
  vat: formatMoneyCents(record.amount_vat_cents, record.currency),
  ttc: formatMoneyCents(record.amount_ttc_cents, record.currency),
  isCancelled: record.status === "cancelled",
  isCreditNote: record.document_type === "credit_note",
  documentLabel: record.document_type === "credit_note" ? "Avoir" : "Facture",
  ...(record.promo_code && record.discount_cents
    ? {
        discount: {
          label: `Remise ${record.promo_code}`,
          gross: formatMoneyCents(
            record.gross_amount_ttc_cents ??
              record.amount_ttc_cents + record.discount_cents,
            record.currency,
          ),
          amount: `-${formatMoneyCents(record.discount_cents, record.currency)}`,
        },
      }
    : {}),
  client: { name: record.client_name, email: record.client_email },
  issuer: {
    legalName: record.issuer_legal_name,
    address: record.issuer_address,
    siren: record.issuer_siren,
    vatNumber: record.issuer_vat_number,
    legalForm: record.issuer_legal_form,
  },
});
