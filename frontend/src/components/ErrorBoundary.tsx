import { Component, type ReactNode } from "react";
import { RouteError } from "./RouteError";

interface ErrorBoundaryProps {
  resetKey?: string;
  onGoHome?: () => void;
  onScan?: () => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: unknown;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(previous: ErrorBoundaryProps) {
    if (this.state.error !== null && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error !== null) {
      return (
        <RouteError
          error={this.state.error}
          onRetry={() => this.setState({ error: null })}
          onGoHome={this.props.onGoHome}
          onScan={this.props.onScan}
        />
      );
    }
    return this.props.children;
  }
}
