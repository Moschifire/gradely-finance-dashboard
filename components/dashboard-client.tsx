"use client";

import { useMemo, useState } from "react";
import type { FinanceRow } from "../lib/types";

type Props = { initialData: FinanceRow[]; source: "live" | "demo"; updatedAt: string; connectionMessage: string | null };
type Period = "all" | "3m" | "6m" | "ytd" | `month:${string}` | `quarter:${string}`;

const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 1 });
const percent = (value: number | null) => value == null ? "—" : `${(value * 100).toFixed(1)}%`;
const shortMonth = (date: string) => new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(`${date}T00:00:00Z`));
const longMonth = (date: string) => new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(`${date}T00:00:00Z`));
const change = (current: number | null, previous: number | null) => current != null && previous != null && previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : null;

function MetricCard({ label, value, delta, intent = "positive" }: { label: string; value: string; delta?: number | null; intent?: "positive" | "warning" | "neutral" }) {
  const up = (delta ?? 0) >= 0;
  return <article className="metric-card">
    <p>{label}</p><strong>{value}</strong>
    {delta != null ? <span className={`pill ${intent === "warning" ? "warning" : intent === "neutral" ? "neutral" : up ? "positive" : "negative"}`}>{up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs prior month</span> : <span className="pill neutral">No comparable prior month</span>}
  </article>;
}

function BarChart({ rows, value, color = "blue", title, subtitle, format = money.format }: { rows: FinanceRow[]; value: (row: FinanceRow) => number | null; color?: "blue" | "purple" | "red"; title: string; subtitle: string; format?: (value: number) => string }) {
  const values = rows.map((row) => Math.max(value(row) ?? 0, 0));
  const highest = Math.max(...values, 1);
  return <article className="chart-card"><header><h3>{title}</h3><p>{subtitle}</p></header>
    <div className="bar-chart">{rows.map((row, index) => <div className="bar-wrap" key={row.date}>
      <div className={`bar ${color}`} title={`${longMonth(row.date)}: ${format(values[index])}`} style={{ height: `${Math.max((values[index] / highest) * 100, values[index] ? 3 : 0)}%` }} />
      <span>{shortMonth(row.date)}</span>
    </div>)}</div>
  </article>;
}

function MarginChart({ rows }: { rows: FinanceRow[] }) {
  return <article className="chart-card"><header><h3>Profitability trend</h3><p>Gross margin and net margin by month</p></header>
    <div className="legend"><span><i className="legend-blue" /> Gross margin</span><span><i className="legend-purple" /> Net margin</span></div>
    <div className="grouped-chart">{rows.map((row) => <div className="group" key={row.date}>
      <div className="group-bars"><i className="gross-bar" title={`Gross margin: ${percent(row.grossMargin)}`} style={{ height: `${Math.max(Math.min((row.grossMargin ?? 0) * 100, 100), 0)}%` }} /><i className="net-bar" title={`Net margin: ${percent(row.netMargin)}`} style={{ height: `${Math.max(Math.min((row.netMargin ?? 0) * 100, 100), 0)}%` }} /></div>
      <span>{shortMonth(row.date)}</span>
    </div>)}</div>
  </article>;
}

function SalesMix({ row }: { row: FinanceRow }) {
  const organic = Math.max(Math.min(row.organicSalesPct ?? 0, 1), 0);
  const referral = Math.max(Math.min(row.referralRate ?? 0, 1 - organic), 0);
  const paid = Math.max(1 - organic - referral, 0);
  const hasData = row.organicSalesPct != null || row.referralRate != null;
  return <article className="chart-card sales-mix"><header><h3>Sales channel mix</h3><p>How sales are attributed in {longMonth(row.date)}</p></header>
    {hasData ? <><div className="donut" style={{ background: `conic-gradient(#60a5fa 0 ${organic * 100}%, #a78bfa ${organic * 100}% ${(organic + referral) * 100}%, #334155 ${(organic + referral) * 100}% 100%)` }}><span>{percent(organic + referral)}</span><small>organic + referral</small></div>
      <div className="mix-legend"><span><i className="legend-blue" /> Organic <b>{percent(organic)}</b></span><span><i className="legend-purple" /> Referral <b>{percent(referral)}</b></span><span><i className="legend-slate" /> Other <b>{percent(paid)}</b></span></div></> : <div className="no-chart-data">Sales-channel data has not been recorded for this month.</div>}
  </article>;
}

function Alerts({ row }: { row: FinanceRow }) {
  const alerts = [
    row.churnRate != null && row.churnRate >= 0.08 ? { tone: "alert-danger", title: "Churn needs attention", body: `Monthly churn is ${percent(row.churnRate)}.` } : null,
    row.ltvCac != null && row.ltvCac < 3 ? { tone: "alert-warning", title: "LTV / CAC is below target", body: `Current return is ${number.format(row.ltvCac)}x; target is 3.0x or higher.` } : null,
  ].filter(Boolean) as { tone: string; title: string; body: string }[];
  return alerts.length ? <section className="alerts">{alerts.map((alert) => <article className={`alert ${alert.tone}`} key={alert.title}><b>{alert.title}</b><span>{alert.body}</span></article>)}</section> : null;
}

export default function DashboardClient({ initialData, source, updatedAt, connectionMessage }: Props) {
  const units = useMemo(() => Array.from(new Set(initialData.map((row) => row.businessUnit))), [initialData]);
  const [unit, setUnit] = useState(units.includes("Overview") ? "Overview" : units[0] ?? "Overview");
  const [period, setPeriod] = useState<Period>("ytd");
  const unitRows = useMemo(() => initialData.filter((row) => row.businessUnit === unit).sort((a, b) => a.date.localeCompare(b.date)), [initialData, unit]);
  const quarterOptions = useMemo(() => {
    const availableDates = new Set(unitRows.map((row) => row.date));
    const quarters = [
      { value: "2026-Q1", label: "Q1 2026", dates: ["2026-01-01", "2026-02-01", "2026-03-01"] },
      { value: "2026-Q2", label: "Q2 2026", dates: ["2026-04-01", "2026-05-01", "2026-06-01"] },
      { value: "2026-Q3", label: "Q3 2026", dates: ["2026-07-01", "2026-08-01", "2026-09-01"] },
      { value: "2026-Q4", label: "Q4 2026", dates: ["2026-10-01", "2026-11-01", "2026-12-01"] },
    ];
    return quarters.filter((quarter) => quarter.dates.every((date) => availableDates.has(date)));
  }, [unitRows]);
  const rows = useMemo(() => {
    if (period.startsWith("month:")) return unitRows.filter((row) => row.date === period.slice("month:".length));
    if (period.startsWith("quarter:")) {
      const [year, quarter] = period.slice("quarter:".length).split("-Q");
      const startMonth = (Number(quarter) - 1) * 3 + 1;
      const start = `${year}-${String(startMonth).padStart(2, "0")}-01`;
      const end = `${year}-${String(startMonth + 2).padStart(2, "0")}-31`;
      return unitRows.filter((row) => row.date >= start && row.date <= end);
    }
    const amount = period === "3m" ? 3 : period === "6m" ? 6 : period === "all" ? unitRows.length : 12;
    return unitRows.slice(Math.max(unitRows.length - amount, 0));
  }, [unitRows, period]);
  const latest = rows.at(-1);
  if (!latest) return <main className="empty">No ready records are available for this business unit.</main>;
  const previous = rows.at(-2) ?? null;
  const metrics = [
    { label: "MRR", value: money.format(latest.mrr), delta: change(latest.mrr, previous?.mrr ?? null) },
    { label: "Gross margin %", value: percent(latest.grossMargin), delta: change(latest.grossMargin, previous?.grossMargin ?? null) },
    { label: "Net profit %", value: percent(latest.netMargin), delta: change(latest.netMargin, previous?.netMargin ?? null) },
    { label: "ARPPU", value: latest.arppu == null ? "—" : money.format(latest.arppu), delta: change(latest.arppu, previous?.arppu ?? null) },
    { label: "CAC", value: latest.cac == null ? "—" : money.format(latest.cac), delta: change(latest.cac, previous?.cac ?? null), intent: "warning" as const },
    { label: "Lifetime value", value: latest.ltv == null ? "—" : money.format(latest.ltv), delta: change(latest.ltv, previous?.ltv ?? null) },
    { label: "LTV / CAC", value: latest.ltvCac == null ? "—" : `${number.format(latest.ltvCac)}x`, delta: change(latest.ltvCac, previous?.ltvCac ?? null), intent: "neutral" as const },
    { label: "Churn rate", value: percent(latest.churnRate), delta: change(latest.churnRate, previous?.churnRate ?? null), intent: "warning" as const },
  ];
  return <main className="shell">
    <header className="hero"><div><span className="eyebrow">GRADELY</span><h1>Gradely Finance Dashboard</h1><p>2026 · Real-time financial insights and analytics</p></div>
      <div className="controls"><label>Reporting period<select value={period} onChange={(event) => setPeriod(event.target.value as Period)}><optgroup label="Reporting windows"><option value="ytd">Year to date</option><option value="3m">Last 3 months</option><option value="6m">Last 6 months</option><option value="all">All periods</option></optgroup><optgroup label="Quarters">{quarterOptions.map((quarter) => <option key={quarter.value} value={`quarter:${quarter.value}`}>{quarter.label}</option>)}</optgroup><optgroup label="Months">{unitRows.map((row) => <option key={row.date} value={`month:${row.date}`}>{longMonth(row.date)}</option>)}</optgroup></select></label>
        <label>Business unit<select value={unit} onChange={(event) => { setUnit(event.target.value); setPeriod("ytd"); }}>{units.map((item) => <option key={item}>{item}</option>)}</select></label></div>
    </header>
    <div className={`source-status ${source}`}>{source === "live" ? "● Live Google Sheets data" : `● Demo data — ${connectionMessage}`}<span>Updated {new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
    <section><div className="section-heading"><div><h2>Key Metrics</h2><p>Performance snapshot for {longMonth(latest.date)}</p></div><span>{unit}</span></div>
      <div className="metrics-grid">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div>
    </section>
    <Alerts row={latest} />
    <section><div className="section-heading"><div><h2>Financial Analytics</h2><p>Selected reporting window: {rows.length} month{rows.length === 1 ? "" : "s"}</p></div></div>
      <div className="charts-grid"><BarChart rows={rows} value={(row) => row.mrr} title="MRR by month" subtitle="Monthly recurring revenue" />
        <MarginChart rows={rows} />
        <BarChart rows={rows} value={(row) => row.cac} color="red" title="Customer acquisition cost" subtitle="CAC trend over time" />
        <SalesMix row={latest} />
      </div>
    </section>
  </main>;
}
