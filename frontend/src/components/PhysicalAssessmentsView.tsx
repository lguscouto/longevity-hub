import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Calendar, Scale, Activity, Plus, Trash2, ArrowLeftRight, Eye, ShieldCheck, Upload, AlertCircle, X, ChevronRight, CheckCircle2, ChevronLeft, RefreshCw, Pencil } from 'lucide-react';

export interface Photo {
  id: string;
  assessment_id: string;
  angle: 'front' | 'back' | 'left_side' | 'right_side' | 'other';
  body_state?: 'relaxed' | 'flexed' | 'unspecified';
  description?: string;
  original_filename?: string;
  stored_filename: string;
  relative_path: string;
  mime_type: string;
  file_size: number;
  sha256: string;
  width?: number;
  height?: number;
  display_order: number;
  created_at: string;
  content_url: string;
}

export interface PhysicalAssessment {
  id: string;
  assessment_date: string;
  title?: string;
  weight_kg?: number;
  body_fat_percentage?: number;
  waist_cm?: number;
  abdomen_cm?: number;
  hip_cm?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  photos: Photo[];
}

export interface ComparisonManifest {
  previous_assessment: Partial<PhysicalAssessment>;
  current_assessment: Partial<PhysicalAssessment>;
  days_between: number;
  deltas: {
    weight_kg?: number | null;
    body_fat_percentage?: number | null;
    waist_cm?: number | null;
    abdomen_cm?: number | null;
    hip_cm?: number | null;
  };
  matched_photos: {
    angle: string;
    previous_photo?: Photo | null;
    current_photo?: Photo | null;
  }[];
}

interface NewPhotoDraft {
  file: File;
  previewUrl: string;
  angle: 'front' | 'back' | 'left_side' | 'right_side' | 'other';
  body_state: 'relaxed' | 'flexed' | 'unspecified';
  description: string;
}

const ANGLE_LABELS: Record<string, string> = {
  front: 'Frente',
  back: 'Costas',
  left_side: 'Lado Esquerdo',
  right_side: 'Lado Direito',
  other: 'Outro',
};

const BODY_STATE_LABELS: Record<string, string> = {
  relaxed: 'Relaxado',
  flexed: 'Contraído',
  unspecified: 'Não informado',
};

