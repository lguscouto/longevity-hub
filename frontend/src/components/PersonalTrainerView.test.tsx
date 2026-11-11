import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { PersonalTrainerView } from './PersonalTrainerView';

// Global fetch mock
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

const mockAssessments = [
  {
    id: 'ass-2',
    assessment_date: '2026-10-15',
    title: 'Avaliação de Outubro',
    weight_kg: 76.0,
    body_fat_percentage: 14.0,
    waist_cm: 79.0,
    abdomen_cm: 82.0,
    hip_cm: 98.0,
    notes: 'Excelente definição e evolução nos dorsais.',
    created_at: '2026-10-15T10:00:00Z',
    updated_at: '2026-10-15T10:00:00Z',
    photos: [
      {
        id: 'photo-2',
        assessment_id: 'ass-2',
        angle: 'front',
        body_state: 'relaxed',
        stored_filename: 'photo-2.jpg',
        relative_path: 'data/physical_assessments/ass-2/photo-2.jpg',
        mime_type: 'image/jpeg',
        file_size: 102400,
        sha256: 'hash2',
        display_order: 0,
        created_at: '2026-10-15T10:00:00Z',
        content_url: '/api/physical-assessments/ass-2/photos/photo-2/content',
      },
    ],
  },
  {
    id: 'ass-1',
    assessment_date: '2026-07-28',
    title: 'Avaliação Inicial',
    weight_kg: 80.0,
    body_fat_percentage: 18.0,
    waist_cm: 84.0,
    abdomen_cm: 87.0,
    hip_cm: 100.0,
    notes: 'Ponto de partida.',
    created_at: '2026-07-28T10:00:00Z',
    updated_at: '2026-07-28T10:00:00Z',
    photos: [
      {
        id: 'photo-1',
        assessment_id: 'ass-1',
        angle: 'front',
        body_state: 'relaxed',
        stored_filename: 'photo-1.jpg',
        relative_path: 'data/physical_assessments/ass-1/photo-1.jpg',
        mime_type: 'image/jpeg',
        file_size: 102400,
        sha256: 'hash1',
        display_order: 0,
        created_at: '2026-07-28T10:00:00Z',
        content_url: '/api/physical-assessments/ass-1/photos/photo-1/content',
      },
    ],
  },
];

const mockComparisonManifest = {
  previous_assessment: mockAssessments[1],
  current_assessment: mockAssessments[0],
  days_between: 79,
  deltas: {
    weight_kg: -4.0,
    body_fat_percentage: -4.0,
    waist_cm: -5.0,
    abdomen_cm: -5.0,
    hip_cm: -2.0,
  },
  matched_photos: [
    {
      angle: 'front',
      body_state: 'relaxed',
      previous_photo: mockAssessments[1].photos[0],
      current_photo: mockAssessments[0].photos[0],
    },
  ],
};

const mockProfile = {
  name: 'Gustavo Santos',
  chronological_age: 32,
  height_cm: 180,
  current_weight_kg: 76.0,
  target_weight_kg: 75.0,
  target_body_fat_pct: 12.0,
};

const mockLabs = [
  {
    id: 'lab-1',
    metric_key: 'testosterone_total',
    metric_name: 'Testosterona Total',
    value: 650,
    unit: 'ng/dL',
    ref_min: 240,
    ref_max: 870,
    optimal_target: '600 - 900',
    collected_at: '2026-10-15T08:00:00Z',
  },
  {
    id: 'lab-2',
    metric_key: 'fasting_glucose',
    metric_name: 'Glicemia de Jejum',
    value: 85,
    unit: 'mg/dL',
    ref_min: 70,
    ref_max: 99,
    optimal_target: '75 - 85',
    collected_at: '2026-10-15T08:00:00Z',
  },
  {
    id: 'lab-3',
    metric_key: 'crp_us',
    metric_name: 'Proteína C Reativa Ultrassensível',
    value: 0.3,
    unit: 'mg/L',
    ref_min: 0,
    ref_max: 1.0,
    optimal_target: '< 0.5',
    collected_at: '2026-10-15T08:00:00Z',
  },
];

