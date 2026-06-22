import React from "react";
import path from "path";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

const BRAND = "#1e3a5f";
const BRAND_LIGHT = "#e8eef6";
const DIVIDER = "#d0d9e8";
const MUTED = "#6b7a8d";
const RED = "#c0392b";

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

  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  logo: { width: 110 },
  headerRight: { alignItems: "flex-end" },
  companyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: BRAND,
    marginBottom: 2,
  },
  companyDetail: { fontSize: 8, color: MUTED, marginBottom: 1 },

  // ── Title band ──────────────────────────────────────────
  titleBand: {
    backgroundColor: BRAND,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  titleSub: { fontSize: 9, color: "#b8ccdf" },

  // ── Employee info box ────────────────────────────────────
  infoBox: {
    backgroundColor: BRAND_LIGHT,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoLabel: { fontSize: 8, color: MUTED, marginBottom: 2 },
  infoValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },

  // ── Section ──────────────────────────────────────────────
  sectionHeader: {
    backgroundColor: BRAND_LIGHT,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 3,
    marginBottom: 1,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: BRAND,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  section: { marginBottom: 14 },

  // ── Line items ───────────────────────────────────────────
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderBottom: `0.5 solid ${DIVIDER}`,
  },
  rowLabel: { color: "#333333", fontSize: 9 },
  rowAmount: { fontFamily: "Helvetica-Bold", color: "#1a1a1a", fontSize: 9 },
  rowDeduction: { fontFamily: "Helvetica-Bold", color: RED, fontSize: 9 },

  // ── Subtotal ─────────────────────────────────────────────
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderTop: `1 solid ${DIVIDER}`,
    marginTop: 1,
  },
  subtotalLabel: { fontSize: 8.5, color: MUTED, fontFamily: "Helvetica-Bold" },
  subtotalAmount: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },

  // ── Net pay ──────────────────────────────────────────────
  netPayBox: {
    backgroundColor: BRAND,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  netPayLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  netPayAmount: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#ffffff" },

  // ── Footer ───────────────────────────────────────────────
  footer: {
    borderTop: `0.5 solid ${DIVIDER}`,
    paddingTop: 8,
    marginTop: "auto",
  },
  footerText: { fontSize: 7.5, color: MUTED, textAlign: "center" },
});

export interface PayslipPdfData {
  employeeName: string;
  periodLabel: string;
  basicSalary: number;
  transportAllowance: number;
  allowances: number;
  overtimeAmount: number;
  bonus: number;
  reimbursement: number;
  midMonthPayment: number;
  salaryAdvanceDeduction: number;
  deductions: number;
  cpfEmployee: number;
  cpfEmployer: number;
  netPay: number;
}

function fmt(n: number) {
  return `S$${n.toFixed(2)}`;
}

function LineItem({
  label,
  amount,
  deduction,
}: {
  label: string;
  amount: number;
  deduction?: boolean;
}) {
  if (amount === 0) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={deduction ? styles.rowDeduction : styles.rowAmount}>
        {deduction ? `(${fmt(amount)})` : fmt(amount)}
      </Text>
    </View>
  );
}

function PayslipDocument({ data }: { data: PayslipPdfData }) {
  const logoPath = path.join(process.cwd(), "public", "images", "logo-blue.png");

  const totalEarnings =
    data.basicSalary + data.transportAllowance + data.allowances + data.overtimeAmount + data.bonus;
  // reimbursement is excluded from totalEarnings — it is tax-exempt and shown separately
  const totalDeductions =
    data.cpfEmployee + data.midMonthPayment + data.salaryAdvanceDeduction + data.deductions;

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

        {/* Title band */}
        <View style={styles.titleBand}>
          <Text style={styles.titleText}>PAYSLIP</Text>
          <Text style={styles.titleSub}>{data.periodLabel}</Text>
        </View>

        {/* Employee info */}
        <View style={styles.infoBox}>
          <View>
            <Text style={styles.infoLabel}>Employee Name</Text>
            <Text style={styles.infoValue}>{data.employeeName}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.infoLabel}>Pay Period</Text>
            <Text style={styles.infoValue}>{data.periodLabel}</Text>
          </View>
        </View>

        {/* Earnings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Earnings</Text>
          </View>
          <LineItem label="Basic Salary" amount={data.basicSalary} />
          <LineItem label="Transport Allowance" amount={data.transportAllowance} />
          <LineItem label="Other Allowance" amount={data.allowances} />
          <LineItem label="Overtime" amount={data.overtimeAmount} />
          <LineItem label="Bonus (Additional Wage)" amount={data.bonus} />
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Total Earnings</Text>
            <Text style={styles.subtotalAmount}>{fmt(totalEarnings)}</Text>
          </View>
        </View>

        {/* Reimbursements (tax-exempt) */}
        {data.reimbursement > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Reimbursements (Tax-Exempt)</Text>
            </View>
            <LineItem label="Reimbursement" amount={data.reimbursement} />
          </View>
        )}

        {/* Deductions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Deductions</Text>
          </View>
          <LineItem label="CPF (Employee)" amount={data.cpfEmployee} deduction />
          <LineItem label="Mid-Month Payment" amount={data.midMonthPayment} deduction />
          <LineItem label="Salary Loan" amount={data.salaryAdvanceDeduction} deduction />
          <LineItem label="Other Deductions" amount={data.deductions} deduction />
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Total Deductions</Text>
            <Text style={{ ...styles.subtotalAmount, color: RED }}>{fmt(totalDeductions)}</Text>
          </View>
        </View>

        {/* Employer contributions (info only) */}
        {data.cpfEmployer > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Employer Contribution</Text>
            </View>
            <LineItem label="CPF (Employer)" amount={data.cpfEmployer} />
          </View>
        )}

        {/* Net pay */}
        <View style={styles.netPayBox}>
          <Text style={styles.netPayLabel}>Net Pay</Text>
          <Text style={styles.netPayAmount}>{fmt(data.netPay)}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This is a computer-generated payslip. No signature required.
          </Text>
        </View>

      </Page>
    </Document>
  );
}

export async function generatePayslipPdf(data: PayslipPdfData): Promise<Buffer> {
  return renderToBuffer(<PayslipDocument data={data} />) as Promise<Buffer>;
}
