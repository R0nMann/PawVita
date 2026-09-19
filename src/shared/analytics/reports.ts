import { analyticsApi } from "../../api/endpoints";
import { CASE_STATUS_LABEL, isoDay, RISK_LABEL } from "../../lib/format";

/**
 * Official reports built from the analytics endpoints: downloaded as CSV, or
 * opened as a printable page (the browser's "Save as PDF" makes the PDF).
 */

export type ReportType = "surveillance" | "outbreak" | "vaccination" | "comparison" | "mortality";
export type ReportFormat = "pdf" | "csv";

export const REPORT_TYPES: { id: ReportType; name: string; desc: string; icon: string }[] = [
  { id: "surveillance", name: "Disease Surveillance Summary", desc: "Cases reported and resolved, open cases by status and risk, response times", icon: "📊" },
  { id: "outbreak", name: "Outbreak Summary", desc: "Open and high-risk cases by area, and weekly cases by disease", icon: "⚠️" },
  { id: "vaccination", name: "Vaccination Coverage Report", desc: "Coverage, overdue and never-vaccinated animals by area", icon: "💉" },
  { id: "comparison", name: "Area Comparison Report", desc: "Case load, deaths and vaccination side by side for every area", icon: "🗺️" },
  { id: "mortality", name: "Mortality Report", desc: "Livestock deaths over time and by area", icon: "📉" },
];

export interface Period {
  id: string;
  label: string;
  from: string;
  to: string;
}

export function reportPeriods(now = new Date()): Period[] {
  const day = (d: Date) => isoDay(d);
  const shift = (days: number) => new Date(now.getTime() - days * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });
  return [
    { id: "7d", label: "Last 7 days", from: day(shift(6)), to: day(now) },
    { id: "this-month", label: monthFmt.format(monthStart), from: day(monthStart), to: day(now) },
    { id: "last-month", label: monthFmt.format(lastMonthStart), from: day(lastMonthStart), to: day(lastMonthEnd) },
    { id: "90d", label: "Last 90 days", from: day(shift(89)), to: day(now) },
    { id: "fy", label: `FY ${fyStartYear}–${String(fyStartYear + 1).slice(2)}`, from: `${fyStartYear}-04-01`, to: day(now) },
  ];
}

export interface ReportSection {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}

export interface Report {
  type: ReportType;
  title: string;
  scope: string;
  period: Period;
  generatedAt: string;
  sections: ReportSection[];
}

const pct = (n: number | null | undefined) => (n == null ? "—" : `${n}%`);

export async function buildReport(type: ReportType, period: Period, regionId?: string): Promise<Report> {
  const q = { from: period.from, to: period.to, regionId };
  const overview = await analyticsApi.overview(q);
  const scope = overview.scope?.name ?? "All India";
  const meta = REPORT_TYPES.find((r) => r.id === type)!;
  const sections: ReportSection[] = [];

  const summary: ReportSection = {
    title: "Summary",
    columns: ["Measure", "Value"],
    rows: [
      ["Cases reported", overview.cases.reported],
      ["Reported offline (synced later)", overview.cases.reportedOffline],
      ["Cases resolved", overview.cases.resolved],
      ["Open cases now", overview.cases.open],
      ["Open notifiable-disease cases", overview.cases.openNotifiable],
      ["Livestock deaths", overview.deaths],
      ["Median hours to first vet response", overview.responseTimeHours.median ?? "—"],
      ["Animals registered", overview.animals],
      ["Vaccination coverage", pct(overview.vaccination.coveragePercent)],
    ],
  };

  if (type === "surveillance") {
    sections.push(summary);
    sections.push({
      title: "Open cases by status",
      columns: ["Status", "Cases"],
      rows: Object.entries(overview.cases.openByStatus).map(([s, n]) => [CASE_STATUS_LABEL[s as keyof typeof CASE_STATUS_LABEL] ?? s, n ?? 0]),
    });
    sections.push({
      title: "Open cases by risk",
      columns: ["Risk", "Cases"],
      rows: Object.entries(overview.cases.openByRisk).map(([r, n]) => [RISK_LABEL[r as keyof typeof RISK_LABEL] ?? r, n ?? 0]),
    });
    const trends = await analyticsApi.trends({ ...q, interval: "week", groupBy: "disease" });
    sections.push(trendSection("Cases by disease, per week", trends));
  }

  if (type === "outbreak" || type === "comparison" || type === "mortality") {
    const regions = await analyticsApi.regions(q);
    const coverage = type === "comparison" ? await analyticsApi.coverage({ regionId }) : null;
    const byId = new Map((coverage?.items ?? []).map((c) => [c.regionId, c]));
    sections.push({
      title: `By ${regions.level}`,
      columns:
        type === "outbreak"
          ? ["Area", "Cases", "Open", "Open high-risk", "Animals affected", "Deaths"]
          : type === "mortality"
            ? ["Area", "Deaths reported with cases", "Animals affected"]
            : ["Area", "Cases", "Open", "Deaths", "Vaccination coverage"],
      rows: regions.items.map((r) => {
        const name = r.region.name ?? r.regionId;
        if (type === "outbreak") return [name, r.cases, r.open, r.highRiskOpen, r.animalsAffected, r.deaths];
        if (type === "mortality") return [name, r.deaths, r.animalsAffected];
        return [name, r.cases, r.open, r.deaths, pct(byId.get(r.regionId)?.coveragePercent)];
      }),
    });
    if (type === "outbreak") {
      const trends = await analyticsApi.trends({ ...q, interval: "week", groupBy: "disease" });
      sections.push(trendSection("New cases by disease, per week", trends));
    }
    if (type === "mortality") {
      const deaths = await analyticsApi.trends({ ...q, interval: "week", metric: "deaths", groupBy: "species" });
      sections.unshift({ title: "Summary", columns: ["Measure", "Value"], rows: [["Livestock deaths", overview.deaths]] });
      sections.push(trendSection("Deaths by species, per week", deaths));
    }
    if (type === "comparison") sections.unshift(summary);
  }

  if (type === "vaccination") {
    const coverage = await analyticsApi.coverage({ regionId });
    sections.push({
      title: "Summary",
      columns: ["Measure", "Value"],
      rows: [
        ["Animals registered", overview.vaccination.animals],
        ["Up to date", overview.vaccination.upToDate],
        ["Overdue", overview.vaccination.overdue],
        ["Coverage", pct(overview.vaccination.coveragePercent)],
      ],
    });
    sections.push({
      title: `Coverage by ${coverage.level}`,
      columns: ["Area", "Animals", "Up to date", "Overdue", "Never vaccinated", "Coverage"],
      rows: coverage.items.map((c) => [c.region.name ?? c.regionId, c.animals, c.upToDate, c.overdue, c.neverVaccinated, pct(c.coveragePercent)]),
    });
  }

  return { type, title: meta.name, scope, period, generatedAt: new Date().toISOString(), sections };
}

