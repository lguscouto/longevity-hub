import { describe, expect, it } from 'vitest';
import {
  getLabMarkerStatus,
  isMarkerOptimal,
  isMarkerWithinClinicalRange,
  formatOptimalTargetText,
  getMarkerMeta,
} from './labMarkers';

describe('labMarkers domain logic (UX_UI_54)', () => {
  describe('isMarkerOptimal with explicit rules (U22-P1-25)', () => {
    it('evaluates range rule correctly for fasting_glucose (70-85 mg/dL is optimal)', () => {
      // fasting_glucose ref_min: 70, ref_max: 99, optimal: 70, optimal_max: 85
      expect(isMarkerOptimal({ metric_key: 'fasting_glucose', value: 80, unit: 'mg/dL', optimal_target: 85, collected_at: '2026-08-01', metric_name: 'Glicose' })).toBe(true);
      expect(isMarkerOptimal({ metric_key: 'fasting_glucose', value: 92, unit: 'mg/dL', optimal_target: 85, collected_at: '2026-08-01', metric_name: 'Glicose' })).toBe(false);
      expect(isMarkerOptimal({ metric_key: 'fasting_glucose', value: 65, unit: 'mg/dL', optimal_target: 85, collected_at: '2026-08-01', metric_name: 'Glicose' })).toBe(false);
    });

    it('evaluates max rule correctly for apob and hscrp', () => {
      // apob optimal: 60, rule: max
      expect(isMarkerOptimal({ metric_key: 'apob', value: 55, unit: 'mg/dL', optimal_target: 60, collected_at: '2026-08-01', metric_name: 'ApoB' })).toBe(true);
      expect(isMarkerOptimal({ metric_key: 'apob', value: 75, unit: 'mg/dL', optimal_target: 60, collected_at: '2026-08-01', metric_name: 'ApoB' })).toBe(false);

      // hscrp optimal: 0.5, rule: max
      expect(isMarkerOptimal({ metric_key: 'hscrp', value: 0.3, unit: 'mg/L', optimal_target: 0.5, collected_at: '2026-08-01', metric_name: 'PCR' })).toBe(true);
      expect(isMarkerOptimal({ metric_key: 'hscrp', value: 1.2, unit: 'mg/L', optimal_target: 0.5, collected_at: '2026-08-01', metric_name: 'PCR' })).toBe(false);
    });

    it('evaluates min rule correctly for apoa1 and albumin', () => {
      // apoa1 optimal: 150, rule: min
      expect(isMarkerOptimal({ metric_key: 'apoa1', value: 160, unit: 'mg/dL', optimal_target: 150, collected_at: '2026-08-01', metric_name: 'ApoA1' })).toBe(true);
      expect(isMarkerOptimal({ metric_key: 'apoa1', value: 130, unit: 'mg/dL', optimal_target: 150, collected_at: '2026-08-01', metric_name: 'ApoA1' })).toBe(false);
    });
  });

  describe('getLabMarkerStatus (U22-P1-22 & U22-P1-23)', () => {
    it('returns "not_eligible" when record origin is not verified or synthetic', () => {
      const status = getLabMarkerStatus({
        metric_key: 'fasting_glucose',
        value: 80,
        unit: 'mg/dL',
        collected_at: '2026-08-01',
        metric_name: 'Glicose',
        record_origin: 'manual',
      });
      expect(status).toBe('not_eligible');
    });

    it('returns "optimal" when value meets the optimal target', () => {
      const status = getLabMarkerStatus({
        metric_key: 'apob',
        value: 58,
        unit: 'mg/dL',
        optimal_target: 60,
        collected_at: '2026-08-01',
        metric_name: 'ApoB',
        record_origin: 'patient_lab',
      });
      expect(status).toBe('optimal');
    });

    it('returns "in_clinical_range" (NOT "out_of_range") when within standard clinical ref but outside optimal target', () => {
      // fasting_glucose standard clinical range: 70 - 99 mg/dL. Optimal: 70 - 85 mg/dL.
      // 92 mg/dL is clinically normal, but not optimal.
      const status = getLabMarkerStatus({
        metric_key: 'fasting_glucose',
        value: 92,
        unit: 'mg/dL',
        ref_min: 70,
        ref_max: 99,
        optimal_target: 85,
        collected_at: '2026-08-01',
        metric_name: 'Glicose',
        record_origin: 'patient_lab',
      });
      expect(status).toBe('in_clinical_range');
    });

    it('returns "out_of_range" when value exceeds clinical reference interval', () => {
      // fasting_glucose > 99 mg/dL is clinically elevated.
      const status = getLabMarkerStatus({
        metric_key: 'fasting_glucose',
        value: 126,
        unit: 'mg/dL',
        ref_min: 70,
        ref_max: 99,
        optimal_target: 85,
        collected_at: '2026-08-01',
        metric_name: 'Glicose',
        record_origin: 'patient_lab',
      });
      expect(status).toBe('out_of_range');
    });
  });

  describe('formatOptimalTargetText (U22-P1-24)', () => {
    it('formats range rule', () => {
      const meta = getMarkerMeta('fasting_glucose');
      expect(formatOptimalTargetText(meta)).toBe('70 – 85 mg/dL');
    });

    it('formats max rule', () => {
      const meta = getMarkerMeta('apob');
      expect(formatOptimalTargetText(meta)).toBe('< 60 mg/dL');
    });

    it('formats min rule', () => {
      const meta = getMarkerMeta('apoa1');
      expect(formatOptimalTargetText(meta)).toBe('> 150 mg/dL');
    });
  });
});
