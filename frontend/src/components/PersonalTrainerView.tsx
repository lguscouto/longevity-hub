import React, { useState, useEffect } from 'react';
import {
  Camera,
  ArrowLeftRight,
  Ruler,
  FileText,
  FlaskConical,
  AlertCircle,
  Eye,
  ChevronLeft,
} from 'lucide-react';
import { Button, LoadingIndicator } from './ui';
import {
  PersonalTrainerTab,
  PersonalTrainerHeader,
  PersonalTrainerGallery,
  PersonalTrainerComparison,
  PersonalTrainerComposition,
  PersonalTrainerNotes,
  PersonalTrainerTopBar,
  PersonalTrainerLabs,
  PersonalTrainerLogin,
  PersonalTrainerSession,
  getPersonalTrainerSession,
  clearPersonalTrainerSession,
} from './personalTrainer';
import {
  Photo,
  PhotoLightbox,
  usePhysicalAssessments,
} from './physicalAssessments';
import { ApiError, requestJson } from '../lib/api';

export interface PersonalTrainerViewProps {
  initialTab?: PersonalTrainerTab;
  onBackToApp?: () => void;
  onRequestUnlock?: () => void;
  isIsolated?: boolean;
  initialSession?: PersonalTrainerSession | null;
  onOwnerLogout?: () => void;
}

