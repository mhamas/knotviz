import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * React class Error Boundary wrapping GraphView.
 * Catches synchronous render/mount errors (e.g. WebGL context unavailable).
 * Falls back to a plain error message so the page does not go blank.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('React boundary caught:', error, errorInfo.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center">
          <p className="text-slate-600">
            Graph failed to render. Check browser console for details.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
