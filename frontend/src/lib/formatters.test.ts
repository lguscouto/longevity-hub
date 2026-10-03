import { describe, it, expect } from 'vitest';
import {
  formatMetricValue,
  formatMetricValueString,
  formatDateUserTz,
  formatDateTimeUserTz,
  formatMinutesToHoursAndMinutes,
} from './formatters';

describe('formatters - Semântica de Valores e Nulos vs Zero (UX_UI_32)', () => {
  describe('formatMetricValue & formatMetricValueString', () => {
    it('distingue explicitamente zero (0) de valor nulo/ausente', () => {
      // Valor zero real medido
      const zeroResult = formatMetricValue(0, 'passos');
      expect(zeroResult.isNull).toBe(false);
      expect(zeroResult.displayValue).toBe('0');
      expect(zeroResult.displayUnit).toBe('passos');
      expect(zeroResult.formattedString).toBe('0 passos');

      // Valor zero sem unidade
      expect(formatMetricValueString(0)).toBe('0');

      // Valor nulo
      const nullResult = formatMetricValue(null, 'passos');
      expect(nullResult.isNull).toBe(true);
      expect(nullResult.displayValue).toBe('—');
      expect(nullResult.accessibleText).toBe('Não informado');
      expect(nullResult.formattedString).toBe('—');

      // Valor undefined
      const undefinedResult = formatMetricValue(undefined, 'bpm');
      expect(undefinedResult.isNull).toBe(true);
      expect(undefinedResult.displayValue).toBe('—');

      // String vazia
      const emptyResult = formatMetricValue('', 'kg');
      expect(emptyResult.isNull).toBe(true);
      expect(emptyResult.displayValue).toBe('—');

      // NaN
      const nanResult = formatMetricValue(NaN, 'kg');
      expect(nanResult.isNull).toBe(true);
      expect(nanResult.displayValue).toBe('—');
    });

    it('formata números decimais com controle de casas decimais', () => {
      expect(formatMetricValueString(72.456, 'kg', { decimals: 1 })).toBe('72.5 kg');
      expect(formatMetricValueString(0, 'kg', { decimals: 1 })).toBe('0.0 kg');
      expect(formatMetricValueString(100, '%', { decimals: 0 })).toBe('100%');
    });

    it('preserva strings textuais válidas (ex: classificações clínicas)', () => {
      const res = formatMetricValue('Normal');
      expect(res.isNull).toBe(false);
      expect(res.displayValue).toBe('Normal');
      expect(res.formattedString).toBe('Normal');
    });

    it('respeita showUnitWhenEmpty se solicitado', () => {
      const res = formatMetricValue(null, 'kg', { showUnitWhenEmpty: true });
      expect(res.formattedString).toBe('— kg');
    });

    it('suporta absenceKind gerando rótulos acessíveis e displays descritivos (UX_UI_43)', () => {
      const unmonitored = formatMetricValue(null, 'bpm', { absenceKind: 'unmonitored' });
      expect(unmonitored.isNull).toBe(true);
      expect(unmonitored.displayValue).toBe('—');
      expect(unmonitored.accessibleText).toBe('Não monitorado');

      const uncomputableWithLabel = formatMetricValue(null, 'anos', {
        absenceKind: 'uncomputable',
        useAbsenceLabelAsDisplay: true,
      });
      expect(uncomputableWithLabel.displayValue).toBe('Não calculável');
      expect(uncomputableWithLabel.accessibleText).toBe('Não calculável');

      // Zero real NUNCA é transformado em ausente mesmo com absenceKind
      const zeroWithAbsence = formatMetricValue(0, 'kcal', { absenceKind: 'no_data' });
      expect(zeroWithAbsence.isNull).toBe(false);
      expect(zeroWithAbsence.displayValue).toBe('0');
      expect(zeroWithAbsence.accessibleText).toBe('0 kcal');
    });
  });

  describe('formatMinutesToHoursAndMinutes', () => {
    it('formata durações em minutos corretamente', () => {
      expect(formatMinutesToHoursAndMinutes(0)).toBe('0m');
      expect(formatMinutesToHoursAndMinutes(45)).toBe('45m');
      expect(formatMinutesToHoursAndMinutes(60)).toBe('1h');
      expect(formatMinutesToHoursAndMinutes(125)).toBe('2h 5m');
      expect(formatMinutesToHoursAndMinutes(null)).toBe('—');
      expect(formatMinutesToHoursAndMinutes(undefined)).toBe('—');
    });
  });

  describe('formatDateUserTz & formatDateTimeUserTz', () => {
    it('formata datas válidas em pt-BR', () => {
      // 2026-09-02T12:00:00Z
      const date = new Date(Date.UTC(2026, 8, 2, 12, 0, 0));
      const formatted = formatDateUserTz(date);
      expect(formatted).toMatch(/02\/09\/2026/);
    });

    it('retorna fallback para datas inválidas ou nulas', () => {
      expect(formatDateUserTz(null)).toBe('—');
      expect(formatDateUserTz(undefined)).toBe('—');
      expect(formatDateUserTz('invalid-date')).toBe('—');
      expect(formatDateTimeUserTz(null)).toBe('—');
    });
  });
});
