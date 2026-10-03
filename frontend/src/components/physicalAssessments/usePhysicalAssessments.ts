import { useState, useEffect } from 'react';
import { useToast } from '../ui';
import {
  Photo,
  PhysicalAssessment,
  ComparisonManifest,
  NewPhotoDraft,
  DRAFT_STORAGE_KEY,
} from './types';

export function usePhysicalAssessments() {
  const { showToast } = useToast();
  const [assessments, setAssessments] = useState<PhysicalAssessment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'history' | 'create' | 'details' | 'compare'>('history');

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [comparisonManifest, setComparisonManifest] = useState<ComparisonManifest | null>(null);
  const [isNotesExpanded, setIsNotesExpanded] = useState<boolean>(false);

  // Selection for comparison
  const [comparePrevId, setComparePrevId] = useState<string>('');
  const [compareCurrId, setCompareCurrId] = useState<string>('');
  const [compareLoading, setCompareLoading] = useState<boolean>(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  // Wizard Stepper State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [hasDraftLoaded, setHasDraftLoaded] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
  const [chartRefreshKey, setChartRefreshKey] = useState<number>(0);

  // ConfirmDialog States
  const [deleteAssessmentConfirm, setDeleteAssessmentConfirm] = useState<{ id: string; title?: string; date: string } | null>(null);
  const [deletePhotoConfirm, setDeletePhotoConfirm] = useState<{ assessmentId: string; photoId: string } | null>(null);

  // Restore Draft on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formDate) setFormDate(parsed.formDate);
        if (parsed.formTitle !== undefined) setFormTitle(parsed.formTitle);
        if (parsed.formWeight !== undefined) setFormWeight(parsed.formWeight);
        if (parsed.formBodyFat !== undefined) setFormBodyFat(parsed.formBodyFat);
        if (parsed.formWaist !== undefined) setFormWaist(parsed.formWaist);
        if (parsed.formAbdomen !== undefined) setFormAbdomen(parsed.formAbdomen);
        if (parsed.formHip !== undefined) setFormHip(parsed.formHip);
        if (parsed.formNotes !== undefined) setFormNotes(parsed.formNotes);
        setHasDraftLoaded(true);
      }
    } catch {
      // Ignorar erros de JSON corrupto no localStorage
    }
  }, []);

  // Save Draft on Change
  useEffect(() => {
    if (formTitle || formWeight || formBodyFat || formWaist || formAbdomen || formHip || formNotes) {
      try {
        const draft = {
          formDate,
          formTitle,
          formWeight,
          formBodyFat,
          formWaist,
          formAbdomen,
          formHip,
          formNotes,
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch {
        // Ignorar falhas de cota no localStorage
      }
    }
  }, [formDate, formTitle, formWeight, formBodyFat, formWaist, formAbdomen, formHip, formNotes]);

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // noop
    }
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTitle('');
    setFormWeight('');
    setFormBodyFat('');
    setFormWaist('');
    setFormAbdomen('');
    setFormHip('');
    setFormNotes('');
    setPhotoDrafts([]);
    setCurrentStep(1);
    setHasDraftLoaded(false);
  };

  const fetchAssessments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/physical-assessments');
      if (!res.ok) throw new Error('Falha ao carregar histórico de avaliações físicas');
      const data = await res.json();
      setAssessments(data);
      setChartRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido ao buscar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  // Cleanup blob object URLs
  useEffect(() => {
    return () => {
      photoDrafts.forEach(d => URL.revokeObjectURL(d.previewUrl));
      detailsPhotoDrafts.forEach(d => URL.revokeObjectURL(d.previewUrl));
    };
  }, [photoDrafts, detailsPhotoDrafts]);

  const addFilesToDrafts = (files: File[], isDetails: boolean) => {
    const validExtensions = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const newDrafts: NewPhotoDraft[] = [];
    let fileError = '';

    files.forEach((file, idx) => {
      if (!validExtensions.includes(file.type)) {
        fileError = `O arquivo ${file.name} não é uma imagem suportada (JPEG, PNG, WebP).`;
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        fileError = `O arquivo ${file.name} excede o limite de 15 MB.`;
        return;
      }

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

    if (fileError) {
      setCreateError(fileError);
    } else {
      setCreateError(null);
    }

    if (isDetails) {
      setDetailsPhotoDrafts(prev => [...prev, ...newDrafts]);
    } else {
      setPhotoDrafts(prev => [...prev, ...newDrafts]);
    }
  };

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

  const handleCreateAssessment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formDate) {
      setCreateError('A data da avaliação é obrigatória.');
      setCurrentStep(1);
      return;
    }

    setSubmitting(true);
    setCreateError(null);

    try {
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
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Erro ao criar avaliação');
      }

      const created = await res.json();

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
            const errJson = await photoRes.json().catch(() => ({}));
            console.error('Erro ao enviar foto:', errJson);
          }
        }
      }

      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // noop
      }

      setPhotoDrafts([]);
      handleClearDraft();
      await fetchAssessments();
      setSelectedAssessmentId(created.id);
      setActiveMode('details');
    } catch (err: any) {
      setCreateError(err.message || 'Erro ao salvar avaliação');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (assessment: PhysicalAssessment) => {
    setEditingAssessment(assessment);
    setEditDate(assessment.assessment_date);
    setEditTitle(assessment.title || '');
    setEditWeight(assessment.weight_kg !== undefined && assessment.weight_kg !== null ? String(assessment.weight_kg) : '');
    setEditBodyFat(assessment.body_fat_percentage !== undefined && assessment.body_fat_percentage !== null ? String(assessment.body_fat_percentage) : '');
    setEditWaist(assessment.waist_cm !== undefined && assessment.waist_cm !== null ? String(assessment.waist_cm) : '');
    setEditAbdomen(assessment.abdomen_cm !== undefined && assessment.abdomen_cm !== null ? String(assessment.abdomen_cm) : '');
    setEditHip(assessment.hip_cm !== undefined && assessment.hip_cm !== null ? String(assessment.hip_cm) : '');
    setEditNotes(assessment.notes || '');
    setEditError(null);
  };

  const handleSaveEditAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssessment) return;
    if (!editDate) {
      setEditError('A data da avaliação é obrigatória.');
      return;
    }

    setEditSubmitting(true);
    setEditError(null);

    try {
      const payload = {
        assessment_date: editDate,
        title: editTitle || undefined,
        weight_kg: editWeight ? parseFloat(editWeight) : null,
        body_fat_percentage: editBodyFat ? parseFloat(editBodyFat) : null,
        waist_cm: editWaist ? parseFloat(editWaist) : null,
        abdomen_cm: editAbdomen ? parseFloat(editAbdomen) : null,
        hip_cm: editHip ? parseFloat(editHip) : null,
        notes: editNotes || undefined,
      };

      const res = await fetch(`/api/physical-assessments/${editingAssessment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Erro ao atualizar avaliação física');
      }

      const updated = await res.json();
      setAssessments(prev => prev.map(a => a.id === updated.id ? updated : a));
      setEditingAssessment(null);
      setChartRefreshKey(prev => prev + 1);
    } catch (err: any) {
      setEditError(err.message || 'Erro ao atualizar avaliação');
    } finally {
      setEditSubmitting(false);
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

        const res = await fetch(`/api/physical-assessments/${selectedAssessmentId}/photos`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          console.error('Erro ao enviar foto extra:', errJson);
        }
      }
      setDetailsPhotoDrafts([]);
      setShowAddPhotosModal(false);
      await fetchAssessments();
    } catch (err) {
      console.error('Erro ao fazer upload de fotos na visualização de detalhes', err);
    } finally {
      setSubmitting(false);
    }
  };

  const executeDeleteAssessment = async () => {
    if (!deleteAssessmentConfirm) return;
    const { id } = deleteAssessmentConfirm;
    setDeleteAssessmentConfirm(null);

    try {
      const res = await fetch(`/api/physical-assessments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir avaliação física');
      setAssessments(prev => prev.filter(a => a.id !== id));
      if (selectedAssessmentId === id) {
        setSelectedAssessmentId(null);
        setActiveMode('history');
      }
      setChartRefreshKey(prev => prev + 1);
      showToast('Avaliação física excluída com sucesso.');
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir avaliação física.', 'error');
    }
  };

  const executeDeleteSinglePhoto = async () => {
    if (!deletePhotoConfirm) return;
    const { assessmentId, photoId } = deletePhotoConfirm;
    setDeletePhotoConfirm(null);

    try {
      const res = await fetch(`/api/physical-assessments/${assessmentId}/photos/${photoId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir foto');
      await fetchAssessments();
      showToast('Fotografia corporal excluída com sucesso.');
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir fotografia corporal.', 'error');
    }
  };

  const handleRunComparison = async () => {
    if (!comparePrevId || !compareCurrId) return;
    setCompareLoading(true);
    setCompareError(null);
    try {
      const res = await fetch(`/api/physical-assessments/compare?previous_id=${comparePrevId}&current_id=${compareCurrId}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Falha ao processar comparativo');
      }
      const data = await res.json();
      setComparisonManifest(data);
    } catch (err: any) {
      setCompareError(err.message || 'Erro ao gerar manifesto de comparação');
    } finally {
      setCompareLoading(false);
    }
  };

  const selectedAssessment = assessments.find(a => a.id === selectedAssessmentId);

  return {
    assessments,
    loading,
    error,
    activeMode,
    setActiveMode,
    selectedAssessmentId,
    setSelectedAssessmentId,
    selectedAssessment,
    comparisonManifest,
    isNotesExpanded,
    setIsNotesExpanded,
    comparePrevId,
    setComparePrevId,
    compareCurrId,
    setCompareCurrId,
    compareLoading,
    compareError,
    handleRunComparison,
    currentStep,
    setCurrentStep,
    hasDraftLoaded,
    handleClearDraft,
    createError,
    formDate,
    setFormDate,
    formTitle,
    setFormTitle,
    formWeight,
    setFormWeight,
    formBodyFat,
    setFormBodyFat,
    formWaist,
    setFormWaist,
    formAbdomen,
    setFormAbdomen,
    formHip,
    setFormHip,
    formNotes,
    setFormNotes,
    photoDrafts,
    setPhotoDrafts,
    handleFileSelect,
    handleDrop,
    removeDraft,
    submitting,
    handleCreateAssessment,
    lightboxPhoto,
    setLightboxPhoto,
    showAddPhotosModal,
    setShowAddPhotosModal,
    detailsPhotoDrafts,
    setDetailsPhotoDrafts,
    handleUploadDetailsPhotos,
    editingAssessment,
    setEditingAssessment,
    editDate,
    setEditDate,
    editTitle,
    setEditTitle,
    editWeight,
    setEditWeight,
    editBodyFat,
    setEditBodyFat,
    editWaist,
    setEditWaist,
    editAbdomen,
    setEditAbdomen,
    editHip,
    setEditHip,
    editNotes,
    setEditNotes,
    editSubmitting,
    editError,
    handleOpenEditModal,
    handleSaveEditAssessment,
    chartRefreshKey,
    deleteAssessmentConfirm,
    setDeleteAssessmentConfirm,
    executeDeleteAssessment,
    deletePhotoConfirm,
    setDeletePhotoConfirm,
    executeDeleteSinglePhoto,
  };
}
