export type TimeWindow = 'today' | '7d' | '30d';

export interface InsightItem {
  category: string;
  headline: string;
  insight_text: string;
  actionable_steps: string;
  observation?: string;
  association?: string;
  limitation?: string;
  recommendation?: string;
}

export interface AIResponseData {
  summary?: string;
  insights?: InsightItem[];
}

export interface SavedReportItem {
  id: number;
  created_at: string;
  provider: string;
  model: string;
  privacy_mode: string;
  time_window?: TimeWindow;
  summary: string;
  guardrail_applied?: boolean;
}

export interface ActiveReportMeta {
  id?: number;
  created_at?: string;
  model?: string;
  provider?: string;
  time_window?: TimeWindow;
}

export type PrivacyMode = 'minimal' | 'full';

export interface AISettingsResponse {
  active_provider?: string;
  selected_model?: string;
  privacy_mode?: string;
  has_openai_key?: boolean;
  has_anthropic_key?: boolean;
  has_openrouter_key?: boolean;
}

export type AICopilotMode = 'analyze' | 'chat' | 'history';

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

export const PRIVACY_MODE_LABELS: Record<PrivacyMode, string> = {
  minimal: 'privacidade mínima',
  full: 'privacidade completa',
};

export const PRIVACY_MODE_DESCRIPTIONS: Record<PrivacyMode, string> = {
  minimal:
    'Modo mínimo: não envia nome, nascimento ou histórico completo; usa apenas o contexto essencial.',
  full: 'Modo completo: opt-in para enviar contexto ampliado de perfil e histórico quando necessário.',
};

export const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  today: 'Hoje (24h)',
  '7d': 'Semana (7d)',
  '30d': 'Mês (30d)',
};

export const TIME_WINDOW_ACTION_TEXTS: Record<TimeWindow, string> = {
  today: 'a análise de prontidão de hoje (últimas 24h)',
  '7d': 'os insights de média semanal (últimos 7 dias)',
  '30d': 'os insights de saúde dos últimos 30 dias',
};

export function normalizePrivacyMode(mode?: string): PrivacyMode {
  return mode === 'full' ? 'full' : 'minimal';
}
