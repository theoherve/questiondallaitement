const SEPARATOR = ";";

const escape = (value: string): string =>
  /[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const centsToEuros = (cents: number): string => (cents / 100).toFixed(2);

export type InvoiceExportRow = {
  number: string;
  issued_at: string;
  document_type: string;
  status: string;
  payment_status: string;
  client_name: string;
  amount_ht_cents: number;
  amount_vat_cents: number;
  amount_ttc_cents: number;
  currency: string;
  settlements: { method: string; amount_cents: number; paid_at: string }[];
};

const HEADER = [
  "Numéro",
  "Date d'émission",
  "Type",
  "Statut document",
  "Statut règlement",
  "Cliente",
  "Montant HT",
  "Montant TVA",
  "Montant TTC",
  "Devise",
  "Règlements",
];

export const buildInvoicesCsv = (rows: InvoiceExportRow[]): string => {
  const lines = rows.map((row) => {
    const settlementsCell = row.settlements
      .map(
        (s) => `${s.method} ${centsToEuros(s.amount_cents)} (${s.paid_at})`,
      )
      .join(" | ");

    const cells = [
      row.number,
      row.issued_at,
      row.document_type,
      row.status,
      row.payment_status,
      row.client_name,
      centsToEuros(row.amount_ht_cents),
      centsToEuros(row.amount_vat_cents),
      centsToEuros(row.amount_ttc_cents),
      row.currency,
      settlementsCell,
    ];

    return cells.map(escape).join(SEPARATOR);
  });

  return [HEADER.map(escape).join(SEPARATOR), ...lines].join("\n");
};
