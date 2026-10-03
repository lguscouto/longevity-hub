import React from 'react';
import {
  Scale,
  Plus,
  ArrowLeftRight,
  Eye,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { ConfirmDialog } from './ui';
import {
  Photo,
  PhysicalAssessment,
  ComparisonManifest,
  PhotoLightbox,
  AssessmentHistory,
  AssessmentWizard,
  AssessmentDetails,
  AssessmentComparison,
  AddPhotosModal,
  EditAssessmentModal,
  usePhysicalAssessments,
} from './physicalAssessments';

// Re-export types for backward compatibility
export type { Photo, PhysicalAssessment, ComparisonManifest };

export const PhysicalAssessmentsView: React.FC = () => {
  const {
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
  } = usePhysicalAssessments();

  return (
    <div className="space-y-6">
      {/* Top Header & Context Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Avaliações Físicas & Fotos Corporais
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Registro visual seguro, acompanhamento antropométrico e comparativo lado a lado.
          </p>
        </div>

        {/* Sub-navigation Modes */}
        <div className="w-full md:w-auto overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100/80 dark:bg-slate-900/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 w-max md:w-auto">
            <button
              onClick={() => setActiveMode('history')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                activeMode === 'history'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Histórico ({assessments.length})
            </button>
            <button
              onClick={() => setActiveMode('create')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                activeMode === 'create'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Nova Avaliação
            </button>
            <button
              onClick={() => {
                setActiveMode('compare');
                if (assessments.length >= 2 && (!comparePrevId || !compareCurrId)) {
                  setComparePrevId(assessments[assessments.length - 1].id);
                  setCompareCurrId(assessments[0].id);
                }
              }}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                activeMode === 'compare'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <ArrowLeftRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Comparar Períodos
            </button>
          </div>
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
        <AssessmentHistory
          assessments={assessments}
          chartRefreshKey={chartRefreshKey}
          onSelectAssessment={(id) => {
            setSelectedAssessmentId(id);
            setIsNotesExpanded(false);
            setActiveMode('details');
          }}
          onOpenCreate={() => setActiveMode('create')}
          onOpenEdit={handleOpenEditModal}
          onDeleteAssessment={setDeleteAssessmentConfirm}
        />
      )}

      {/* MODE 2: NOVA AVALIAÇÃO (WIZARD STEPPER) */}
      {!loading && !error && activeMode === 'create' && (
        <AssessmentWizard
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          hasDraftLoaded={hasDraftLoaded}
          onClearDraft={handleClearDraft}
          createError={createError}
          formDate={formDate}
          setFormDate={setFormDate}
          formTitle={formTitle}
          setFormTitle={setFormTitle}
          formWeight={formWeight}
          setFormWeight={setFormWeight}
          formBodyFat={formBodyFat}
          setFormBodyFat={setFormBodyFat}
          formWaist={formWaist}
          setFormWaist={setFormWaist}
          formAbdomen={formAbdomen}
          setFormAbdomen={setFormAbdomen}
          formHip={formHip}
          setFormHip={setFormHip}
          formNotes={formNotes}
          setFormNotes={setFormNotes}
          photoDrafts={photoDrafts}
          setPhotoDrafts={setPhotoDrafts}
          onFileSelect={e => handleFileSelect(e, false)}
          onDrop={e => handleDrop(e, false)}
          onRemoveDraft={idx => removeDraft(idx, false)}
          submitting={submitting}
          onSubmit={handleCreateAssessment}
          onCancel={() => setActiveMode('history')}
        />
      )}

      {/* MODE 3: DETALHES DA AVALIAÇÃO */}
      {!loading && !error && activeMode === 'details' && selectedAssessment && (
        <AssessmentDetails
          selectedAssessment={selectedAssessment}
          isNotesExpanded={isNotesExpanded}
          setIsNotesExpanded={setIsNotesExpanded}
          onBackToHistory={() => setActiveMode('history')}
          onOpenEdit={handleOpenEditModal}
          onOpenAddPhotos={() => setShowAddPhotosModal(true)}
          onDeleteAssessment={setDeleteAssessmentConfirm}
          onDeletePhoto={setDeletePhotoConfirm}
          onOpenLightbox={setLightboxPhoto}
        />
      )}

      {/* MODE 4: COMPARAR PERÍODOS */}
      {!loading && !error && activeMode === 'compare' && (
        <AssessmentComparison
          assessments={assessments}
          comparePrevId={comparePrevId}
          setComparePrevId={setComparePrevId}
          compareCurrId={compareCurrId}
          setCompareCurrId={setCompareCurrId}
          compareLoading={compareLoading}
          compareError={compareError}
          comparisonManifest={comparisonManifest}
          onRunComparison={handleRunComparison}
          onOpenLightbox={setLightboxPhoto}
        />
      )}

      {/* ACCESSIBLE PHOTO LIGHTBOX */}
      <PhotoLightbox
        photo={lightboxPhoto}
        photos={selectedAssessment?.photos || []}
        onClose={() => setLightboxPhoto(null)}
        onSelectPhoto={setLightboxPhoto}
      />

      {/* ADD PHOTOS MODAL */}
      <AddPhotosModal
        isOpen={Boolean(showAddPhotosModal && selectedAssessmentId)}
        onClose={() => setShowAddPhotosModal(false)}
        submitting={submitting}
        detailsPhotoDrafts={detailsPhotoDrafts}
        setDetailsPhotoDrafts={setDetailsPhotoDrafts}
        onDrop={e => handleDrop(e, true)}
        onFileSelect={e => handleFileSelect(e, true)}
        onRemoveDraft={idx => removeDraft(idx, true)}
        onUpload={handleUploadDetailsPhotos}
      />

      {/* EDIT ASSESSMENT MODAL */}
      <EditAssessmentModal
        isOpen={Boolean(editingAssessment)}
        onClose={() => setEditingAssessment(null)}
        editError={editError}
        editDate={editDate}
        setEditDate={setEditDate}
        editTitle={editTitle}
        setEditTitle={setEditTitle}
        editWeight={editWeight}
        setEditWeight={setEditWeight}
        editBodyFat={editBodyFat}
        setEditBodyFat={setEditBodyFat}
        editWaist={editWaist}
        setEditWaist={setEditWaist}
        editAbdomen={editAbdomen}
        setEditAbdomen={setEditAbdomen}
        editHip={editHip}
        setEditHip={setEditHip}
        editNotes={editNotes}
        setEditNotes={setEditNotes}
        editSubmitting={editSubmitting}
        onSubmit={handleSaveEditAssessment}
      />

      {/* CONFIRM DIALOG: EXCLUIR AVALIAÇÃO */}
      <ConfirmDialog
        isOpen={Boolean(deleteAssessmentConfirm)}
        title="Excluir Avaliação Física"
        description={`Tem certeza de que deseja excluir permanentemente a avaliação de ${
          deleteAssessmentConfirm ? new Date(deleteAssessmentConfirm.date + 'T00:00:00').toLocaleDateString('pt-BR') : ''
        } e todas as fotografias associadas? Esta ação é irreversível.`}
        confirmLabel="Excluir Definitivamente"
        cancelLabel="Cancelar"
        isDestructive
        onConfirm={executeDeleteAssessment}
        onClose={() => setDeleteAssessmentConfirm(null)}
      />

      {/* CONFIRM DIALOG: EXCLUIR FOTO AVULSA */}
      <ConfirmDialog
        isOpen={Boolean(deletePhotoConfirm)}
        title="Remover Fotografia"
        description="Deseja remover esta fotografia corporal permanentemente? O arquivo será deletado do armazenamento local."
        confirmLabel="Remover Foto"
        cancelLabel="Cancelar"
        isDestructive
        onConfirm={executeDeleteSinglePhoto}
        onClose={() => setDeletePhotoConfirm(null)}
      />
    </div>
  );
};
