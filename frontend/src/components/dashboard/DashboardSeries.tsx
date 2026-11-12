import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { TREND_METRICS, type TrendMetric } from './preferences'

export type DashboardMetric = {
  date_ref: string
  hrv_ms?: number | null
  sleep_minutes?: number | null
  steps?: number | null
  rhr_bpm?: number | null
}

export type SeriesMetric = TrendMetric

const METRIC_FIELDS: Record<SeriesMetric, keyof DashboardMetric> = {
  hrv_ms: 'hrv_ms',
  sleep_minutes: 'sleep_minutes',
  steps: 'steps',
  rhr_bpm: 'rhr_bpm',
}

const METRIC_UNITS: Record<SeriesMetric, string> = {
  hrv_ms: 'ms',
  sleep_minutes: 'min',
  steps: 'passos',
  rhr_bpm: 'bpm',
}

export type SeriesPoint = { date: string; label: string; value: number | null }

export function buildSeries(
  rows: DashboardMetric[],
  metric: SeriesMetric,
  startDate: string,
  endDate: string,
): SeriesPoint[] {
  const observed = new Map<string, number>()
  for (const row of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date_ref)) continue
    const value = row[METRIC_FIELDS[metric]]
    if (typeof value === 'number' && Number.isFinite(value)) observed.set(row.date_ref, value)
  }
  const startMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate)
  const endMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(endDate)
  if (!startMatch || !endMatch) return []
  const current = new Date(Date.UTC(Number(startMatch[1]), Number(startMatch[2]) - 1, Number(startMatch[3])))
  const end = new Date(Date.UTC(Number(endMatch[1]), Number(endMatch[2]) - 1, Number(endMatch[3])))
  if (Number.isNaN(current.getTime()) || Number.isNaN(end.getTime()) || current > end) return []

  const points: SeriesPoint[] = []
  while (current <= end && points.length < 90) {
    const date = current.toISOString().slice(0, 10)
    const [year, month, day] = date.split('-').map(Number)
    const label = new Date(year, month - 1, day).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    points.push({ date, label, value: observed.get(date) ?? null })
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return points
}

function numericSummary(points: SeriesPoint[]) {
  const values = points.flatMap(point => point.value == null ? [] : [point.value])
  return {
    values,
    average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    count: values.length,
  }
}

function numberFormat(value: number, digits = 1): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(value)
}

function formatDateLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const parsed = new Date(year, month - 1, day, 12)
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function coverageLabel(count: number, days: number): string {
  const observations = `${count} ${count === 1 ? 'dia' : 'dias'} com dados`
  const period = `${days} ${days === 1 ? 'dia' : 'dias'} no período`
  return `${observations} / ${period}`
}

function formatValue(value: number | null, metric: SeriesMetric): string {
  if (value == null) return '—'
  if (metric === 'sleep_minutes') {
    const total = Math.round(value)
    return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')} min`
  }
  if (metric === 'steps') return numberFormat(value, 0)
  return `${numberFormat(value)} ${METRIC_UNITS[metric]}`
}

function axisValue(value: number, metric: SeriesMetric): string {
  if (metric === 'sleep_minutes') return `${numberFormat(value / 60, 1)} h`
  if (metric === 'steps') return numberFormat(value / 1000, 0) + 'k'
  return numberFormat(value, 0)
}

function metricColor(metric: SeriesMetric): string {
  return metric === 'sleep_minutes' ? '#fbbf24' : '#22d3ee'
}

const trendCardClass = 'dashboard-trend-card min-w-0 overflow-hidden rounded-radius-xl border p-3.5 shadow-xs sm:p-4'
const axisTick = { fontSize: 10, fill: 'currentColor' }

function EmptyHistory({ loading, error, height }: { loading: boolean; error: boolean; height: string }) {
  if (loading) return <div className={`flex ${height} items-center justify-center text-sm text-slate-500 dark:text-slate-400`} role="status">Carregando histórico…</div>
  if (error) return <div className={`flex ${height} items-center justify-center text-center text-sm text-rose-700 dark:text-rose-300`} role="status">Histórico indisponível.</div>
  return <div className={`flex ${height} items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400`}>Sem medições no período selecionado.</div>
}

