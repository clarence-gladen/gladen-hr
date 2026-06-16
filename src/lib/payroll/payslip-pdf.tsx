import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", padding: 48, fontSize: 10, color: "#222" },
  header: { marginBottom: 24 },
  company: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#2b3d6b" },
  subtitle: { fontSize: 10, color: "#666", marginTop: 3 },
  divider: { borderBottom: "1 solid #e0e0e0", marginVertical: 16 },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#2b3d6b",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  section: { marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  label: { color: "#555" },
  amount: { fontFamily: "Helvetica-Bold" },
  deductionAmount: { fontFamily: "Helvetica-Bold", color: "#cc2200" },
  netRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#eef2ff",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 12,
    borderRadius: 4,
  },
  netLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#2b3d6b" },
  netAmount: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#2b3d6b" },
  footer: { marginTop: 32, fontSize: 8, color: "#aaa", textAlign: "center" },
});

export interface PayslipPdfData {
  employeeName: string;
  periodLabel: string;
  basicSalary: number;
  overtimeAmount: number;
  allowances: number;
  reimbursements: number;
  deductions: number;
  salaryAdvanceDeduction: number;
  cpfEmployee: number;
  cpfEmployer: number;
  fwlAmount: number;
  netPay: number;
}

function fmt(n: number) {
  return `S$${n.toFixed(2)}`;
}

function LineItem({ label, amount, deduction }: { label: string; amount: number; deduction?: boolean }) {
  if (amount === 0) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={deduction ? styles.deductionAmount : styles.amount}>
        {deduction ? `−${fmt(amount)}` : fmt(amount)}
      </Text>
    </View>
  );
}

function PayslipDocument({ data }: { data: PayslipPdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.company}>Gladen Maintenance Services (S) Pte Ltd</Text>
          <Text style={styles.subtitle}>Payslip for {data.periodLabel}</Text>
          <Text style={{ ...styles.subtitle, marginTop: 8 }}>Employee: {data.employeeName}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings</Text>
          <LineItem label="Basic Salary" amount={data.basicSalary} />
          <LineItem label="Overtime" amount={data.overtimeAmount} />
          <LineItem label="Allowances" amount={data.allowances} />
          <LineItem label="Reimbursements" amount={data.reimbursements} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deductions</Text>
          <LineItem label="Deductions" amount={data.deductions} deduction />
          <LineItem label="Salary Advance Deduction" amount={data.salaryAdvanceDeduction} deduction />
          <LineItem label="CPF (Employee)" amount={data.cpfEmployee} deduction />
        </View>

        {(data.cpfEmployer > 0 || data.fwlAmount > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Employer Contributions</Text>
            <LineItem label="CPF (Employer)" amount={data.cpfEmployer} />
            <LineItem label="Foreign Worker Levy" amount={data.fwlAmount} />
          </View>
        )}

        <View style={styles.netRow}>
          <Text style={styles.netLabel}>Net Pay</Text>
          <Text style={styles.netAmount}>{fmt(data.netPay)}</Text>
        </View>

        <Text style={styles.footer}>
          This is a computer-generated payslip. No signature required.
        </Text>
      </Page>
    </Document>
  );
}

export async function generatePayslipPdf(data: PayslipPdfData): Promise<Buffer> {
  return renderToBuffer(<PayslipDocument data={data} />) as Promise<Buffer>;
}
