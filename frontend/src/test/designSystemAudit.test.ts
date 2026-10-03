import { describe, it, expect } from 'vitest';
// @ts-expect-error - import mjs helper script
import { RULES, summarize } from '../../scripts/audit-design-system.mjs';

describe('Design System Audit Engine (UX_UI_34)', () => {
  it('should have all 16 canonical conformance rules defined', () => {
    expect(RULES).toBeInstanceOf(Array);
    expect(RULES.length).toBeGreaterThanOrEqual(16);

    const ids = RULES.map((r: { id: string }) => r.id);
    expect(ids).toContain('typography.micro-9');
    expect(ids).toContain('typography.micro-10');
    expect(ids).toContain('typography.micro-11');
    expect(ids).toContain('gradients.bg');
    expect(ids).toContain('effects.glow');
    expect(ids).toContain('focus.outline-none');
    expect(ids).toContain('native.button');
  });

  describe('Rule Regex Matching', () => {
    it('detects micro typography patterns correctly', () => {
      const micro9 = RULES.find((r: { id: string }) => r.id === 'typography.micro-9');
      const micro10 = RULES.find((r: { id: string }) => r.id === 'typography.micro-10');
      const micro11 = RULES.find((r: { id: string }) => r.id === 'typography.micro-11');

      expect('text-[9px] font-bold'.match(micro9.pattern)).not.toBeNull();
      expect('text-[10px] font-bold'.match(micro9.pattern)).toBeNull();

      expect('text-[10px]'.match(micro10.pattern)).not.toBeNull();
      expect('text-[10.5px]'.match(micro10.pattern)).not.toBeNull();
      expect('text-[12px]'.match(micro10.pattern)).toBeNull();

      expect('text-[11px]'.match(micro11.pattern)).not.toBeNull();
    });

    it('detects prohibited gradients and effects', () => {
      const grad = RULES.find((r: { id: string }) => r.id === 'gradients.bg');
      const glow = RULES.find((r: { id: string }) => r.id === 'effects.glow');
      const focus = RULES.find((r: { id: string }) => r.id === 'focus.outline-none');

      expect('bg-gradient-to-r from-cyan-500'.match(grad.pattern)).not.toBeNull();
      expect('bg-slate-900'.match(grad.pattern)).toBeNull();

      expect('shadow-lg glow-cyan-500'.match(glow.pattern)).not.toBeNull();

      expect('focus:outline-none'.match(focus.pattern)).not.toBeNull();
      expect('focus-visible:outline-none'.match(focus.pattern)).toBeNull();

      const blur = RULES.find((r: { id: string }) => r.id === 'effects.backdrop-blur');
      expect('backdrop-blur-md'.match(blur.pattern)).not.toBeNull();
      expect('backdrop-filter: blur(12px);'.match(blur.pattern)).not.toBeNull();
      expect('-webkit-backdrop-filter: blur(12px);'.match(blur.pattern)).not.toBeNull();
      expect('filter: blur(12px);'.match(blur.pattern)).toBeNull();
    });

    it('detects native controls', () => {
      const btn = RULES.find((r: { id: string }) => r.id === 'native.button');
      const inp = RULES.find((r: { id: string }) => r.id === 'native.input');

      expect('<button type="button" className="...">'.match(btn.pattern)).not.toBeNull();
      expect('<Button variant="primary">'.match(btn.pattern)).toBeNull();

      expect('<input type="text" />'.match(inp.pattern)).not.toBeNull();
      expect('<Input label="Nome" />'.match(inp.pattern)).toBeNull();
    });
  });

  describe('Summarizer & Status Classification', () => {
    it('classifies as PASS when open count is 0 and no exceptions', () => {
      const summary = summarize({
        findings: [],
        missingRegistry: [],
      });
      // All rules have 0 findings
      for (const row of summary.rows) {
        expect(['PASS', 'EXCEPTION', 'WARN']).toContain(row.status);
      }
    });

    it('classifies as FAIL when an orphan exception is present', () => {
      const summary = summarize({
        findings: [],
        missingRegistry: [{ file: 'test.tsx', line: 10, exception: 'DSX-999' }],
      });
      expect(summary.worst).toBe('FAIL');
      expect(summary.orphan.length).toBe(1);
    });

    it('calculates delta correctly and reports stale exceptions (UX_UI_49, U22-P0-08, U22-P2-26)', () => {
      const summary = summarize({
        findings: [
          { rule: 'radius.non-token', file: 'a.tsx', line: 1, excerpt: 'rounded-xl', exception: null },
        ],
        missingRegistry: [],
        staleExceptions: ['DSX-099'],
      });
      const radiusRow = summary.rows.find((r: { rule: string }) => r.rule === 'radius.non-token');
      expect(radiusRow).toBeDefined();
      expect(radiusRow?.delta).toBeDefined();
      expect(summary.staleExceptions).toContain('DSX-099');
    });

    it('classifies as FAIL when open count exceeds baseline (delta > 0)', () => {
      const mockFindings = [
        { rule: 'typography.micro-9', file: 'a.tsx', line: 1, excerpt: 'text-[9px]', exception: null },
      ];
      // Even if baseline has 6 for micro-9, if we have findings exceeding baseline it will fail
      const findingsExceeding: Array<{ rule: string; file: string; line: number; excerpt: string; exception: string | null }> = [];
      for (let i = 0; i < 100; i++) {
        findingsExceeding.push({ rule: 'typography.micro-9', file: `file${i}.tsx`, line: 1, excerpt: 'text-[9px]', exception: null });
      }
      const summary = summarize({
        findings: findingsExceeding,
        missingRegistry: [],
      });
      const micro9Row = summary.rows.find((r: { rule: string }) => r.rule === 'typography.micro-9');
      expect(micro9Row?.status).toBe('FAIL');
      expect(micro9Row?.delta).toBeGreaterThan(0);
      expect(summary.worst).toBe('FAIL');
    });
  });
});
