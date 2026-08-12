import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

export type GiftCardPdfView = {
  code: string;
  typeLabel: string;
  amountLabel: string | null;
  expiresAtLabel: string;
  beneficiaryName: string | null;
  personalMessage: string | null;
  consultantName: string;
};

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 12 },
  title: { fontSize: 20, marginBottom: 16 },
  code: { fontSize: 16, marginBottom: 24, fontFamily: "Courier" },
  row: { marginBottom: 8 },
  message: { marginTop: 24, fontStyle: "italic" },
});

const GiftCardPdf = ({ view }: { view: GiftCardPdfView }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Carte cadeau — {view.consultantName}</Text>
      <Text style={styles.code}>{view.code}</Text>
      <Text style={styles.row}>{view.typeLabel}</Text>
      {view.amountLabel && <Text style={styles.row}>Valeur : {view.amountLabel}</Text>}
      <Text style={styles.row}>Valable jusqu&apos;au {view.expiresAtLabel}</Text>
      {view.beneficiaryName && (
        <Text style={styles.row}>Pour : {view.beneficiaryName}</Text>
      )}
      {view.personalMessage && (
        <Text style={styles.message}>{view.personalMessage}</Text>
      )}
    </Page>
  </Document>
);

export const renderGiftCardPdf = (view: GiftCardPdfView): Promise<Buffer> =>
  renderToBuffer(<GiftCardPdf view={view} />);