function trendSection(title: string, trends: { keys: string[]; buckets: { start: string; total: number; counts: Record<string, number> }[] }): ReportSection {
  return {
    title,
    columns: ["Week starting", ...trends.keys.map((k) => k.toUpperCase()), "Total"],
    rows: trends.buckets.map((b) => [b.start, ...trends.keys.map((k) => b.counts[k] ?? 0), b.total]),
  };
}

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv(report: Report) {
  const lines = [
    [report.title],
    [`Area: ${report.scope}`],
    [`Period: ${report.period.label} (${report.period.from} to ${report.period.to})`],
    [`Generated: ${new Date(report.generatedAt).toLocaleString("en-IN")}`],
  ].map((r) => r.map(csvCell).join(","));
  for (const s of report.sections) {
    lines.push("", csvCell(s.title), s.columns.map(csvCell).join(","), ...s.rows.map((r) => r.map(csvCell).join(",")));
  }
  // BOM so Excel reads non-ASCII place names correctly.
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pawvita-${report.type}-${report.period.from}-to-${report.period.to}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Print through a hidden frame, so popup blockers never get in the way. */
export function printReport(report: Report) {
  const body = report.sections
    .map(
      (s) => `<h2>${escapeHtml(s.title)}</h2><table><thead><tr>${s.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>
      <tbody>${s.rows.length ? s.rows.map((r) => `<tr>${r.map((v) => `<td>${escapeHtml(String(v))}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${s.columns.length}">No data</td></tr>`}</tbody></table>`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title>
    <style>body{font-family:Inter,Arial,sans-serif;color:#1f2937;margin:32px}h1{color:#1B4332;margin:0}h2{color:#1B4332;font-size:15px;margin:24px 0 8px}
    .meta{color:#6b7280;font-size:12px;margin-top:4px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left}
    th{background:#f3f4f6}footer{margin-top:32px;color:#9ca3af;font-size:11px}</style></head>
    <body><h1>${escapeHtml(report.title)}</h1><p class="meta">${escapeHtml(report.scope)} · ${escapeHtml(report.period.label)} (${report.period.from} to ${report.period.to}) · generated ${escapeHtml(new Date(report.generatedAt).toLocaleString("en-IN"))}</p>
    ${body}<footer>PawVita livestock disease surveillance</footer></body></html>`;
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  }, 250);
}

// --- Per-browser history of generated reports --------------------------------

export interface ReportHistoryEntry {
  id: string;
  type: ReportType;
  periodId: string;
  title: string;
  periodLabel: string;
  scope: string;
  format: ReportFormat;
  generatedAt: string;
}

const HISTORY_KEY = "pawvita.reports";

export function loadReportHistory(userId: string): ReportHistoryEntry[] {
  try {
    const all = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "{}") as Record<string, ReportHistoryEntry[]>;
    return all[userId] ?? [];
  } catch {
    return [];
  }
}

export function saveReportHistory(userId: string, entry: ReportHistoryEntry) {
  try {
    const all = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "{}") as Record<string, ReportHistoryEntry[]>;
    all[userId] = [entry, ...(all[userId] ?? [])].slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
  } catch {
    // Storage unavailable: history is a convenience only.
  }
}

/** Generate and deliver a report in the chosen format; returns the history entry. */
export async function generateReport(userId: string, type: ReportType, period: Period, format: ReportFormat, regionId?: string) {
  const report = await buildReport(type, period, regionId);
  if (format === "csv") downloadCsv(report);
  else printReport(report);
  const entry: ReportHistoryEntry = {
    id: `${Date.now()}`,
    type,
    periodId: period.id,
    title: report.title,
    periodLabel: period.label,
    scope: report.scope,
    format,
    generatedAt: report.generatedAt,
  };
  saveReportHistory(userId, entry);
  return entry;
}
