import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { InvoiceView } from "./invoice-view";

/**
 * Rendu PDF de la facture, pour la piece jointe de l'email.
 *
 * @react-pdf plutot qu'un navigateur headless (Puppeteer) : pur JavaScript,
 * il tourne dans une fonction serverless sans binaire Chromium a embarquer.
 * Les donnees et le formatage proviennent du meme modele que le document HTML
 * ([invoice-view.ts](./invoice-view.ts)) — une seule source de verite.
 */

const GREEN = "#203634";
const GREY = "#5a6b69";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#1a1a1a", lineHeight: 1.5 },
  cancelled: {
    marginBottom: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: "#a0283e",
    color: "#a0283e",
    textAlign: "center",
    textTransform: "uppercase",
    fontSize: 11,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: { fontSize: 20, color: GREEN },
  muted: { color: GREY },
  partiesRow: { flexDirection: "row", gap: 24, marginTop: 24 },
  party: { flex: 1 },
  label: {
    fontSize: 8,
    color: GREY,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  bold: { fontWeight: 700 },
  table: { marginTop: 24 },
  th: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#cccccc",
    paddingBottom: 4,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#eeeeee",
    paddingVertical: 6,
  },
  cellDesc: { flex: 3 },
  cellNum: { flex: 1, textAlign: "right" },
  totals: { marginTop: 12, marginLeft: "auto", width: 200 },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    color: GREY,
  },
  totalTtc: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: "#cccccc",
    paddingTop: 3,
    marginTop: 3,
    color: "#1a1a1a",
    fontWeight: 700,
  },
  legal: {
    marginTop: 32,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#eeeeee",
    fontSize: 8,
    color: GREY,
  },
});

const InvoicePdf = ({ view }: { view: InvoiceView }) => (
  <Document
    title={`Facture ${view.number}`}
    author={view.issuer.legalName}
  >
    <Page size="A4" style={s.page}>
      {view.isCancelled && (
        <Text style={s.cancelled}>{view.documentLabel} annulée</Text>
      )}

      <View style={s.headerRow}>
        <View>
          <Text style={s.title}>{view.documentLabel}</Text>
          <Text style={s.muted}>N° {view.number}</Text>
        </View>
        <Text style={s.muted}>Émise le {view.issuedDate}</Text>
      </View>

      <View style={s.partiesRow}>
        <View style={s.party}>
          <Text style={s.label}>Émettrice</Text>
          <Text style={s.bold}>{view.issuer.legalName}</Text>
          {view.issuer.legalForm ? (
            <Text style={s.muted}>{view.issuer.legalForm}</Text>
          ) : null}
          <Text style={s.muted}>{view.issuer.address}</Text>
          <Text style={s.muted}>SIREN : {view.issuer.siren}</Text>
          <Text style={s.muted}>N° TVA : {view.issuer.vatNumber}</Text>
        </View>
        <View style={s.party}>
          <Text style={s.label}>Cliente</Text>
          <Text style={s.bold}>{view.client.name}</Text>
          <Text style={s.muted}>{view.client.email}</Text>
        </View>
      </View>

      <View style={s.table}>
        <View style={s.th}>
          <Text style={s.cellDesc}>Désignation</Text>
          <Text style={s.cellNum}>Montant HT</Text>
          <Text style={s.cellNum}>TVA</Text>
          <Text style={s.cellNum}>Total TTC</Text>
        </View>
        <View style={s.tr}>
          <Text style={s.cellDesc}>{view.description}</Text>
          <Text style={s.cellNum}>{view.ht}</Text>
          <Text style={s.cellNum}>{view.vatRateLabel}</Text>
          <Text style={s.cellNum}>{view.ttc}</Text>
        </View>
      </View>

      <View style={s.totals}>
        <View style={s.totalLine}>
          <Text>Total HT</Text>
          <Text>{view.ht}</Text>
        </View>
        <View style={s.totalLine}>
          <Text>TVA ({view.vatRateLabel})</Text>
          <Text>{view.vat}</Text>
        </View>
        <View style={s.totalTtc}>
          <Text>Total TTC</Text>
          <Text>{view.ttc}</Text>
        </View>
      </View>

      <Text style={s.legal}>
        TVA acquittée sur les encaissements. En cas de retard de paiement, une
        indemnité forfaitaire pour frais de recouvrement de 40 € est due
        (art. L441-10 du Code de commerce). Pas d&apos;escompte pour paiement
        anticipé.
      </Text>
    </Page>
  </Document>
);

export const renderInvoicePdf = (view: InvoiceView): Promise<Buffer> =>
  renderToBuffer(<InvoicePdf view={view} />);
