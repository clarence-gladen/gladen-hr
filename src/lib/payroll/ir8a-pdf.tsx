import React from "react";
import path from "path";
import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";

const BRAND = "#1e3a5f";
const BRAND_LIGHT = "#e8eef6";
const DIVIDER = "#d0d9e8";
const MUTED = "#6b7a8d";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
    paddingHorizontal: 44,
    paddingTop: 36,
    paddingBottom: 48,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  logo: { width: 110 },
  headerRight: { alignItems: "flex-end" },
  companyName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND, marginBottom: 2 },
  companyDetail: { fontSize: 8, color: MUTED, marginBottom: 1 },

  titleBand: {
    backgroundColor: BRAND,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 4, marginBottom: 6,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  titleText: { fontFamily: "Helvetica-Bold", fontSize: 11, color: "#ffffff", letterSpacing: 0.5 },
  titleSub: { fontSize: 9, color: "#b8ccdf" },

  metaBox: {
    backgroundColor: BRAND_LIGHT,
    paddingVertical: 6, paddingHorizontal: 12, marginBottom: 16, borderRadius: 4,
    flexDirection: "row", justifyContent: "space-between",
  },
  metaItem: { alignItems: "center" },
  metaLabel: { fontSize: 7.5, color: MUTED, marginBottom: 2 },
  metaValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BRAND },

  section: { marginBottom: 14 },
  sectionHeader: { backgroundColor: BRAND_LIGHT, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 3, marginBottom: 1 },
  sectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BRAND, textTransform: "uppercase", letterSpacing: 0.8 },

  row: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 4, paddingHorizontal: 10,
    borderBottom: `0.5 solid ${DIVIDER}`,
  },
  rowLabel: { color: "#333333", fontSize: 9 },
  rowValue: { fontFamily: "Helvetica-Bold", color: "#1a1a1a", fontSize: 9 },

  totalRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 5, paddingHorizontal: 10,
    borderTop: `1 solid ${DIVIDER}`,
    backgroundColor: BRAND_LIGHT, marginTop: 1, borderRadius: 3,
  },
  totalLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BRAND },
  totalValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BRAND },

  noteBox: { marginTop: 12, backgroundColor: "#fff8e6", borderRadius: 3, padding: 8 },
  noteText: { fontSize: 7.5, color: "#7a5800", lineHeight: 1.5 },

  footer: { borderTop: `0.5 solid ${DIVIDER}`, paddingTop: 8, marginTop: "auto" },
  footerText: { fontSize: 7.5, color: MUTED, textAlign: "center" },
});

export interface Ir8aPdfData {
  year: number;
  employeeName: string;
  nricLast4: string;
  dateOfBirth: string;
  designation: string | null;
  periodStart: string;
  periodEnd: string;
  employmentIncome: number;
  bonus: number;
  reimbursement: number;
  cpfEmployee: number;
  cpfEmployer: number;
}

function fmt(n: number): string {
  return `S$${n.toFixed(2)}`;
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function AmountRow({ label, amount }: { label: string; amount: number }) {
  if (amount === 0) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{fmt(amount)}</Text>
    </View>
  );
}

function Ir8aDocument({ data }: { data: Ir8aPdfData }) {
  const logoPath = path.join(process.cwd(), "public", "images", "logo-blue.png");
  const grossIncome = data.employmentIncome + data.bonus;
  const ya = data.year + 1;

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <Image src={logoPath} style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>Gladen Maintenance Services (S) Pte Ltd</Text>
            <Text style={styles.companyDetail}>UEN: 199604077R</Text>
            <Text style={styles.companyDetail}>Singapore</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleBand}>
          <Text style={styles.titleText}>IR8A — EMPLOYEE REMUNERATION STATEMENT</Text>
          <Text style={styles.titleSub}>Income Year {data.year}</Text>
        </View>

        {/* Meta row */}
        <View style={styles.metaBox}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Year of Assessment</Text>
            <Text style={styles.metaValue}>YA {ya}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Income Year</Text>
            <Text style={styles.metaValue}>{data.year}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Period of Employment</Text>
            <Text style={styles.metaValue}>{fmtDate(data.periodStart)} – {fmtDate(data.periodEnd)}</Text>
          </View>
        </View>

        {/* Employee Particulars */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Employee Particulars</Text></View>
          <Row label="Full Name" value={data.employeeName} />
          <Row label="NRIC / FIN (Last 4 digits)" value={`●●●●${data.nricLast4}`} />
          <Row label="Date of Birth" value={fmtDate(data.dateOfBirth)} />
          {data.designation && <Row label="Designation" value={data.designation} />}
        </View>

        {/* Employment Income */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Employment Income</Text></View>
          <AmountRow label="Gross Salary, Allowances & Overtime" amount={data.employmentIncome} />
          <AmountRow label="Bonus / Additional Wages" amount={data.bonus} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Gross Employment Income</Text>
            <Text style={styles.totalValue}>{fmt(grossIncome)}</Text>
          </View>
        </View>

        {/* CPF */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>CPF Contributions</Text></View>
          <AmountRow label="Employee's CPF Contribution" amount={data.cpfEmployee} />
          <AmountRow label="Employer's CPF Contribution" amount={data.cpfEmployer} />
        </View>

        {/* Reimbursements — reference only */}
        {data.reimbursement > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Reimbursements (Tax-Exempt — Reference Only)</Text></View>
            <AmountRow label="Total Reimbursements" amount={data.reimbursement} />
          </View>
        )}

        {/* Note */}
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            {"This document is for internal reference only. To file IR8A via AIS, log in to IRAS myTax Portal (Corppass) and enter the required fields. Full NRIC/FIN is required for submission. Tax-exempt reimbursements are not included in employment income and should not be declared on the IR8A form."}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Computer-generated by Gladen HR System · Not a tax clearance document</Text>
        </View>

      </Page>
    </Document>
  );
}

export async function generateIr8aPdf(data: Ir8aPdfData): Promise<Buffer> {
  return renderToBuffer(<Ir8aDocument data={data} />) as Promise<Buffer>;
}
