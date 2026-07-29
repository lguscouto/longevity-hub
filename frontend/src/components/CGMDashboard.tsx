import React, { useRef, useState } from 'react';
import { Activity, Zap, ArrowUpRight, ArrowDownRight, FileSpreadsheet, Download } from 'lucide-react';

interface CGMSummary {
  date_ref: string;
  mean_glucose: number;
  glucose_sd?: number;
  cv_pct?: number;
  time_in_range_pct?: number;
  time_above_range_pct?: number;
  time_below_range_pct?: number;
  total_readings: number;
}

interface CGMDashboardProps {
  summaries: CGMSummary[];
  onRefreshData?: () => void;
}

export const CGMDashboard: React.FC<CGMDashboardProps> = ({ summaries, onRefreshData }) => {
  const latest = summaries[0];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/cgm/upload-csv', {
        method: 'POST',
        body: formData
      }).then(r => r.json());

      if (res.status === 'ok') {
        setMessage(res.message);
        if (onRefreshData) onRefreshData();
      } else {
        setMessage('Erro ao importar CSV');
      }
    } catch (err) {
      console.error(err);
      setMessage('Falha na requisição de upload do CSV');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportCSV = () => {
    window.open('/api/cgm/export-csv', '_blank');
  };

  return (
    <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" /> Glicemia Contínua (CGM - Continuous Glucose Monitor)
          </h3>
          <p className="text-xs text-slate-400">Variabilidade glicêmica, Média de 24h e Tempo no Alvo de Longevidade (70-140 mg/dL)</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition glow-amber"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isUploading ? 'Importando...' : 'Importar CSV Libre / Dexcom'}
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Download className="h-4 w-4 text-cyan-400" /> Exportar CSV
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-slate-900/60">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Glicemia Média 24h</span>
          <div className="text-2xl font-extrabold text-amber-400 mt-1">
            {latest ? `${latest.mean_glucose} mg/dL` : '(Sem dados)'}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Alvo Blueprint: &lt; 90 mg/dL</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-slate-900/60">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Time-In-Range (70-140)</span>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">
            {latest ? `${latest.time_in_range_pct}%` : '(Sem dados)'}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Alvo Longevidade: &gt; 95%</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-slate-900/60">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Variabilidade (CV %)</span>
          <div className="text-2xl font-extrabold text-cyan-400 mt-1">
            {latest ? `${latest.cv_pct}%` : '(Sem dados)'}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Alvo Estabilidade: &lt; 15%</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-slate-900/60">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Total de Leituras</span>
          <div className="text-2xl font-extrabold text-slate-200 mt-1">
            {latest ? `${latest.total_readings}` : '(Sem dados)'}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Sensor Ativo 24/7</span>
        </div>
      </div>
    </div>
  );
};
