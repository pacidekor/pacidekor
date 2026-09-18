import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  defaultInvoiceFooterNote,
  formatInvoiceAddressLines,
  formatInvoiceDateSk,
  formatInvoiceIdLines,
  formatInvoiceMoney,
  invoicePaymentStatusLabel,
  plainInvoiceDash,
  type InvoicePdfData,
} from "@/lib/invoicing/types";
import { formatIbanDisplay } from "@/lib/invoicing/issuer";

const INK = "#222222";
const MUTED = "#888888";

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 52,
    paddingHorizontal: 48,
    fontFamily: "Roboto",
    fontSize: 9,
    color: INK,
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  logo: {
    width: 120,
    height: 36,
    objectFit: "contain",
  },
  brandText: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 1,
    color: INK,
  },
  titleBlock: {
    alignItems: "flex-end",
    maxWidth: 260,
  },
  titleRule: {
    width: 160,
    height: 2,
    backgroundColor: INK,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  titleLabel: {
    fontSize: 20,
    fontWeight: 700,
    color: INK,
  },
  titleNumber: {
    fontSize: 20,
    fontWeight: 400,
    color: MUTED,
  },
  columns: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
    marginBottom: 28,
  },
  column: {
    width: "48%",
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.8,
    color: MUTED,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  line: {
    marginBottom: 2,
    lineHeight: 1.3,
  },
  muted: {
    color: MUTED,
  },
  metaBlock: {
    marginTop: 6,
  },
  tableHeader: {
    borderBottomWidth: 1,
    borderBottomColor: INK,
    paddingBottom: 6,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.6,
    color: MUTED,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#dddddd",
  },
  itemDesc: {
    width: "62%",
    paddingRight: 8,
  },
  itemMeta: {
    width: "18%",
    textAlign: "right",
    color: MUTED,
  },
  itemPrice: {
    width: "20%",
    textAlign: "right",
    fontWeight: 700,
  },
  totalsWrap: {
    marginTop: 28,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  totals: {
    width: 200,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 4,
  },
  totalRule: {
    width: "100%",
    height: 2,
    backgroundColor: INK,
    marginVertical: 8,
  },
  grandLabel: {
    fontSize: 11,
    fontWeight: 700,
  },
  grandValue: {
    fontSize: 14,
    fontWeight: 700,
  },
  pageFooter: {
    marginTop: "auto",
    paddingTop: 28,
    width: "100%",
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: INK,
    width: "100%",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.4,
    color: INK,
  },
  note: {
    marginTop: 8,
    fontSize: 8,
    color: MUTED,
    lineHeight: 1.4,
    width: "100%",
  },
});

function AddressBlock({ address }: { address: string }) {
  const lines = formatInvoiceAddressLines(address);
  return (
    <>
      {lines.map((line) => (
        <Text key={line} style={styles.line}>
          {line}
        </Text>
      ))}
    </>
  );
}

function IdBlock(props: { ico?: string; dic?: string; icDph?: string }) {
  const lines = formatInvoiceIdLines(props);
  if (!lines.length) return null;
  return (
    <>
      {lines.map((line) => (
        <Text key={line} style={[styles.line, styles.muted]}>
          {line}
        </Text>
      ))}
    </>
  );
}

export function InvoicePdfDocument({ data }: { data: InvoicePdfData }) {
  const vatPercent = Math.round(data.vatRate * 100);
  const footerNote = defaultInvoiceFooterNote(data);
  const statusLabel = invoicePaymentStatusLabel(data);

  return (
    <Document
      title={`Faktúra ${data.invoiceNumber}`}
      author={data.issuerName}
      language="sk"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {data.logoDataUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image
            <Image src={data.logoDataUrl} style={styles.logo} />
          ) : (
            <Text style={styles.brandText}>PACIDEKOR</Text>
          )}
          <View style={styles.titleBlock}>
            <View style={styles.titleRule} />
            <View style={styles.titleRow}>
              <Text style={styles.titleLabel}>Faktúra </Text>
              <Text style={styles.titleNumber}>{data.invoiceNumber}</Text>
            </View>
          </View>
        </View>

        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.sectionLabel}>Dodávateľ</Text>
            <Text style={[styles.line, { fontWeight: 700 }]}>
              {data.issuerName}
            </Text>
            <AddressBlock address={data.issuerAddress} />
            <IdBlock
              ico={data.issuerIco}
              dic={data.issuerDic}
              icDph={data.issuerIcDph}
            />
            <View style={styles.metaBlock}>
              <Text style={styles.line}>
                IBAN: {formatIbanDisplay(data.issuerIban)}
              </Text>
              <Text style={styles.line}>VS: {data.variableSymbol}</Text>
              <Text style={styles.line}>Platba: {data.paymentMethod}</Text>
            </View>
          </View>

          <View style={styles.column}>
            <Text style={styles.sectionLabel}>Odberateľ</Text>
            <Text style={[styles.line, { fontWeight: 700 }]}>
              {data.customerName}
            </Text>
            <AddressBlock address={data.customerAddress} />
            <IdBlock ico={data.customerIco} dic={data.customerDic} />
            <View style={styles.metaBlock}>
              <Text style={styles.line}>
                Vystavené: {formatInvoiceDateSk(data.issueDate)}
              </Text>
              <Text style={styles.line}>
                Splatnosť: {formatInvoiceDateSk(data.dueDate)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { width: "62%" }]}>Položka</Text>
          <Text style={[styles.tableHeaderText, { width: "18%", textAlign: "right" }]}>
            Množstvo
          </Text>
          <Text style={[styles.tableHeaderText, { width: "20%", textAlign: "right" }]}>
            Cena bez DPH
          </Text>
        </View>

        {data.items.map((item, index) => (
          <View key={`${item.description}-${index}`} style={styles.itemRow} wrap={false}>
            <Text style={styles.itemDesc}>
              {plainInvoiceDash(item.description)}
            </Text>
            <Text style={styles.itemMeta}>
              {item.quantity}× {formatInvoiceMoney(item.unitPriceExVat, data.currency)}
            </Text>
            <Text style={styles.itemPrice}>
              {formatInvoiceMoney(item.lineTotalExVat, data.currency)}
            </Text>
          </View>
        ))}

        <View style={styles.totalsWrap}>
          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={styles.muted}>Základ bez DPH</Text>
              <Text>{formatInvoiceMoney(data.subtotalExVat, data.currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.muted}>DPH ({vatPercent} %)</Text>
              <Text>{formatInvoiceMoney(data.vatAmount, data.currency)}</Text>
            </View>
            <View style={styles.totalRule} />
            <View style={styles.totalRow}>
              <Text style={styles.grandLabel}>Celkom</Text>
              <Text style={styles.grandValue}>
                {formatInvoiceMoney(data.totalIncVat, data.currency)}
              </Text>
            </View>
          </View>
        </View>

        {statusLabel || footerNote ? (
          <View style={styles.pageFooter}>
            {statusLabel ? (
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{statusLabel}</Text>
              </View>
            ) : null}
            {footerNote ? <Text style={styles.note}>{footerNote}</Text> : null}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
