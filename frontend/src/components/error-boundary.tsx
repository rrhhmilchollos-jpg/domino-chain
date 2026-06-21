import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

/**
 * Antes de esto, la app no tenía NINGÚN error boundary: si cualquier
 * componente lanzaba un error al renderizar (un undefined inesperado,
 * una librería de terceros que falla, etc.) React desmontaba TODO el
 * árbol y la pantalla se quedaba completamente en negro (el fondo base
 * de DOMINO es #0b0b12/#000), sin ningún mensaje — exactamente el
 * síntoma de "se abre un modal y se queda la pantalla en negro".
 *
 * Esto no sustituye arreglar los bugs concretos, pero asegura que un
 * fallo futuro muestre algo recuperable en vez de una pantalla muerta.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[DOMINO] Error no capturado:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0b0b12' }}>
          <div className="text-center max-w-sm">
            <div className="text-6xl mb-4">🎲</div>
            <h1 className="text-xl font-black text-white mb-2">Algo ha fallado</h1>
            <p className="text-gray-400 text-sm mb-6">Ha ocurrido un error inesperado. Prueba a recargar la página.</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
              className="px-6 py-3 rounded-xl font-bold text-black"
              style={{ background: '#00F5FF' }}
            >
              Volver al inicio
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
