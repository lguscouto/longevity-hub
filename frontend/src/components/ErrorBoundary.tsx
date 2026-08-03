import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="rounded-2xl border border-rose-500/40 bg-rose-950/30 p-8 text-slate-100 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold">Ocorreu um erro ao carregar esta seção.</h2>
            <p className="text-sm text-slate-300 max-w-md">
              {this.state.error?.message || 'Erro inesperado na renderização do componente.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition text-sm"
            >
              <RefreshCw className="h-4 w-4" /> Tentar novamente
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
