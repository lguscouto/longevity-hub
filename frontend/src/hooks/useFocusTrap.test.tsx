import React, { useRef, useState } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useFocusTrap, resetActiveOverlayStack, getActiveOverlayCount } from './useFocusTrap'

interface TestTrapComponentProps {
  isOpen: boolean
  onClose?: () => void
  disableEscape?: boolean
  returnFocus?: boolean
  testId?: string
  noFocusable?: boolean
}

const TestTrapComponent: React.FC<TestTrapComponentProps> = ({
  isOpen,
  onClose,
  disableEscape,
  returnFocus = true,
  testId = 'trap-container',
  noFocusable = false,
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
    <div ref={containerRef} data-testid={testId} tabIndex={-1}>
      {noFocusable ? (
        <p>Apenas texto informativo sem controles focáveis</p>
      ) : (
        <>
          <button data-testid={`${testId}-btn-first`}>Primeiro</button>
          <input data-testid={`${testId}-input-middle`} placeholder="Meio" />
          <button data-testid={`${testId}-btn-last`}>Último</button>
        </>
      )}
    </div>
  )
}

describe('useFocusTrap & Modal Stacking', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.style.overflow = ''
    resetActiveOverlayStack()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    resetActiveOverlayStack()
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

    const firstBtn = screen.getByTestId('trap-container-btn-first')
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

    const first = screen.getByTestId('trap-container-btn-first')
    const last = screen.getByTestId('trap-container-btn-last')

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

    expect(document.activeElement).toBe(screen.getByTestId('trap-container-btn-first'))

    rerender(<TestTrapComponent isOpen={false} />)
    expect(document.activeElement).toBe(triggerBtn)

    document.body.removeChild(triggerBtn)
  })

  it('manages 3 stacked overlays (Drawer -> Modal -> ConfirmDialog) where Escape only closes the top-most overlay', () => {
    const onCloseDrawer = vi.fn()
    const onCloseModal = vi.fn()
    const onCloseConfirm = vi.fn()

    const StackedOverlays = ({
      openDrawer,
      openModal,
      openConfirm,
    }: {
      openDrawer: boolean
      openModal: boolean
      openConfirm: boolean
    }) => (
      <div>
        <TestTrapComponent isOpen={openDrawer} onClose={onCloseDrawer} testId="drawer" />
        <TestTrapComponent isOpen={openModal} onClose={onCloseModal} testId="modal" />
        <TestTrapComponent isOpen={openConfirm} onClose={onCloseConfirm} testId="confirm" />
      </div>
    )

    const { rerender } = render(
      <StackedOverlays openDrawer={true} openModal={true} openConfirm={true} />
    )

    expect(getActiveOverlayCount()).toBe(3)

    // Pressing Escape should only trigger the top-most overlay (ConfirmDialog)
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(onCloseConfirm).toHaveBeenCalledTimes(1)
    expect(onCloseModal).not.toHaveBeenCalled()
    expect(onCloseDrawer).not.toHaveBeenCalled()

    // Confirm is closed; rerender with 2 overlays
    rerender(<StackedOverlays openDrawer={true} openModal={true} openConfirm={false} />)
    expect(getActiveOverlayCount()).toBe(2)

    // Pressing Escape should now close Modal
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(onCloseModal).toHaveBeenCalledTimes(1)
    expect(onCloseDrawer).not.toHaveBeenCalled()

    // Modal is closed; rerender with 1 overlay
    rerender(<StackedOverlays openDrawer={true} openModal={false} openConfirm={false} />)
    expect(getActiveOverlayCount()).toBe(1)

    // Pressing Escape should now close Drawer
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(onCloseDrawer).toHaveBeenCalledTimes(1)

    // All closed
    rerender(<StackedOverlays openDrawer={false} openModal={false} openConfirm={false} />)
    expect(getActiveOverlayCount()).toBe(0)
  })

  it('maintains body overflow hidden until all stacked overlays are closed', () => {
    document.body.style.overflow = 'auto'

    const StackedComponent = ({ count }: { count: number }) => (
      <div>
        {count >= 1 && <TestTrapComponent isOpen={true} testId="ov-1" />}
        {count >= 2 && <TestTrapComponent isOpen={true} testId="ov-2" />}
      </div>
    )

    const { rerender } = render(<StackedComponent count={2} />)
    expect(document.body.style.overflow).toBe('hidden')

    // Close 1 overlay, 1 remains
    rerender(<StackedComponent count={1} />)
    expect(document.body.style.overflow).toBe('hidden')

    // Close final overlay
    rerender(<StackedComponent count={0} />)
    expect(document.body.style.overflow).toBe('auto')
  })

  it('safely focuses container and prevents Tab escape when modal has zero focusable elements', () => {
    render(<TestTrapComponent isOpen={true} noFocusable={true} testId="empty-modal" />)

    act(() => {
      vi.advanceTimersByTime(20)
    })

    const container = screen.getByTestId('empty-modal')
    expect(document.activeElement).toBe(container)

    // Tab key should be prevented from moving focus to body elements
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    window.dispatchEvent(tabEvent)
    expect(tabEvent.defaultPrevented).toBe(true)
  })

  it('triggers onClose when a navigation event (popstate) occurs with overlay open', () => {
    const handleClose = vi.fn()
    render(<TestTrapComponent isOpen={true} onClose={handleClose} />)

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