const mockTrainerSession = {
  authenticated: true,
  username: 'willian',
  name: 'Willian',
  role: 'personal_trainer',
  token: 'mock_token_pt_123',
};

function createJsonResponse(data: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(data),
    json: async () => data,
  };
}

describe('PersonalTrainerView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(
      'longevidade_personal_trainer_session_v1',
      JSON.stringify(mockTrainerSession)
    );

    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : (url as any).url || '';
      if (urlStr.includes('/personal/login')) {
        let body: any = {};
        try {
          body = init?.body ? JSON.parse(init.body as string) : {};
        } catch {
          // ignore
        }
        if (body.username?.toLowerCase() === 'willian' && body.password === '1234') {
          return createJsonResponse({
            authenticated: true,
            username: 'willian',
            name: 'Willian',
            role: 'personal_trainer',
            token: 'mock_token_pt_123',
            expires_at: '2026-12-31T23:59:59Z',
          });
        }
        return createJsonResponse(
          { detail: 'Usuário ou senha incorretos. Verifique suas credenciais de acesso.' },
          401
        );
      }
      if (urlStr.includes('/personal/logout')) {
        return createJsonResponse({ status: 'ok' });
      }
      if (urlStr.includes('/personal/session')) {
        return createJsonResponse(mockTrainerSession);
      }
      if (urlStr.includes('/profile') || urlStr.includes('/athlete-profile')) {
        return createJsonResponse(mockProfile);
      }
      if (urlStr.includes('/compare')) {
        return createJsonResponse(mockComparisonManifest);
      }
      if (urlStr.includes('/timeline')) {
        return createJsonResponse({
          target_weight_kg: 75.0,
          points: [],
          summary: {
            latest_weight_kg: 76.0,
            weight_delta: -4.0,
            latest_body_fat_pct: 14.0,
            body_fat_delta: -4.0,
            latest_lean_mass_kg: 65.36,
            lean_mass_delta: -0.24,
            total_points: 2,
            assessment_count: 2,
          },
        });
      }
      if (urlStr.includes('/api/labs') || urlStr.endsWith('/labs')) {
        return createJsonResponse(mockLabs);
      }
      return createJsonResponse(mockAssessments);
    });
  });

  it('renders student header with profile details and quick KPIs', async () => {
    render(<PersonalTrainerView />);

    await waitFor(() => {
      expect(screen.getByText('Portal do Personal Trainer')).toBeInTheDocument();
      expect(screen.getByText('Gustavo Santos')).toBeInTheDocument();
    });

    // Student meta
    expect(screen.getByText('32 anos')).toBeInTheDocument();
    expect(screen.getByText('180 cm')).toBeInTheDocument();

    // KPI values
    expect(screen.getAllByText('76 kg').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('-4 kg')).toBeInTheDocument(); // total weight delta
    expect(screen.getByText('14%')).toBeInTheDocument();
    expect(screen.getByText('2 fotos')).toBeInTheDocument();
  });

  it('allows switching between gallery view modes (timeline and angle matrix)', async () => {
    render(<PersonalTrainerView />);

    await waitFor(() => {
      expect(screen.getByText('Avaliação de Outubro')).toBeInTheDocument();
    });

    // Default timeline mode shows assessment cards
    expect(screen.getByText('Avaliação Inicial')).toBeInTheDocument();

    // Switch to Mural de Poses Lado a Lado
    const muralBtn = screen.getByRole('button', { name: /Mural de Poses Lado a Lado/i });
    fireEvent.click(muralBtn);

    await waitFor(() => {
      expect(screen.getByText(/Evolução Cronológica — Pose: Frente/i)).toBeInTheDocument();
    });
  });

  it('switches to Antes & Depois comparison tab and runs period comparison', async () => {
    render(<PersonalTrainerView />);

    await waitFor(() => {
      expect(screen.getByText('Portal do Personal Trainer')).toBeInTheDocument();
    });

    // Click Antes & Depois tab
    const compareTabBtn = screen.getByRole('button', { name: /Antes & Depois/i });
    fireEvent.click(compareTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Comparador de Evolução e Poses/i)).toBeInTheDocument();
    });

    // Click quick preset "Início vs Atual"
    const presetBtn = screen.getByRole('button', { name: /Início vs Atual/i });
    fireEvent.click(presetBtn);

    await waitFor(() => {
      expect(screen.getByText(/Resumo de Evolução \(79 dias de intervalo\)/i)).toBeInTheDocument();
      expect(screen.getAllByText('-4 kg').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('switches to Medidas & Composição tab and renders the anthropometric table', async () => {
    render(<PersonalTrainerView />);

    await waitFor(() => {
      expect(screen.getByText('Portal do Personal Trainer')).toBeInTheDocument();
    });

    const compTabBtn = screen.getByRole('button', { name: /Medidas & Composição/i });
    fireEvent.click(compTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Tabela de Medidas Antropométricas e Bioimpedância/i)).toBeInTheDocument();
    });

    // Check table headers and rows (Massa Magra and Massa Gorda appear in table)
    expect(screen.getAllByText('Massa Magra').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Massa Gorda').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Mais recente')).toBeInTheDocument();
    expect(screen.getByText('Excelente definição e evolução nos dorsais.')).toBeInTheDocument();
  });

  it('switches to Orientações do Treinador, toggles goals, and adds a new technical directive', async () => {
    render(<PersonalTrainerView />);

    await waitFor(() => {
      expect(screen.getByText('Portal do Personal Trainer')).toBeInTheDocument();
    });

    const notesTabBtn = screen.getByRole('button', { name: /Orientações do Treinador/i });
    fireEvent.click(notesTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Metas e Compromissos para o Próximo Ciclo/i)).toBeInTheDocument();
      expect(screen.getByText(/Pareceres e Orientações Técnicas do Treinador/i)).toBeInTheDocument();
    });

    // Toggle a goal item
    const goalItem = screen.getByText(/Manter frequência semanal de 4 a 5 treinos de força/i);
    fireEvent.click(goalItem);

    // Open add feedback form
    const addNoteBtn = screen.getByRole('button', { name: /Nova Anotação Técnica/i });
    fireEvent.click(addNoteBtn);

    const titleInput = screen.getByPlaceholderText(/Ex: Ajuste de volume de dorsais e deltoides/i);
    const contentInput = screen.getByPlaceholderText(/Descreva a evolução observada/i);

    fireEvent.change(titleInput, { target: { value: 'Ajuste de Cargas em Agachamento' } });
    fireEvent.change(contentInput, { target: { value: 'Progredir para 100kg mantendo boa profundidade.' } });

    const submitBtn = screen.getByRole('button', { name: /Salvar Parecer/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Ajuste de Cargas em Agachamento')).toBeInTheDocument();
      expect(screen.getByText(/Progredir para 100kg mantendo boa profundidade/i)).toBeInTheDocument();
    });
  });

  it('toggles presentation mode on and off', async () => {
    render(<PersonalTrainerView />);

    await waitFor(() => {
      expect(screen.getByText('Portal do Personal Trainer')).toBeInTheDocument();
    });

    const modeBtn = screen.getByRole('button', { name: /Modo Apresentação/i });
    fireEvent.click(modeBtn);

    expect(screen.getByText(/Modo Apresentação do Personal ativado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sair do Modo Foco/i })).toBeInTheDocument();

    // Exit presentation mode
    const exitBtn = screen.getByRole('button', { name: /Sair do Modo Apresentação/i });
    fireEvent.click(exitBtn);

    expect(screen.queryByText(/Modo Apresentação do Personal ativado/i)).not.toBeInTheDocument();
  });

  it('supports interactive split slider mode with keyboard controls, division presets, and clip-path overlay', async () => {
    render(<PersonalTrainerView />);

    await waitFor(() => {
      expect(screen.getByText('Portal do Personal Trainer')).toBeInTheDocument();
    });

    // Go to comparison tab
    fireEvent.click(screen.getByRole('button', { name: /Antes & Depois/i }));

    await waitFor(() => {
      expect(screen.getByText(/Comparador de Evolução e Poses/i)).toBeInTheDocument();
    });

    // Switch to slider mode
    const sliderTabBtn = screen.getByRole('button', { name: /Cortina Interativa \(Slider\)/i });
    fireEvent.click(sliderTabBtn);

    // Verify division presets exist
    expect(screen.getByRole('button', { name: '25%' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '50%' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '75%' })).toBeInTheDocument();

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '50');

    // Click 75% preset
    fireEvent.click(screen.getByRole('button', { name: '75%' }));
    expect(slider).toHaveAttribute('aria-valuenow', '75');

    // Test keyboard controls (ArrowLeft and ArrowRight)
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(slider).toHaveAttribute('aria-valuenow', '70');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '75');
  });

  it('supports inverting comparison periods and re-running comparison', async () => {
    render(<PersonalTrainerView />);

    await waitFor(() => {
      expect(screen.getByText('Portal do Personal Trainer')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Antes & Depois/i }));

    await waitFor(() => {
      expect(screen.getByText(/Comparador de Evolução e Poses/i)).toBeInTheDocument();
    });

    const swapBtn = screen.getByTitle(/Inverter períodos/i);
    fireEvent.click(swapBtn);

    // Verify fetch was called with swapped IDs
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/compare?previous_id=ass-2&current_id=ass-1')
    );
  });

  it('allows clicking photo count in anthropometric table to view photos in lightbox', async () => {
    render(<PersonalTrainerView />);

    await waitFor(() => {
      expect(screen.getByText('Portal do Personal Trainer')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Medidas & Composição/i }));

    await waitFor(() => {
      expect(screen.getByText(/Tabela de Medidas Antropométricas e Bioimpedância/i)).toBeInTheDocument();
    });

    const photoButtons = screen.getAllByRole('button', { name: /1 foto/i });
    expect(photoButtons.length).toBeGreaterThanOrEqual(1);

    // Click on photo button to open lightbox
    fireEvent.click(photoButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('exits presentation mode when pressing Escape key', async () => {
    render(<PersonalTrainerView />);

    await waitFor(() => {
      expect(screen.getByText('Portal do Personal Trainer')).toBeInTheDocument();
    });

    const modeBtn = screen.getByRole('button', { name: /Modo Apresentação/i });
    fireEvent.click(modeBtn);

    expect(screen.getByText(/Modo Apresentação do Personal ativado/i)).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText(/Modo Apresentação do Personal ativado/i)).not.toBeInTheDocument();
    });
  });

  it('renders return to workouts button when onBackToApp is provided', async () => {
    const handleBack = vi.fn();
    render(<PersonalTrainerView onBackToApp={handleBack} />);

    await waitFor(() => {
      expect(screen.getByText('Portal do Personal Trainer')).toBeInTheDocument();
    });

    const backBtn = screen.getByRole('button', { name: /Voltar para Sessões de Treino/i });
    expect(backBtn).toBeInTheDocument();

    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('copies shareable link with clipboard API', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<PersonalTrainerView />);

    await waitFor(() => {
      expect(screen.getByText('Portal do Personal Trainer')).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole('button', { name: /Copiar Link/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('#personal'));
    await waitFor(() => {
      expect(screen.getByText('Link Copiado!')).toBeInTheDocument();
    });
  });

  it('filters trainer notes by category pills', async () => {
    render(<PersonalTrainerView />);

    await waitFor(() => {
      expect(screen.getByText('Portal do Personal Trainer')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Orientações do Treinador/i }));

    await waitFor(() => {
      expect(screen.getByText(/Pareceres e Orientações Técnicas do Treinador/i)).toBeInTheDocument();
      expect(screen.getByText('Diretrizes de Hipertrofia e Postura')).toBeInTheDocument();
    });

    // Click on "Definição" filter - which has no matching notes initially
    const defFilterBtn = screen.getByRole('button', { name: 'Definição' });
    fireEvent.click(defFilterBtn);

    expect(screen.getByText(/Nenhuma anotação técnica encontrada para a categoria selecionada/i)).toBeInTheDocument();

    // Click back to "Hipertrofia"
    const hipFilterBtn = screen.getByRole('button', { name: 'Hipertrofia' });
    fireEvent.click(hipFilterBtn);

    expect(screen.getByText('Diretrizes de Hipertrofia e Postura')).toBeInTheDocument();
  });

  it('renders isolated navigation top bar with student lock button', async () => {
    const handleUnlock = vi.fn();
    render(<PersonalTrainerView onRequestUnlock={handleUnlock} isIsolated={true} />);

    await waitFor(() => {
      expect(screen.getByText(/Modo Isolado • Acesso restrito/i)).toBeInTheDocument();
    });

    const unlockBtn = screen.getByRole('button', { name: /Área do Aluno 🔒/i });
    expect(unlockBtn).toBeInTheDocument();

    fireEvent.click(unlockBtn);
    expect(handleUnlock).toHaveBeenCalledTimes(1);
  });

  it('does not render new assessment button ensuring read-only assessment view for personal trainer', async () => {
    render(<PersonalTrainerView />);

    await waitFor(() => {
      expect(screen.getByText('Portal do Personal Trainer')).toBeInTheDocument();
    });

    // Personal trainer should NOT have the option to create a new evaluation
    expect(screen.queryByRole('button', { name: /Nova Avaliação/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Cadastrar Nova Avaliação/i)).not.toBeInTheDocument();
  });

  it('switches to Últimos Exames tab and renders blood test results with category filter and search', async () => {
    render(<PersonalTrainerView />);

    await waitFor(() => {
      expect(screen.getByText('Portal do Personal Trainer')).toBeInTheDocument();
    });

    const labsTabBtn = screen.getByRole('button', { name: /Últimos Exames/i });
    expect(labsTabBtn).toBeInTheDocument();
    fireEvent.click(labsTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Últimos Exames de Sangue')).toBeInTheDocument();
    });

    // Check biomarkers are displayed
    expect(screen.getByText('Testosterona Total')).toBeInTheDocument();
    expect(screen.getByText('Glicemia de Jejum')).toBeInTheDocument();
    expect(screen.getByText('Proteína C Reativa Ultrassensível')).toBeInTheDocument();

    // Check category pills
    expect(screen.getByRole('button', { name: /Hormônios & Tireoide/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Metabolismo & Glicemia/i })).toBeInTheDocument();

    // Test search filter
    const searchInput = screen.getByPlaceholderText(/Buscar biomarcador/i);
    fireEvent.change(searchInput, { target: { value: 'Testosterona' } });

    expect(screen.getByText('Testosterona Total')).toBeInTheDocument();
    expect(screen.queryByText('Glicemia de Jejum')).not.toBeInTheDocument();
  });

  it('validates PIN in PersonalTrainerUnlockModal correctly', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();
    const { PersonalTrainerUnlockModal, DEFAULT_PERSONAL_PIN } = await import(
      './personalTrainer/PersonalTrainerUnlockModal'
    );

    const { rerender } = render(
      <PersonalTrainerUnlockModal
        isOpen={true}
        onClose={handleClose}
        onUnlockSuccess={handleSuccess}
      />
    );

    expect(screen.getByText('Área Restrita do Aluno')).toBeInTheDocument();

    const pinInput = screen.getByPlaceholderText('••••');
    // Try wrong PIN
    fireEvent.change(pinInput, { target: { value: '9999' } });
    const unlockBtn = screen.getByRole('button', { name: /Desbloquear Área Completa/i });
    fireEvent.click(unlockBtn);

    expect(screen.getByText(/PIN incorreto/i)).toBeInTheDocument();
    expect(handleSuccess).not.toHaveBeenCalled();

    // Type correct default PIN (1234)
    fireEvent.change(pinInput, { target: { value: DEFAULT_PERSONAL_PIN } });
    fireEvent.click(unlockBtn);

    expect(handleSuccess).toHaveBeenCalledTimes(1);
  });

  it('blocks portal with login screen when not authenticated and does not render student data', async () => {
    localStorage.clear();
    sessionStorage.clear();
    render(<PersonalTrainerView initialSession={null} />);

    // Should display login card
    expect(screen.getByText('Acesso Exclusivo do Treinador')).toBeInTheDocument();
    expect(screen.getByLabelText(/Usuário do Personal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Senha do Personal/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Acessar Portal do Treinador/i })).toBeInTheDocument();

    // Should NOT show student data or dashboard tabs
    expect(screen.queryByText('Gustavo Santos')).not.toBeInTheDocument();
    expect(screen.queryByText('Galeria & Poses')).not.toBeInTheDocument();
    expect(screen.queryByText('Antes & Depois')).not.toBeInTheDocument();
  });

  it('rejects a revoked saved session before requesting student data', async () => {
    mockFetch.mockResolvedValue(createJsonResponse({ detail: 'Sessão expirada' }, 401));
    render(<PersonalTrainerView />);

    expect(await screen.findByText('Acesso Exclusivo do Treinador')).toBeInTheDocument();
    expect(localStorage.getItem('longevidade_personal_trainer_session_v1')).toBeNull();
    expect(mockFetch.mock.calls.some(([url]) => String(url).includes('/api/physical-assessments'))).toBe(false);
    expect(mockFetch.mock.calls.some(([url]) => String(url).includes('/api/profile'))).toBe(false);
  });

  it('preserves a saved session when verification is temporarily unavailable', async () => {
    mockFetch.mockRejectedValue(new Error('offline'));
    render(<PersonalTrainerView />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível verificar a sessão salva');
    expect(localStorage.getItem('longevidade_personal_trainer_session_v1')).not.toBeNull();
    expect(mockFetch.mock.calls.some(([url]) => String(url).includes('/api/physical-assessments'))).toBe(false);
  });

  it('rejects invalid login credentials and displays error message', async () => {
    localStorage.clear();
    sessionStorage.clear();
    render(<PersonalTrainerView initialSession={null} />);

    const userInput = screen.getByLabelText(/Usuário do Personal/i);
    const passInput = screen.getByLabelText(/Senha do Personal/i);
    const submitBtn = screen.getByRole('button', { name: /Acessar Portal do Treinador/i });

    fireEvent.change(userInput, { target: { value: 'willian' } });
    fireEvent.change(passInput, { target: { value: 'senha_errada' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Usuário ou senha incorretos/i)).toBeInTheDocument();
    });
  });

  it('authenticates user willian with password 1234 and unlocks the dashboard', async () => {
    localStorage.clear();
    sessionStorage.clear();
    render(<PersonalTrainerView initialSession={null} />);

    const userInput = screen.getByLabelText(/Usuário do Personal/i);
    const passInput = screen.getByLabelText(/Senha do Personal/i);
    const submitBtn = screen.getByRole('button', { name: /Acessar Portal do Treinador/i });

    fireEvent.change(userInput, { target: { value: 'willian' } });
    fireEvent.change(passInput, { target: { value: '1234' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Portal do Personal Trainer')).toBeInTheDocument();
      expect(screen.getByText('Gustavo Santos')).toBeInTheDocument();
      expect(screen.getByText(/willian/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sair/i })).toBeInTheDocument();
    });
  });

  it('allows logging out and returns immediately to the login screen', async () => {
    render(<PersonalTrainerView />);

    await waitFor(() => {
      expect(screen.getByText('Gustavo Santos')).toBeInTheDocument();
    });

    const logoutBtn = screen.getByRole('button', { name: /Sair/i });
    expect(logoutBtn).toBeInTheDocument();
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(screen.getByText('Acesso Exclusivo do Treinador')).toBeInTheDocument();
      expect(screen.queryByText('Gustavo Santos')).not.toBeInTheDocument();
      expect(screen.queryByText('Galeria & Poses')).not.toBeInTheDocument();
    });
  });
});