export const PersonalTrainerView: React.FC<PersonalTrainerViewProps> = ({
  initialTab = 'gallery',
  onBackToApp,
  onRequestUnlock,
  isIsolated = true,
  initialSession,
  onOwnerLogout,
}) => {
  const [savedSession] = useState<PersonalTrainerSession | null>(() =>
    initialSession !== undefined ? initialSession : getPersonalTrainerSession()
  );
  const [session, setSession] = useState<PersonalTrainerSession | null>(null);
  const [checkingSession, setCheckingSession] = useState(Boolean(savedSession));
  const [sessionCheckError, setSessionCheckError] = useState(false);
  const [activeTab, setActiveTab] = useState<PersonalTrainerTab>(() => {
    try {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('compare') || hash.includes('antes')) return 'compare';
      if (hash.includes('composition') || hash.includes('medidas')) return 'composition';
      if (hash.includes('notes') || hash.includes('orientacoes')) return 'notes';
      if (hash.includes('labs') || hash.includes('exames') || hash.includes('sangue')) return 'labs';
    } catch {
      // noop
    }
    return initialTab;
  });
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!savedSession) return;
    let active = true;
    if (!savedSession.token) {
      clearPersonalTrainerSession();
      setCheckingSession(false);
      return;
    }
    requestJson<PersonalTrainerSession>('/api/personal/session', {
      headers: { 'X-Personal-Token': savedSession.token },
    }).then(validated => {
      if (!validated.authenticated || !validated.token || !validated.username || validated.requires_password_change) throw new ApiError(401, 'Sessão inválida');
      if (active) setSession(validated);
    }).catch(error => {
      if (!active) return;
      if (error instanceof ApiError && error.status === 401) clearPersonalTrainerSession();
      else setSessionCheckError(true);
    }).finally(() => {
      if (active) setCheckingSession(false);
    });
    return () => { active = false; };
  }, [savedSession]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    const verify = () => {
      requestJson<PersonalTrainerSession>('/api/personal/session', {
        headers: { 'X-Personal-Token': session.token },
      }).then(validated => {
        if (!validated.authenticated || validated.requires_password_change) throw new Error('Sessão inválida');
      }).catch(() => {
        if (active) {
          clearPersonalTrainerSession();
          setSession(null);
        }
      });
    };
    const timer = window.setInterval(verify, 60_000);
    const visibility = () => { if (document.visibilityState === 'visible') verify(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
  }, [session]);

  // Escuta tecla ESC para sair do modo apresentação
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPresentationMode) {
        setIsPresentationMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresentationMode]);

  // Carrega hook de avaliações físicas (leitura e comparativo)
  const {
    assessments,
    loading,
    error,
    comparePrevId,
    setComparePrevId,
    compareCurrId,
    setCompareCurrId,
    compareLoading,
    compareError,
    comparisonManifest,
    handleRunComparison,
    chartRefreshKey,
  } = usePhysicalAssessments(Boolean(session));

  // Lightbox compartilhado
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState<Photo | null>(null);
  const [activeLightboxList, setActiveLightboxList] = useState<Photo[]>([]);

  // Carrega perfil isolado do atleta (sem exames clínicos ou dados médicos)
  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    let isMounted = true;
    requestJson<any>('/api/physical-assessments/athlete-profile')
      .then(data => {
        if (isMounted && data) {
          setProfile(data);
        }
      })
      .catch(() => {
        // Fallback silencioso
      });
    return () => {
      isMounted = false;
    };
  }, [session]);

  const handleOpenPhotoInLightbox = (photo: Photo, photoList: Photo[]) => {
    setActiveLightboxPhoto(photo);
    setActiveLightboxList(photoList);
  };

  const handleViewAssessmentPhotos = (ass: any) => {
    if (ass.photos && ass.photos.length > 0) {
      handleOpenPhotoInLightbox(ass.photos[0], ass.photos);
    }
  };

  const triggerUnlock = () => {
    if (onRequestUnlock) {
      onRequestUnlock();
    } else if (onBackToApp) onBackToApp();
    else window.location.hash = 'overview';
  };

  const handleLogout = () => {
    if (session?.token) {
      requestJson('/api/personal/logout', {
        method: 'POST',
        headers: { 'X-Personal-Token': session.token },
      }).catch(() => {});
    }
    clearPersonalTrainerSession();
    setSession(null);
  };

  // Se o personal não estiver autenticado, exibe a tela de login exclusiva com usuário e senha
  if (checkingSession) return <LoadingIndicator />;
  if (!session) {
    return (
      <div className="space-y-6">
        {sessionCheckError && (
          <p role="alert">Não foi possível verificar a sessão salva. Verifique a conexão e tente novamente.</p>
        )}
        {isIsolated && (
          <PersonalTrainerTopBar
            onRequestUnlock={triggerUnlock}
            session={null}
            onOwnerLogout={onOwnerLogout}
          />
        )}
        <PersonalTrainerLogin
          onLoginSuccess={newSession => setSession(newSession)}
          onRequestStudentUnlock={triggerUnlock}
        />
      </div>
    );
  }

  return (
    <div
      className={
        isPresentationMode
          ? 'fixed inset-0 z-50 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 animate-fadeIn'
          : 'space-y-6'
      }
    >
      {/* Top Isolated Navigation Bar (only when in standalone isolated view and not in presentation mode) */}
      {isIsolated && !isPresentationMode && (
        <PersonalTrainerTopBar
          onRequestUnlock={triggerUnlock}
          session={session}
          onLogout={handleLogout}
          onOwnerLogout={onOwnerLogout}
        />
      )}

      {/* Back button when onBackToApp is provided and not in presentation mode */}
      {onBackToApp && !isPresentationMode && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToApp}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar para Sessões de Treino
          </button>
        </div>
      )}

      {/* Return Bar when in presentation mode */}
      {isPresentationMode && (
        <div className="max-w-7xl mx-auto mb-4 flex items-center justify-between p-3 rounded-xl bg-cyan-600/10 border border-cyan-500/20 text-xs font-semibold text-cyan-800 dark:text-cyan-200">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span>Modo Apresentação do Personal ativado (visão limpa sem distrações • pressione ESC para sair)</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPresentationMode(false)}
            className="text-xs"
          >
            Sair do Modo Apresentação
          </Button>
        </div>
      )}

      {/* Hero Header with Profile and KPIs */}
      <PersonalTrainerHeader
        profile={profile}
        assessments={assessments}
        isPresentationMode={isPresentationMode}
        onTogglePresentationMode={() => setIsPresentationMode(prev => !prev)}
      />

      {/* Sub-navigation Tabs for Trainer (Responsivo: 5 colunas no mobile sem scroll horizontal, barra expansível no desktop) */}
      <nav aria-label="Abas do Portal do Personal" className="w-full">
        <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 sm:flex sm:items-center sm:gap-2 sm:rounded-xl sm:p-1.5 sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            aria-label="Galeria & Poses"
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3.5 py-2 rounded-xl sm:rounded-lg text-center font-semibold transition-all cursor-pointer min-w-0 ${
              activeTab === 'gallery'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Camera className="h-4 w-4 shrink-0" />
            <span className="text-[10px] sm:text-xs md:text-sm leading-tight block truncate w-full">
              <span className="sm:hidden">Galeria</span>
              <span className="hidden sm:inline">Galeria & Poses</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('compare')}
            aria-label="Antes & Depois"
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3.5 py-2 rounded-xl sm:rounded-lg text-center font-semibold transition-all cursor-pointer min-w-0 ${
              activeTab === 'compare'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ArrowLeftRight className="h-4 w-4 shrink-0" />
            <span className="text-[10px] sm:text-xs md:text-sm leading-tight block truncate w-full">
              <span className="sm:hidden">Comparar</span>
              <span className="hidden sm:inline">Antes & Depois</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('composition')}
            aria-label="Medidas & Composição"
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3.5 py-2 rounded-xl sm:rounded-lg text-center font-semibold transition-all cursor-pointer min-w-0 ${
              activeTab === 'composition'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Ruler className="h-4 w-4 shrink-0" />
            <span className="text-[10px] sm:text-xs md:text-sm leading-tight block truncate w-full">
              <span className="sm:hidden">Medidas</span>
              <span className="hidden sm:inline">Medidas & Composição</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('labs')}
            aria-label="Últimos Exames"
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3.5 py-2 rounded-xl sm:rounded-lg text-center font-semibold transition-all cursor-pointer min-w-0 ${
              activeTab === 'labs'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FlaskConical className="h-4 w-4 shrink-0" />
            <span className="text-[10px] sm:text-xs md:text-sm leading-tight block truncate w-full">
              <span className="sm:hidden">Exames</span>
              <span className="hidden sm:inline">Últimos Exames</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            aria-label="Orientações do Treinador"
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3.5 py-2 rounded-xl sm:rounded-lg text-center font-semibold transition-all cursor-pointer min-w-0 ${
              activeTab === 'notes'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="text-[10px] sm:text-xs md:text-sm leading-tight block truncate w-full">
              <span className="sm:hidden">Treinador</span>
              <span className="hidden sm:inline">Orientações do Treinador</span>
            </span>
          </button>
        </div>
      </nav>

      {/* Loading & Error States */}
      {loading && (
        <div className="glass-panel p-12 text-center text-slate-400 rounded-2xl flex flex-col items-center gap-3">
          <LoadingIndicator label="Carregando dados para o Personal Trainer..." size="md" />
        </div>
      )}

      {error && (
        <div className="glass-panel p-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 flex items-center gap-3">
          <AlertCircle className="h-6 w-6 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB CONTENT */}
      {!loading && !error && (
        <div>
          {activeTab === 'gallery' && (
            <PersonalTrainerGallery
              assessments={assessments}
              onSelectPhoto={handleOpenPhotoInLightbox}
            />
          )}

          {activeTab === 'compare' && (
            <PersonalTrainerComparison
              assessments={assessments}
              comparePrevId={comparePrevId}
              setComparePrevId={setComparePrevId}
              compareCurrId={compareCurrId}
              setCompareCurrId={setCompareCurrId}
              compareLoading={compareLoading}
              compareError={compareError}
              comparisonManifest={comparisonManifest}
              onRunComparison={handleRunComparison}
              onOpenLightbox={photo => handleOpenPhotoInLightbox(photo, [photo])}
            />
          )}

          {activeTab === 'composition' && (
            <PersonalTrainerComposition
              assessments={assessments}
              chartRefreshKey={chartRefreshKey}
              onSelectAssessment={() => setActiveTab('gallery')}
              onViewPhotos={handleViewAssessmentPhotos}
            />
          )}

          {activeTab === 'labs' && <PersonalTrainerLabs />}

          {activeTab === 'notes' && <PersonalTrainerNotes />}
        </div>
      )}

      {/* Accessible Photo Lightbox */}
      <PhotoLightbox
        photo={activeLightboxPhoto}
        photos={activeLightboxList}
        onClose={() => setActiveLightboxPhoto(null)}
        onSelectPhoto={setActiveLightboxPhoto}
      />

    </div>
  );
};
