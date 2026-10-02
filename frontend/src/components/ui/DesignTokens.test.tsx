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
  it('defines canonical borderRadius tokens in tailwind.config.js', () => {
    const borderRadius = tailwindConfig?.theme?.extend?.borderRadius;
    expect(borderRadius).toBeDefined();
    expect(borderRadius?.['radius-sm']).toBe('0.5rem');
    expect(borderRadius?.['radius-md']).toBe('0.75rem');
    expect(borderRadius?.['radius-lg']).toBe('1.25rem');
    expect(borderRadius?.['radius-xl']).toBe('1.5rem');
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
