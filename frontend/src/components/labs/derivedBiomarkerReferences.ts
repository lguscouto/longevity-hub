/**
 * Motor de Avaliação Clínica e Referências de Biomarcadores Derivados.
 *
 * Módulo determinístico que fornece categorização de status clínico
 * ('optimal' | 'normal' | 'attention' | 'alert' | 'neutral'),
 * notas interpretativas baseadas na literatura médica e pontos de corte
 * para mini-gauges visuais.
 */

export type ClinicalEvaluationStatus = 'optimal' | 'normal' | 'attention' | 'alert' | 'neutral';

export interface EvaluationResult {
  status: ClinicalEvaluationStatus;
  badgeLabel: string;
  clinicalNote: string;
  referenceText: string;
  optimalText?: string;
  gaugePercent: number; // 0 a 100 para barra linear
  borderAccentClass: string; // ex: 'border-l-emerald-500'
  badgeVariant: 'success' | 'info' | 'warning' | 'error' | 'neutral';
}

export interface MetricEvaluationContext {
  sex?: string | null;
  age?: number | null;
  backendReference?: string | null;
  backendOptimal?: string | null;
}

const clamp = (val: number, min = 0, max = 100): number => {
  return Math.max(min, Math.min(max, Math.round(val)));
};

export function evaluateDerivedMetric(
  metricId: string,
  value: number | null,
  context?: MetricEvaluationContext
): EvaluationResult {
  const isFemale = context?.sex?.toLowerCase().startsWith('f') || false;
  const age = typeof context?.age === 'number' && !isNaN(context.age) ? context.age : undefined;
  const refText = context?.backendReference || '—';
  const optText = context?.backendOptimal || undefined;

  // 1. Tratamento para valor nulo ou indefinido
  if (value === null || value === undefined || isNaN(value)) {
    return {
      status: 'neutral',
      badgeLabel: 'Pendente',
      clinicalNote: 'Aguardando exames laboratoriais ou medições necessárias para o cálculo.',
      referenceText: refText,
      optimalText: optText,
      gaugePercent: 0,
      borderAccentClass: 'border-l-slate-300 dark:border-l-slate-700',
      badgeVariant: 'neutral',
    };
  }

  // 2. Avaliações específicas por identificador de métrica
  switch (metricId) {
    // -------------------------------------------------------------------------
    // Idade Biológica & Gaps
    // -------------------------------------------------------------------------
    case 'phenoage_gap': {
      if (value < -2.0) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Rejuvenescimento biológico estimado acentuado (> 2 anos mais jovem que a idade cronológica).',
          referenceText: '-2.0 a +2.0 anos',
          optimalText: '< -2.0 anos',
          gaugePercent: clamp(((value + 6) / 12) * 100, 5, 30),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value <= 0.0) {
        return {
          status: 'optimal',
          badgeLabel: 'Favorável',
          clinicalNote: 'Idade biológica favorável, inferior à idade cronológica.',
          referenceText: '-2.0 a +2.0 anos',
          optimalText: '< -2.0 anos',
          gaugePercent: clamp(((value + 6) / 12) * 100, 31, 49),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value <= 2.0) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Idade biológica alinhada à idade cronológica (dentro da margem esperada).',
          referenceText: '-2.0 a +2.0 anos',
          optimalText: '< -2.0 anos',
          gaugePercent: clamp(((value + 6) / 12) * 100, 50, 65),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value <= 5.0) {
        return {
          status: 'attention',
          badgeLabel: 'Atenção',
          clinicalNote: 'Idade biológica moderadamente superior à cronológica (envelhecimento ligeiramente adiantado).',
          referenceText: '-2.0 a +2.0 anos',
          optimalText: '< -2.0 anos',
          gaugePercent: clamp(((value + 6) / 12) * 100, 66, 85),
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alerta',
        clinicalNote: 'Envelhecimento biológico acelerado clinicamente relevante (> 5 anos além da idade cronológica).',
        referenceText: '-2.0 a +2.0 anos',
        optimalText: '< -2.0 anos',
        gaugePercent: 95,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    case 'light_bioage_diff':
    case 'gold_bioage_diff':
    case 'kdm_accel_v2': {
      if (value < -1.0) {
        return {
          status: 'optimal',
          badgeLabel: 'Favorável',
          clinicalNote: 'Idade biológica favorável, inferior à idade cronológica.',
          referenceText: '-2.0 a +2.0 anos',
          optimalText: '< 0.0 anos',
          gaugePercent: clamp(((value + 5) / 10) * 100, 10, 40),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value <= 1.5) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Diferença biológica dentro do intervalo de tolerância e calibração.',
          referenceText: '-2.0 a +2.0 anos',
          optimalText: '< 0.0 anos',
          gaugePercent: clamp(((value + 5) / 10) * 100, 41, 65),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value <= 4.0) {
        return {
          status: 'attention',
          badgeLabel: 'Atenção',
          clinicalNote: 'Ritmo de envelhecimento superior à idade cronológica.',
          referenceText: '-2.0 a +2.0 anos',
          optimalText: '< 0.0 anos',
          gaugePercent: 78,
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alerta',
        clinicalNote: 'Envelhecimento acelerado detectado pelo modelo comparativo.',
        referenceText: '-2.0 a +2.0 anos',
        optimalText: '< 0.0 anos',
        gaugePercent: 95,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    case 'phenoage':
    case 'light_bioage':
    case 'gold_bioage':
    case 'kdm_bioage_v2': {
      if (age !== undefined) {
        const gap = value - age;
        const res = evaluateDerivedMetric('phenoage_gap', gap, context);
        return {
          ...res,
          referenceText: `± 2.0a da cronológica (${(age - 2).toFixed(0)} a ${(age + 2).toFixed(0)} anos)`,
          optimalText: `< ${age.toFixed(0)} anos (rejuvenescimento)`,
          clinicalNote: `Gap de ${gap > 0 ? '+' : ''}${gap.toFixed(1)} anos vs. idade cronológica (${age.toFixed(0)}a). ${res.clinicalNote}`,
        };
      }
      return {
        status: 'normal',
        badgeLabel: 'Estimado',
        clinicalNote: 'Idade biológica estimada pelo modelo com base em biomarcadores clínicos.',
        referenceText: refText !== '—' ? refText : 'Idade cronológica ± 2.0 anos',
        optimalText: optText || '< Idade cronológica',
        gaugePercent: 50,
        borderAccentClass: 'border-l-blue-500',
        badgeVariant: 'info',
      };
    }

    // -------------------------------------------------------------------------
    // Metabolismo & Sensibilidade à Insulina
    // -------------------------------------------------------------------------
    case 'homa_ir': {
      if (value < 1.0) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Alta sensibilidade à insulina e excelente eficiência glicometabólica.',
          referenceText: '< 2.0 (normal) / < 2.5 (limítrofe)',
          optimalText: '< 1.0 (alta sensibilidade)',
          gaugePercent: clamp((value / 3.5) * 100, 10, 28),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value < 2.0) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Sensibilidade à insulina dentro do padrão basal esperado.',
          referenceText: '< 2.0 (normal) / < 2.5 (limítrofe)',
          optimalText: '< 1.0 (alta sensibilidade)',
          gaugePercent: clamp((value / 3.5) * 100, 29, 57),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value < 3.0) {
        return {
          status: 'attention',
          badgeLabel: 'Atenção',
          clinicalNote: 'Sensibilidade à insulina limítrofe com tendência à resistência insulínica.',
          referenceText: '< 2.0 (normal) / < 2.5 (limítrofe)',
          optimalText: '< 1.0 (alta sensibilidade)',
          gaugePercent: clamp((value / 3.5) * 100, 58, 85),
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alerta',
        clinicalNote: 'Resistência insulínica significativa com sobrecarga metabólica pancreática.',
        referenceText: '< 2.0 (normal) / < 2.5 (limítrofe)',
        optimalText: '< 1.0 (alta sensibilidade)',
        gaugePercent: 95,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    case 'quicki': {
      if (value >= 0.38) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Alta sensibilidade à insulina no modelo quantitativo.',
          referenceText: '> 0.33',
          optimalText: '≥ 0.38',
          gaugePercent: 88,
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value >= 0.33) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Sensibilidade insulínica satisfatória.',
          referenceText: '> 0.33',
          optimalText: '≥ 0.38',
          gaugePercent: 60,
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value >= 0.30) {
        return {
          status: 'attention',
          badgeLabel: 'Atenção',
          clinicalNote: 'Sensibilidade insulínica reduzida (faixa limítrofe).',
          referenceText: '> 0.33',
          optimalText: '≥ 0.38',
          gaugePercent: 35,
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alerta',
        clinicalNote: 'Resistência à insulina acentuada no índice QUICKI.',
        referenceText: '> 0.33',
        optimalText: '≥ 0.38',
        gaugePercent: 15,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    case 'tyg_index': {
      if (value < 8.0) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Excelente controle triglicerídeo-glicêmico e baixo risco de esteatose.',
          referenceText: '< 8.5',
          optimalText: '< 8.0',
          gaugePercent: clamp(((value - 7.0) / 3.0) * 100, 10, 33),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value < 8.5) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Índice TyG dentro da normalidade basal.',
          referenceText: '< 8.5',
          optimalText: '< 8.0',
          gaugePercent: clamp(((value - 7.0) / 3.0) * 100, 34, 50),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value < 9.0) {
        return {
          status: 'attention',
          badgeLabel: 'Atenção',
          clinicalNote: 'Risco moderado de resistência insulínica e acúmulo lipídico hepático.',
          referenceText: '< 8.5',
          optimalText: '< 8.0',
          gaugePercent: clamp(((value - 7.0) / 3.0) * 100, 51, 75),
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alerta',
        clinicalNote: 'Forte correlação com resistência insulínica periférica e risco metabólico.',
        referenceText: '< 8.5',
        optimalText: '< 8.0',
        gaugePercent: 92,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    // -------------------------------------------------------------------------
    // Cardiovascular & Risco Lipídico
    // -------------------------------------------------------------------------
    case 'aip': {
      if (value < 0.0) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Baixíssimo risco aterogênico; predomínio de partículas LDL amplas e flutuantes (fenótipo A).',
          referenceText: '< 0.11 (baixo risco)',
          optimalText: '< 0.00 (baixíssimo risco)',
          gaugePercent: clamp(((value + 0.3) / 0.8) * 100, 10, 37),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value <= 0.10) {
        return {
          status: 'normal',
          badgeLabel: 'Baixo Risco',
          clinicalNote: 'Baixo risco aterogênico e equilíbrio lipídico satisfatório.',
          referenceText: '< 0.11 (baixo risco)',
          optimalText: '< 0.00 (baixíssimo risco)',
          gaugePercent: clamp(((value + 0.3) / 0.8) * 100, 38, 55),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value <= 0.21) {
        return {
          status: 'attention',
          badgeLabel: 'Risco Moderado',
          clinicalNote: 'Risco aterogênico moderado; potencial aumento de partículas LDL pequenas e densas.',
          referenceText: '< 0.11 (baixo risco)',
          optimalText: '< 0.00 (baixíssimo risco)',
          gaugePercent: clamp(((value + 0.3) / 0.8) * 100, 56, 75),
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alto Risco',
        clinicalNote: 'Alto risco aterogênico; forte probabilidade de padrão B aterogênico (partículas densas).',
        referenceText: '< 0.11 (baixo risco)',
        optimalText: '< 0.00 (baixíssimo risco)',
        gaugePercent: 95,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    case 'castelli_1': {
      const cutOpt = isFemale ? 3.0 : 3.5;
      const cutNorm = isFemale ? 4.0 : 4.5;
      const cutAtt = isFemale ? 5.0 : 5.5;

      if (value < cutOpt) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Relação Colesterol Total / HDL excelente, associada a proteção vascular.',
          referenceText: isFemale ? '< 4.0 (mulheres)' : '< 4.5 (homens)',
          optimalText: `< ${cutOpt}`,
          gaugePercent: clamp((value / 6.5) * 100, 10, 35),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value <= cutNorm) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Relação dentro do intervalo aceitável de risco coronariano.',
          referenceText: isFemale ? '< 4.0 (mulheres)' : '< 4.5 (homens)',
          optimalText: `< ${cutOpt}`,
          gaugePercent: clamp((value / 6.5) * 100, 36, 60),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value <= cutAtt) {
        return {
          status: 'attention',
          badgeLabel: 'Atenção',
          clinicalNote: 'Risco cardiovascular moderadamente aumentado.',
          referenceText: isFemale ? '< 4.0 (mulheres)' : '< 4.5 (homens)',
          optimalText: `< ${cutOpt}`,
          gaugePercent: clamp((value / 6.5) * 100, 61, 80),
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alerta',
        clinicalNote: 'Risco coronariano aterogênico significativamente elevado.',
        referenceText: isFemale ? '< 4.0 (mulheres)' : '< 4.5 (homens)',
        optimalText: `< ${cutOpt}`,
        gaugePercent: 95,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    case 'castelli_2': {
      const cutOpt = isFemale ? 1.8 : 2.0;
      const cutNorm = isFemale ? 2.5 : 3.0;
      const cutAtt = isFemale ? 3.3 : 3.8;

      if (value < cutOpt) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Excelente proporção LDL/HDL com alta proteção endotelial.',
          referenceText: isFemale ? '< 2.5 (mulheres)' : '< 3.0 (homens)',
          optimalText: `< ${cutOpt.toFixed(1)}`,
          gaugePercent: clamp((value / 4.5) * 100, 10, 35),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value <= cutNorm) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Proporção LDL/HDL dentro do alvo desejável.',
          referenceText: isFemale ? '< 2.5 (mulheres)' : '< 3.0 (homens)',
          optimalText: `< ${cutOpt.toFixed(1)}`,
          gaugePercent: clamp((value / 4.5) * 100, 36, 60),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value <= cutAtt) {
        return {
          status: 'attention',
          badgeLabel: 'Atenção',
          clinicalNote: 'Proporção LDL/HDL discretamente elevada; risco cardiovascular moderado.',
          referenceText: isFemale ? '< 2.5 (mulheres)' : '< 3.0 (homens)',
          optimalText: `< ${cutOpt.toFixed(1)}`,
          gaugePercent: clamp((value / 4.5) * 100, 61, 80),
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alerta',
        clinicalNote: 'Desequilíbrio entre frações aterogênicas e protetoras.',
        referenceText: isFemale ? '< 2.5 (mulheres)' : '< 3.0 (homens)',
        optimalText: `< ${cutOpt.toFixed(1)}`,
        gaugePercent: 90,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    case 'tg_hdl_ratio': {
      const cutOpt = 1.5;
      const cutNorm = isFemale ? 2.0 : 2.5;
      const cutAtt = isFemale ? 3.0 : 3.5;

      if (value < cutOpt) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Forte indicativo de sensibilidade à insulina e LDL de padrão favorável.',
          referenceText: isFemale ? '< 2.0 (mulheres)' : '< 2.5 (homens)',
          optimalText: '< 1.5',
          gaugePercent: clamp((value / 4.0) * 100, 10, 35),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value <= cutNorm) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Relação triglicerídeos/HDL adequada.',
          referenceText: isFemale ? '< 2.0 (mulheres)' : '< 2.5 (homens)',
          optimalText: '< 1.5',
          gaugePercent: clamp((value / 4.0) * 100, 36, 60),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value <= cutAtt) {
        return {
          status: 'attention',
          badgeLabel: 'Atenção',
          clinicalNote: 'Relação triglicerídeos/HDL limítrofe; risco moderado de partículas densas e resistência insulínica.',
          referenceText: isFemale ? '< 2.0 (mulheres)' : '< 2.5 (homens)',
          optimalText: '< 1.5',
          gaugePercent: clamp((value / 4.0) * 100, 61, 80),
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alerta',
        clinicalNote: 'Associação frequente com resistência insulínica e partículas aterogênicas.',
        referenceText: isFemale ? '< 2.0 (mulheres)' : '< 2.5 (homens)',
        optimalText: '< 1.5',
        gaugePercent: 90,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    case 'non_hdl_cholesterol': {
      if (value < 100) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Carga total de lipoproteínas aterogênicas em nível ideal protetor.',
          referenceText: '< 130 mg/dL',
          optimalText: '< 100 mg/dL',
          gaugePercent: clamp((value / 180) * 100, 10, 35),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value <= 130) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Colesterol Não-HDL em nível adequado para prevenção primária.',
          referenceText: '< 130 mg/dL',
          optimalText: '< 100 mg/dL',
          gaugePercent: clamp((value / 180) * 100, 36, 65),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value <= 160) {
        return {
          status: 'attention',
          badgeLabel: 'Atenção',
          clinicalNote: 'Nível moderadamente elevado de partículas aterogênicas.',
          referenceText: '< 130 mg/dL',
          optimalText: '< 100 mg/dL',
          gaugePercent: clamp((value / 180) * 100, 66, 85),
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alerta',
        clinicalNote: 'Excesso relevante de colesterol aterogênico circulante.',
        referenceText: '< 130 mg/dL',
        optimalText: '< 100 mg/dL',
        gaugePercent: 95,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    case 'remnant_cholesterol': {
      if (value < 20) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Colesterol remanescente em nível mínimo protetor de risco residual.',
          referenceText: '< 30 mg/dL',
          optimalText: '< 20 mg/dL',
          gaugePercent: clamp((value / 40) * 100, 10, 35),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value <= 30) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Remanescentes de quilomícrons e VLDL dentro do padrão seguro.',
          referenceText: '< 30 mg/dL',
          optimalText: '< 20 mg/dL',
          gaugePercent: clamp((value / 40) * 100, 36, 65),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value <= 40) {
        return {
          status: 'attention',
          badgeLabel: 'Atenção',
          clinicalNote: 'Colesterol remanescente moderadamente elevado; risco aterogênico residual intermediário.',
          referenceText: '< 30 mg/dL',
          optimalText: '< 20 mg/dL',
          gaugePercent: clamp((value / 40) * 100, 66, 85),
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alerta',
        clinicalNote: 'Risco aterogênico residual significativo associado a triglicerídeos.',
        referenceText: '< 30 mg/dL',
        optimalText: '< 20 mg/dL',
        gaugePercent: 90,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    // -------------------------------------------------------------------------
    // Fígado, Esteatose & Fibrose
    // -------------------------------------------------------------------------
    case 'fib4': {
      const cutLow = age !== undefined && age >= 65 ? 2.0 : 1.30;
      if (value < 1.0) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Excelente valor preditivo negativo para fibrose avançada (F3-F4 altamente improvável).',
          referenceText: `< ${cutLow.toFixed(2)} (<65a: 1.30 / ≥65a: 2.0)`,
          optimalText: '< 1.0',
          gaugePercent: clamp((value / 3.0) * 100, 10, 30),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value <= cutLow) {
        return {
          status: 'normal',
          badgeLabel: 'Baixa Probabilidade',
          clinicalNote: 'Baixa probabilidade de fibrose hepática avançada de acordo com a faixa etária.',
          referenceText: `< ${cutLow.toFixed(2)} (<65a: 1.30 / ≥65a: 2.0)`,
          optimalText: '< 1.0',
          gaugePercent: clamp((value / 3.0) * 100, 31, 55),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value <= 2.67) {
        return {
          status: 'attention',
          badgeLabel: 'Indeterminado',
          clinicalNote: 'Zona intermediária do FIB-4; recomenda-se correlação com elastografia ou métodos complementares.',
          referenceText: `< ${cutLow.toFixed(2)} (<65a: 1.30 / ≥65a: 2.0)`,
          optimalText: '< 1.0',
          gaugePercent: clamp((value / 3.0) * 100, 56, 80),
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alerta',
        clinicalNote: 'Alta probabilidade de fibrose hepática significativa (F3-F4). Exige investigação especializada.',
        referenceText: `< ${cutLow.toFixed(2)} (<65a: 1.30 / ≥65a: 2.0)`,
        optimalText: '< 1.0',
        gaugePercent: 95,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    case 'fli': {
      if (value < 20) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Esteatose hepática altamente improvável no algoritmo do Fatty Liver Index.',
          referenceText: '< 30 (esteatose improvável)',
          optimalText: '< 20',
          gaugePercent: clamp(value, 5, 25),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value < 30) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Baixa probabilidade de infiltração gordurosa no fígado.',
          referenceText: '< 30 (esteatose improvável)',
          optimalText: '< 20',
          gaugePercent: clamp(value, 26, 45),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value < 60) {
        return {
          status: 'attention',
          badgeLabel: 'Indeterminado',
          clinicalNote: 'Faixa intermediária de risco; recomendada confirmação ultrassonográfica.',
          referenceText: '< 30 (esteatose improvável)',
          optimalText: '< 20',
          gaugePercent: clamp(value, 46, 75),
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alerta',
        clinicalNote: 'Alta probabilidade de esteatose hepática (acúmulo gorduroso significativo).',
        referenceText: '< 30 (esteatose improvável)',
        optimalText: '< 20',
        gaugePercent: 92,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    case 'hsi': {
      if (value < 25.0) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Esteatose improvável com excelente perfil aminotransferases/IMC.',
          referenceText: '< 30.0',
          optimalText: '< 25.0',
          gaugePercent: 20,
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value < 30.0) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Esteatose hepática improvável.',
          referenceText: '< 30.0',
          optimalText: '< 25.0',
          gaugePercent: 45,
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value < 36.0) {
        return {
          status: 'attention',
          badgeLabel: 'Atenção',
          clinicalNote: 'Zona intermediária do Hepatic Steatosis Index.',
          referenceText: '< 30.0',
          optimalText: '< 25.0',
          gaugePercent: 70,
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alerta',
        clinicalNote: 'Alta probabilidade de esteatose hepática.',
        referenceText: '< 30.0',
        optimalText: '< 25.0',
        gaugePercent: 92,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    case 'ast_alt_ratio': {
      if (value < 0.8) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Relação AST/ALT favorável; perfil enzimático comum em homeostase hepática.',
          referenceText: '0.8 a 1.2',
          optimalText: '< 1.0',
          gaugePercent: clamp((value / 2.5) * 100, 10, 32),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value <= 1.2) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Relação AST/ALT dentro dos limites usuais de integridade hepatocitária.',
          referenceText: '0.8 a 1.2',
          optimalText: '< 1.0',
          gaugePercent: clamp((value / 2.5) * 100, 33, 55),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value <= 2.0) {
        return {
          status: 'attention',
          badgeLabel: 'Atenção',
          clinicalNote: 'Relação AST/ALT invertida; sugere estresse hepatocelular crônico ou progressão fibrosante.',
          referenceText: '0.8 a 1.2',
          optimalText: '< 1.0',
          gaugePercent: clamp((value / 2.5) * 100, 56, 80),
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alerta',
        clinicalNote: 'Relação AST/ALT > 2.0; forte correlação com lesão parenquimatosa avançada ou hepatopatia alcoólica.',
        referenceText: '0.8 a 1.2',
        optimalText: '< 1.0',
        gaugePercent: 95,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    case 'apri': {
      if (value < 0.5) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Índice APRI baixo; fibrose hepática significativa improvável.',
          referenceText: '< 0.5 (fibrose improvável)',
          optimalText: '< 0.5',
          gaugePercent: clamp((value / 2.0) * 100, 10, 30),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value <= 1.0) {
        return {
          status: 'attention',
          badgeLabel: 'Indeterminado',
          clinicalNote: 'Zona intermediária do APRI; recomendada avaliação elastográfica complementar.',
          referenceText: '< 0.5 (fibrose improvável)',
          optimalText: '< 0.5',
          gaugePercent: clamp((value / 2.0) * 100, 35, 65),
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alerta',
        clinicalNote: 'Alta probabilidade de fibrose hepática avançada ou cirrose pelo escore APRI.',
        referenceText: '< 0.5 (fibrose improvável)',
        optimalText: '< 0.5',
        gaugePercent: 92,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    // -------------------------------------------------------------------------
    // Inflamação & Imunidade
    // -------------------------------------------------------------------------
    case 'nlr': {
      if (value < 0.7) {
        return {
          status: 'attention',
          badgeLabel: 'Atenção',
          clinicalNote: 'NLR acentuadamente reduzido; sugere neutropenia relativa ou linfocitose.',
          referenceText: '1.0 a 3.0',
          optimalText: '1.2 a 2.0',
          gaugePercent: 12,
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      if (value < 1.0) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'NLR na faixa limítrofe inferior, compatível com predomínio linfocitário.',
          referenceText: '1.0 a 3.0',
          optimalText: '1.2 a 2.0',
          gaugePercent: 20,
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value >= 1.2 && value <= 2.0) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Balanço neutrófilos/linfócitos ideal, compatível com homeostase imunológica.',
          referenceText: '1.0 a 3.0',
          optimalText: '1.2 a 2.0',
          gaugePercent: clamp(((value - 0.5) / 3.5) * 100, 25, 45),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value <= 3.0) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Razão NLR dentro dos limites fisiológicos da população saudável.',
          referenceText: '1.0 a 3.0',
          optimalText: '1.2 a 2.0',
          gaugePercent: clamp(((value - 0.5) / 3.5) * 100, 46, 65),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value <= 4.5) {
        return {
          status: 'attention',
          badgeLabel: 'Atenção',
          clinicalNote: 'Nível moderadamente elevado; sugere ativação imune ou estresse inflamatório crônico.',
          referenceText: '1.0 a 3.0',
          optimalText: '1.2 a 2.0',
          gaugePercent: 78,
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alerta',
        clinicalNote: 'Desvio imunitário acentuado (resposta inflamatória sistêmica ou linfopenia).',
        referenceText: '1.0 a 3.0',
        optimalText: '1.2 a 2.0',
        gaugePercent: 95,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    case 'plr': {
      if (value >= 90 && value <= 140) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Balanço plaquetas/linfócitos equilibrado.',
          referenceText: '80 a 180',
          optimalText: '90 a 140',
          gaugePercent: 35,
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value >= 80 && value <= 180) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Razão PLR dentro da faixa fisiológica.',
          referenceText: '80 a 180',
          optimalText: '90 a 140',
          gaugePercent: 50,
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      return {
        status: 'attention',
        badgeLabel: 'Atenção',
        clinicalNote: 'Variação na reatividade trombocítica ou imunológica.',
        referenceText: '80 a 180',
        optimalText: '90 a 140',
        gaugePercent: 80,
        borderAccentClass: 'border-l-amber-500',
        badgeVariant: 'warning',
      };
    }

    case 'sii': {
      if (value < 450) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Índice de inflamação imune sistêmica muito baixo e protetor.',
          referenceText: '< 600',
          optimalText: '< 450',
          gaugePercent: clamp((value / 800) * 100, 10, 35),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value <= 600) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Nível inflamatório sistêmico basal aceitável.',
          referenceText: '< 600',
          optimalText: '< 450',
          gaugePercent: clamp((value / 800) * 100, 36, 65),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alerta',
        clinicalNote: 'Carga imuno-inflamatória sistêmica elevada.',
        referenceText: '< 600',
        optimalText: '< 450',
        gaugePercent: 90,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    case 'siri': {
      if (value < 0.8) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Índice SIRI baixo; ausência de hiper-reatividade monocítico-neutrofílica.',
          referenceText: '< 1.2',
          optimalText: '< 0.8',
          gaugePercent: clamp((value / 2.5) * 100, 10, 30),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value <= 1.2) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Equilíbrio monocítico-neutrofílico dentro do padrão basal.',
          referenceText: '< 1.2',
          optimalText: '< 0.8',
          gaugePercent: clamp((value / 2.5) * 100, 31, 55),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value <= 2.0) {
        return {
          status: 'attention',
          badgeLabel: 'Atenção',
          clinicalNote: 'Ativação moderada da resposta imune inata com sobrecarga monocítica.',
          referenceText: '< 1.2',
          optimalText: '< 0.8',
          gaugePercent: clamp((value / 2.5) * 100, 56, 80),
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alerta',
        clinicalNote: 'Inflamação sistêmica acentuada no índice SIRI.',
        referenceText: '< 1.2',
        optimalText: '< 0.8',
        gaugePercent: 95,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    case 'piv': {
      if (value < 300) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Pan-Immune-Inflammation Value excelente, compatível com homeostase imunológica.',
          referenceText: '< 450',
          optimalText: '< 300',
          gaugePercent: clamp((value / 600) * 100, 10, 35),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value <= 450) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Valor PIV dentro do intervalo populacional satisfatório.',
          referenceText: '< 450',
          optimalText: '< 300',
          gaugePercent: clamp((value / 600) * 100, 36, 60),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value <= 600) {
        return {
          status: 'attention',
          badgeLabel: 'Atenção',
          clinicalNote: 'Ativação imuno-inflamatória combinada (neutrófilos, plaquetas e monócitos).',
          referenceText: '< 450',
          optimalText: '< 300',
          gaugePercent: clamp((value / 600) * 100, 61, 85),
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alerta',
        clinicalNote: 'Índice PIV significativamente elevado; sobrecarga celular pró-inflamatória.',
        referenceText: '< 450',
        optimalText: '< 300',
        gaugePercent: 95,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    // -------------------------------------------------------------------------
    // Função Renal & Filtração Glomerular
    // -------------------------------------------------------------------------
    case 'egfr': {
      if (value >= 90) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Função de filtração glomerular normal ou excelente.',
          referenceText: '≥ 60 mL/min/1.73m²',
          optimalText: '≥ 90 mL/min/1.73m²',
          gaugePercent: 90,
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value >= 60) {
        return {
          status: 'normal',
          badgeLabel: 'Leve Redução',
          clinicalNote: 'Filtração glomerular discretamente diminuída para faixa etária jovem ou normal para senescência.',
          referenceText: '≥ 60 mL/min/1.73m²',
          optimalText: '≥ 90 mL/min/1.73m²',
          gaugePercent: 65,
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value >= 45) {
        return {
          status: 'attention',
          badgeLabel: 'Atenção',
          clinicalNote: 'Redução moderada da taxa de filtração glomerular (Estágio G3a).',
          referenceText: '≥ 60 mL/min/1.73m²',
          optimalText: '≥ 90 mL/min/1.73m²',
          gaugePercent: 40,
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alerta',
        clinicalNote: 'Declínio significativo da função renal (Estágio G3b ou superior).',
        referenceText: '≥ 60 mL/min/1.73m²',
        optimalText: '≥ 90 mL/min/1.73m²',
        gaugePercent: 20,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    // -------------------------------------------------------------------------
    // Adiposidade & Composição Corporal
    // -------------------------------------------------------------------------
    case 'bmi': {
      if (value >= 21.0 && value <= 23.5) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Faixa antropométrica epidemiologicamente associada à menor mortalidade e maior longevidade.',
          referenceText: '18.5 a 24.9 kg/m²',
          optimalText: '21.0 a 23.5 kg/m²',
          gaugePercent: 40,
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value >= 18.5 && value <= 24.9) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Índice de massa corporal dentro dos limites saudáveis da OMS.',
          referenceText: '18.5 a 24.9 kg/m²',
          optimalText: '21.0 a 23.5 kg/m²',
          gaugePercent: clamp(((value - 18.5) / 11.5) * 100, 20, 55),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value >= 25.0 && value < 30.0) {
        return {
          status: 'attention',
          badgeLabel: 'Sobrepeso',
          clinicalNote: 'Sobrepeso ponderal; recomenda-se verificar composição muscular e gordura visceral.',
          referenceText: '18.5 a 24.9 kg/m²',
          optimalText: '21.0 a 23.5 kg/m²',
          gaugePercent: 70,
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      if (value >= 30.0) {
        return {
          status: 'alert',
          badgeLabel: 'Obesidade',
          clinicalNote: 'Obesidade clínica; risco metabólico e cardiovascular ampliado.',
          referenceText: '18.5 a 24.9 kg/m²',
          optimalText: '21.0 a 23.5 kg/m²',
          gaugePercent: 92,
          borderAccentClass: 'border-l-rose-500',
          badgeVariant: 'error',
        };
      }
      return {
        status: 'attention',
        badgeLabel: 'Baixo Peso',
        clinicalNote: 'Abaixo do peso ideal; investigar risco de sarcopenia ou desnutrição.',
        referenceText: '18.5 a 24.9 kg/m²',
        optimalText: '21.0 a 23.5 kg/m²',
        gaugePercent: 12,
        borderAccentClass: 'border-l-amber-500',
        badgeVariant: 'warning',
      };
    }

    case 'whtr': {
      if (value < 0.48) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Excelente proporção cintura/estatura com baixa adiposidade visceral.',
          referenceText: '< 0.50',
          optimalText: '< 0.48',
          gaugePercent: clamp((value / 0.7) * 100, 15, 40),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value <= 0.50) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Circunferência da cintura proporcional à altura corporal.',
          referenceText: '< 0.50',
          optimalText: '< 0.48',
          gaugePercent: clamp((value / 0.7) * 100, 41, 55),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      return {
        status: 'attention',
        badgeLabel: 'Atenção',
        clinicalNote: 'Acúmulo de gordura intra-abdominal com aumento de risco cardiometabólico.',
        referenceText: '< 0.50',
        optimalText: '< 0.48',
        gaugePercent: 82,
        borderAccentClass: 'border-l-amber-500',
        badgeVariant: 'warning',
      };
    }

    case 'rfm': {
      const cutOpt = isFemale ? 25.0 : 18.0;
      const cutNorm = isFemale ? 32.0 : 22.0;

      if (value <= cutOpt && value >= (isFemale ? 18.0 : 10.0)) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Porcentagem de gordura corporal relativa estimada em nível atlético/saudável.',
          referenceText: isFemale ? '20 a 32% (mulheres)' : '10 a 22% (homens)',
          optimalText: isFemale ? '20 a 25%' : '12 a 18%',
          gaugePercent: 35,
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value <= cutNorm) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Massa gorda relativa dentro da faixa de referência para sexo.',
          referenceText: isFemale ? '20 a 32% (mulheres)' : '10 a 22% (homens)',
          optimalText: isFemale ? '20 a 25%' : '12 a 18%',
          gaugePercent: 55,
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      return {
        status: 'attention',
        badgeLabel: 'Atenção',
        clinicalNote: 'Gordura corporal relativa acima do intervalo desejável.',
        referenceText: isFemale ? '20 a 32% (mulheres)' : '10 a 22% (homens)',
        optimalText: isFemale ? '20 a 25%' : '12 a 18%',
        gaugePercent: 80,
        borderAccentClass: 'border-l-amber-500',
        badgeVariant: 'warning',
      };
    }

    // -------------------------------------------------------------------------
    // Marcadores Primários Diretos
    // -------------------------------------------------------------------------
    case 'hba1c': {
      if (value < 5.4) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Excelente controle glicêmico médio nos últimos 90 dias.',
          referenceText: '< 5.7%',
          optimalText: '< 5.4%',
          gaugePercent: clamp(((value - 4.5) / 3.0) * 100, 10, 30),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value < 5.7) {
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Glicemia média glicada normal sem evidência de disglicemia.',
          referenceText: '< 5.7%',
          optimalText: '< 5.4%',
          gaugePercent: clamp(((value - 4.5) / 3.0) * 100, 31, 55),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value < 6.5) {
        return {
          status: 'attention',
          badgeLabel: 'Pré-Diabetes',
          clinicalNote: 'Critério de pré-diabetes (ADA); foco em nutrição, exercício e sensibilidade insulínica.',
          referenceText: '< 5.7%',
          optimalText: '< 5.4%',
          gaugePercent: clamp(((value - 4.5) / 3.0) * 100, 56, 80),
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Diabetes',
        clinicalNote: 'Controle glicêmico comprometido na faixa diagnóstica de diabetes.',
        referenceText: '< 5.7%',
        optimalText: '< 5.4%',
        gaugePercent: 95,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    case 'hs_crp': {
      if (value < 0.5) {
        return {
          status: 'optimal',
          badgeLabel: 'Ótimo',
          clinicalNote: 'Inflamação endotelial mínima; excelente marcador de estabilidade vascular.',
          referenceText: '< 1.0 mg/L (baixo risco)',
          optimalText: '< 0.5 mg/L',
          gaugePercent: clamp((value / 3.0) * 100, 10, 25),
          borderAccentClass: 'border-l-emerald-500',
          badgeVariant: 'success',
        };
      }
      if (value <= 1.0) {
        return {
          status: 'normal',
          badgeLabel: 'Baixo Risco',
          clinicalNote: 'Baixo risco inflamatório vascular e aterogênico.',
          referenceText: '< 1.0 mg/L (baixo risco)',
          optimalText: '< 0.5 mg/L',
          gaugePercent: clamp((value / 3.0) * 100, 26, 50),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      if (value <= 3.0) {
        return {
          status: 'attention',
          badgeLabel: 'Risco Moderado',
          clinicalNote: 'Ativação inflamatória moderada; investigar estressores metabólicos ou estilo de vida.',
          referenceText: '< 1.0 mg/L (baixo risco)',
          optimalText: '< 0.5 mg/L',
          gaugePercent: clamp((value / 3.0) * 100, 51, 80),
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'alert',
        badgeLabel: 'Alto Risco',
        clinicalNote: 'Inflamação sistêmica acentuada; avaliar focos inflamatórios ou infecção recente.',
        referenceText: '< 1.0 mg/L (baixo risco)',
        optimalText: '< 0.5 mg/L',
        gaugePercent: 95,
        borderAccentClass: 'border-l-rose-500',
        badgeVariant: 'error',
      };
    }

    case 'total_testosterone': {
      // Homens vs Mulheres
      if (!isFemale) {
        if (value < 300) {
          return {
            status: 'attention',
            badgeLabel: 'Baixa',
            clinicalNote: 'Níveis abaixo do limiar basal masculino; investigar causas de hipogonadismo e fadiga.',
            referenceText: '300 a 890 ng/dL',
            optimalText: '500 a 750 ng/dL',
            gaugePercent: clamp((value / 1200) * 100, 5, 25),
            borderAccentClass: 'border-l-amber-500',
            badgeVariant: 'warning',
          };
        }
        if (value > 1000) {
          return {
            status: 'normal',
            badgeLabel: 'Suprafisiológico',
            clinicalNote: 'Níveis elevados compatíveis com terapia de reposição hormonal (TRT); monitorar hematócrito e perfil lipídico.',
            referenceText: '300 a 890 ng/dL',
            optimalText: '500 a 750 ng/dL',
            gaugePercent: 90,
            borderAccentClass: 'border-l-blue-500',
            badgeVariant: 'info',
          };
        }
        return {
          status: 'normal',
          badgeLabel: 'Normal',
          clinicalNote: 'Níveis basais de testosterona dentro do intervalo de referência clínico.',
          referenceText: '300 a 890 ng/dL',
          optimalText: '500 a 750 ng/dL',
          gaugePercent: clamp((value / 1200) * 100, 26, 75),
          borderAccentClass: 'border-l-blue-500',
          badgeVariant: 'info',
        };
      }
      // Mulheres
      if (value > 70) {
        return {
          status: 'attention',
          badgeLabel: 'Elevada',
          clinicalNote: 'Níveis androgênicos femininos elevados; considerar investigação de SOP.',
          referenceText: '15 a 70 ng/dL',
          optimalText: '20 a 45 ng/dL',
          gaugePercent: 85,
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      return {
        status: 'normal',
        badgeLabel: 'Normal',
        clinicalNote: 'Níveis androgênicos femininos fisiológicos.',
        referenceText: '15 a 70 ng/dL',
        optimalText: '20 a 45 ng/dL',
        gaugePercent: 50,
        borderAccentClass: 'border-l-blue-500',
        badgeVariant: 'info',
      };
    }

    case 'hematocrit': {
      const minRef = isFemale ? 36.0 : 40.0;
      const maxRef = isFemale ? 48.0 : 52.0;
      const minOpt = isFemale ? 38.0 : 42.0;
      const maxOpt = isFemale ? 44.0 : 48.0;

      if (value < minRef) {
        return {
          status: 'attention',
          badgeLabel: 'Baixo',
          clinicalNote: 'Hematócrito reduzido; compatível com anemia ou hemodiluição.',
          referenceText: `${minRef.toFixed(1)} a ${maxRef.toFixed(1)}%`,
          optimalText: `${minOpt.toFixed(1)} a ${maxOpt.toFixed(1)}%`,
          gaugePercent: 20,
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      if (value > maxRef + 2.0) {
        return {
          status: 'alert',
          badgeLabel: 'Elevado / Risco',
          clinicalNote: 'Policitemia / hemoconcentração acentuada; risco aumentado de viscosidade e trombose.',
          referenceText: `${minRef.toFixed(1)} a ${maxRef.toFixed(1)}%`,
          optimalText: `${minOpt.toFixed(1)} a ${maxOpt.toFixed(1)}%`,
          gaugePercent: 95,
          borderAccentClass: 'border-l-rose-500',
          badgeVariant: 'error',
        };
      }
      return {
        status: 'normal',
        badgeLabel: 'Adequado',
        clinicalNote: 'Concentração eritrocitária e viscosidade sanguínea normais.',
        referenceText: `${minRef.toFixed(1)} a ${maxRef.toFixed(1)}%`,
        optimalText: `${minOpt.toFixed(1)} a ${maxOpt.toFixed(1)}%`,
        gaugePercent: clamp(((value - minRef) / (maxRef - minRef)) * 100, 30, 70),
        borderAccentClass: 'border-l-blue-500',
        badgeVariant: 'info',
      };
    }

    case 'hemoglobin': {
      const minRef = isFemale ? 12.0 : 13.5;
      const maxRef = isFemale ? 15.5 : 17.5;
      const minOpt = isFemale ? 13.0 : 14.5;
      const maxOpt = isFemale ? 15.0 : 16.5;

      if (value < minRef) {
        return {
          status: 'attention',
          badgeLabel: 'Anemia / Baixa',
          clinicalNote: 'Hemoglobina diminuída; avaliar ferritina, saturação de transferrina e perfil hematimétrico.',
          referenceText: `${minRef.toFixed(1)} a ${maxRef.toFixed(1)} g/dL`,
          optimalText: `${minOpt.toFixed(1)} a ${maxOpt.toFixed(1)} g/dL`,
          gaugePercent: 20,
          borderAccentClass: 'border-l-amber-500',
          badgeVariant: 'warning',
        };
      }
      if (value > maxRef + 1.0) {
        return {
          status: 'alert',
          badgeLabel: 'Elevada',
          clinicalNote: 'Níveis eritrocitários muito elevados; avaliar causas de eritrocitose primária ou secundária.',
          referenceText: `${minRef.toFixed(1)} a ${maxRef.toFixed(1)} g/dL`,
          optimalText: `${minOpt.toFixed(1)} a ${maxOpt.toFixed(1)} g/dL`,
          gaugePercent: 95,
          borderAccentClass: 'border-l-rose-500',
          badgeVariant: 'error',
        };
      }
      return {
        status: 'normal',
        badgeLabel: 'Eutrófica',
        clinicalNote: 'Capacidade de transporte de oxigênio tecidual fisiológica e preservada.',
        referenceText: `${minRef.toFixed(1)} a ${maxRef.toFixed(1)} g/dL`,
        optimalText: `${minOpt.toFixed(1)} a ${maxOpt.toFixed(1)} g/dL`,
        gaugePercent: clamp(((value - minRef) / (maxRef - minRef)) * 100, 30, 70),
        borderAccentClass: 'border-l-blue-500',
        badgeVariant: 'info',
      };
    }

    // -------------------------------------------------------------------------
    // Fallback padrão genérico para outras métricas
    // -------------------------------------------------------------------------
    default: {
      return {
        status: 'normal',
        badgeLabel: 'Calculado',
        clinicalNote: 'Indicador derivado processado com sucesso pelo algoritmo clínico.',
        referenceText: refText,
        optimalText: optText,
        gaugePercent: 50,
        borderAccentClass: 'border-l-indigo-500',
        badgeVariant: 'info',
      };
    }
  }
}