export const PhysicalAssessmentsView: React.FC = () => {
  const [assessments, setAssessments] = useState<PhysicalAssessment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'history' | 'create' | 'details' | 'compare'>('history');

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [comparisonManifest, setComparisonManifest] = useState<ComparisonManifest | null>(null);

  // Selection for comparison
  const [comparePrevId, setComparePrevId] = useState<string>('');
  const [compareCurrId, setCompareCurrId] = useState<string>('');
  const [compareLoading, setCompareLoading] = useState<boolean>(false);

  // Form State
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formWeight, setFormWeight] = useState<string>('');
  const [formBodyFat, setFormBodyFat] = useState<string>('');
  const [formWaist, setFormWaist] = useState<string>('');
  const [formAbdomen, setFormAbdomen] = useState<string>('');
  const [formHip, setFormHip] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [photoDrafts, setPhotoDrafts] = useState<NewPhotoDraft[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Lightbox
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);

  // Additional Upload modal in Details
  const [showAddPhotosModal, setShowAddPhotosModal] = useState<boolean>(false);
  const [detailsPhotoDrafts, setDetailsPhotoDrafts] = useState<NewPhotoDraft[]>([]);

  // Edit Assessment Modal State
  const [editingAssessment, setEditingAssessment] = useState<PhysicalAssessment | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editWeight, setEditWeight] = useState<string>('');
  const [editBodyFat, setEditBodyFat] = useState<string>('');
  const [editWaist, setEditWaist] = useState<string>('');
  const [editAbdomen, setEditAbdomen] = useState<string>('');
  const [editHip, setEditHip] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchAssessments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/physical-assessments');
      if (!res.ok) throw new Error('Falha ao carregar histórico de avaliações físicas');
      const data = await res.json();
      setAssessments(data);
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido ao buscar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  // Cleanup blob object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      photoDrafts.forEach(d => URL.revokeObjectURL(d.previewUrl));
      detailsPhotoDrafts.forEach(d => URL.revokeObjectURL(d.previewUrl));
    };
  }, [photoDrafts, detailsPhotoDrafts]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isDetails: boolean = false) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    addFilesToDrafts(files, isDetails);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, isDetails: boolean = false) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files);
      addFilesToDrafts(files, isDetails);
    }
  };

  const addFilesToDrafts = (files: File[], isDetails: boolean) => {
    const validExtensions = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const newDrafts: NewPhotoDraft[] = [];

    files.forEach((file, idx) => {
      if (!validExtensions.includes(file.type)) {
        alert(`O arquivo ${file.name} não é uma imagem suportada (JPEG, PNG, WebP).`);
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        alert(`O arquivo ${file.name} excede o limite de 15 MB.`);
        return;
      }

      // Auto-assign default angle based on index
      let defaultAngle: 'front' | 'back' | 'left_side' | 'right_side' | 'other' = 'other';
      if (idx === 0) defaultAngle = 'front';
      else if (idx === 1) defaultAngle = 'back';
      else if (idx === 2) defaultAngle = 'left_side';
      else if (idx === 3) defaultAngle = 'right_side';

      newDrafts.push({
        file,
        previewUrl: URL.createObjectURL(file),
        angle: defaultAngle,
        body_state: 'relaxed',
        description: '',
      });
    });

    if (isDetails) {
      setDetailsPhotoDrafts(prev => [...prev, ...newDrafts]);
    } else {
      setPhotoDrafts(prev => [...prev, ...newDrafts]);
    }
  };

  const removeDraft = (index: number, isDetails: boolean = false) => {
    if (isDetails) {
      setDetailsPhotoDrafts(prev => {
        URL.revokeObjectURL(prev[index].previewUrl);
        return prev.filter((_, i) => i !== index);
      });
    } else {
      setPhotoDrafts(prev => {
        URL.revokeObjectURL(prev[index].previewUrl);
        return prev.filter((_, i) => i !== index);
      });
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate) {
      alert('A data da avaliação é obrigatória.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create Assessment Record
      const payload = {
        assessment_date: formDate,
        title: formTitle || undefined,
        weight_kg: formWeight ? parseFloat(formWeight) : undefined,
        body_fat_percentage: formBodyFat ? parseFloat(formBodyFat) : undefined,
        waist_cm: formWaist ? parseFloat(formWaist) : undefined,
        abdomen_cm: formAbdomen ? parseFloat(formAbdomen) : undefined,
        hip_cm: formHip ? parseFloat(formHip) : undefined,
        notes: formNotes || undefined,
      };

      const res = await fetch('/api/physical-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || 'Erro ao criar avaliação');
      }

      const created = await res.json();

      // 2. Upload photos if any
      if (photoDrafts.length > 0) {
        for (const draft of photoDrafts) {
          const formData = new FormData();
          formData.append('files', draft.file);
          formData.append('angle', draft.angle);
          formData.append('body_state', draft.body_state);
          if (draft.description) formData.append('description', draft.description);

          const photoRes = await fetch(`/api/physical-assessments/${created.id}/photos`, {
            method: 'POST',
            body: formData,
          });

          if (!photoRes.ok) {
            const errJson = await photoRes.json();
            console.error('Erro ao enviar foto:', errJson);
          }
        }
      }

      // Reset form & reload
      setPhotoDrafts([]);
      setFormTitle('');
      setFormWeight('');
      setFormBodyFat('');
      setFormWaist('');
      setFormAbdomen('');
      setFormHip('');
      setFormNotes('');
      await fetchAssessments();
      setActiveMode('history');
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar avaliação física');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadDetailsPhotos = async () => {
    if (!selectedAssessmentId || detailsPhotoDrafts.length === 0) return;
    setSubmitting(true);
    try {
      for (const draft of detailsPhotoDrafts) {
        const formData = new FormData();
        formData.append('files', draft.file);
        formData.append('angle', draft.angle);
        formData.append('body_state', draft.body_state);
        if (draft.description) formData.append('description', draft.description);

        const photoRes = await fetch(`/api/physical-assessments/${selectedAssessmentId}/photos`, {
          method: 'POST',
          body: formData,
        });

        if (!photoRes.ok) {
          const errJson = await photoRes.json();
          throw new Error(errJson.detail || 'Erro ao enviar foto');
        }
      }

      setDetailsPhotoDrafts([]);
      setShowAddPhotosModal(false);
      await fetchAssessments();
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar fotos adicionais');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    if (!confirm('Tem certeza de que deseja excluir esta avaliação física e todas as suas fotos permanentemente?')) {
      return;
    }
    try {
      const res = await fetch(`/api/physical-assessments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir avaliação');
      await fetchAssessments();
      if (selectedAssessmentId === id) {
        setSelectedAssessmentId(null);
        setActiveMode('history');
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir');
    }
  };

  const handleDeleteSinglePhoto = async (assessmentId: string, photoId: string) => {
    if (!confirm('Deseja remover esta foto permanentemente?')) return;
    try {
      const res = await fetch(`/api/physical-assessments/${assessmentId}/photos/${photoId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Falha ao remover foto');
      await fetchAssessments();
    } catch (err: any) {
      alert(err.message || 'Erro ao remover foto');
    }
  };

  const handleRunComparison = async () => {
    if (!comparePrevId || !compareCurrId) {
      alert('Selecione a avaliação anterior e a avaliação atual.');
      return;
    }
    if (comparePrevId === compareCurrId) {
      alert('Selecione duas avaliações diferentes para comparar.');
      return;
    }

    setCompareLoading(true);
    try {
      const res = await fetch(`/api/physical-assessments/compare?previous_id=${comparePrevId}&current_id=${compareCurrId}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || 'Erro ao gerar comparação');
      }
      const manifest = await res.json();
      setComparisonManifest(manifest);
    } catch (err: any) {
      alert(err.message || 'Erro ao comparar períodos');
    } finally {
      setCompareLoading(false);
    }
  };

  const handleOpenEditModal = (ass: PhysicalAssessment) => {
    setEditingAssessment(ass);
    setEditDate(ass.assessment_date || '');
    setEditTitle(ass.title || '');
    setEditWeight(ass.weight_kg !== undefined && ass.weight_kg !== null ? String(ass.weight_kg) : '');
    setEditBodyFat(ass.body_fat_percentage !== undefined && ass.body_fat_percentage !== null ? String(ass.body_fat_percentage) : '');
    setEditWaist(ass.waist_cm !== undefined && ass.waist_cm !== null ? String(ass.waist_cm) : '');
    setEditAbdomen(ass.abdomen_cm !== undefined && ass.abdomen_cm !== null ? String(ass.abdomen_cm) : '');
    setEditHip(ass.hip_cm !== undefined && ass.hip_cm !== null ? String(ass.hip_cm) : '');
    setEditNotes(ass.notes || '');
    setEditError(null);
  };

  const handleSaveEditAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssessment) return;

    setEditSubmitting(true);
    setEditError(null);

    const payload: Record<string, any> = {
      assessment_date: editDate,
      title: editTitle.trim() || undefined,
      weight_kg: editWeight !== '' ? parseFloat(editWeight) : null,
      body_fat_percentage: editBodyFat !== '' ? parseFloat(editBodyFat) : null,
      waist_cm: editWaist !== '' ? parseFloat(editWaist) : null,
      abdomen_cm: editAbdomen !== '' ? parseFloat(editAbdomen) : null,
      hip_cm: editHip !== '' ? parseFloat(editHip) : null,
      notes: editNotes.trim() || null,
    };

    try {
      const res = await fetch(`/api/physical-assessments/${editingAssessment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Erro ao atualizar avaliação física');
      }

      const updatedData: PhysicalAssessment = await res.json();

      setAssessments(prev => prev.map(a => (a.id === updatedData.id ? { ...a, ...updatedData } : a)));
      setEditingAssessment(null);
    } catch (err: any) {
      setEditError(err.message || 'Erro ao salvar alterações');
    } finally {
      setEditSubmitting(false);
    }
  };

  const selectedAssessment = assessments.find(a => a.id === selectedAssessmentId);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg">
              <Camera className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Avaliações Físicas & Registro Fotográfico</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Acompanhamento periódico de composição corporal, medidas antropométricas e evolução visual.
          </p>
        </div>

        {/* Sub-navigation Modes */}
        <div className="flex items-center gap-2 bg-slate-100/80 dark:bg-slate-900/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveMode('history')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeMode === 'history'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Eye className="h-4 w-4" /> Histórico ({assessments.length})
          </button>
          <button
            onClick={() => setActiveMode('create')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeMode === 'create'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Plus className="h-4 w-4" /> Nova Avaliação
          </button>
          <button
            onClick={() => {
              setActiveMode('compare');
              if (assessments.length >= 2 && (!comparePrevId || !compareCurrId)) {
                setComparePrevId(assessments[assessments.length - 1].id);
                setCompareCurrId(assessments[0].id);
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeMode === 'compare'
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <ArrowLeftRight className="h-4 w-4" /> Comparar Períodos
          </button>
        </div>
      </div>

      {/* Privacy Guarantee Alert */}
      <div className="glass-panel p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3 text-emerald-700 dark:text-emerald-400 text-sm">
        <ShieldCheck className="h-5 w-5 shrink-0" />
        <span>
          <strong>Privacidade Garantida:</strong> As fotos são salvas estritamente no seu armazenamento local e não são transmitidas automaticamente a nenhum provedor de Inteligência Artificial.
        </span>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="glass-panel p-12 text-center text-slate-400 rounded-2xl flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
          <p>Carregando avaliações físicas...</p>
        </div>
      )}

      {error && (
        <div className="glass-panel p-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 flex items-center gap-3">
          <AlertCircle className="h-6 w-6 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* MODE 1: HISTÓRICO */}
      {!loading && !error && activeMode === 'history' && (
        <div>
          {assessments.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
              <Camera className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-300 mb-1">Nenhuma avaliação cadastrada</h3>
              <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
                Registre sua primeira avaliação física para acompanhar fotos de frente, costas e lados, peso e percentual de gordura.
              </p>
              <button
                onClick={() => setActiveMode('create')}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-lg hover:shadow-emerald-500/20 transition-all inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Registrar Primeira Avaliação
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assessments.map(ass => {
                const frontPhoto = ass.photos.find(p => p.angle === 'front') || ass.photos[0];
                return (
                  <div
                    key={ass.id}
                    className="glass-panel rounded-2xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between group"
                  >
                    {/* Thumbnail Header */}
                    <div className="relative h-48 bg-slate-950 flex items-center justify-center overflow-hidden">
                      {frontPhoto ? (
                        <img
                          src={frontPhoto.content_url}
                          alt={`Avaliação ${ass.assessment_date}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center text-slate-600 gap-2">
                          <Camera className="h-10 w-10" />
                          <span className="text-xs">Sem fotos</span>
                        </div>
                      )}
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 font-medium flex items-center gap-1.5">
                        <Camera className="h-3.5 w-3.5 text-cyan-400" />
                        {ass.photos.length} {ass.photos.length === 1 ? 'foto' : 'fotos'}
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(ass.assessment_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </div>
                          {ass.weight_kg && (
                            <div className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {ass.weight_kg} kg
                            </div>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">
                          {ass.title || `Avaliação de ${new Date(ass.assessment_date + 'T00:00:00').toLocaleDateString('pt-BR')}`}
                        </h3>

                        {/* Badges for metrics */}
                        <div className="flex flex-wrap gap-2 text-xs text-slate-400 mb-3">
                          {ass.body_fat_percentage && (
                            <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded">
                              Gordura: <strong className="text-slate-200">{ass.body_fat_percentage}%</strong>
                            </span>
                          )}
                          {ass.waist_cm && (
                            <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded">
                              Cintura: <strong className="text-slate-200">{ass.waist_cm} cm</strong>
                            </span>
                          )}
                          {ass.notes && (
                            <p className="text-xs text-slate-400 line-clamp-2 mt-1 italic w-full">
                              "{ass.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-4">
                        <button
                          onClick={() => {
                            setSelectedAssessmentId(ass.id);
                            setActiveMode('details');
                          }}
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5 text-cyan-400" /> Ver Detalhes
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(ass)}
                          className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 text-slate-400 hover:text-amber-500 border border-slate-200 dark:border-slate-800 hover:border-amber-500/30 transition-all"
                          title="Editar avaliação"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAssessment(ass.id)}
                          className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-200 dark:border-slate-800 hover:border-rose-500/30 transition-all"
                          title="Excluir avaliação"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: NOVA AVALIAÇÃO */}
      {!loading && !error && activeMode === 'create' && (
        <form onSubmit={handleCreateAssessment} className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Calendar className="h-5 w-5 text-emerald-400" /> Dados Principais da Avaliação
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Data da Avaliação <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Título (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Início do cutting / Medição mensal"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 78.5"
                  value={formWeight}
                  onChange={e => setFormWeight(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Gordura Corporal (%)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 15.2"
                  value={formBodyFat}
                  onChange={e => setFormBodyFat(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Cintura (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Ex: 82.0"
                  value={formWaist}
                  onChange={e => setFormWaist(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Abdômen (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Ex: 85.0"
                  value={formAbdomen}
                  onChange={e => setFormAbdomen(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Quadril (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Ex: 96.0"
                  value={formHip}
                  onChange={e => setFormHip(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Observações Pessoais</label>
              <textarea
                rows={3}
                placeholder="Ex: Medição realizada em jejum pela manhã..."
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>
          </div>

          {/* Photo Dropzone & Preview */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Camera className="h-5 w-5 text-cyan-400" /> Fotografias Corporais
            </h3>

            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, false)}
              className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 bg-slate-950/50 rounded-2xl p-8 text-center transition-all cursor-pointer group"
            >
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={e => handleFileSelect(e, false)}
                className="hidden"
                id="photo-upload-input"
              />
              <label htmlFor="photo-upload-input" className="cursor-pointer block">
                <Upload className="h-10 w-10 text-slate-500 group-hover:text-cyan-400 mx-auto mb-3 transition-colors" />
                <p className="text-sm font-medium text-slate-200 mb-1">
                  Clique ou arraste e solte fotos corporais aqui
                </p>
                <p className="text-xs text-slate-400">
                  Formatos aceitos: JPEG, PNG, WebP (máx. 15 MB por imagem, até 20 fotos)
                </p>
              </label>
            </div>

            {/* Photo Drafts List */}
            {photoDrafts.length > 0 && (
              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-semibold text-slate-300">
                  Fotos Selecionadas ({photoDrafts.length}) — Classifique os ângulos:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {photoDrafts.map((draft, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex gap-4 items-center shadow-sm"
                    >
                      <img
                        src={draft.previewUrl}
                        alt="Draft"
                        className="w-20 h-24 object-cover rounded-lg border border-slate-700 shrink-0"
                      />
                      <div className="flex-1 space-y-2 text-xs">
                        <div>
                          <label className="block text-slate-400 mb-1">Ângulo Corporal</label>
                          <select
                            value={draft.angle}
                            onChange={e => {
                              const val = e.target.value as any;
                              setPhotoDrafts(prev => {
                                const copy = [...prev];
                                copy[idx].angle = val;
                                return copy;
                              });
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
                          >
                            <option value="front">Frente</option>
                            <option value="back">Costas</option>
                            <option value="left_side">Lado Esquerdo</option>
                            <option value="right_side">Lado Direito</option>
                            <option value="other">Outro</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1">Estado Corporal</label>
                          <select
                            value={draft.body_state}
                            onChange={e => {
                              const val = e.target.value as any;
                              setPhotoDrafts(prev => {
                                const copy = [...prev];
                                copy[idx].body_state = val;
                                return copy;
                              });
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
                          >
                            <option value="relaxed">Relaxado</option>
                            <option value="flexed">Contraído</option>
                            <option value="unspecified">Não informado</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeDraft(idx, false)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg"
                        title="Remover foto"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveMode('history')}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Salvar Avaliação Física
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* MODE 3: DETALHES DA AVALIAÇÃO */}
      {!loading && !error && activeMode === 'details' && selectedAssessment && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveMode('history')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all inline-flex items-center gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar ao Histórico
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenEditModal(selectedAssessment)}
                className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-medium transition-all inline-flex items-center gap-1.5"
              >
                <Pencil className="h-4 w-4" /> Editar Avaliação
              </button>
              <button
                onClick={() => setShowAddPhotosModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-medium shadow-md transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Adicionar Fotos
              </button>
              <button
                onClick={() => handleDeleteAssessment(selectedAssessment.id)}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-all inline-flex items-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" /> Excluir Registro
              </button>
            </div>
          </div>

          {/* Details Overview Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
              <div>
                <div className="text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(selectedAssessment.assessment_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedAssessment.title || `Avaliação Físico-Corporal`}
                </h2>
                {selectedAssessment.notes && (
                  <p className="text-slate-400 text-sm mt-2 italic">"{selectedAssessment.notes}"</p>
                )}
              </div>

              {/* Metrics Summary Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {selectedAssessment.weight_kg && (
                  <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-center shadow-sm">
                    <span className="text-slate-400 text-xs block">Peso</span>
                    <strong className="text-emerald-400 text-lg font-bold">{selectedAssessment.weight_kg} kg</strong>
                  </div>
                )}
                {selectedAssessment.body_fat_percentage && (
                  <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-center shadow-sm">
                    <span className="text-slate-400 text-xs block">% Gordura</span>
                    <strong className="text-cyan-400 text-lg font-bold">{selectedAssessment.body_fat_percentage}%</strong>
                  </div>
                )}
                {selectedAssessment.waist_cm && (
                  <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-center shadow-sm">
                    <span className="text-slate-400 text-xs block">Cintura</span>
                    <strong className="text-slate-200 text-lg font-bold">{selectedAssessment.waist_cm} cm</strong>
                  </div>
                )}
                {selectedAssessment.abdomen_cm && (
                  <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-center shadow-sm">
                    <span className="text-slate-400 text-xs block">Abdômen</span>
                    <strong className="text-slate-200 text-lg font-bold">{selectedAssessment.abdomen_cm} cm</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Photo Gallery Grid */}
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Camera className="h-4 w-4 text-cyan-400" /> Galeria de Fotografias ({selectedAssessment.photos.length})
            </h3>

            {selectedAssessment.photos.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-slate-800 text-slate-400 text-sm">
                Nenhuma foto anexada a esta avaliação.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {selectedAssessment.photos.map(photo => (
                  <div
                    key={photo.id}
                    className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col"
                  >
                    <img
                      src={photo.content_url}
                      alt={photo.description || photo.angle}
                      onClick={() => setLightboxPhoto(photo)}
                      className="w-full h-56 object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Badges Overlay */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900/80 backdrop-blur text-xs font-semibold text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-700">
                      {ANGLE_LABELS[photo.angle] || photo.angle}
                    </div>

                    <button
                      onClick={() => handleDeleteSinglePhoto(selectedAssessment.id, photo.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 dark:bg-slate-900/80 text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity border border-slate-200 dark:border-slate-700"
                      title="Excluir foto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                      <span>{BODY_STATE_LABELS[photo.body_state || 'unspecified']}</span>
                      <span>{(photo.file_size / 1024).toFixed(0)} KB</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 4: COMPARAR PERÍODOS LADO A LADO */}
      {!loading && !error && activeMode === 'compare' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-violet-400" /> Seleção de Períodos para Comparação
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Avaliação Anterior (Baseline)</label>
                <select
                  value={comparePrevId}
                  onChange={e => setComparePrevId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-violet-500"
                >
                  <option value="">Selecione a avaliação anterior...</option>
                  {assessments.map(a => (
                    <option key={a.id} value={a.id}>
                      {new Date(a.assessment_date + 'T00:00:00').toLocaleDateString('pt-BR')} — {a.title || 'Sem título'} ({a.weight_kg ? `${a.weight_kg}kg` : 'sem peso'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Avaliação Atual (Evolução)</label>
                <select
                  value={compareCurrId}
                  onChange={e => setCompareCurrId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-violet-500"
                >
                  <option value="">Selecione a avaliação recente...</option>
                  {assessments.map(a => (
                    <option key={a.id} value={a.id}>
                      {new Date(a.assessment_date + 'T00:00:00').toLocaleDateString('pt-BR')} — {a.title || 'Sem título'} ({a.weight_kg ? `${a.weight_kg}kg` : 'sem peso'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleRunComparison}
                disabled={compareLoading || !comparePrevId || !compareCurrId}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold text-sm shadow-lg hover:shadow-purple-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {compareLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
                Gerar Comparativo Lado a Lado
              </button>
            </div>
          </div>

          {/* Comparison Results */}
          {comparisonManifest && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Intervalo Decorrido</span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {comparisonManifest.days_between} dias entre as avaliações
                    </h3>
                  </div>

                  <div className="flex gap-4 text-sm text-slate-300">
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
                      <span className="text-xs text-slate-400 block">Baseline</span>
                      <strong>{new Date(comparisonManifest.previous_assessment.assessment_date + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
                      <span className="text-xs text-slate-400 block">Evolução</span>
                      <strong>{new Date(comparisonManifest.current_assessment.assessment_date + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>
                    </div>
                  </div>
                </div>

                {/* Deltas Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-xs text-slate-400 block">Variação de Peso</span>
                    {comparisonManifest.deltas.weight_kg !== null ? (
                      <strong className={`text-lg font-bold ${comparisonManifest.deltas.weight_kg! <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {comparisonManifest.deltas.weight_kg! > 0 ? `+${comparisonManifest.deltas.weight_kg}` : comparisonManifest.deltas.weight_kg} kg
                      </strong>
                    ) : (
                      <span className="text-slate-500 text-sm">—</span>
                    )}
                  </div>

                  <div className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-xs text-slate-400 block">Variação % Gordura</span>
                    {comparisonManifest.deltas.body_fat_percentage !== null ? (
                      <strong className={`text-lg font-bold ${comparisonManifest.deltas.body_fat_percentage! <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {comparisonManifest.deltas.body_fat_percentage! > 0 ? `+${comparisonManifest.deltas.body_fat_percentage}` : comparisonManifest.deltas.body_fat_percentage}%
                      </strong>
                    ) : (
                      <span className="text-slate-500 text-sm">—</span>
                    )}
                  </div>

                  <div className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-xs text-slate-400 block">Variação Cintura</span>
                    {comparisonManifest.deltas.waist_cm !== null ? (
                      <strong className="text-lg font-bold text-slate-200">
                        {comparisonManifest.deltas.waist_cm! > 0 ? `+${comparisonManifest.deltas.waist_cm}` : comparisonManifest.deltas.waist_cm} cm
                      </strong>
                    ) : (
                      <span className="text-slate-500 text-sm">—</span>
                    )}
                  </div>

                  <div className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-xs text-slate-400 block">Variação Abdômen</span>
                    {comparisonManifest.deltas.abdomen_cm !== null ? (
                      <strong className="text-lg font-bold text-slate-200">
                        {comparisonManifest.deltas.abdomen_cm! > 0 ? `+${comparisonManifest.deltas.abdomen_cm}` : comparisonManifest.deltas.abdomen_cm} cm
                      </strong>
                    ) : (
                      <span className="text-slate-500 text-sm">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Side-by-side Matched Photos */}
              <div className="space-y-6">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Camera className="h-5 w-5 text-cyan-400" /> Comparativo Fotográfico Lado a Lado Por Ângulo
                </h4>

                {comparisonManifest.matched_photos.length === 0 ? (
                  <div className="p-8 text-center glass-panel rounded-2xl text-slate-400 text-sm">
                    Nenhuma foto equivalente encontrada para parear nesta comparação.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {comparisonManifest.matched_photos.map((match, idx) => (
                      <div key={idx} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <span className="text-sm font-bold text-cyan-400 uppercase tracking-wider">
                            Ângulo: {ANGLE_LABELS[match.angle] || match.angle}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Previous Photo */}
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center">
                            <span className="text-xs font-semibold text-slate-400 mb-2">
                              Anterior ({new Date(comparisonManifest.previous_assessment.assessment_date + 'T00:00:00').toLocaleDateString('pt-BR')})
                            </span>
                            {match.previous_photo ? (
                              <img
                                src={match.previous_photo.content_url}
                                alt="Anterior"
                                onClick={() => setLightboxPhoto(match.previous_photo!)}
                                className="w-full h-80 object-cover rounded-lg border border-slate-800 cursor-pointer hover:scale-102 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-80 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 bg-slate-100/40 dark:bg-slate-900/40 rounded-lg text-xs">
                                <Camera className="h-8 w-8 mb-2" /> Foto não disponível nesta avaliação
                              </div>
                            )}
                          </div>

                          {/* Current Photo */}
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center">
                            <span className="text-xs font-semibold text-slate-400 mb-2">
                              Atual ({new Date(comparisonManifest.current_assessment.assessment_date + 'T00:00:00').toLocaleDateString('pt-BR')})
                            </span>
                            {match.current_photo ? (
                              <img
                                src={match.current_photo.content_url}
                                alt="Atual"
                                onClick={() => setLightboxPhoto(match.current_photo!)}
                                className="w-full h-80 object-cover rounded-lg border border-slate-800 cursor-pointer hover:scale-102 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-80 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 bg-slate-100/40 dark:bg-slate-900/40 rounded-lg text-xs">
                                <Camera className="h-8 w-8 mb-2" /> Foto não disponível nesta avaliação
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {lightboxPhoto && createPortal(
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute -top-12 right-0 p-2 text-slate-700 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={lightboxPhoto.content_url}
              alt={lightboxPhoto.description || lightboxPhoto.angle}
              className="max-h-[80vh] w-auto object-contain rounded-xl border border-slate-800"
            />
            <div className="mt-3 text-center text-slate-300 text-sm">
              <strong>{ANGLE_LABELS[lightboxPhoto.angle]}</strong> — {BODY_STATE_LABELS[lightboxPhoto.body_state || 'unspecified']}
            </div>
          </div>
        </div>
      , document.body)}

      {/* ADD PHOTOS MODAL (In Details Mode) */}
      {showAddPhotosModal && selectedAssessmentId && createPortal(
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 max-w-2xl w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Adicionar Fotos a esta Avaliação</h3>
              <button onClick={() => setShowAddPhotosModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, true)}
              className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 bg-slate-950/50 rounded-2xl p-6 text-center cursor-pointer"
            >
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={e => handleFileSelect(e, true)}
                className="hidden"
                id="details-photo-upload"
              />
              <label htmlFor="details-photo-upload" className="cursor-pointer block">
                <Upload className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-200">Clique para selecionar novas fotos</p>
              </label>
            </div>

            {detailsPhotoDrafts.length > 0 && (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {detailsPhotoDrafts.map((d, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 shadow-sm">
                    <img src={d.previewUrl} alt="Preview" className="w-12 h-14 object-cover rounded" />
                    <select
                      value={d.angle}
                      onChange={e => {
                        const val = e.target.value as any;
                        setDetailsPhotoDrafts(prev => {
                          const copy = [...prev];
                          copy[idx].angle = val;
                          return copy;
                        });
                      }}
                      className="bg-slate-950 border border-slate-800 rounded p-1 text-slate-200"
                    >
                      <option value="front">Frente</option>
                      <option value="back">Costas</option>
                      <option value="left_side">Lado Esquerdo</option>
                      <option value="right_side">Lado Direito</option>
                      <option value="other">Outro</option>
                    </select>
                    <button onClick={() => removeDraft(idx, true)} className="text-rose-400 ml-auto p-1">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddPhotosModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleUploadDetailsPhotos}
                disabled={submitting || detailsPhotoDrafts.length === 0}
                className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
              >
                Enviar {detailsPhotoDrafts.length} {detailsPhotoDrafts.length === 1 ? 'Foto' : 'Fotos'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* EDIT ASSESSMENT MODAL */}
      {editingAssessment && createPortal(
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="h-5 w-5 text-amber-500" /> Editar Avaliação Física
              </h3>
              <button onClick={() => setEditingAssessment(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditAssessment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Data da Avaliação <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Título (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Medição pós-treino"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 78.5"
                    value={editWeight}
                    onChange={e => setEditWeight(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Gordura Corporal (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 15.2"
                    value={editBodyFat}
                    onChange={e => setEditBodyFat(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Cintura (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Ex: 82.0"
                    value={editWaist}
                    onChange={e => setEditWaist(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Abdômen (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Ex: 85.0"
                    value={editAbdomen}
                    onChange={e => setEditAbdomen(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Quadril (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Ex: 96.0"
                    value={editHip}
                    onChange={e => setEditHip(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Observações Pessoais</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Atualizado peso e cintura após retorno das férias..."
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAssessment(null)}
                  className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl text-xs font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xs font-semibold shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {editSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
    </div>
  );
};
