import React, { useRef, useState } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useFocusTrap } from './useFocusTrap'

interface TestTrapComponentProps {
  isOpen: boolean
  onClose?: () => void
  disableEscape?: boolean
  returnFocus?: boolean
}

const TestTrapComponent: React.FC<TestTrapComponentProps> = ({
  isOpen,
  onClose,
  disableEscape,
  returnFocus = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  useFocusTrap(containerRef, {
    isOpen,
    onClose,
    disableEscape,
    returnFocusOnDeactivate: returnFocus,
  })

  if (!isOpen) return null

  return (
    <div ref={containerRef} data-testid="trap-container" tabIndex={-1}>
      <button data-testid="btn-first">Primeiro</button>
      <input data-testid="input-middle" placeholder="Meio" />
      <button data-testid="btn-last">Último</button>
    </div>
  )
}

describe('useFocusTrap', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.style.overflow = ''
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('locks document.body overflow when open and restores it when closed', () => {
    document.body.style.overflow = 'auto'
    const { rerender } = render(<TestTrapComponent isOpen={true} />)

    expect(document.body.style.overflow).toBe('hidden')

    rerender(<TestTrapComponent isOpen={false} />)
    expect(document.body.style.overflow).toBe('auto')
  })

  it('sets initial focus to first focusable element inside container', () => {
    render(<TestTrapComponent isOpen={true} />)

    act(() => {
      vi.advanceTimersByTime(20)
    })

    const firstBtn = screen.getByTestId('btn-first')
    expect(document.activeElement).toBe(firstBtn)
  })

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn()
    render(<TestTrapComponent isOpen={true} onClose={handleClose} />)

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose when Escape is pressed if disableEscape is true', () => {
    const handleClose = vi.fn()
    render(<TestTrapComponent isOpen={true} onClose={handleClose} disableEscape={true} />)

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(handleClose).not.toHaveBeenCalled()
  })

  it('cycles focus within container on Tab and Shift+Tab', () => {
    render(<TestTrapComponent isOpen={true} />)
    act(() => {
      vi.advanceTimersByTime(20)
    })

    const first = screen.getByTestId('btn-first')
    const middle = screen.getByTestId('input-middle')
    const last = screen.getByTestId('btn-last')

    // Start at last element and press Tab -> should wrap to first
    last.focus()
    expect(document.activeElement).toBe(last)

    fireEvent.keyDown(window, { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    // Start at first element and press Shift+Tab -> should wrap to last
    first.focus()
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('restores focus to previously active element on close', () => {
    const triggerBtn = document.createElement('button')
    triggerBtn.setAttribute('data-testid', 'trigger-button')
    document.body.appendChild(triggerBtn)
    triggerBtn.focus()
    expect(document.activeElement).toBe(triggerBtn)

    const { rerender } = render(<TestTrapComponent isOpen={true} />)
    act(() => {
      vi.advanceTimersByTime(20)
    })

    expect(document.activeElement).toBe(screen.getByTestId('btn-first'))

    rerender(<TestTrapComponent isOpen={false} />)
    expect(document.activeElement).toBe(triggerBtn)

    document.body.removeChild(triggerBtn)
  })
})
