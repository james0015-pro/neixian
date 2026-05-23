import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  pageName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, retryCount: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[ErrorBoundary${this.props.pageName ? `/${this.props.pageName}` : ''}]`,
      error.message,
      info.componentStack?.slice(0, 200),
    );
  }

  handleRetry = () => {
    this.setState((s) => ({ hasError: false, error: null, retryCount: s.retryCount + 1 }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const name = this.props.pageName || 'PAGE';
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100vh', background: '#000', flexDirection: 'column', gap: 16,
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          <div style={{ color: '#f33', fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>
            [{name}] LOAD ERROR
          </div>
          <div style={{ color: '#888', fontSize: 10, maxWidth: 420, textAlign: 'center', lineHeight: 1.6 }}>
            {this.state.error?.message || 'Component failed to render'}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={this.handleRetry}
              style={{
                background: 'transparent', border: '1px solid #ff8c00', color: '#ff8c00',
                cursor: 'pointer', padding: '6px 20px', fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace', borderRadius: 2,
              }}
            >
              [ RETRY ]
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'transparent', border: '1px solid #333', color: '#555',
                cursor: 'pointer', padding: '6px 20px', fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace', borderRadius: 2,
              }}
            >
              [ RELOAD ]
            </button>
          </div>
          {this.state.retryCount > 0 && (
            <div style={{ color: '#555', fontSize: 9 }}>
              Retry #{this.state.retryCount}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
