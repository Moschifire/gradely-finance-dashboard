"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { FinanceRow } from "../lib/types";

type Props = { initialData: FinanceRow[]; source: "live" | "demo"; updatedAt: string; connectionMessage: string | null };
type Period = "all" | "3m" | "6m" | "ytd" | `month:${string}` | `quarter:${string}`;

const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 1 });
const percent = (value: number | null) => value == null ? "—" : `${(value * 100).toFixed(1)}%`;
const shortMonth = (date: string) => new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(`${date}T00:00:00Z`));
const longMonth = (date: string) => new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(`${date}T00:00:00Z`));
const change = (current: number | null, previous: number | null) => current != null && previous != null && previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : null;

function MetricCard({ label, value, delta, intent = "positive", caption, comparisonLabel = "prior month" }: { label: string; value: string; delta?: number | null; intent?: "positive" | "warning" | "neutral"; caption?: string; comparisonLabel?: string }) {
  const up = (delta ?? 0) >= 0;
  return <article className="metric-card">
    <p>{label}</p><strong>{value}</strong>
    {delta != null ? <span className={`pill ${intent === "warning" ? "warning" : intent === "neutral" ? "neutral" : up ? "positive" : "negative"}`}>{up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs {comparisonLabel}</span> : <span className="pill neutral">{caption ?? "No comparable prior month"}</span>}
  </article>;
}

function BarChart({ rows, value, color = "blue", title, subtitle, format = money.format }: { rows: FinanceRow[]; value: (row: FinanceRow) => number | null; color?: "blue" | "purple" | "red"; title: string; subtitle: string; format?: (value: number) => string }) {
  const values = rows.map((row) => Math.max(value(row) ?? 0, 0));
  const highest = Math.max(...values, 1);
  return <article className="chart-card"><header><h3>{title}</h3><p>{subtitle}</p></header>
    <div className="bar-chart">{rows.map((row, index) => <div className="bar-wrap" key={row.date}>
      <div className={`bar ${color}`} title={`${longMonth(row.date)}: ${format(values[index])}`} style={{ height: `${Math.max((values[index] / highest) * 100, values[index] ? 3 : 0)}%` }}><span className="bar-value">{format(values[index])}</span></div>
      <span>{shortMonth(row.date)}</span>
    </div>)}</div>
  </article>;
}

function CashSpendChart({ rows }: { rows: FinanceRow[] }) {
  const cashValues = rows.map((row) => Math.max(row.cashCollected ?? 0, 0));
  const spendValues = rows.map((row) => Math.max(row.operatingExpenses ?? 0, 0));
  const highest = Math.max(...cashValues, ...spendValues, 1);
  const height = (value: number) => `${Math.max((value / highest) * 100, value ? 3 : 0)}%`;
  return <article className="chart-card"><header><h3>Cash collected vs spend</h3><p>Total inflow compared with operating expenses by month</p></header>
    <div className="legend"><span><i className="legend-purple" /> Cash collected</span><span><i className="legend-red" /> Spend</span></div>
    <div className="grouped-chart">{rows.map((row, index) => <div className="group" key={row.date}>
      <div className="group-bars">
        <i className="cash-bar" title={`Cash collected: ${money.format(cashValues[index])}`} style={{ height: height(cashValues[index]), bottom: 0 }}><span className="margin-value">Cash: {money.format(cashValues[index])}</span></i>
        <i className="spend-bar" title={`Spend: ${row.operatingExpenses == null ? "—" : money.format(spendValues[index])}`} style={{ height: height(spendValues[index]), bottom: 0 }}><span className="margin-value">Spend: {row.operatingExpenses == null ? "—" : money.format(spendValues[index])}</span></i>
      </div>
      <span>{shortMonth(row.date)}</span>
    </div>)}</div>
  </article>;
}

function MarginChart({ rows }: { rows: FinanceRow[] }) {
  const marginValues = rows.flatMap((row) => [row.grossMargin, row.netMargin]).filter((value): value is number => value != null);
  const minimum = Math.min(0, ...marginValues);
  const maximum = Math.max(0, ...marginValues);
  const range = Math.max(maximum - minimum, 0.01);
  const zeroLine = ((0 - minimum) / range) * 100;
  const barStyle = (value: number | null) => {
    const margin = value ?? 0;
    const height = `${Math.abs(margin) / range * 100}%`;
    return margin >= 0 ? { height, bottom: `${zeroLine}%` } : { height, top: `${100 - zeroLine}%` };
  };
  return <article className="chart-card"><header><h3>Profitability trend</h3><p>Gross margin and net margin by month</p></header>
    <div className="legend"><span><i className="legend-blue" /> Gross margin</span><span><i className="legend-purple" /> Net margin</span></div>
    <div className="grouped-chart">{rows.map((row) => <div className="group" key={row.date}>
      <div className="group-bars"><b className="zero-line" style={{ bottom: `${zeroLine}%` }} />
        <i className={`gross-bar ${(row.grossMargin ?? 0) < 0 ? "negative" : ""}`} title={`Gross margin: ${percent(row.grossMargin)}`} style={barStyle(row.grossMargin)}><span className="margin-value">Gross: {percent(row.grossMargin)}</span></i>
        <i className={`net-bar ${(row.netMargin ?? 0) < 0 ? "negative" : ""}`} title={`Net margin: ${percent(row.netMargin)}`} style={barStyle(row.netMargin)}><span className="margin-value">Net: {percent(row.netMargin)}</span></i>
      </div>
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
  const [restoredState, setRestoredState] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const savedUnit = params.get("unit");
    const savedPeriod = params.get("period");
    if (savedUnit && units.includes(savedUnit)) setUnit(savedUnit);
    if (savedPeriod && (savedPeriod === "all" || savedPeriod === "3m" || savedPeriod === "6m" || savedPeriod === "ytd" || savedPeriod.startsWith("month:") || savedPeriod.startsWith("quarter:"))) setPeriod(savedPeriod as Period);
    setRestoredState(true);
  }, [units]);
  useEffect(() => {
    if (!restoredState) return;
    const url = new URL(window.location.href);
    url.searchParams.set("unit", unit);
    url.searchParams.set("period", period);
    window.history.replaceState(null, "", url);
  }, [period, restoredState, unit]);
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
    if (period === "ytd") {
      const latestYear = unitRows.at(-1)?.date.slice(0, 4);
      return unitRows.filter((row) => row.date.startsWith(`${latestYear}-`));
    }
    const amount = period === "3m" ? 3 : period === "6m" ? 6 : unitRows.length;
    return unitRows.slice(Math.max(unitRows.length - amount, 0));
  }, [unitRows, period]);
  const latest = rows.at(-1);
  if (!latest) return <main className="empty">No ready records are available for this business unit.</main>;
  const latestIndex = unitRows.findIndex((row) => row.date === latest.date);
  const previous = latestIndex > 0 ? unitRows[latestIndex - 1] : null;
  const isOverview = unit === "Overview";
  const isYtd = period === "ytd";
  const isQuarter = period.startsWith("quarter:");
  const isRolling = period === "3m" || period === "6m";
  const isAggregate = isYtd || isQuarter || isRolling;
  const previousQuarterRows = useMemo(() => {
    if (!isQuarter) return [];
    const [yearText, quarterText] = period.slice("quarter:".length).split("-Q");
    const year = Number(yearText);
    const quarter = Number(quarterText);
    const previousYear = quarter === 1 ? year - 1 : year;
    const previousQuarter = quarter === 1 ? 4 : quarter - 1;
    const startMonth = (previousQuarter - 1) * 3 + 1;
    const start = `${previousYear}-${String(startMonth).padStart(2, "0")}-01`;
    const end = `${previousYear}-${String(startMonth + 2).padStart(2, "0")}-31`;
    return unitRows.filter((row) => row.date >= start && row.date <= end);
  }, [isQuarter, period, unitRows]);
  const previousRollingRows = useMemo(() => {
    if (!isRolling || !rows.length) return [];
    const currentStart = unitRows.findIndex((row) => row.date === rows[0].date);
    return currentStart >= rows.length ? unitRows.slice(currentStart - rows.length, currentStart) : [];
  }, [isRolling, rows, unitRows]);
  const sum = (value: (row: FinanceRow) => number | null, sourceRows = rows) => sourceRows.reduce((total, row) => total + (value(row) ?? 0), 0);
  const sumOrNull = (value: (row: FinanceRow) => number | null, sourceRows = rows) => {
    const values = sourceRows.map(value).filter((item): item is number => item != null);
    return values.length ? values.reduce((total, item) => total + item, 0) : null;
  };
  const average = (value: (row: FinanceRow) => number | null, sourceRows = rows) => {
    const values = sourceRows.map(value).filter((item): item is number => item != null);
    return values.length ? values.reduce((total, item) => total + item, 0) / values.length : null;
  };
  const weightedAverage = (value: (row: FinanceRow) => number | null, sourceRows = rows) => {
    const weightedRows = sourceRows.filter((row) => value(row) != null && row.mrr > 0);
    const totalWeight = weightedRows.reduce((total, row) => total + row.mrr, 0);
    return totalWeight ? weightedRows.reduce((total, row) => total + (value(row) ?? 0) * row.mrr, 0) / totalWeight : null;
  };
  const aggregateCaption = (kind: "total" | "average" | "weighted") => {
    const prefix = isYtd ? "Year-to-date" : isQuarter ? "Quarter" : period === "3m" ? "Last 3 months" : "Last 6 months";
    return kind === "total" ? `${prefix} total` : kind === "weighted" ? `${prefix} weighted average` : `${prefix} monthly average`;
  };
  const snapshotLabel = isYtd ? `Year to date through ${longMonth(latest.date)}` : isQuarter ? `${period.slice("quarter:".length)} summary` : isRolling ? `${period === "3m" ? "Last 3" : "Last 6"} months through ${longMonth(latest.date)}` : `Performance snapshot for ${longMonth(latest.date)}`;
  const comparisonRows = isQuarter ? previousQuarterRows : isRolling ? previousRollingRows : [];
  const periodDelta = (current: number | null, previous: number | null) => (isQuarter || isRolling) && comparisonRows.length === rows.length ? change(current, previous) : null;
  const metrics = isAggregate && isOverview ? [
    { label: "MRR", value: money.format(average((row) => row.mrr) ?? 0), delta: periodDelta(average((row) => row.mrr), average((row) => row.mrr, comparisonRows)), caption: aggregateCaption("average") },
    { label: "Total revenue", value: money.format(sum((row) => row.mrr)), delta: periodDelta(sum((row) => row.mrr), sum((row) => row.mrr, comparisonRows)), caption: aggregateCaption("total") },
    { label: "Gross margin", value: percent(weightedAverage((row) => row.grossMargin)), delta: periodDelta(weightedAverage((row) => row.grossMargin), weightedAverage((row) => row.grossMargin, comparisonRows)), caption: aggregateCaption("weighted") },
    { label: "Net profit", value: money.format(sum((row) => row.netProfit)), delta: periodDelta(sum((row) => row.netProfit), sum((row) => row.netProfit, comparisonRows)), caption: aggregateCaption("total") },
    { label: "Cash collected", value: money.format(sum((row) => row.cashCollected)), delta: periodDelta(sum((row) => row.cashCollected), sum((row) => row.cashCollected, comparisonRows)), caption: aggregateCaption("total") },
    { label: "Receivables", value: money.format(sum((row) => row.receivables)), delta: periodDelta(sum((row) => row.receivables), sum((row) => row.receivables, comparisonRows)), caption: aggregateCaption("total"), intent: "neutral" as const },
    { label: "Operating expenses", value: sumOrNull((row) => row.operatingExpenses) == null ? "—" : money.format(sumOrNull((row) => row.operatingExpenses) ?? 0), delta: periodDelta(sumOrNull((row) => row.operatingExpenses), sumOrNull((row) => row.operatingExpenses, comparisonRows)), caption: aggregateCaption("total"), intent: "warning" as const },
  ] : isAggregate ? [
    { label: "MRR", value: money.format(average((row) => row.mrr) ?? 0), delta: periodDelta(average((row) => row.mrr), average((row) => row.mrr, comparisonRows)), caption: aggregateCaption("average") },
    { label: "Gross margin %", value: percent(weightedAverage((row) => row.grossMargin)), delta: periodDelta(weightedAverage((row) => row.grossMargin), weightedAverage((row) => row.grossMargin, comparisonRows)), caption: aggregateCaption("weighted") },
    { label: "Net profit %", value: percent(weightedAverage((row) => row.netMargin)), delta: periodDelta(weightedAverage((row) => row.netMargin), weightedAverage((row) => row.netMargin, comparisonRows)), caption: aggregateCaption("weighted") },
    { label: "ARPPU", value: average((row) => row.arppu) == null ? "—" : money.format(average((row) => row.arppu) ?? 0), delta: periodDelta(average((row) => row.arppu), average((row) => row.arppu, comparisonRows)), caption: aggregateCaption("average") },
    { label: "CAC", value: average((row) => row.cac) == null ? "—" : money.format(average((row) => row.cac) ?? 0), delta: periodDelta(average((row) => row.cac), average((row) => row.cac, comparisonRows)), caption: aggregateCaption("average"), intent: "warning" as const },
    { label: "Lifetime value", value: average((row) => row.ltv) == null ? "—" : money.format(average((row) => row.ltv) ?? 0), delta: periodDelta(average((row) => row.ltv), average((row) => row.ltv, comparisonRows)), caption: aggregateCaption("average") },
    { label: "LTV / CAC", value: average((row) => row.ltvCac) == null ? "—" : `${number.format(average((row) => row.ltvCac) ?? 0)}x`, delta: periodDelta(average((row) => row.ltvCac), average((row) => row.ltvCac, comparisonRows)), caption: aggregateCaption("average"), intent: "neutral" as const },
    { label: "Churn rate", value: percent(average((row) => row.churnRate)), delta: periodDelta(average((row) => row.churnRate), average((row) => row.churnRate, comparisonRows)), caption: aggregateCaption("average"), intent: "warning" as const },
  ] : isOverview ? [
    { label: "MRR", value: money.format(latest.mrr), delta: change(latest.mrr, previous?.mrr ?? null) },
    { label: "Total revenue", value: money.format(latest.mrr), delta: change(latest.mrr, previous?.mrr ?? null) },
    { label: "Gross margin", value: percent(latest.grossMargin), delta: change(latest.grossMargin, previous?.grossMargin ?? null) },
    { label: "Net profit", value: latest.netProfit == null ? "—" : money.format(latest.netProfit), delta: change(latest.netProfit, previous?.netProfit ?? null) },
    { label: "Cash collected", value: latest.cashCollected == null ? "—" : money.format(latest.cashCollected), delta: change(latest.cashCollected, previous?.cashCollected ?? null) },
    { label: "Receivables", value: latest.receivables == null ? "—" : money.format(latest.receivables), delta: change(latest.receivables, previous?.receivables ?? null), intent: "neutral" as const },
    { label: "Operating expenses", value: latest.operatingExpenses == null ? "—" : money.format(latest.operatingExpenses), delta: change(latest.operatingExpenses, previous?.operatingExpenses ?? null), intent: "warning" as const },
  ] : [
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
    <header className="hero"><div><Image className="gradely-logo" src="/gradely-logo.png" alt="Gradely" width={123} height={31} priority /><h1>Gradely Finance Dashboard</h1><p>2026 · Real-time financial insights and analytics</p></div>
      <div className="controls"><label>Reporting period<select value={period} onChange={(event) => setPeriod(event.target.value as Period)}><optgroup label="Reporting windows"><option value="ytd">Year to date</option><option value="3m">Last 3 months</option><option value="6m">Last 6 months</option><option value="all">All periods</option></optgroup><optgroup label="Quarters">{quarterOptions.map((quarter) => <option key={quarter.value} value={`quarter:${quarter.value}`}>{quarter.label}</option>)}</optgroup><optgroup label="Months">{unitRows.map((row) => <option key={row.date} value={`month:${row.date}`}>{longMonth(row.date)}</option>)}</optgroup></select></label>
        <label>Business unit<select value={unit} onChange={(event) => { setUnit(event.target.value); setPeriod("ytd"); }}>{units.map((item) => <option key={item}>{item}</option>)}</select></label></div>
    </header>
    <div className={`source-status ${source}`}>{source === "live" ? "● Live Google Sheets data" : `● Demo data — ${connectionMessage}`}<span>Updated {new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
    <section><div className="section-heading"><div><h2>Key Metrics</h2><p>{snapshotLabel}</p></div><span>{unit}</span></div>
      <div className="metrics-grid">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} comparisonLabel={isQuarter ? "previous quarter" : isRolling ? "previous period" : undefined} />)}</div>
    </section>
    {!isOverview && <Alerts row={latest} />}
    <section><div className="section-heading"><div><h2>Financial Analytics</h2><p>Selected reporting window: {rows.length} month{rows.length === 1 ? "" : "s"}</p></div></div>
      <div className="charts-grid"><BarChart rows={rows} value={(row) => row.mrr} title="MRR by month" subtitle="Monthly recurring revenue" />
        <MarginChart rows={rows} />
        {isOverview ? <><CashSpendChart rows={rows} /><BarChart rows={rows} value={(row) => row.receivables} color="red" title="Receivables" subtitle="Receivables by month" /></> : <><BarChart rows={rows} value={(row) => row.cac} color="red" title="Customer acquisition cost" subtitle="CAC trend over time" /><SalesMix row={latest} /></>}
      </div>
    </section>
  </main>;
}
