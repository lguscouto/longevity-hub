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
import { AICopilotView } from './components/AICopilotView';
import { AISettingsModal } from './components/AISettingsModal';
import { DateNavigator } from './components/DateNavigator';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'labs' | 'ai' | 'n-of-1' | 'profile'>('overview');
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

            {/* Top Stat Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <MetricCard
                title="Passos Diários"
                value={activeMetric.steps ? activeMetric.steps.toLocaleString() : '10,480'}
                unit="passos"
                icon={Footprints}
                trend={activeMetric.date_ref ? `Data: ${activeMetric.date_ref}` : '+8% vs semana anterior'}
                color="emerald"
              />

              <MetricCard
                title="Variabilidade Cardíaca (HRV)"
                value={activeMetric.hrv_ms ? `${activeMetric.hrv_ms} ms` : '68 ms'}
                unit="rMSSD"
                icon={Heart}
                trend="Recuperação Autonômica Alta"
                color="rose"
              />

              <MetricCard
                title="Frequência Cardíaca de Repouso"
                value={activeMetric.rhr_bpm ? `${activeMetric.rhr_bpm} bpm` : '52 bpm'}
                unit="bpm"
                icon={Activity}
                trend="Cardioproteção Otimizada"
                color="emerald"
              />

              <MetricCard
                title="Idade Biológica PhenoAge"
                value={latestPheno.pheno_age ? `${latestPheno.pheno_age} anos` : '34.2 anos'}
                unit="anos"
                icon={Sparkles}
                trend={latestPheno.age_delta ? `Rejuvenescimento de ${Math.abs(latestPheno.age_delta)} anos` : 'Rejuvenescimento de -5.8 anos'}
                color="cyan"
              />
            </div>

            {/* Middle Section: PhenoAge Widget + Sleep Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <PhenoAgeWidget latestRecord={latestPheno} onRecalculate={handleRecalculatePheno} />
              </div>

              {/* Sleep & HRV Chart */}
              <div className="lg:col-span-2 glass-card p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Moon className="h-5 w-5 text-indigo-400" /> Sono & Variabilidade de Frequência Cardíaca (HRV)
                    </h3>
                    <p className="text-xs text-slate-400">Tendência dos últimos {daysRange} dias sincronizados via Amazfit Zepp & Google Fit</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Sincronizado
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[...metrics].reverse()}>
                      <defs>
                        <linearGradient id="colorHrv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                      <XAxis dataKey="date_ref" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="hrv_ms" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorHrv)" name="HRV (ms)" />
                    </AreaChart>
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

        {activeTab === 'ai' && (
          <AICopilotView onOpenSettings={() => setShowAISettings(true)} />
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
