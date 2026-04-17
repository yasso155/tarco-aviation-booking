import React, { Component, ReactNode } from 'react';
import { X, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
          <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl max-w-lg w-full text-center space-y-8 border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-red-500"></div>
            
            <div className="w-24 h-24 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner transform -rotate-6">
              <X size={48} strokeWidth={3} />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">System Encountered an Error</h2>
              <p className="text-slate-500 text-base leading-relaxed">
                We apologize for the inconvenience. The application core encountered an unexpected state and needs to be reset.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-slate-50 rounded-2xl text-left font-mono text-[10px] text-slate-400 overflow-auto max-h-32 border border-slate-100">
                {this.state.error.message}
              </div>
            )}

            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-tarco-blue transition-all group active:scale-95"
            >
              <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
              Refresh Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
