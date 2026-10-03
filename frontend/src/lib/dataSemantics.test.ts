import { describe, it, expect } from 'vitest';
import {
  describeAbsence,
  getSourceConfig,
  formatDataFreshness,
  formatLocalDateKey,
  formatConfidenceLabel,
  evaluateSyncStale,
  STALE_THRESHOLDS,
  AbsenceKind,
  SourceKind,
} from './dataSemantics';

describe('dataSemantics (UX_UI_43)', () => {
  describe('Taxonomia dos 6 Estados de Ausência (describeAbsence)', () => {
    const kinds: AbsenceKind[] = [
      'no_data',
      'unmonitored',
      'uncomputable',
      'unsynced',
      'stale',
      'error',
    ];

    it.each(kinds)('provides distinct semantics for %s', (kind) => {
      const result = describeAbsence(kind);
      expect(result.kind).toBe(kind);
      expect(result.label.length).toBeGreaterThan(0);
      expect(result.shortLabel.length).toBeGreaterThan(0);
      expect(result.description.length).toBeGreaterThan(10);
      expect(result.actionSuggestion.length).toBeGreaterThan(10);
      expect(result.badgeClass).toContain('border-');
    });

    it('returns unique labels across all 6 absence kinds', () => {
      const labels = kinds.map((k) => describeAbsence(k).label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(6);
      expect(labels).toContain('Sem dados');
      expect(labels).toContain('Não monitorado');
      expect(labels).toContain('Não calculável');
      expect(labels).toContain('Não sincronizado');
      expect(labels).toContain('Desatualizado');
      expect(labels).toContain('Erro de leitura');
    });
  });

  describe('Camada Epistemológica (getSourceConfig)', () => {
    const sourceKinds: SourceKind[] = [
      'observed',
      'model',
      'inference',
      'clinical',
      'warning',
      'action',
    ];

    it.each(sourceKinds)('configures distinct epistemological layer for %s', (kind) => {
      const config = getSourceConfig(kind);
      expect(config.kind).toBe(kind);
      expect(config.label.length).toBeGreaterThan(0);
      expect(config.ariaLabel).toContain('Natureza do dado:');
      expect(config.icon).toBeDefined();
    });

    it('maps correctly to observed vs model vs inference', () => {
      expect(getSourceConfig('observed').label).toBe('Dado Observado');
      expect(getSourceConfig('model').label).toBe('Modelo Matemático');
      expect(getSourceConfig('inference').label).toBe('Inferência de IA');
      expect(getSourceConfig('clinical').label).toBe('Referência Clínica');
      expect(getSourceConfig('warning').label).toBe('Atenção Clínica');
      expect(getSourceConfig('action').label).toBe('Ação Recomendada');
    });
  });

  describe('Semântica Temporal e Frescor do Dado (formatDataFreshness)', () => {
    it('returns "Sem registro de atualização" when date is missing or invalid', () => {
      expect(formatDataFreshness(null).text).toBe('Sem registro de atualização');
      expect(formatDataFreshness(undefined).text).toBe('Sem registro de atualização');
      expect(formatDataFreshness('data-invalida').text).toBe('Data inválida');
    });

    it('returns "Atualizado hoje" for current date', () => {
      const today = new Date().toISOString().slice(0, 10);
      const freshness = formatDataFreshness(today);
      expect(freshness.text).toBe('Atualizado hoje');
      expect(freshness.isStale).toBe(false);
      expect(freshness.statusTone).toBe('fresh');
    });

    it('returns "Atualizado ontem" for 1 day ago', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const freshness = formatDataFreshness(yesterday);
      expect(freshness.text).toBe('Atualizado ontem');
      expect(freshness.isStale).toBe(false);
      expect(freshness.statusTone).toBe('fresh');
    });

    it('returns "Atualizado há X dias" for 2 to 6 days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const freshness = formatDataFreshness(threeDaysAgo);
      expect(freshness.text).toBe('Atualizado há 3 dias');
      expect(freshness.isStale).toBe(false);
      expect(freshness.statusTone).toBe('moderate');
    });

    it('identifies stale data (>= 7 days) correctly', () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const freshness = formatDataFreshness(tenDaysAgo);
      expect(freshness.text).toBe('Dados desatualizados (há 10 dias)');
      expect(freshness.isStale).toBe(true);
      expect(freshness.statusTone).toBe('stale');
    });

    it('does not label historical records as stale when isHistorical is true', () => {
      const thirtyDaysAgo = '2026-08-15';
      const freshness = formatDataFreshness(thirtyDaysAgo, { isHistorical: true });
      expect(freshness.text).toBe('Registro histórico');
      expect(freshness.isStale).toBe(false);
      expect(freshness.statusTone).toBe('fresh');
    });
  });

  describe('Chave de Data Local e Fuso Horário (formatLocalDateKey)', () => {
    it('formats a date as YYYY-MM-DD in local timezone without UTC drift', () => {
      const testDate = new Date(2026, 9, 3, 23, 30); // 3 de Outubro de 2026, 23:30 local
      expect(formatLocalDateKey(testDate)).toBe('2026-10-03');
    });

    it('defaults to current local date when called with no arguments', () => {
      const key = formatLocalDateKey();
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Rótulos Canônicos de Confiança (formatConfidenceLabel)', () => {
    it('translates confidence levels to Portuguese', () => {
      expect(formatConfidenceLabel('high')).toBe('Alta');
      expect(formatConfidenceLabel('medium')).toBe('Média');
      expect(formatConfidenceLabel('low')).toBe('Baixa');
      expect(formatConfidenceLabel('unavailable')).toBe('Indisponível');
    });

    it('provides detailed labels when requested', () => {
      expect(formatConfidenceLabel('high', true)).toBe('Alta confiança');
      expect(formatConfidenceLabel('medium', true)).toBe('Média confiança');
      expect(formatConfidenceLabel('low', true)).toBe('Baixa confiança');
      expect(formatConfidenceLabel('unavailable', true)).toBe('Dados insuficientes');
    });
  });

  describe('Governança Centralizada de Stale (evaluateSyncStale & STALE_THRESHOLDS)', () => {
    it('defines 24 hours for wearable sync and 7 days for clinical records', () => {
      expect(STALE_THRESHOLDS.WEARABLE_HOURS).toBe(24);
      expect(STALE_THRESHOLDS.CLINICAL_DAYS).toBe(7);
    });

    it('evaluates sync freshness against 24h threshold', () => {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const thirtyHoursAgo = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();

      expect(evaluateSyncStale(twelveHoursAgo)).toBe(false);
      expect(evaluateSyncStale(thirtyHoursAgo)).toBe(true);
      expect(evaluateSyncStale(null)).toBe(false);
    });
  });
});
