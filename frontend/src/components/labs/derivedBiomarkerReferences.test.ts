import { describe, expect, it } from 'vitest';
import { evaluateDerivedMetric } from './derivedBiomarkerReferences';

describe('derivedBiomarkerReferences - Motor de Avaliação Clínica', () => {
  describe('HOMA-IR', () => {
    it('avalia HOMA-IR < 1.0 como ótimo (alta sensibilidade)', () => {
      const res = evaluateDerivedMetric('homa_ir', 0.65);
      expect(res.status).toBe('optimal');
      expect(res.badgeLabel).toBe('Ótimo');
      expect(res.badgeVariant).toBe('success');
      expect(res.borderAccentClass).toContain('emerald');
      expect(res.clinicalNote).toContain('Alta sensibilidade');
      expect(res.optimalText).toBe('< 1.0 (alta sensibilidade)');
      expect(res.gaugePercent).toBeLessThan(30);
    });

    it('avalia HOMA-IR entre 1.0 e 2.0 como normal', () => {
      const res = evaluateDerivedMetric('homa_ir', 1.45);
      expect(res.status).toBe('normal');
      expect(res.badgeLabel).toBe('Normal');
      expect(res.badgeVariant).toBe('info');
      expect(res.borderAccentClass).toContain('blue');
    });

    it('avalia HOMA-IR entre 2.0 e 3.0 como atenção (limítrofe)', () => {
      const res = evaluateDerivedMetric('homa_ir', 2.45);
      expect(res.status).toBe('attention');
      expect(res.badgeLabel).toBe('Atenção');
      expect(res.badgeVariant).toBe('warning');
      expect(res.borderAccentClass).toContain('amber');
    });

    it('avalia HOMA-IR ≥ 3.0 como alerta (resistência insulínica)', () => {
      const res = evaluateDerivedMetric('homa_ir', 3.8);
      expect(res.status).toBe('alert');
      expect(res.badgeLabel).toBe('Alerta');
      expect(res.badgeVariant).toBe('error');
      expect(res.borderAccentClass).toContain('rose');
    });
  });

  describe('AIP (Índice Aterogênico do Plasma)', () => {
    it('avalia AIP negativo como ótimo (baixíssimo risco)', () => {
      const res = evaluateDerivedMetric('aip', -0.12);
      expect(res.status).toBe('optimal');
      expect(res.badgeLabel).toBe('Ótimo');
      expect(res.badgeVariant).toBe('success');
      expect(res.clinicalNote).toContain('Baixíssimo risco aterogênico');
    });

    it('avalia AIP entre 0.0 e 0.10 como normal (baixo risco)', () => {
      const res = evaluateDerivedMetric('aip', 0.05);
      expect(res.status).toBe('normal');
      expect(res.badgeLabel).toBe('Baixo Risco');
      expect(res.badgeVariant).toBe('info');
    });

    it('avalia AIP entre 0.11 e 0.21 como atenção (risco moderado)', () => {
      const res = evaluateDerivedMetric('aip', 0.18);
      expect(res.status).toBe('attention');
      expect(res.badgeLabel).toBe('Risco Moderado');
      expect(res.badgeVariant).toBe('warning');
    });

    it('avalia AIP > 0.21 como alerta (alto risco)', () => {
      const res = evaluateDerivedMetric('aip', 0.32);
      expect(res.status).toBe('alert');
      expect(res.badgeLabel).toBe('Alto Risco');
      expect(res.badgeVariant).toBe('error');
    });
  });

  describe('PhenoAge Gap', () => {
    it('avalia gap < -2.0 anos como ótimo', () => {
      const res = evaluateDerivedMetric('phenoage_gap', -3.5);
      expect(res.status).toBe('optimal');
      expect(res.badgeLabel).toBe('Ótimo');
      expect(res.clinicalNote).toContain('Rejuvenescimento');
    });

    it('avalia gap entre -2.0 e 0.0 anos como favorável', () => {
      const res = evaluateDerivedMetric('phenoage_gap', -0.8);
      expect(res.status).toBe('optimal');
      expect(res.badgeLabel).toBe('Favorável');
    });

    it('avalia gap entre 0.0 e 2.0 anos como normal', () => {
      const res = evaluateDerivedMetric('phenoage_gap', 1.2);
      expect(res.status).toBe('normal');
      expect(res.badgeLabel).toBe('Normal');
    });

    it('avalia gap entre 2.0 e 5.0 anos como atenção', () => {
      const res = evaluateDerivedMetric('phenoage_gap', 3.4);
      expect(res.status).toBe('attention');
      expect(res.badgeLabel).toBe('Atenção');
    });

    it('avalia gap > 5.0 anos como alerta', () => {
      const res = evaluateDerivedMetric('phenoage_gap', 6.2);
      expect(res.status).toBe('alert');
      expect(res.badgeLabel).toBe('Alerta');
    });
  });

  describe('FIB-4 com sensibilidade à idade', () => {
    it('para paciente jovem (<65 anos), 1.25 é baixa probabilidade (normal)', () => {
      const res = evaluateDerivedMetric('fib4', 1.25, { age: 45 });
      expect(res.status).toBe('normal');
      expect(res.badgeLabel).toBe('Baixa Probabilidade');
    });

    it('para paciente jovem (<65 anos), 1.65 é zona indeterminada (atenção)', () => {
      const res = evaluateDerivedMetric('fib4', 1.65, { age: 45 });
      expect(res.status).toBe('attention');
      expect(res.badgeLabel).toBe('Indeterminado');
    });

    it('para paciente idoso (≥65 anos), 1.65 é normal devido ao corte relaxado (2.0)', () => {
      const res = evaluateDerivedMetric('fib4', 1.65, { age: 68 });
      expect(res.status).toBe('normal');
      expect(res.badgeLabel).toBe('Baixa Probabilidade');
    });

    it('valor < 1.0 é classificado como ótimo', () => {
      const res = evaluateDerivedMetric('fib4', 0.72, { age: 40 });
      expect(res.status).toBe('optimal');
      expect(res.badgeLabel).toBe('Ótimo');
    });
  });

  describe('Castelli I e II com ajuste de sexo biológico', () => {
    it('homem com CT/HDL = 4.2 é normal (< 4.5)', () => {
      const res = evaluateDerivedMetric('castelli_1', 4.2, { sex: 'male' });
      expect(res.status).toBe('normal');
    });

    it('mulher com CT/HDL = 4.2 é atenção (> 4.0)', () => {
      const res = evaluateDerivedMetric('castelli_1', 4.2, { sex: 'female' });
      expect(res.status).toBe('attention');
    });

    it('homem com Castelli II = 3.4 está na faixa de atenção (risco moderado)', () => {
      const res = evaluateDerivedMetric('castelli_2', 3.4, { sex: 'male' });
      expect(res.status).toBe('attention');
      expect(res.badgeLabel).toBe('Atenção');
      expect(res.badgeVariant).toBe('warning');
    });

    it('mulher com Castelli II = 3.6 está em alerta', () => {
      const res = evaluateDerivedMetric('castelli_2', 3.6, { sex: 'female' });
      expect(res.status).toBe('alert');
      expect(res.badgeLabel).toBe('Alerta');
    });
  });

  describe('Razão TG/HDL e Colesterol Remanescente com faixa de Atenção', () => {
    it('homem com TG/HDL = 2.8 está em atenção (moderado)', () => {
      const res = evaluateDerivedMetric('tg_hdl_ratio', 2.8, { sex: 'male' });
      expect(res.status).toBe('attention');
      expect(res.badgeLabel).toBe('Atenção');
    });

    it('TG/HDL > 3.5 em homem é alerta', () => {
      const res = evaluateDerivedMetric('tg_hdl_ratio', 4.0, { sex: 'male' });
      expect(res.status).toBe('alert');
      expect(res.badgeLabel).toBe('Alerta');
    });

    it('colesterol remanescente = 35 mg/dL é atenção (intermediário)', () => {
      const res = evaluateDerivedMetric('remnant_cholesterol', 35);
      expect(res.status).toBe('attention');
      expect(res.badgeLabel).toBe('Atenção');
    });
  });

  describe('NLR e Marcadores Imunoinflamatórios (SIRI, PIV)', () => {
    it('NLR < 0.7 é classificado como atenção (neutropenia/linfocitose)', () => {
      const res = evaluateDerivedMetric('nlr', 0.55);
      expect(res.status).toBe('attention');
      expect(res.badgeLabel).toBe('Atenção');
      expect(res.clinicalNote).toContain('neutropenia');
    });

    it('NLR 0.85 é classificado como normal (limítrofe inferior)', () => {
      const res = evaluateDerivedMetric('nlr', 0.85);
      expect(res.status).toBe('normal');
      expect(res.badgeLabel).toBe('Normal');
    });

    it('avalia SIRI < 0.8 como ótimo e > 2.0 como alerta', () => {
      const opt = evaluateDerivedMetric('siri', 0.65);
      expect(opt.status).toBe('optimal');
      expect(opt.badgeLabel).toBe('Ótimo');

      const alert = evaluateDerivedMetric('siri', 2.4);
      expect(alert.status).toBe('alert');
      expect(alert.badgeLabel).toBe('Alerta');
    });

    it('avalia PIV < 300 como ótimo e 500 como atenção', () => {
      const opt = evaluateDerivedMetric('piv', 220);
      expect(opt.status).toBe('optimal');

      const att = evaluateDerivedMetric('piv', 520);
      expect(att.status).toBe('attention');
      expect(att.badgeLabel).toBe('Atenção');
    });
  });

  describe('Fígado: AST/ALT e APRI', () => {
    it('AST/ALT ratio = 0.75 é ótimo; ratio = 1.6 é atenção', () => {
      const opt = evaluateDerivedMetric('ast_alt_ratio', 0.75);
      expect(opt.status).toBe('optimal');

      const att = evaluateDerivedMetric('ast_alt_ratio', 1.6);
      expect(att.status).toBe('attention');
      expect(att.badgeLabel).toBe('Atenção');
    });

    it('APRI < 0.5 é ótimo; APRI 0.8 é indeterminado (atenção); APRI 1.8 é alerta', () => {
      const opt = evaluateDerivedMetric('apri', 0.35);
      expect(opt.status).toBe('optimal');

      const att = evaluateDerivedMetric('apri', 0.8);
      expect(att.status).toBe('attention');

      const alert = evaluateDerivedMetric('apri', 1.8);
      expect(alert.status).toBe('alert');
    });
  });

  describe('PhenoAge com contexto de idade cronológica', () => {
    it('calcula gap e personaliza referência quando idade é informada', () => {
      const res = evaluateDerivedMetric('phenoage', 41.25, { age: 45 });
      expect(res.status).toBe('optimal');
      expect(res.badgeLabel).toBe('Ótimo');
      expect(res.clinicalNote).toContain('Gap de -3.8 anos');
      expect(res.referenceText).toContain('cronológica');
      expect(res.optimalText).toContain('< 45 anos');
    });
  });

  describe('Resiliência a Nulos e Casos Limite', () => {
    it('retorna status neutral e pendente para valor nulo', () => {
      const res = evaluateDerivedMetric('homa_ir', null);
      expect(res.status).toBe('neutral');
      expect(res.badgeLabel).toBe('Pendente');
      expect(res.gaugePercent).toBe(0);
      expect(res.badgeVariant).toBe('neutral');
    });

    it('retorna status neutral e pendente para NaN', () => {
      const res = evaluateDerivedMetric('aip', NaN);
      expect(res.status).toBe('neutral');
      expect(res.badgeLabel).toBe('Pendente');
    });

    it('suporta métricas genéricas sem corte específico', () => {
      const res = evaluateDerivedMetric('unmapped_metric', 42.0);
      expect(res.status).toBe('normal');
      expect(res.badgeLabel).toBe('Calculado');
      expect(res.gaugePercent).toBe(50);
    });
  });
});
