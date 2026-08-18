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
import type { ServiceReportData } from "./service-report";

const BRAND = "#1e3a5f";
const BRAND_LIGHT = "#e8eef6";
const DIVIDER = "#d0d9e8";
const MUTED = "#6b7a8d";
const DONE = "#1f7a4d";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
    paddingHorizontal: 28,
    paddingTop: 26,
    paddingBottom: 34,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  logo: { width: 96 },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", color: BRAND },
  headerRight: { alignItems: "flex-end" },
  metaLabel: { fontSize: 8, color: MUTED },
  metaValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },

  meta: {
    flexDirection: "row",
    gap: 24,
    backgroundColor: BRAND_LIGHT,
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  metaCol: { flexDirection: "column" },

  cover: { fontSize: 9, color: "#333", marginBottom: 10, lineHeight: 1.4 },

  summaryRow: { flexDirection: "row", gap: 20, marginBottom: 10 },
  stat: { flexDirection: "column" },
  statValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: BRAND },
  statLabel: { fontSize: 7.5, color: MUTED },

  // Grid
  gridHeaderRow: { flexDirection: "row", borderBottom: `1px solid ${BRAND}` },
  taskColHead: { width: 168, paddingVertical: 3, paddingRight: 4 },
  taskColHeadText: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BRAND },
  dayCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 3,
    minWidth: 12,
  },
  dayHeadText: { fontSize: 6, color: MUTED },
  rateColHead: { width: 30, alignItems: "flex-end", paddingVertical: 3 },

  row: { flexDirection: "row", borderBottom: `0.5px solid ${DIVIDER}`, alignItems: "center" },
  taskCol: { width: 168, paddingVertical: 3, paddingRight: 4 },
  taskText: { fontSize: 7.5 },
  taskSub: { fontSize: 6, color: MUTED },
  tick: { fontSize: 7, color: DONE, fontFamily: "Helvetica-Bold" },
  rateCol: { width: 30, alignItems: "flex-end", paddingVertical: 3 },
  rateText: { fontSize: 7.5, fontFamily: "Helvetica-Bold" },

  attRow: { flexDirection: "row", marginTop: 8, alignItems: "center" },

  remarksBox: {
    marginTop: 12,
    border: `0.5px solid ${DIVIDER}`,
    borderRadius: 4,
    padding: 8,
  },
  remarksLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BRAND, marginBottom: 2 },
  remarksText: { fontSize: 8.5, lineHeight: 1.4 },

  signoff: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  signLine: { width: 200, borderTop: `0.5px solid ${MUTED}`, paddingTop: 3 },
  signLabel: { fontSize: 7.5, color: MUTED },

  footer: {
    position: "absolute",
    bottom: 16,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6.5,
    color: MUTED,
  },
});

function DayHeader({ days }: { days: number }) {
  return (
    <>
      {Array.from({ length: days }, (_, i) => (
        <View key={i} style={styles.dayCell}>
          <Text style={styles.dayHeadText}>{i + 1}</Text>
        </View>
      ))}
    </>
  );
}

function ServiceReportDocument({ data }: { data: ServiceReportData }) {
  const logoPath = path.join(process.cwd(), "public", "images", "logo-blue.png");
  const dayNums = Array.from({ length: data.daysInMonth }, (_, i) => i + 1);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Image src={logoPath} style={styles.logo} />
            <Text style={[styles.title, { marginTop: 6 }]}>Monthly Service Report</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.metaLabel}>Reporting period</Text>
            <Text style={styles.metaValue}>{data.monthLabel}</Text>
          </View>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Client</Text>
            <Text style={styles.metaValue}>{data.clientName}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Site</Text>
            <Text style={styles.metaValue}>{data.siteName}</Text>
          </View>
        </View>

        {data.coverMessage ? <Text style={styles.cover}>{data.coverMessage}</Text> : null}

        <View style={styles.summaryRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{data.tasks.length}</Text>
            <Text style={styles.statLabel}>Tasks tracked</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{data.totalCompletions}</Text>
            <Text style={styles.statLabel}>Total completions</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{data.attendanceDays.length}</Text>
            <Text style={styles.statLabel}>Days staff on site</Text>
          </View>
        </View>

        {/* Grid header */}
        <View style={styles.gridHeaderRow}>
          <View style={styles.taskColHead}>
            <Text style={styles.taskColHeadText}>Task</Text>
          </View>
          <DayHeader days={data.daysInMonth} />
          <View style={styles.rateColHead}>
            <Text style={styles.dayHeadText}>Done</Text>
          </View>
        </View>

        {/* Grid rows */}
        {data.tasks.map((task) => {
          const doneSet = new Set(task.daysDone);
          return (
            <View key={task.id} style={styles.row}>
              <View style={styles.taskCol}>
                <Text style={styles.taskText}>{task.description}</Text>
                <Text style={styles.taskSub}>
                  {task.frequency}
                  {task.area ? ` · ${task.area}` : ""}
                </Text>
              </View>
              {dayNums.map((d) => (
                <View key={d} style={styles.dayCell}>
                  <Text style={styles.tick}>{doneSet.has(d) ? "✓" : ""}</Text>
                </View>
              ))}
              <View style={styles.rateCol}>
                <Text style={styles.rateText}>{task.daysDone.length}</Text>
              </View>
            </View>
          );
        })}

        {data.tasks.length === 0 ? (
          <Text style={{ fontSize: 8, color: MUTED, marginTop: 8 }}>
            No tasks recorded for this period.
          </Text>
        ) : null}

        {data.remarks ? (
          <View style={styles.remarksBox}>
            <Text style={styles.remarksLabel}>Remarks</Text>
            <Text style={styles.remarksText}>{data.remarks}</Text>
          </View>
        ) : null}

        <View style={styles.signoff}>
          <View style={styles.signLine}>
            <Text style={styles.signLabel}>
              Supervisor: {data.supervisorName || "________________________"}
            </Text>
          </View>
          <View style={styles.signLine}>
            <Text style={styles.signLabel}>Client acknowledgement / date</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>Gladen Maintenance Services (S) Pte Ltd</Text>
          <Text>
            Generated{" "}
            {new Date(data.generatedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export function generateServiceReportPdf(data: ServiceReportData): Promise<Buffer> {
  return renderToBuffer(<ServiceReportDocument data={data} />) as Promise<Buffer>;
}
