import React, { useState, useEffect } from 'react';
import {
  Footprints,
  RefreshCw,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { requestJson } from '../../lib/api';
import { formatLastSyncDisplay } from '../../lib/formatters';
import {
  StepsAnalyticsResponse,
  StepsChartRange,
  formatDateBR,
} from './types';
import { StepsSummaryCards } from './StepsSummaryCards';
import { StepsTrendChart } from './StepsTrendChart';
import { StepsWeeklyBreakdown } from './StepsWeeklyBreakdown';
import { StepsMonthlyTable } from './StepsMonthlyTable';
import { DailyStepsTable } from './DailyStepsTable';
import { Button, LoadingIndicator, ErrorState } from '../ui';

export interface DailyStepsViewProps {
  onSyncZepp?: () => void;
  isSyncingZepp?: boolean;
}

export const DailyStepsView: React.FC<DailyStepsViewProps> = ({
  onSyncZepp,
  isSyncingZepp = false,
}) => {
  const [data, setData] = useState<StepsAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState<StepsChartRange>('30d');

  const fetchStepsAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await requestJson<StepsAnalyticsResponse>('/api/steps/analytics').catch(() =>
        requestJson<StepsAnalyticsResponse>('/api/metrics/steps/analytics')
      );
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar estatísticas de passos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStepsAnalytics();
  }, []);

  const handleSyncAndRefresh = async () => {
    if (onSyncZepp) {
      await onSyncZepp();
    }
    await fetchStepsAnalytics();
  };

  if (loading && !data) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-3">
        <LoadingIndicator label="Carregando estatísticas e histórico de passos do Zepp..." size="md" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-8">
        <ErrorState
          title="Não foi possível carregar os passos"
          message={error}
          onRetry={fetchStepsAnalytics}
        />
      </div>
    );
  }

  if (!data) return null;

  const currentMonthData = data.monthly_stats.length > 0 ? data.monthly_stats[0] : undefined;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cabeçalho da Visão de Passos */}
      <div className="rounded-radius-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-radius-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Footprints className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Passos Diários & Atividade Física
                <span className="text-2xs font-bold px-2 py-0.5 rounded-radius-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  {data.zepp_sync_info.source}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Médias semanais, mensais, tendências e consistência cardiometabólica
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-2xs text-slate-500 dark:text-slate-400 pt-1 flex-wrap">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              {data.summary.total_days} dias sincronizados
            </span>
            {data.summary.avg_active_minutes != null && data.summary.avg_active_minutes > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  Média de <strong>{data.summary.avg_active_minutes} min ativos/dia</strong>
                </span>
              </>
            )}
            <span>•</span>
            <span>
              Última coleta Zepp:{' '}
              <strong className="text-slate-700 dark:text-slate-300 font-mono">
                {data.zepp_sync_info.last_sync
                  ? formatLastSyncDisplay(data.zepp_sync_info.last_sync) ||
                    formatDateBR(data.zepp_sync_info.last_sync.split('T')[0])
                  : 'Registrada'}
              </strong>
            </span>
          </div>
        </div>

        {/* Botão Sincronizar Zepp */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSyncAndRefresh}
            disabled={isSyncingZepp || loading}
            leftIcon={RefreshCw}
            className={isSyncingZepp ? 'animate-pulse' : ''}
          >
            {isSyncingZepp ? 'Sincronizando Zepp...' : 'Sincronizar Zepp'}
          </Button>
        </div>
      </div>

      {/* Camada 1: Top KPI Summary Cards */}
      <StepsSummaryCards
        summary={data.summary}
        trend={data.trend}
        currentMonth={currentMonthData}
      />

      {/* Camada 2: Gráfico Interativo de Tendências */}
      <StepsTrendChart
        dailyRecords={data.daily_records}
        range={chartRange}
        onRangeChange={setChartRange}
        defaultGoal={data.summary.default_goal}
      />

      {/* Camada 3: Médias Semanais, Padrão por Dia da Semana & Perfil Horário Zepp */}
      <StepsWeeklyBreakdown
        weeklyStats={data.weekly_stats}
        weekdayAverages={data.weekday_averages}
        hourlyDistribution={data.hourly_distribution}
        targetGoal={data.summary.default_goal}
      />

      {/* Camada 4: Médias Mensais & Histórico Consolidado */}
      <StepsMonthlyTable monthlyStats={data.monthly_stats} />

      {/* Camada 5: Tabela de Registros Diários Detalhados */}
      <DailyStepsTable
        records={data.daily_records}
        targetGoal={data.summary.default_goal}
      />
    </div>
  );
};
