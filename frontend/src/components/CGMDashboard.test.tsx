import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { CGMDashboard } from './CGMDashboard'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CGMDashboard', () => {
  it('shows an error state in the upload banner when the server responds with !ok', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'CSV inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const user = userEvent.setup()
    const { container } = render(<CGMDashboard summaries={[]} onRefreshData={vi.fn()} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['date_ref,glucose'], 'cgm.csv', { type: 'text/csv' })

    await user.upload(input, file)

    expect(fetchSpy).toHaveBeenCalledWith('/api/cgm/upload-csv', expect.objectContaining({ method: 'POST' }))
    expect(screen.getByText('CSV inválido')).toBeInTheDocument()

    const message = screen.getByRole('alert')
    expect(message).toHaveClass('text-rose-700')
    expect(message).toHaveClass('dark:text-rose-400')
    expect(message).not.toHaveClass('text-emerald-400')
  })
})
