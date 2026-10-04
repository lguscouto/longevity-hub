import React from 'react';
import {
  ShieldCheck,
  Activity,
  RefreshCw,
  Dumbbell,
  CheckCircle2,
} from 'lucide-react';
import { ProfileData } from './ProfileTypes';
import { StatusBadge, Button } from '../ui';

export interface ProfileIntegrationsSectionProps {
  profile: ProfileData;
  onOpenGoogleHealthModal?: () => void;
  onSyncZepp?: (full?: boolean) => void;
  isSyncingZepp?: boolean;
  onSyncGoogleHealth?: () => void;
  isSyncingGoogle?: boolean;
}

export const ProfileIntegrationsSection: React.FC<ProfileIntegrationsSectionProps> = ({
  profile,
  onOpenGoogleHealthModal,
  onSyncZepp,
  isSyncingZepp = false,
  onSyncGoogleHealth,
  isSyncingGoogle = false,
}) => {
  return (
    <div className="space-y-6 animate-fadeIn" role="region" aria-label="Integrações e dispositivos">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          Fontes de dados e dispositivos conectados
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Conecte sensores e dispositivos para sincronizar métricas de frequência cardíaca, sono e recuperação.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Zepp OS */}
        <div className="p-5 rounded-radius-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-radius-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Activity className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Zepp OS (Amazfit)</h4>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    ● Coleta de Sensores Ativa
                  </span>
                </div>
              </div>
              <StatusBadge variant="success">Conectado</StatusBadge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              Origem principal para frequência cardíaca de repouso, HRV, fases do sono e passos.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            {onSyncZepp && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onSyncZepp(false)}
                loading={isSyncingZepp}
                loadingText="Sincronizando..."
                leftIcon={RefreshCw}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
              >
                Sincronizar Zepp
              </Button>
            )}
            {onSyncZepp && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onSyncZepp(true)}
                disabled={isSyncingZepp}
              >
                Sincronizar tudo
              </Button>
            )}
          </div>
        </div>

        {/* Card Google Health Connect */}
        <div className="p-5 rounded-radius-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-radius-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Google Health</h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Pixel Watch e Health Connect · API v4
                  </span>
                </div>
              </div>
              {profile.google_connected ? (
                <StatusBadge variant="success">Conectado</StatusBadge>
              ) : (
                <StatusBadge variant="neutral">Não Conectado</StatusBadge>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              Sincronização de biomarcadores adicionais, agregação de dispositivos e redundância dos dados.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            {profile.google_connected ? (
              <>
                {onSyncGoogleHealth && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onSyncGoogleHealth}
                    loading={isSyncingGoogle}
                    loadingText="Sincronizando..."
                    leftIcon={RefreshCw}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
                  >
                    Sincronizar Google Health
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onOpenGoogleHealthModal}
                >
                  Configurações Google
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenGoogleHealthModal}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
              >
                Conectar Google Health
              </Button>
            )}
          </div>
        </div>

        {/* Card Hevy */}
        <div className="p-5 rounded-radius-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between md:col-span-2">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-radius-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Dumbbell className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Hevy (Treinos de Força)</h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Cargas, séries e volume muscular
                  </span>
                </div>
              </div>
              <StatusBadge variant="info">API Ativa</StatusBadge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              Importação contínua de treinos de musculação e hipertrofia para cálculo de carga crônica e manutenção da massa magra.
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Gerenciado nas Configurações Centrais</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Pronto para sincronização
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
