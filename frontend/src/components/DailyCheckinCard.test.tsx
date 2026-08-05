import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DailyCheckinCard } from './DailyCheckinCard'
import { requestJson } from '../lib/api'

vi.mock('../lib/api', () => ({
  requestJson: vi.fn(),
}))

type PendingWrite = {
  resolve: () => void
  body: { energy_score?: number }
}

const mockedRequestJson = vi.mocked(requestJson)

const emptyCheckin = (dateRef: string) => ({
  date_ref: dateRef,
  energy_score: null,
  mood_score: null,
  perceived_stress: null,
  tags: [],
  notes: '',
})

describe('DailyCheckinCard autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('serializes pending saves instead of starting concurrent writes', async () => {
    const pendingWrites: PendingWrite[] = []

    mockedRequestJson.mockImplementation((input, init) => {
      if (init?.method !== 'PUT') {
        return Promise.resolve(emptyCheckin(String(input).split('/').pop() ?? '2026-08-01')) as ReturnType<typeof requestJson>
      }

      const body = JSON.parse(String(init.body)) as { energy_score?: number }
      return new Promise((resolve) => {
        pendingWrites.push({
          body,
          resolve: () => resolve(emptyCheckin('2026-08-01')),
        })
      }) as ReturnType<typeof requestJson>
    })

    render(<DailyCheckinCard selectedDate="2026-08-01" />)

    fireEvent.click(screen.getByRole('button', { name: 'Energia nível 1' }))
    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(pendingWrites).toHaveLength(1)
    expect(pendingWrites[0].body.energy_score).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: 'Energia nível 2' }))
    act(() => {
      vi.advanceTimersByTime(600)
    })

    expect(pendingWrites).toHaveLength(1)

    await act(async () => {
      pendingWrites[0].resolve()
      await Promise.resolve()
    })

    expect(pendingWrites).toHaveLength(2)
    expect(pendingWrites[1].body.energy_score).toBe(2)
  })

  it('retries a failed save only after an explicit user action', async () => {
    let writeCalls = 0

    mockedRequestJson.mockImplementation((input, init) => {
      if (init?.method !== 'PUT') {
        return Promise.resolve(emptyCheckin(String(input).split('/').pop() ?? '2026-08-01')) as ReturnType<typeof requestJson>
      }

      writeCalls += 1
      if (writeCalls === 1) {
        return Promise.reject(new Error('network error')) as ReturnType<typeof requestJson>
      }
      return Promise.resolve(emptyCheckin('2026-08-01')) as ReturnType<typeof requestJson>
    })

    render(<DailyCheckinCard selectedDate="2026-08-01" />)

    fireEvent.click(screen.getByRole('button', { name: 'Energia nível 4' }))
    await act(async () => {
      vi.advanceTimersByTime(600)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(writeCalls).toBe(1)
    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível salvar/i)

    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }))

    expect(writeCalls).toBe(2)
  })

  it('keeps the original payload date when the selected date changes during a save', async () => {
    const writeUrls: string[] = []
    let resolveFirstWrite: (() => void) | undefined

    mockedRequestJson.mockImplementation((input, init) => {
      if (init?.method !== 'PUT') {
        return Promise.resolve(emptyCheckin(String(input).split('/').pop() ?? '2026-08-01')) as ReturnType<typeof requestJson>
      }

      writeUrls.push(String(input))
      if (writeUrls.length === 1) {
        return new Promise((resolve) => {
          resolveFirstWrite = () => resolve(emptyCheckin('2026-08-01'))
        }) as ReturnType<typeof requestJson>
      }
      return Promise.resolve(emptyCheckin('2026-08-01')) as ReturnType<typeof requestJson>
    })

    const view = render(<DailyCheckinCard selectedDate="2026-08-01" />)

    fireEvent.click(screen.getByRole('button', { name: 'Energia nível 1' }))
    act(() => {
      vi.advanceTimersByTime(600)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Energia nível 2' }))
    act(() => {
      vi.advanceTimersByTime(600)
    })

    view.rerender(<DailyCheckinCard selectedDate="2026-08-02" />)
    await act(async () => {
      resolveFirstWrite?.()
      await Promise.resolve()
    })

    expect(writeUrls).toEqual(['/api/checkins/2026-08-01', '/api/checkins/2026-08-01'])
  })

  it('preserves a debounced edit when the user moves to another date', async () => {
    const writeUrls: string[] = []

    mockedRequestJson.mockImplementation((input, init) => {
      if (init?.method !== 'PUT') {
        return Promise.resolve(emptyCheckin(String(input).split('/').pop() ?? '2026-08-01')) as ReturnType<typeof requestJson>
      }
      writeUrls.push(String(input))
      return Promise.resolve(emptyCheckin(String(input).split('/').pop() ?? '2026-08-01')) as ReturnType<typeof requestJson>
    })

    const view = render(<DailyCheckinCard selectedDate="2026-08-01" />)
    fireEvent.click(screen.getByRole('button', { name: 'Energia nível 1' }))

    view.rerender(<DailyCheckinCard selectedDate="2026-08-02" />)
    fireEvent.click(screen.getByRole('button', { name: 'Energia nível 2' }))

    await act(async () => {
      vi.advanceTimersByTime(600)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(writeUrls).toEqual(['/api/checkins/2026-08-01', '/api/checkins/2026-08-02'])
  })

  it('flushes a pending debounce when the component unmounts', async () => {
    mockedRequestJson.mockResolvedValue(emptyCheckin('2026-08-01'))

    const view = render(<DailyCheckinCard selectedDate="2026-08-01" />)
    fireEvent.click(screen.getByRole('button', { name: 'Energia nível 3' }))
    view.unmount()

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockedRequestJson).toHaveBeenCalledWith(
      '/api/checkins/2026-08-01',
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('does not show stale success while a newer revision is still waiting', async () => {
    const resolvers: Array<() => void> = []

    mockedRequestJson.mockImplementation((input, init) => {
      if (init?.method !== 'PUT') {
        return Promise.resolve(emptyCheckin(String(input).split('/').pop() ?? '2026-08-01')) as ReturnType<typeof requestJson>
      }
      return new Promise((resolve) => {
        resolvers.push(() => resolve(emptyCheckin('2026-08-01')))
      }) as ReturnType<typeof requestJson>
    })

    render(<DailyCheckinCard selectedDate="2026-08-01" />)
    fireEvent.click(screen.getByRole('button', { name: 'Energia nível 1' }))
    act(() => {
      vi.advanceTimersByTime(600)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Energia nível 2' }))

    await act(async () => {
      resolvers[0]()
      await Promise.resolve()
    })

    expect(screen.queryByText('Salvo')).not.toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(600)
      await Promise.resolve()
    })
    await act(async () => {
      resolvers[1]()
      await Promise.resolve()
    })

    expect(screen.getByText('Salvo')).toBeInTheDocument()
  })
})