export function DashboardTrendChart({
  rows,
  metric,
  startDate,
  endDate,
  loading = false,
  error = false,
}: {
  rows: DashboardMetric[]
  metric: SeriesMetric
  startDate: string
  endDate: string
  loading?: boolean
  error?: boolean
}) {
  const points = useMemo(() => buildSeries(rows, metric, startDate, endDate), [rows, metric, startDate, endDate])
  const summary = useMemo(() => numericSummary(points), [points])
  const color = metricColor(metric)
  const interval = Math.max(0, Math.floor(points.length / 6))

  return (
    <section className={trendCardClass} aria-label={`${TREND_METRICS[metric]} no período`}>
      <div className="mb-3">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{TREND_METRICS[metric]} ao longo do tempo</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateLabel(startDate)} a {formatDateLabel(endDate)}</p>
      </div>
      {loading || error || summary.count === 0 ? <EmptyHistory loading={loading} error={error} height="h-60" /> : (
        <div className="h-60 min-w-0 sm:h-[290px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 10, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.18} />
              <XAxis dataKey="label" interval={interval} tick={axisTick} tickMargin={8} minTickGap={8} />
              <YAxis width={52} tick={axisTick} tickMargin={6} tickFormatter={value => axisValue(Number(value), metric)} />
              <Tooltip
                labelFormatter={(_label, payload) => payload?.[0]?.payload?.date ?? ''}
                formatter={value => [formatValue(Number(value), metric), TREND_METRICS[metric]]}
                contentStyle={{ borderRadius: '0.75rem', borderColor: 'var(--border-default)', background: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={TREND_METRICS[metric]}
                stroke={color}
                strokeWidth={3}
                dot={{ r: 3, fill: color, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

export function DashboardHistoryChart({ metric, rows, startDate, endDate, loading = false, error = false }: {
  metric: 'sleep_minutes' | 'steps'
  rows: DashboardMetric[]
  startDate: string
  endDate: string
  loading?: boolean
  error?: boolean
}) {
  const points = useMemo(() => buildSeries(rows, metric, startDate, endDate), [rows, metric, startDate, endDate])
  const summary = useMemo(() => numericSummary(points), [points])
  const chartColor = metricColor(metric)
  const interval = Math.max(0, Math.floor(points.length / 6))

  return (
    <section className={trendCardClass} aria-label={`${TREND_METRICS[metric]} no período`}>
      <header className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{TREND_METRICS[metric]}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{metric === 'sleep_minutes' ? 'Tempo total por dia' : 'Total por dia'}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{loading ? '…' : error ? 'Indisponível' : formatValue(summary.average, metric)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Média do período</p>
        </div>
      </header>
      {loading || error || summary.count === 0 ? <EmptyHistory loading={loading} error={error} height="h-48" /> : (
        <div className="h-48 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            {metric === 'sleep_minutes' ? (
              <BarChart data={points} margin={{ top: 10, right: 8, bottom: 2, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.18} />
                <XAxis dataKey="label" interval={interval} tick={axisTick} tickMargin={7} minTickGap={8} />
                <YAxis width={44} tick={axisTick} tickFormatter={value => axisValue(Number(value), metric)} />
                <Tooltip
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.date ?? ''}
                  formatter={value => [formatValue(Number(value), metric), 'Sono']}
                  contentStyle={{ borderRadius: '0.75rem', borderColor: 'var(--border-default)', background: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                />
                <Bar dataKey="value" name="Sono" fill={chartColor} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            ) : (
              <LineChart data={points} margin={{ top: 10, right: 8, bottom: 2, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.18} />
                <XAxis dataKey="label" interval={interval} tick={axisTick} tickMargin={7} minTickGap={8} />
                <YAxis width={44} tick={axisTick} tickFormatter={value => axisValue(Number(value), metric)} />
                <Tooltip
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.date ?? ''}
                  formatter={value => [formatValue(Number(value), metric), 'Passos']}
                  contentStyle={{ borderRadius: '0.75rem', borderColor: 'var(--border-default)', background: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                />
                <Line type="monotone" dataKey="value" name="Passos" stroke={chartColor} strokeWidth={3} dot={{ r: 3, fill: chartColor, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Cobertura: <strong>{coverageLabel(summary.count, points.length)}</strong></p>
    </section>
  )
}

export function DashboardCoverage({ rows, metric, startDate, endDate, loading = false, error = false }: {
  rows: DashboardMetric[]
  metric: SeriesMetric
  startDate: string
  endDate: string
  loading?: boolean
  error?: boolean
}) {
  const points = useMemo(() => buildSeries(rows, metric, startDate, endDate), [rows, metric, startDate, endDate])
  const summary = useMemo(() => numericSummary(points), [points])
  const last = [...points].reverse().find(point => point.value != null)?.value ?? null

  if (loading || error) {
    return (
      <div className="space-y-3" aria-label="Resumo da cobertura do período">
        <section className={`${trendCardClass} min-h-32`}>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{TREND_METRICS[metric]}</h3>
          <p role="status" className={`mt-2 text-sm ${error ? 'text-rose-700 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'}`}>{error ? 'Histórico indisponível.' : 'Carregando dados…'}</p>
        </section>
        <section className={`${trendCardClass} min-h-32`}>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Dias com dados</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{error ? 'Cobertura indisponível.' : 'Calculando cobertura…'}</p>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-3" aria-label="Resumo da cobertura do período">
      <section className={`${trendCardClass} min-h-32`} aria-label={`Média de ${TREND_METRICS[metric]}`}>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{TREND_METRICS[metric]}</h3>
        <p className="mt-1 text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{formatValue(summary.average, metric)}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">Média do período</p>
        <p className="mt-3 border-t border-slate-200 pt-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">Última medição: <strong>{formatValue(last, metric)}</strong></p>
      </section>
      <section className={`${trendCardClass} min-h-32`} aria-label="Dias com dados no período">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Dias com dados</h3>
        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{summary.count} de {points.length}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">dias no período selecionado</p>
      </section>
    </div>
  )
}

export function DashboardMetricTile({ metric, rows, selectedDate, range, loading = false, error = false }: {
  metric: 'sleep_minutes' | 'steps'
  rows: DashboardMetric[]
  selectedDate: string
  range: { startDate: string; endDate: string }
  loading?: boolean
  error?: boolean
}) {
  const latest = rows.find(row => row.date_ref === selectedDate)
  const value = latest?.[metric]
  const points = useMemo(() => buildSeries(rows, metric, range.startDate, range.endDate), [rows, metric, range.startDate, range.endDate])
  const summary = useMemo(() => numericSummary(points), [points])
  const displayed = error
    ? 'Falha ao carregar'
    : typeof value !== 'number' || !Number.isFinite(value)
      ? 'Sem registro'
      : metric === 'sleep_minutes'
        ? formatValue(value, metric)
        : `${numberFormat(value, 0)} passos`

  return (
    <section className="min-w-0 overflow-hidden rounded-radius-xl border border-violet-200 bg-white p-4 shadow-xs dark:border-violet-900/60 dark:bg-slate-900" aria-label={metric === 'sleep_minutes' ? 'Sono' : 'Passos'}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{TREND_METRICS[metric]}</h3>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">{loading ? 'Carregando…' : displayed}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{selectedDate}</p>
        </div>
        <div className="h-16 w-2/5 min-w-20 max-w-36 text-violet-600 dark:text-violet-400">
          {loading || error || summary.count === 0 ? <div aria-hidden="true" className="h-full" /> : (
            <ResponsiveContainer width="100%" height="100%">
              {metric === 'steps' ? (
                <BarChart data={points}>
                  <Bar dataKey="value" fill="currentColor" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              ) : (
                <LineChart data={points}>
                  <Line type="monotone" dataKey="value" stroke="currentColor" strokeWidth={2.5} dot={false} activeDot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">Cobertura: {coverageLabel(summary.count, points.length)}</p>
    </section>
  )
}
