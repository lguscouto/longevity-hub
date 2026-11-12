import type { ReactNode } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button, Select } from '../ui'
import { DateNavigator } from '../DateNavigator'
import { DASHBOARD_MODELS, type CustomModel, type DashboardLayout, type DashboardModel, type WidgetArea, type WidgetId } from './preferences'

function formatDashboardDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const parsed = new Date(year, month - 1, day, 12)
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface CustomDashboardProps {
  model: CustomModel
  layout: DashboardLayout
  selectedDate: string
  daysRange: number
  onDateChange: (date: string) => void
  onDaysRangeChange: (days: number) => void
  onModelChange: (model: DashboardModel) => void
  renderWidget: (id: WidgetId) => ReactNode
  storageError?: boolean
  metricLoadError?: string | null
  onRetry?: () => void
  onCustomize: () => void
}

export function CustomDashboard({
  model,
  layout,
  selectedDate,
  daysRange,
  onDateChange,
  onDaysRangeChange,
  onModelChange,
  renderWidget,
  storageError = false,
  metricLoadError,
  onRetry,
  onCustomize,
}: CustomDashboardProps) {
  const count = layout.widgets.length
  const renderArea = (area: WidgetArea) => layout.widgets.filter(widget => widget.area === area).map(widget => (
    <div
      key={widget.id}
      className={model === 'modular' && widget.width === 'full' ? 'sm:col-span-2' : ''}
      data-dashboard-widget={widget.id}
    >
      {renderWidget(widget.id)}
    </div>
  ))

  const rootStyle = model === 'day'
    ? 'dashboard-theme-day'
    : model === 'trends'
      ? 'dashboard-theme-trends'
      : 'dashboard-theme-modular'
  const headingStyle = model === 'day'
    ? 'font-serif text-3xl font-semibold tracking-tight text-emerald-950 sm:text-5xl dark:text-emerald-50'
    : model === 'trends'
      ? 'text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50'
      : 'text-2xl font-bold tracking-tight text-violet-950 sm:text-4xl dark:text-violet-50'

  return (
    <section
      aria-label={DASHBOARD_MODELS[model]}
      data-testid={`dashboard-${model}`}
      className={`min-w-0 space-y-5 rounded-radius-xl border p-3 sm:p-5 ${rootStyle}`}
    >
      <div className="flex flex-col gap-3 border-b border-slate-300/70 pb-4 dark:border-slate-700/80 lg:flex-row lg:items-center lg:justify-between">
        <DateNavigator
          compact
          rangeAccent={model === 'day' ? 'emerald' : model === 'trends' ? 'cyan' : 'violet'}
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          daysRange={daysRange}
          onDaysRangeChange={onDaysRangeChange}
        />

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center lg:max-w-md">
          <div className="min-w-0 flex-1 space-y-1">
            <label htmlFor="dashboard-model" className="sr-only">Modelo</label>
            <Select
              id="dashboard-model"
              aria-label="Modelo"
              value={model}
              onChange={event => onModelChange(event.target.value as DashboardModel)}
              className={`min-h-10 ${model === 'modular' ? 'border-violet-300 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/40' : model === 'trends' ? 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900' : 'border-amber-200 bg-white dark:border-emerald-900 dark:bg-slate-900'}`}
            >
              {Object.entries(DASHBOARD_MODELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </div>
          <Button
            variant={model === 'trends' ? 'outline' : 'primary'}
            onClick={onCustomize}
            leftIcon={model === 'trends' ? SlidersHorizontal : undefined}
            className={model === 'modular' ? 'border-violet-700 bg-violet-700 text-white hover:bg-violet-800' : model === 'trends' ? 'border-cyan-600 text-cyan-700 dark:border-cyan-400 dark:text-cyan-300' : ''}
          >Personalizar</Button>
        </div>
      </div>

      {storageError && (
        <p role="status" className="text-xs text-amber-800 dark:text-amber-300">Não foi possível salvar as preferências neste navegador.</p>
      )}

      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{formatDashboardDate(selectedDate)}</p>
        <h2 className={headingStyle}>{DASHBOARD_MODELS[model]}</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
          {model === 'day' && 'Orientação, sinais do dia e contexto em uma leitura rápida.'}
          {model === 'trends' && 'Compare suas medições no período selecionado; datas sem registro permanecem como lacunas.'}
          {model === 'modular' && 'Indicadores e ferramentas organizados em cartões que você pode ajustar.'}
        </p>
      </header>

      {metricLoadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-radius-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-900 dark:text-rose-100">
          <span>{metricLoadError}</span>
          {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Tentar novamente</Button>}
        </div>
      )}

      {count === 0 ? (
        <div className="surface-card rounded-radius-xl p-6 text-center">
          <p className="font-semibold text-slate-900 dark:text-slate-100">Seu painel está vazio.</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Adicione widgets para montar a composição deste modelo.</p>
          <Button className="mt-4" onClick={onCustomize}>Abrir personalização</Button>
        </div>
      ) : model === 'day' ? (
        <div className="grid min-w-0 items-start gap-5 lg:grid-cols-3">
          <section className="min-w-0 space-y-5 lg:col-span-2" aria-label="Conteúdo principal do dia">
            <h3 className="sr-only">Principal</h3>
            {renderArea('main')}
          </section>
          <aside className="min-w-0 space-y-4 border-t border-amber-300/70 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0 dark:border-emerald-900/60" aria-label="Contexto e rotina do dia">
            <h3 className="sr-only">Lateral</h3>
            {renderArea('side')}
          </aside>
        </div>
      ) : model === 'trends' ? (
        <div className="min-w-0 space-y-5">
          <div className="grid min-w-0 items-start gap-4 lg:grid-cols-3">
            <section className="min-w-0 lg:col-span-2" aria-label="Gráfico em destaque">
              <h3 className="sr-only">Gráfico principal</h3>
              <div className="space-y-4">{renderArea('main')}</div>
            </section>
            <aside className="min-w-0" aria-label="Resumo e indicadores do período">
              <h3 className="sr-only">Resumo do período</h3>
              <div className="space-y-3">{renderArea('side')}</div>
            </aside>
          </div>
          <section aria-label="Outros históricos">
            <h3 className="sr-only">Histórico de sono e passos</h3>
            <div className="grid min-w-0 items-start gap-4 md:grid-cols-2">{renderArea('below')}</div>
          </section>
        </div>
      ) : (
        <section aria-label="Widgets do painel modular">
          <div className="grid min-w-0 items-start gap-4 sm:grid-cols-2">{renderArea('main')}</div>
        </section>
      )}
    </section>
  )
}
