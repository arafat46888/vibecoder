import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/** App-level error boundary so a render crash never leaves a blank page. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep stack traces out of user-visible surfaces; log minimally for debugging.
    console.warn('UI crashed:', error.message, info.componentStack?.slice(0, 200))
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, maxWidth: 640, margin: '0 auto', fontFamily: 'inherit' }}>
          <h1 style={{ fontSize: 20 }}>😵 Something went wrong in the interface</h1>
          <p style={{ opacity: 0.8 }}>{this.state.error.message}</p>
          <p style={{ opacity: 0.6, fontSize: 13 }}>
            Your API key and saved projects live in localStorage and are untouched. Reload to continue.
          </p>
          <button className="btn primary" onClick={() => window.location.reload()}>
            Reload app
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
