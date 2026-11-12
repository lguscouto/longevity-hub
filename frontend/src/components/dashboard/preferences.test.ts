import { beforeEach, describe, expect, it } from 'vitest'
import {
  DASHBOARD_STORAGE_KEY,
  defaultDashboardLayout,
  readDashboardPreferences,
} from './preferences'
import { buildSeries } from './DashboardSeries'
import { calendarRange } from './dateRange'

describe('preferências de dashboards', () => {
  beforeEach(() => localStorage.clear())

  it('abre a Visão atual por padrão e mantém as composições separadas', () => {
    expect(readDashboardPreferences().active).toBe('classic')
    const saved = {
      active: 'trends',
      layouts: {
        day: defaultDashboardLayout('day'),
        trends: { ...defaultDashboardLayout('trends'), trendMetric: 'sleep_minutes' },
        modular: defaultDashboardLayout('modular'),
      },
    }
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(saved))

    const read = readDashboardPreferences()
    expect(read.active).toBe('trends')
    expect(read.layouts.trends.trendMetric).toBe('sleep_minutes')
    expect(read.layouts.day.widgets).toEqual(defaultDashboardLayout('day').widgets)
    expect(read.layouts.modular.widgets).toEqual(defaultDashboardLayout('modular').widgets)
  })

  it('restaura somente o modelo com configuração inválida', () => {
    const trends = defaultDashboardLayout('trends')
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify({
      active: 'modular',
      layouts: {
        day: { widgets: [{ id: 'inventado', area: 'main', width: 'full' }], trendMetric: 'hrv_ms' },
        trends: { ...trends, trendMetric: 'sleep_minutes' },
        modular: defaultDashboardLayout('modular'),
      },
    }))

    const read = readDashboardPreferences()
    expect(read.active).toBe('modular')
    expect(read.layouts.day).toEqual(defaultDashboardLayout('day'))
    expect(read.layouts.trends.trendMetric).toBe('sleep_minutes')
  })

  it('calcula intervalo inclusivo e mantém lacunas e zero medido', () => {
    expect(calendarRange('2024-03-01', 7)).toEqual({ startDate: '2024-02-24', endDate: '2024-03-01' })
    const points = buildSeries([
      { date_ref: '2024-02-24', steps: 0 },
      { date_ref: '2024-02-26', steps: 3200 },
      { date_ref: '2024-03-02', steps: 9000 },
    ], 'steps', '2024-02-24', '2024-02-26')

    expect(points).toEqual([
      { date: '2024-02-24', label: expect.any(String), value: 0 },
      { date: '2024-02-25', label: expect.any(String), value: null },
      { date: '2024-02-26', label: expect.any(String), value: 3200 },
    ])
  })
})
