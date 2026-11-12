export const DASHBOARD_STORAGE_KEY = 'longevidade_dashboard_preferences_v1'

export const DASHBOARD_MODELS = {
  classic: 'Visão atual',
  day: 'Dia em foco',
  trends: 'Tendências',
  modular: 'Painel modular',
} as const

export const WIDGET_LABELS = {
  guidance: 'Orientação do dia',
  metrics: 'Indicadores do dia',
  checkin: 'Check-in',
  routine: 'Rotina',
  training: 'Carga de treino',
  energy: 'Energia e ritmo',
  age: 'Idade biológica',
  glucose: 'Glicemia',
  sleep: 'Sono',
  steps: 'Passos',
  chart: 'Gráfico principal',
  coverage: 'Resumo do período',
  sleepChart: 'Histórico de sono',
  stepsChart: 'Histórico de passos',
} as const

export const TREND_METRICS = {
  hrv_ms: 'VFC',
  sleep_minutes: 'Sono',
  steps: 'Passos',
  rhr_bpm: 'Frequência cardíaca de repouso',
} as const

export type DashboardModel = keyof typeof DASHBOARD_MODELS
export type CustomModel = Exclude<DashboardModel, 'classic'>
export type WidgetId = keyof typeof WIDGET_LABELS
export type TrendMetric = keyof typeof TREND_METRICS
export type WidgetArea = 'main' | 'side' | 'below'
export type WidgetWidth = 'normal' | 'full'

export type DashboardWidget = { id: WidgetId; area: WidgetArea; width: WidgetWidth }
export type DashboardLayout = { widgets: DashboardWidget[]; trendMetric: TrendMetric }
export type DashboardPreferences = {
  active: DashboardModel
  layouts: Record<CustomModel, DashboardLayout>
}

export const AREA_LABELS: Record<WidgetArea, string> = {
  main: 'Principal',
  side: 'Lateral',
  below: 'Inferior',
}

export function dashboardAreas(model: CustomModel): WidgetArea[] {
  if (model === 'trends') return ['main', 'side', 'below']
  if (model === 'day') return ['main', 'side']
  return ['main']
}

export function widgetCatalog(model: CustomModel): WidgetId[] {
  const ids = Object.keys(WIDGET_LABELS) as WidgetId[]
  return model === 'trends' ? ids : ids.filter(id => !['chart', 'coverage', 'sleepChart', 'stepsChart'].includes(id))
}

export function defaultDashboardLayout(model: CustomModel): DashboardLayout {
  const presets: Record<CustomModel, Partial<Record<WidgetArea, WidgetId[]>>> = {
    day: { main: ['guidance', 'metrics'], side: ['checkin', 'routine', 'training'] },
    trends: { main: ['chart'], side: ['coverage'], below: ['sleepChart', 'stepsChart'] },
    modular: { main: ['sleep', 'steps', 'glucose', 'checkin'] },
  }
  const widgets = dashboardAreas(model).flatMap(area =>
    (presets[model][area] ?? []).map((id): DashboardWidget => ({ id, area, width: 'normal' })),
  )
  return { widgets, trendMetric: 'hrv_ms' }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function parseLayout(value: unknown, model: CustomModel): DashboardLayout {
  const fallback = defaultDashboardLayout(model)
  if (!isRecord(value) || !Array.isArray(value.widgets)) return fallback
  if (typeof value.trendMetric !== 'string' || !hasOwn(TREND_METRICS, value.trendMetric)) return fallback

  const catalog = new Set<string>(widgetCatalog(model))
  const areas = new Set<string>(dashboardAreas(model))
  const used = new Set<string>()
  const widgets: DashboardWidget[] = []
  for (const entry of value.widgets as unknown[]) {
    if (!isRecord(entry)) return fallback
    const { id, area, width } = entry
    if (typeof id !== 'string' || !catalog.has(id) || used.has(id)) return fallback
    if (typeof area !== 'string' || !areas.has(area)) return fallback
    if (width !== 'normal' && width !== 'full') return fallback
    widgets.push({ id: id as WidgetId, area: area as WidgetArea, width })
    used.add(id)
  }
  return { widgets, trendMetric: value.trendMetric as TrendMetric }
}

export function readDashboardPreferences(): DashboardPreferences {
  let stored: unknown
  try {
    stored = JSON.parse(localStorage.getItem(DASHBOARD_STORAGE_KEY) ?? 'null')
  } catch {
    stored = null
  }
  const active = isRecord(stored) && typeof stored.active === 'string' && hasOwn(DASHBOARD_MODELS, stored.active)
    ? stored.active as DashboardModel : 'classic'
  const layouts = isRecord(stored) && isRecord(stored.layouts) ? stored.layouts : {}
  return {
    active,
    layouts: {
      day: parseLayout(layouts.day, 'day'),
      trends: parseLayout(layouts.trends, 'trends'),
      modular: parseLayout(layouts.modular, 'modular'),
    },
  }
}
