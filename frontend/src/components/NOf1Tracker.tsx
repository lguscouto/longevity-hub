import React, { useState } from 'react';
import { FlaskConical, Plus, CheckCircle2, AlertCircle, TrendingUp, BarChart2, Scale } from 'lucide-react';
import { ConfounderBalanceModal } from './contextInsights/ConfounderBalanceModal';
import { EmptyState, Modal, Button, FormField, Input, Select } from './ui';
import { formatLocalDateKey } from '../lib/formatters';

interface NOf1Experiment {
  id?: number;
  title: string;
  hypothesis?: string;
  metric_key: string;
  control_start: string;
  control_end: string;
  treatment_start: string;
  treatment_end: string;
  control_mean?: number;
  treatment_mean?: number;
  cohens_d?: number;
  p_value?: number;
  statistically_significant?: number | boolean;
  status?: string;
}

interface NOf1TrackerProps {
  experiments: NOf1Experiment[];
  onCreateExperiment: (expData: any) => void;
}

export const NOf1Tracker: React.FC<NOf1TrackerProps> = ({ experiments, onCreateExperiment }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedExperimentForBalance, setSelectedExperimentForBalance] = useState<NOf1Experiment | null>(null);
  const todayStr = formatLocalDateKey();
  const [formData, setFormData] = useState({
    title: '',
    hypothesis: '',
    metric_key: 'hrv_ms',
    control_start: todayStr,
    control_end: todayStr,
    treatment_start: todayStr,
    treatment_end: todayStr,
    status: 'em_andamento'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateExperiment(formData);
    setShowModal(false);
  };

  const inputClass = "w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white font-medium focus:border-violet-500 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none";

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-violet-600 dark:text-violet-400" /> Experimentos N-of-1 (A/B Testing Pessoal)
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">Validação estatística rigorosa (14d Controle vs 14d Intervenção) com d de Cohen e p-value</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowModal(true)}
          leftIcon={Plus}
          className="bg-violet-600 hover:bg-violet-500 w-full sm:w-auto shrink-0"
        >
          Criar Experimento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {experiments.length === 0 ? (
          <div className="col-span-2">
            <EmptyState
              icon={FlaskConical}
              title="Nenhum experimento N-of-1 ativo"
              description="Teste causalmente o efeito de um novo suplemento, treino ou rotina de sono sobre seus biomarcadores usando rigor estatístico N-of-1."
              action={{
                label: 'Criar Experimento',
                onClick: () => setShowModal(true),
                icon: Plus,
              }}
            />
          </div>
        ) : (
          experiments.map((exp, idx) => {
            const isSig = Boolean(exp.statistically_significant);
            return (
              <div key={idx} className="glass-card rounded-2xl p-5 border border-violet-500/20 bg-white dark:bg-slate-900 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs uppercase font-bold text-violet-600 dark:text-violet-400 tracking-wider">Métrica: {exp.metric_key}</span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{exp.title}</h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${isSig ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'}`}>
                    {isSig ? 'Significativo (p < 0.05)' : 'Em andamento'}
                  </span>
                </div>

                {exp.hypothesis && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 mb-4 bg-slate-100/90 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    💡 <strong className="text-slate-900 dark:text-slate-200">Hipótese:</strong> {exp.hypothesis}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 text-center text-xs bg-slate-50 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Média Controle</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{exp.control_mean ?? '--'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Média Intervenção</span>
                    <span className="font-bold text-violet-700 dark:text-violet-300">{exp.treatment_mean ?? '--'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Efeito (Cohen's d)</span>
                    <span className="font-bold text-cyan-700 dark:text-cyan-400">{exp.cohens_d ?? '--'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">p-value</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">{exp.p_value ?? '--'}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {exp.control_start} → {exp.treatment_end}
                  </span>
                  {exp.id && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedExperimentForBalance(exp)}
                      leftIcon={Scale}
                      className="text-violet-700 dark:text-violet-300 text-xs py-1"
                    >
                      Balanço de Confundidores
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Criar Experimento N-of-1"
        size="lg"
        icon={
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 shrink-0">
            <FlaskConical className="h-5 w-5" />
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <FormField id="nof1-title" label="Título do Experimento" required>
            <Input
              id="nof1-title"
              type="text"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              required
            />
          </FormField>

          <FormField id="nof1-hypothesis" label="Hipótese">
            <Input
              id="nof1-hypothesis"
              type="text"
              value={formData.hypothesis}
              onChange={e => setFormData({...formData, hypothesis: e.target.value})}
            />
          </FormField>

          <FormField id="nof1-metric" label="Métrica Testada">
            <Select
              id="nof1-metric"
              value={formData.metric_key}
              onChange={e => setFormData({...formData, metric_key: e.target.value})}
            >
              <option value="hrv_ms">HRV (Variabilidade da Frequência Cardíaca)</option>
              <option value="sleep_deep_min">Sono Profundo (minutos)</option>
              <option value="sleep_rem_min">Sono REM (minutos)</option>
              <option value="rhr_bpm">Frequência Cardíaca de Repouso (RHR)</option>
              <option value="readiness_score">Readiness Score</option>
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField id="nof1-control-start" label="Início Controle (14d)">
              <Input
                id="nof1-control-start"
                type="date"
                value={formData.control_start}
                onChange={e => setFormData({...formData, control_start: e.target.value})}
              />
            </FormField>
            <FormField id="nof1-control-end" label="Fim Controle">
              <Input
                id="nof1-control-end"
                type="date"
                value={formData.control_end}
                onChange={e => setFormData({...formData, control_end: e.target.value})}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField id="nof1-treatment-start" label="Início Intervenção (14d)">
              <Input
                id="nof1-treatment-start"
                type="date"
                value={formData.treatment_start}
                onChange={e => setFormData({...formData, treatment_start: e.target.value})}
              />
            </FormField>
            <FormField id="nof1-treatment-end" label="Fim Intervenção">
              <Input
                id="nof1-treatment-end"
                type="date"
                value={formData.treatment_end}
                onChange={e => setFormData({...formData, treatment_end: e.target.value})}
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowModal(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="bg-violet-600 hover:bg-violet-500"
            >
              Criar &amp; Analisar
            </Button>
          </div>
        </form>
      </Modal>

      {selectedExperimentForBalance && (
        <ConfounderBalanceModal
          isOpen={true}
          onClose={() => setSelectedExperimentForBalance(null)}
          experimentId={selectedExperimentForBalance.id}
          experimentTitle={selectedExperimentForBalance.title}
        />
      )}
    </div>
  );
};

