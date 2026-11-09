import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Sparkles,
  Calendar,
  UserCheck,
  Target,
  Dumbbell,
  AlertCircle,
} from 'lucide-react';
import { Button, Input, Textarea, useToast } from '../ui';
import {
  TrainerFeedback,
  TrainerGoalItem,
  TrainerFeedbackCategory,
  FEEDBACK_CATEGORY_LABELS,
  TRAINER_STORAGE_KEY_FEEDBACKS,
  TRAINER_STORAGE_KEY_GOALS,
  formatDateBr,
} from './types';

const INITIAL_GOALS: TrainerGoalItem[] = [
  { id: 'g1', label: 'Registrar fotos a cada 30-45 dias no mesmo horário e iluminação', completed: true },
  { id: 'g2', label: 'Manter frequência semanal de 4 a 5 treinos de força', completed: false },
  { id: 'g3', label: 'Priorizar progressão de carga em exercícios multiarticulares', completed: false },
  { id: 'g4', label: 'Monitorar hidratação mínima diária de 35ml/kg', completed: false },
];

export const PersonalTrainerNotes: React.FC = () => {
  const { showToast } = useToast();

  const [feedbacks, setFeedbacks] = useState<TrainerFeedback[]>(() => {
    try {
      const saved = localStorage.getItem(TRAINER_STORAGE_KEY_FEEDBACKS);
      if (saved) return JSON.parse(saved);
    } catch {
      // noop
    }
    return [
      {
        id: 'fb-initial-1',
        created_at: new Date().toISOString(),
        category: 'hypertrophy',
        author: 'Personal Trainer',
        title: 'Diretrizes de Hipertrofia e Postura',
        content:
          'Evolução nítida no tônus de membros superiores e dorsais. Para o próximo mesociclo, vamos focar em aumentar o volume de posteriores de coxa e manter a consistência de cardio pós-treino (15-20 min em Z2).',
      },
    ];
  });

  const [goals, setGoals] = useState<TrainerGoalItem[]>(() => {
    try {
      const saved = localStorage.getItem(TRAINER_STORAGE_KEY_GOALS);
      if (saved) return JSON.parse(saved);
    } catch {
      // noop
    }
    return INITIAL_GOALS;
  });

  // Salvar no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(TRAINER_STORAGE_KEY_FEEDBACKS, JSON.stringify(feedbacks));
    } catch {
      // noop
    }
  }, [feedbacks]);

  useEffect(() => {
    try {
      localStorage.setItem(TRAINER_STORAGE_KEY_GOALS, JSON.stringify(goals));
    } catch {
      // noop
    }
  }, [goals]);

  // Form State para Novo Feedback
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [author, setAuthor] = useState<'Personal Trainer' | 'Aluno'>('Personal Trainer');
  const [category, setCategory] = useState<TrainerFeedbackCategory>('hypertrophy');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [newGoalText, setNewGoalText] = useState('');

  const filteredFeedbacks = feedbacks.filter(fb => {
    if (selectedCategoryFilter === 'all') return true;
    return fb.category === selectedCategoryFilter;
  });

  const handleAddFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showToast({
        title: 'Campos incompletos',
        message: 'Por favor, preencha o título e o conteúdo da anotação.',
        type: 'error',
      });
      return;
    }

    const newEntry: TrainerFeedback = {
      id: `fb-${Date.now()}`,
      created_at: new Date().toISOString(),
      category,
      author,
      title: title.trim(),
      content: content.trim(),
    };

    setFeedbacks(prev => [newEntry, ...prev]);
    setTitle('');
    setContent('');
    setShowAddForm(false);
    showToast({
      title: 'Anotação salva',
      message: 'Diretriz do personal registrada com sucesso.',
      type: 'success',
    });
  };

  const handleDeleteFeedback = (id: string) => {
    setFeedbacks(prev => prev.filter(f => f.id !== id));
    showToast({
      title: 'Anotação removida',
      message: 'A anotação foi excluída.',
      type: 'info',
    });
  };

  const handleToggleGoal = (id: string) => {
    setGoals(prev =>
      prev.map(g => (g.id === id ? { ...g, completed: !g.completed } : g))
    );
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    const item: TrainerGoalItem = {
      id: `g-${Date.now()}`,
      label: newGoalText.trim(),
      completed: false,
    };
    setGoals(prev => [...prev, item]);
    setNewGoalText('');
  };

  const handleDeleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Metas & Checklist do Ciclo */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              Metas e Compromissos para o Próximo Ciclo
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Checklist alinhado entre o personal trainer e o aluno para a próxima avaliação física.
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {goals.filter(g => g.completed).length} de {goals.length} concluídas
          </div>
        </div>

        {/* Goals List */}
        <div className="space-y-2">
          {goals.map(goal => (
            <div
              key={goal.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                goal.completed
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-600 dark:text-slate-400'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
              }`}
            >
              <button
                type="button"
                onClick={() => handleToggleGoal(goal.id)}
                className="flex items-center gap-2.5 text-left text-xs font-medium flex-1 cursor-pointer focus-visible:outline-none"
              >
                {goal.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-400 shrink-0" />
                )}
                <span className={goal.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}>
                  {goal.label}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleDeleteGoal(goal.id)}
                className="p-1 text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                title="Excluir meta"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Goal Input */}
        <form onSubmit={handleAddGoal} className="flex items-center gap-2 pt-2">
          <Input
            value={newGoalText}
            onChange={e => setNewGoalText(e.target.value)}
            placeholder="Adicionar nova meta ou foco de treino..."
            className="text-xs"
          />
          <Button type="submit" variant="secondary" size="sm" leftIcon={Plus} className="text-xs shrink-0">
            Adicionar Meta
          </Button>
        </form>
      </div>

      {/* Histórico de Pareceres e Anotações Técnicas */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              Pareceres e Orientações Técnicas do Treinador
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Registros técnicos, análises de postura, ajustes de prescrição e feedbacks após cada avaliação.
            </p>
          </div>

          {!showAddForm && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setShowAddForm(true)}
              leftIcon={Plus}
              className="text-xs font-semibold self-start sm:self-auto"
            >
              Nova Anotação Técnica
            </Button>
          )}
        </div>

        {/* Add Feedback Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddFeedback}
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 space-y-3.5 animate-fadeIn"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Registrar Parecer / Recomendação
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Autor da Anotação:
                </label>
                <select
                  value={author}
                  onChange={e => setAuthor(e.target.value as any)}
                  className="w-full text-xs font-medium py-1.5 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Personal Trainer">Personal Trainer</option>
                  <option value="Aluno">Aluno / Paciente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Categoria do Parecer:
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full text-xs font-medium py-1.5 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="hypertrophy">Foco em Hipertrofia</option>
                  <option value="fat_loss">Definição & Queima</option>
                  <option value="posture">Postura & Mobilidade</option>
                  <option value="target">Meta para Próxima Avaliação</option>
                  <option value="general">Parecer Geral</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Título do Feedback:
              </label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Ajuste de volume de dorsais e deltoides"
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Conteúdo / Orientações Detalhadas:
              </label>
              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Descreva a evolução observada, correções de postura, cadência ou cargas..."
                rows={4}
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)} className="text-xs">
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" className="text-xs font-bold">
                Salvar Parecer
              </Button>
            </div>
          </form>
        )}

        {/* Category Filters */}
        {feedbacks.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-slate-400 font-medium mr-1">Filtrar:</span>
            {[
              { id: 'all', label: `Todos (${feedbacks.length})` },
              { id: 'hypertrophy', label: 'Hipertrofia' },
              { id: 'fat_loss', label: 'Definição' },
              { id: 'posture', label: 'Postura' },
              { id: 'target', label: 'Metas' },
              { id: 'general', label: 'Geral' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedCategoryFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategoryFilter === f.id
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Feedback Cards List */}
        {feedbacks.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
            Nenhum parecer técnico registrado ainda. Clique em "Nova Anotação Técnica" para registrar seu feedback.
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
            Nenhuma anotação técnica encontrada para a categoria selecionada.
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredFeedbacks.map(fb => (
              <div
                key={fb.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-2 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                      {FEEDBACK_CATEGORY_LABELS[fb.category] || fb.category}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Por: {fb.author}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDateBr(fb.created_at)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteFeedback(fb.id)}
                    className="text-slate-400 hover:text-rose-500 transition-colors self-end sm:self-auto p-1"
                    title="Excluir anotação"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {fb.title}
                </h4>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {fb.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
