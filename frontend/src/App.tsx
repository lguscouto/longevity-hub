import React, { useState, useEffect } from 'react';
import {
  Activity, Heart, Flame, Moon, Footprints, Scale, Zap, Shield,
  Award, TrendingUp, Sparkles, AlertCircle, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, BarChart, Bar, LineChart, Line, Legend
} from 'recharts';

import { Header } from './components/Header';
import { MetricCard } from './components/MetricCard';
import { PhenoAgeWidget } from './components/PhenoAgeWidget';
import { LabResultsTable } from './components/LabResultsTable';
import { NOf1Tracker } from './components/NOf1Tracker';
import { CGMDashboard } from './components/CGMDashboard';
import { DoctorBriefingModal } from './components/DoctorBriefingModal';
import { ManualEntryModal } from './components/ManualEntryModal';
import { SyncProgressModal } from './components/SyncProgressModal';
import { ProfileView } from './components/ProfileView';
import { AICopilotView } from './components/AICopilotView';
import { AISettingsModal } from './components/AISettingsModal';
import { DateNavigator } from './components/DateNavigator';
import { SupplementsView } from './components/SupplementsView';
import { DailyComplianceWidget } from './components/DailyComplianceWidget';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'labs' | 'supplements' | 'ai' | 'n-of-1' | 'profile'>('overview');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [daysRange, setDaysRange] = useState<number>(30);

  const [metrics, setMetrics] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [phenoHistory, setPhenoHistory] = useState<any[]>([]);
  const [experiments, setExperiments] = useState<any[]>([]);
  const [cgmSummaries, setCgmSummaries] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>({
    name: 'Paciente Longevidade',
    chronological_age: 40.0,
    height_cm: 170.0,
    current_weight_kg: 72.5,
    target_weight_kg: 75.0
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const [showManualModal, setShowManualModal] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const [doctorBriefingMd, setDoctorBriefingMd] = useState('');

  const [aiChatMessages, setAiChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'Olá! Sou o seu Copiloto de Inteligência de Longevidade. Analiso continuamente seus biomarcadores de exames, idade epigenética PhenoAge, curvas de glicemia CGM e variabilidade cardíaca (HRV) para guiar seu protocolo. Como posso ajudar hoje?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const fetchAllData = async () => {
    try {
      const [resMetrics, resLabs, resPheno, resExp, resCgm, resProf] = await Promise.all([
        fetch(`/api/metrics?days=${daysRange}`).then(r => r.json()),
        fetch('/api/labs').then(r => r.json()),
        fetch('/api/phenoage/history').then(r => r.json()),
        fetch('/api/n-of-1').then(r => r.json()),
        fetch('/api/cgm/summary').then(r => r.json()),
        fetch('/api/profile').then(r => r.json())
      ]);

      setMetrics(resMetrics || []);
      setLabs(resLabs || []);
      setPhenoHistory(resPheno || []);
      setExperiments(resExp || []);
      setCgmSummaries(resCgm || []);
      if (resProf) setProfile(resProf);
    } catch (err) {
      console.error("Erro ao carregar dados da API:", err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [daysRange]);

  const latestMetric = metrics[0] || {};
  const activeMetric = metrics.find(m => m.date_ref === selectedDate) || latestMetric;
  const latestPheno = phenoHistory[0] || {};

  const handleSyncZepp = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    setIsSyncModalOpen(true);

    try {
      const res = await fetch('/api/metrics/sync/zepp', { method: 'POST' });
      const data = await res.json();
      setSyncResult(data);
      if (data.status === 'ok') {
        await fetchAllData();
      }
    } catch (err) {
      setSyncResult({ status: 'error', message: 'Falha ao conectar com o serviço de importação do Zepp.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRecalculatePheno = async (inputData: any) => {
    try {
      const res = await fetch('/api/phenoage/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData)
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateExperiment = async (expData: any) => {
    try {
      const res = await fetch('/api/n-of-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expData)
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveMetric = async (entry: any) => {
    try {
      const res = await fetch('/api/metrics/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      if (res.ok) {
        setShowManualModal(false);
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddBatchLabs = async (recordsToSave: any[]) => {
    try {
      const res = await fetch('/api/labs/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chronological_age: profile.chronological_age || 40.0,
          records: recordsToSave
        })
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProfile = async (updatedData: any) => {
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDoctorBriefing = async () => {
    try {
      const res = await fetch('/api/reports/doctor-briefing');
      const data = await res.json();
      if (data && data.markdown) {
        setDoctorBriefingMd(data.markdown);
        setShowDoctorModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatSleepStr = (mins?: number) => {
    if (!mins) return '4h 30m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
      <Header
        activeTab={activeTab}
        setActiveTab={(t: any) => setActiveTab(t)}
        onSyncZepp={handleSyncZepp}
        onOpenManualEntry={() => setShowManualModal(true)}
        onOpenDoctorBriefing={handleOpenDoctorBriefing}
        onOpenAISettings={() => setShowAISettings(true)}
        isSyncing={isSyncing}
      />

      <main className="max-w-7xl mx-auto px-6 space-y-8">
        {activeTab === 'overview' && (
          <>
            {/* Navegador de Datas & Filtro de Período */}
            <DateNavigator
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              daysRange={daysRange}
              onDaysRangeChange={setDaysRange}
            />

            {/* Top 6 Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <MetricCard
                title="PASSOS 24H"
                value={activeMetric.steps ? activeMetric.steps.toLocaleString() : '4.100'}
                unit="passos"
                icon={Footprints}
                subtitle="Meta: 10.000"
                color="emerald"
              />

              <MetricCard
                title="RHR REPOUSO"
                value={activeMetric.rhr_bpm ? `${activeMetric.rhr_bpm} bpm` : '68 bpm'}
                icon={Heart}
                subtitle="Alvo: < 55 bpm"
                color="rose"
              />

              <MetricCard
                title="HRV NOTURNA"
                value={activeMetric.hrv_ms ? `${activeMetric.hrv_ms} ms` : '30 ms'}
                icon={Activity}
                subtitle="Variabilidade FC"
                color="cyan"
              />

              <MetricCard
                title="SONO TOTAL"
                value={formatSleepStr(activeMetric.sleep_minutes)}
                icon={Moon}
                subtitle="Monitorado"
                color="violet"
              />

              <MetricCard
                title="VO2 MAX"
                value={activeMetric.vo2_max ? `${activeMetric.vo2_max} mL/kg/min` : '41.08 mL/kg/min'}
                icon={Flame}
                subtitle="Capacidade Cardiorespiratória"
                color="amber"
              />

              <MetricCard
                title="PRESSÃO ARTERIAL"
                value={activeMetric.systolic_bp && activeMetric.diastolic_bp ? `${activeMetric.systolic_bp}/${activeMetric.diastolic_bp}` : '(Sem dados)'}
                icon={Shield}
                subtitle="Use +Registrar para aferir"
                color="emerald"
              />
            </div>

            {/* Middle Section 1: PhenoAge Widget + Daily Compliance Score Widget */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <PhenoAgeWidget latestRecord={latestPheno} onRecalculate={handleRecalculatePheno} />
              </div>
              <div className="lg:col-span-2">
                <DailyComplianceWidget selectedDate={selectedDate} />
              </div>
            </div>

            {/* Middle Section 2: 2 Gráficos Lado a Lado (HRV vs RHR + Fases do Sono) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico 1: HRV vs RHR */}
              <div className="glass-card p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Activity className="h-5 w-5 text-cyan-400" /> HRV (Variabilidade FC) vs RHR (Repouso)
                    </h3>
                    <p className="text-xs text-slate-400">Recuperação do sistema nervoso autônomo ({daysRange}d)</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    Zepp / Amazfit
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[...metrics].reverse()}>
                      <defs>
                        <linearGradient id="colorHrv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                      <XAxis dataKey="date_ref" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="hrv_ms" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorHrv)" name="HRV (ms)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 2: Distribuição de Fases do Sono */}
              <div className="glass-card p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Moon className="h-5 w-5 text-indigo-400" /> Distribuição de Fases do Sono
                    </h3>
                    <p className="text-xs text-slate-400">Minutos em Sono Profundo, REM e Leve ({daysRange}d)</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Monitoramento
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...metrics].reverse()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                      <XAxis dataKey="date_ref" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="sleep_deep_min" stackId="a" fill="#8b5cf6" name="Sono Profundo (min)" />
                      <Bar dataKey="sleep_rem_min" stackId="a" fill="#06b6d4" name="Sono REM (min)" />
                      <Bar dataKey="sleep_light_min" stackId="a" fill="#475569" name="Sono Leve (min)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* CGM Section */}
            <CGMDashboard summaries={cgmSummaries} onRefreshData={fetchAllData} />
          </>
        )}

        {activeTab === 'labs' && (
          <LabResultsTable labs={labs} onAddBatchLabs={handleAddBatchLabs} onRefreshData={fetchAllData} />
        )}

        {activeTab === 'supplements' && (
          <SupplementsView selectedDate={selectedDate} />
        )}

        {activeTab === 'ai' && (
          <AICopilotView
            onOpenSettings={() => setShowAISettings(true)}
            chatMessages={aiChatMessages}
            setChatMessages={setAiChatMessages}
          />
        )}

        {activeTab === 'n-of-1' && (
          <NOf1Tracker experiments={experiments} onCreateExperiment={handleCreateExperiment} />
        )}

        {activeTab === 'profile' && (
          <ProfileView profile={profile} onUpdateProfile={handleUpdateProfile} />
        )}
      </main>

      {/* Modals */}
      <AISettingsModal
        isOpen={showAISettings}
        onClose={() => setShowAISettings(false)}
        onRefreshSettings={fetchAllData}
      />

      <SyncProgressModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        isSyncing={isSyncing}
        syncResult={syncResult}
      />

      <ManualEntryModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSaveMetric={handleSaveMetric}
      />

      <DoctorBriefingModal
        isOpen={showDoctorModal}
        onClose={() => setShowDoctorModal(false)}
        markdownContent={doctorBriefingMd}
      />
    </div>
  );
}
