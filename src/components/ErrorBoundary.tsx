import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-4 rounded-3xl bg-amber-50/90 border border-amber-300 text-center shadow-md max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">
              {this.props.fallbackTitle || 'Something went wrong rendering this section'}
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              The coloring book viewer encountered an unexpected update. Click below to reload and restore your book.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Coloring Book</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
