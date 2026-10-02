import React, { useState, useRef, useEffect, useId } from 'react';
import { HelpCircle, Info, Sparkles, X } from 'lucide-react';

export interface GlossaryDefinition {
  title: string;
  shortDescription: string;
  whyItMatters: string;
  optimalTarget?: string;
}

export const GLOSSARY_TERMS: Record<string, GlossaryDefinition> = {
  phenoage: {
    title: 'PhenoAge (Idade Fenotípica)',
    shortDescription: 'Estimativa de idade biológica baseada em 9 biomarcadores laboratoriais clínicos e idade cronológica.',
    whyItMatters: 'Mede o ritmo real de envelhecimento fisiológico. Uma PhenoAge menor que a cronológica indica resiliência e menor mortalidade.',
    optimalTarget: 'Menor é melhor (abaixo da idade cronológica)',
  },
  kdm: {
    title: 'KDM (Método Klemera-Doubal)',
    shortDescription: 'Algoritmo biológico que pondera o declínio fisiológico de múltiplos sistemas para estimar a idade biológica.',
    whyItMatters: 'Permite acompanhar se intervenções de estilo de vida estão desacelerando o relógio celular.',
    optimalTarget: 'Menor é melhor (inferior à cronológica)',
  },
  hrv: {
    title: 'VFC / HRV (Variabilidade da FC)',
    shortDescription: 'Oscilação em milissegundos entre batimentos cardíacos consecutivos regulada pelo sistema nervoso autônomo.',
    whyItMatters: 'Valores mais altos em repouso indicam prontidão, flexibilidade adaptativa e predomínio do tônus parassimpático.',
    optimalTarget: 'Maior é melhor (acima da baseline pessoal)',
  },
  rmssd: {
    title: 'RMSSD (Raiz Quadrada da Média das Diferenças Sucessivas)',
    shortDescription: 'Principal métrica estatística de HRV que quantifica a atividade vagal parassimpática imediata.',
    whyItMatters: 'Padrão-ouro em wearables para monitorar recuperação noturna e resposta ao treino.',
    optimalTarget: 'Maior é melhor (em repouso noturno)',
  },
  rhr: {
    title: 'FC Repouso (Frequência Cardíaca de Repouso)',
    shortDescription: 'Número de batimentos cardíacos por minuto durante repouso completo ou sono profundo.',
    whyItMatters: 'Reflete eficiência miocárdica e baixo estresse fisiológico crônico sustentado.',
    optimalTarget: 'Menor é melhor (faixa ideal: 45 a 60 bpm)',
  },
  vo2max: {
    title: 'VO₂ Máx (Capacidade Cardiorrespiratória)',
    shortDescription: 'Volume máximo de oxigênio (mL/kg/min) metabolizado durante esforço físico máximo.',
    whyItMatters: 'O preditor isolado mais forte de longevidade e sobrevida em estudos epidemiológicos globais.',
    optimalTarget: 'Maior é melhor (percentil superior por idade e sexo)',
  },
  cgm: {
    title: 'CGM (Monitor Contínuo de Glicose)',
    shortDescription: 'Sensor que mede a glicose no líquido intersticial a cada poucos minutos de forma contínua.',
    whyItMatters: 'Revela picos pós-prandiais, variabilidade e hipoglicemias noturnas invisíveis em exames pontuais.',
    optimalTarget: 'Estabilidade glicêmica sustentada',
  },
  tir: {
    title: 'TIR (Time in Range / Tempo no Alvo)',
    shortDescription: 'Porcentagem de tempo em que a glicemia permanece na faixa ótima pré-determinada (ex: 70 a 140 mg/dL).',
    whyItMatters: 'Manter TIR elevado reduz estresse oxidativo e lesões vasculares induzidas por picos.',
    optimalTarget: 'Maior é melhor (alvo: > 85%)',
  },
  mean_glucose: {
    title: 'Glicose Média Diária',
    shortDescription: 'Média de todas as leituras de glicemia captadas pelo sensor contínuo ou exames no período.',
    whyItMatters: 'Indica a exposição metabólica basal e correlaciona-se com a hemoglobina glicada estimada.',
    optimalTarget: 'Faixa ideal: 85 a 100 mg/dL',
  },
  apob: {
    title: 'ApoB (Apolipoproteína B)',
    shortDescription: 'Marcador do número total de partículas aterogênicas circulantes (LDL, VLDL, IDL, Lp(a)).',
    whyItMatters: 'É superior ao LDL-colesterol tradicional na avaliação do risco de formação de placas nas artérias.',
    optimalTarget: 'Menor é melhor (alvo longevidade: < 70 mg/dL)',
  },
  hscrp: {
    title: 'PCR-us (Proteína C Reativa Ultrassensível)',
    shortDescription: 'Biomarcador hepático de inflamação sistêmica crônica de baixa intensidade.',
    whyItMatters: 'A inflamação subclínica mantida acelera o envelhecimento cardiovascular, neural e metabólico.',
    optimalTarget: 'Menor é melhor (alvo longevidade: < 0.5 mg/L)',
  },
  hba1c: {
    title: 'Hemoglobina Glicada (HbA1c)',
    shortDescription: 'Percentual de hemoglobina ligada à glicose, refletindo a média glicêmica dos últimos 90 a 120 dias.',
    whyItMatters: 'Mede o grau de glicação de tecidos e formação de AGEs (produtos de glicação avançada).',
    optimalTarget: 'Faixa ideal: 4.8% a 5.4%',
  },
  sleep_efficiency: {
    title: 'Eficiência do Sono',
    shortDescription: 'Proporção entre o tempo real dormindo e o tempo total passado na cama.',
    whyItMatters: 'Eficiência alta indica sono contínuo, adormecimento rápido e ausência de despertares prolongados.',
    optimalTarget: 'Maior é melhor (alvo: > 85%, excelente: > 90%)',
  },
  sleep_deep: {
    title: 'Sono Profundo (Ondas Lentas)',
    shortDescription: 'Estágio restaurador de ondas lentas delta com liberação máxima de GH e relaxamento muscular.',
    whyItMatters: 'Essencial para reparo de tecidos, regeneração física e drenagem glinfática do cérebro.',
    optimalTarget: 'Faixa ideal: 1h a 1h45min por noite (15% a 25%)',
  },
  sleep_rem: {
    title: 'Sono REM (Movimento Ocular Rápido)',
    shortDescription: 'Fase de alta atividade cerebral associada a sonhos, processamento emocional e conexões neurais.',
    whyItMatters: 'Crítico para consolidação da memória, saúde cognitiva e regulação do humor.',
    optimalTarget: 'Faixa ideal: 1h a 2h por noite (20% a 25%)',
  },
  nof1: {
    title: 'N-of-1 (Ensaio Pessoal Controlado)',
    shortDescription: 'Metodologia científica onde o próprio indivíduo testa intervenções contra períodos de controle.',
    whyItMatters: 'Permite validar se um protocolo de longevidade funciona especificamente na sua biologia individual.',
    optimalTarget: 'Rigor experimental e consistência de dados',
  },
  respiratory_rate: {
    title: 'Taxa Respiratória Noturna (rpm)',
    shortDescription: 'Número médio de respirações por minuto durante o descanso noturno.',
    whyItMatters: 'Métrica estável; aumentos súbitos costumam ser sinais precoces de infecção ou fadiga.',
    optimalTarget: 'Estabilidade na baseline (típico: 12 a 16 rpm)',
  },
};

