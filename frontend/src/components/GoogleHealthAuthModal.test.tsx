import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { GoogleHealthAuthModal } from './GoogleHealthAuthModal'
import { requestJson } from '../lib/api'

vi.mock('../lib/api', () => ({
  requestJson: vi.fn(),
  ApiError: class ApiError extends Error {
    status?: number
    constructor(message: string, status?: number) {
      super(message)
      this.status = status
    }
  },
}))

const requestJsonMock = vi.mocked(requestJson)

describe('GoogleHealthAuthModal', () => {
  let writeTextMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      writable: true,
      configurable: true,
    })
  })

  it('renders Google Cloud Console friendly link and URL when credentials are not configured', async () => {
    requestJsonMock.mockResolvedValueOnce({
      connected: false,
      authenticated: false,
      reauthentication_required: false,
      last_sync: null,
      authorized_scopes: [],
      last_error: null,
      has_client_id: false,
      client_id: null,
      has_client_secret: false,
      masked_client_id: null,
      token_path: 'token.json',
      has_token_file: false,
      token_expiry: null,
      api_version: 'v4',
      service: 'Google Health API',
      redirect_uri: 'http://127.0.0.1:8887/api/google-health/callback',
    })

    render(
      <GoogleHealthAuthModal
        isOpen={true}
        onClose={() => {}}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Conexão Google Health API v4')).toBeInTheDocument()
    })

    // Check friendly credentials link and explicit URL
    const googleConsoleButton = screen.getByRole('link', { name: /Acessar Google Cloud Console/i })
    expect(googleConsoleButton).toBeInTheDocument()
    expect(googleConsoleButton).toHaveAttribute('href', 'https://console.cloud.google.com/apis/credentials')
    expect(googleConsoleButton).toHaveAttribute('target', '_blank')
    expect(googleConsoleButton).toHaveAttribute('rel', 'noopener noreferrer')

    const directUrlLink = screen.getByRole('link', { name: /https:\/\/console\.cloud\.google\.com\/apis\/credentials/i })
    expect(directUrlLink).toBeInTheDocument()
    expect(directUrlLink).toHaveAttribute('href', 'https://console.cloud.google.com/apis/credentials')

    // Check redirect URI and copy button
    expect(screen.getByText('http://127.0.0.1:8887/api/google-health/callback')).toBeInTheDocument()
    const copyButton = screen.getByRole('button', { name: /Copiar URI/i })
    expect(copyButton).toBeInTheDocument()

    fireEvent.click(copyButton)
    expect(writeTextMock).toHaveBeenCalledWith('http://127.0.0.1:8887/api/google-health/callback')
    expect(screen.getByText('Copiado!')).toBeInTheDocument()
  })

  it('allows user to input Client ID and Client Secret', async () => {
    requestJsonMock.mockResolvedValueOnce({
      connected: false,
      authenticated: false,
      reauthentication_required: false,
      last_sync: null,
      authorized_scopes: [],
      last_error: null,
      has_client_id: false,
      client_id: null,
      has_client_secret: false,
      masked_client_id: null,
      token_path: 'token.json',
      has_token_file: false,
      token_expiry: null,
      api_version: 'v4',
      service: 'Google Health API',
      redirect_uri: 'http://127.0.0.1:8887/api/google-health/callback',
    })

    render(
      <GoogleHealthAuthModal
        isOpen={true}
        onClose={() => {}}
      />
    )

    const user = userEvent.setup()
    const idInput = await screen.findByPlaceholderText(/Ex: 721724668570/i)
    const secretInput = screen.getByPlaceholderText(/Ex: GOCSPX-/i)

    await user.type(idInput, 'my-test-client-id.apps.googleusercontent.com')
    await user.type(secretInput, 'my-secret-value')

    expect(idInput).toHaveValue('my-test-client-id.apps.googleusercontent.com')
    expect(secretInput).toHaveValue('my-secret-value')
  })
})
