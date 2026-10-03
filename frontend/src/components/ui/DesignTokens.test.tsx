import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

import { Card } from './Card';
import { MetricCard } from '../MetricCard';
import { Activity } from 'lucide-react';
// @ts-expect-error - tailwind config is a JS file
import tailwindConfig from '../../../tailwind.config.js';
// @ts-expect-error - Vite ?raw query import
import cssContent from '../../index.css?raw';

describe('Design Tokens & Reduced Motion Verification (UX-P2-02, UX-P2-03, UX-P2-04)', () => {
  it('defines canonical borderRadius tokens in tailwind.config.js (UX_UI_48, U22-P0-06)', () => {
    const borderRadius = tailwindConfig?.theme?.extend?.borderRadius;
    expect(borderRadius).toBeDefined();
    expect(borderRadius?.['surface-xs']).toBe('0.5rem');
    expect(borderRadius?.['surface-sm']).toBe('0.75rem');
    expect(borderRadius?.['surface-md']).toBe('1rem');
    expect(borderRadius?.['surface-lg']).toBe('1rem');
    expect(borderRadius?.['dialog']).toBe('1rem');
    expect(borderRadius?.['pill']).toBe('9999px');
    expect(borderRadius?.['radius-sm']).toBe('0.5rem');
    expect(borderRadius?.['radius-md']).toBe('0.75rem');
    expect(borderRadius?.['radius-lg']).toBe('1rem');
    expect(borderRadius?.['radius-xl']).toBe('1rem');
  });

  it('defines canonical semantic color tokens in tailwind.config.js (UX_UI_48, U22-P2-04..07)', () => {
    const colors = tailwindConfig?.theme?.extend?.colors;
    expect(colors?.surface?.canvas).toBe('var(--surface-canvas)');
    expect(colors?.surface?.panel).toBe('var(--surface-panel)');
    expect(colors?.surface?.card).toBe('var(--surface-card)');
    expect(colors?.border?.subtle).toBe('var(--border-subtle)');
    expect(colors?.border?.default).toBe('var(--border-default)');
    expect(colors?.content?.primary).toBe('var(--text-primary)');
    expect(colors?.content?.secondary).toBe('var(--text-secondary)');
    expect(colors?.data?.observed).toBe('var(--data-observed)');
    expect(colors?.data?.derived).toBe('var(--data-derived)');
    expect(colors?.data?.model).toBe('var(--data-model)');
  });

  it('defines semantic CSS variables and utility classes in index.css (UX_UI_48, UX_UI_60)', () => {
    expect(cssContent).toContain('--surface-canvas:');
    expect(cssContent).toContain('--surface-card:');
    expect(cssContent).toContain('--border-subtle:');
    expect(cssContent).toContain('--text-primary:');
    expect(cssContent).toContain('--data-derived:');
    expect(cssContent).toContain('.surface-panel');
    expect(cssContent).toContain('.surface-card');
    expect(cssContent).toContain('.surface-elevated');
  });

  it('defines canonical boxShadow elevation tokens in tailwind.config.js', () => {
    const boxShadow = tailwindConfig?.theme?.extend?.boxShadow;
    expect(boxShadow).toBeDefined();
    expect(boxShadow?.subtle).toBeDefined();
    expect(boxShadow?.card).toBeDefined();
    expect(boxShadow?.dialog).toBeDefined();
    expect(boxShadow?.['elevation-1']).toBeDefined();
    expect(boxShadow?.['elevation-2']).toBeDefined();
    expect(boxShadow?.['elevation-3']).toBeDefined();
  });

  it('includes strict prefers-reduced-motion rules in index.css cancelling keyframe animations', () => {
    expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
    expect(cssContent).toContain('animation-duration: 0.01ms !important');
    expect(cssContent).toContain('.animate-spin');
    expect(cssContent).toContain('animation: none !important');
  });

  it('renders Card with semantic elevation tokens', () => {
    const { container, rerender } = render(<Card surface="default">Conteúdo Padrão</Card>);
    expect(container.firstChild).toHaveClass('shadow-card');

    rerender(<Card surface="raised">Conteúdo Elevado</Card>);
    expect(container.firstChild).toHaveClass('shadow-dialog');

    rerender(<Card surface="highlight">Conteúdo Destaque</Card>);
    expect(container.firstChild).toHaveClass('shadow-subtle');
  });

  it('guarantees MetricCard has no hover:scale class preventing physical jumping on hover', () => {
    const { container } = render(
      <MetricCard
        title="VO2 Max"
        value={48.5}
        unit="mL/kg/min"
        subtitle="Meta: > 45"
        icon={Activity}
        color="emerald"
      />
    );

    const cardElement = container.firstElementChild as HTMLElement;
    expect(cardElement).toBeInTheDocument();
    expect(cardElement.className).not.toMatch(/hover:scale/);
    expect(cardElement).toHaveClass('transition-colors');
  });
});