export interface TermHelpProps {
  termKey?: string;
  customTitle?: string;
  customDescription?: string;
  customWhyItMatters?: string;
  customTarget?: string;
  children?: React.ReactNode;
  showIcon?: boolean;
  placement?: 'top' | 'bottom';
  className?: string;
}

export const TermHelp: React.FC<TermHelpProps> = ({
  termKey,
  customTitle,
  customDescription,
  customWhyItMatters,
  customTarget,
  children,
  showIcon = true,
  placement = 'top',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  // Resolve definition from dictionary or custom overrides
  const resolvedDef = termKey ? GLOSSARY_TERMS[termKey.toLowerCase()] : undefined;
  const title = customTitle || resolvedDef?.title || termKey || 'Conceito Clínico';
  const description = customDescription || resolvedDef?.shortDescription || 'Informações clínicas contextuais.';
  const whyItMatters = customWhyItMatters || resolvedDef?.whyItMatters;
  const optimalTarget = customTarget || resolvedDef?.optimalTarget;

  // Fechar com tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Fechar ao clicar fora
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center gap-1 align-baseline ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Trigger */}
      {children ? (
        <span
          className="inline-flex items-center gap-1 border-b border-dotted border-slate-400 dark:border-slate-500 cursor-help"
          tabIndex={0}
          role="button"
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-describedby={isOpen ? tooltipId : undefined}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
        >
          {children}
          {showIcon && (
            <HelpCircle className="h-3 w-3 text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400 shrink-0 transition-colors" />
          )}
        </span>
      ) : (
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-describedby={isOpen ? tooltipId : undefined}
          aria-label={`Entender ${title}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          className="p-0.5 rounded-full text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-help focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Popover / Tooltip */}
      {isOpen && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`absolute z-50 w-72 max-w-[calc(100vw-32px)] p-3.5 rounded-2xl shadow-dialog border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-left text-xs transition-all pointer-events-auto ${
            placement === 'top'
              ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
              : 'top-full mt-2 left-1/2 -translate-x-1/2'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
              <Sparkles className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
              <span>{title}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md"
              aria-label="Fechar ajuda"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* Description ("O que é?") */}
          <div className="space-y-2 text-slate-600 dark:text-slate-300">
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 block text-[11px] uppercase tracking-wider text-xs mb-0.5">
                O que é:
              </span>
              <p className="text-[11px] leading-relaxed">{description}</p>
            </div>

            {/* Why It Matters ("Por que importa?") */}
            {whyItMatters && (
              <div>
                <span className="font-semibold text-cyan-600 dark:text-cyan-400 block text-[11px] uppercase tracking-wider text-xs mb-0.5">
                  Importância para a longevidade:
                </span>
                <p className="text-[11px] leading-relaxed">{whyItMatters}</p>
              </div>
            )}

            {/* Optimal Direction ("Direção Ótima") */}
            {optimalTarget && (
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Alvo / Direção:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  {optimalTarget}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  );
};
