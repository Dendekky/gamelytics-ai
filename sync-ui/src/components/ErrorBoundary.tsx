import React, { Component, ReactNode } from 'react'
import { Card, CardContent } from './ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
          <CardContent className="p-6">
            <div className="text-center py-4">
              <div className="text-4xl mb-2">⚠️</div>
              <p className="text-slate-400">Something went wrong</p>
              <p className="text-slate-500 text-sm mt-2">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
