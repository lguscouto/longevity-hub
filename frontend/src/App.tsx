import React, { useState, useEffect } from 'react';
import {
  Activity, Heart, Flame, Moon, Footprints, Scale, Zap, Shield,
  Award, TrendingUp, Sparkles, AlertCircle, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, BarChart, Bar, LineChart, Line
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

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'labs' | 'n-of-1' | 'profile'>('overview');
  const [metrics, setMetrics] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [phenoHistory, setPhenoHistory] = useState<any[]>([]);
  const [experiments, setExperiments] = useState<any[]>([]);
  const [cgmSummaries, setCgmSummaries] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>({
    name: 'Paciente Longevidade',
    email: 'googlefit@longevidade.local',
    birthdate: '1986-07-28',
    chronological_age: 40.0,
    height_cm: 178.0,
    target_weight_kg: 75.0,
    gender: 'Masculino',
    google_connected: true,
    source: 'Google Fit'
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const [showManualModal, setShowManualModal] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [doctorBriefingMd, setDoctorBriefingMd] = useState('');

  const fetchAllData = async () => {
    try {
      const [mRes, lRes, pRes, expRes, cgmRes, profRes] = await Promise.all([
        fetch('/api/metrics?days=30').then(r => r.json()),
        fetch('/api/labs').then(r => r.json()),
        fetch('/api/phenoage/history').then(r => r.json()),
        fetch('/api/n-of-1').then(r => r.json()),
        fetch('/api/cgm/summary').then(r => r.json()),
        fetch('/api/profile').then(r => r.json()),
      ]);

      if (Array.isArray(mRes)) setMetrics(mRes);
      if (Array.isArray(lRes)) setLabs(lRes);
      if (Array.isArray(pRes)) setPhenoHistory(pRes);
      if (Array.isArray(expRes)) setExperiments(expRes);
      if (Array.isArray(cgmRes)) setCgmSummaries(cgmRes);
      if (profRes && typeof profRes === 'object') setProfile(profRes);
    } catch (err) {
      console.warn("API offline ou aguardando sincronização de dados:", err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSyncZepp = async () => {
    setIsSyncing(true);
    setIsSyncModalOpen(true);
    setSyncResult(null);

    try {
      const res = await fetch('/api/metrics/sync/zepp', { method: 'POST' }).then(r => r.json());
      setSyncResult(res);
      await fetchAllData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveMetric = async (data: any) => {
    try {
      await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      await fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecalculatePhenoAge = async (data: any) => {
    try {
      const res = await fetch('/api/phenoage/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json());

      if (res && res.result) {
        setPhenoHistory((prev) => [
          {
            pheno_age: res.result.pheno_age,
            chronological_age: res.result.chronological_age,
            age_delta: res.result.age_delta,
            calculated_at: new Date().toISOString().slice(0, 10)
          },
          ...prev
        ]);
      }
      await fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddBatchLabs = async (records: any[]) => {
    try {
      await fetch('/api/labs/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chronological_age: profile.chronological_age || 40, records })
      });
      await fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateExperiment = async (expData: any) => {
    try {
      await fetch('/api/n-of-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expData)
      });
      await fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateProfile = async (updatedData: any) => {
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      await fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenDoctorBriefing = async () => {
    try {
      const res = await fetch('/api/reports/doctor-briefing').then(r => r.json());
      setDoctorBriefingMd(res.markdown || '');
      setShowDoctorModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  const latestMetric = metrics[0] || {};
  const reversedMetrics = [...metrics].reverse();

  return (
    <div className="min-h-screen pb-16">
      <Header
        activeTab={activeTab}
        setActiveTab={(t: any) => setActiveTab(t)}
        onSyncZepp={handleSyncZepp}
        onOpenManualEntry={() => setShowManualModal(true)}
        onOpenDoctorBriefing={handleOpenDoctorBriefing}
        isSyncing={isSyncing}
      />

      <main className="max-w-7xl mx-auto px-6 space-y-8">
        {/* PhenoAge Top Banner Widget */}
        <PhenoAgeWidget
          latestRecord={phenoHistory[0]}
          onRecalculate={handleRecalculatePhenoAge}
        />

        {activeTab === 'overview' && (
          <>
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              <MetricCard
                title="Passos 24h"
                value={latestMetric.steps !== undefined && latestMetric.steps !== null ? latestMetric.steps.toLocaleString('pt-BR') : '(Sem dados)'}
                unit={latestMetric.steps ? "passos" : ""}
                subtitle={latestMetric.steps ? "Meta: 10.000" : "Sincronize o Zepp"}
                icon={Footprints}
                color="emerald"
              />
              <MetricCard
                title="RHR Repouso"
                value={latestMetric.rhr_bpm ? Math.round(latestMetric.rhr_bpm) : '(Sem dados)'}
                unit={latestMetric.rhr_bpm ? "bpm" : ""}
                subtitle={latestMetric.rhr_bpm ? "Alvo: < 55 bpm" : "Sem aferição"}
                icon={Heart}
                color="rose"
              />
              <MetricCard
                title="HRV Noturna"
                value={latestMetric.hrv_ms ? Math.round(latestMetric.hrv_ms) : '(Sem dados)'}
                unit={latestMetric.hrv_ms ? "ms" : ""}
                subtitle={latestMetric.hrv_ms ? "Variabilidade FC" : "Sem aferição"}
                icon={Activity}
                color="cyan"
              />
              <MetricCard
                title="Sono Total"
                value={latestMetric.sleep_minutes ? `${Math.floor(latestMetric.sleep_minutes / 60)}h ${latestMetric.sleep_minutes % 60}m` : '(Sem dados)'}
                subtitle={latestMetric.sleep_minutes ? "Monitorado" : "Sem aferição"}
                icon={Moon}
                color="violet"
              />
              <MetricCard
                title="VO2 Max"
                value={latestMetric.vo2_max ? latestMetric.vo2_max : '(Sem dados)'}
                unit={latestMetric.vo2_max ? "mL/kg/min" : ""}
                subtitle={latestMetric.vo2_max ? "Capacidade Cardiorrespiratória" : "Sem aferição"}
                icon={Flame}
                color="amber"
              />
              <MetricCard
                title="Pressão Arterial"
                value={latestMetric.systolic_bp && latestMetric.diastolic_bp ? `${latestMetric.systolic_bp}/${latestMetric.diastolic_bp}` : '(Sem dados)'}
                unit={latestMetric.systolic_bp ? "mmHg" : ""}
                subtitle={latestMetric.systolic_bp ? "Aferição Recente" : "Use +Registrar para aferir"}
                icon={Shield}
                color="emerald"
              />
            </div>

            {/* Time Series Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* HRV & RHR Trend */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Activity className="h-4 w-4 text-cyan-400" /> HRV (Variabilidade FC) vs RHR (Repouso)
                    </h3>
                    <p className="text-xs text-slate-400">Recuperação do sistema nervoso autônomo</p>
                  </div>
                </div>
                <div className="h-64">
                  {reversedMetrics.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={reversedMetrics}>
                        <defs>
                          <linearGradient id="hrvGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                        <XAxis dataKey="date_ref" stroke="#64748B" fontSize={10} />
                        <YAxis stroke="#64748B" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px' }} />
                        <Area type="monotone" dataKey="hrv_ms" name="HRV (ms)" stroke="#06B6D4" fillOpacity={1} fill="url(#hrvGrad)" strokeWidth={2} />
                        <Line type="monotone" dataKey="rhr_bpm" name="RHR (bpm)" stroke="#F43F5E" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 text-xs font-medium">
                      (Sem dados registrados para este gráfico. Clique em "Sync Zepp" para importar)
                    </div>
                  )}
                </div>
              </div>

              {/* Sleep Stages */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Moon className="h-4 w-4 text-violet-400" /> Distribuição de Fases do Sono
                    </h3>
                    <p className="text-xs text-slate-400">Minutos em Sono Profundo, REM e Leve</p>
                  </div>
                </div>
                <div className="h-64">
                  {reversedMetrics.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reversedMetrics}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                        <XAxis dataKey="date_ref" stroke="#64748B" fontSize={10} />
                        <YAxis stroke="#64748B" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px' }} />
                        <Bar dataKey="sleep_deep_min" name="Profundo (min)" stackId="a" fill="#8B5CF6" />
                        <Bar dataKey="sleep_rem_min" name="REM (min)" stackId="a" fill="#06B6D4" />
                        <Bar dataKey="sleep_light_min" name="Leve (min)" stackId="a" fill="#334155" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 text-xs font-medium">
                      (Sem dados registrados para este gráfico. Clique em "Sync Zepp" para importar)
                    </div>
                  )}
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

        {activeTab === 'n-of-1' && (
          <NOf1Tracker experiments={experiments} onCreateExperiment={handleCreateExperiment} />
        )}

        {activeTab === 'profile' && (
          <ProfileView profile={profile} onUpdateProfile={handleUpdateProfile} />
        )}
      </main>

      {/* Modals */}
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
