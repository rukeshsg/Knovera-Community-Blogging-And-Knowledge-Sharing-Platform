"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center text-center px-4 py-20 bg-[var(--color-bg-soft)] rounded-[40px] border border-[var(--color-bg-secondary)] m-4">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-3xl font-heading font-black text-[var(--color-text-primary)] mb-4">Something went wrong</h2>
          <p className="text-[var(--color-text-secondary)] max-w-md mx-auto mb-10 font-medium leading-relaxed">
            An unexpected error occurred while rendering this section. Our team has been notified.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="flex items-center gap-2 px-8 py-3 bg-[var(--color-primary)] text-white font-black rounded-2xl hover:bg-[#7a350b] transition-all shadow-lg"
            >
              <RotateCcw size={18} /> Try Again
            </button>
            <Link
              href="/"
              className="flex items-center gap-2 px-8 py-3 bg-[var(--background)] border border-[var(--color-bg-secondary)] text-[var(--color-text-primary)] font-bold rounded-2xl hover:bg-[var(--color-bg-soft)] transition-all"
            >
              <Home size={18} /> Back to Home
            </Link>
          </div>
          {process.env.NODE_ENV === "development" && (
            <div className="mt-10 p-4 bg-black/5 rounded-xl text-left overflow-auto max-w-full text-xs font-mono text-red-600">
              {this.state.error?.toString()}
            </div>
          )}
        </div>
      );
    }

    return this.children;
  }
}

export default ErrorBoundary;
