import { describe, it, expect } from 'vitest'
// @ts-expect-error - Vite raw CSS import
import cssContent from '../index.css?raw'

describe('Reduced Motion Compliance (WCAG 2.3.3 / UX21-P2-04)', () => {
  it('contains @media (prefers-reduced-motion: reduce) rule', () => {
    expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('overrides animation and transition duration to instant in reduced motion', () => {
    expect(cssContent).toContain('animation-duration: 0.01ms !important;')
    expect(cssContent).toContain('transition-duration: 0.01ms !important;')
    expect(cssContent).toContain('scroll-behavior: auto !important;')
  })

  it('neutralizes infinite decorative animations in reduced motion', () => {
    expect(cssContent).toContain('.animate-spin')
    expect(cssContent).toContain('.animate-pulse')
    expect(cssContent).toContain('.animate-bounce')
    expect(cssContent).toContain('.animate-ping')
    expect(cssContent).toContain('animation: none !important;')
  })
})
