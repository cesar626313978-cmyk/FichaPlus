import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.setItem('fichaplus_active_tab', 'dashboard');
    } catch {}
    this.setState({ hasError: false, error: undefined });
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-lg border border-slate-100">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">warning</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 mb-2">
              Se ha producido un error imprevisto
            </h1>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              La vista no ha podido cargarse correctamente. Pulsa el botón inferior para restaurar tu sesión de forma segura sin perder datos.
            </p>
            {this.state.error && (
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl mb-6 text-left overflow-auto max-h-32">
                <p className="font-mono text-[11px] text-rose-600 font-semibold break-all">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={this.handleReset}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer"
              >
                Volver a Mi Terminal de Fichaje
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer"
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
