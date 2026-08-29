import { Component, type ReactNode } from "react";
import "./style.css";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          <p className="error-boundary__message">Qualcosa è andato storto.</p>
          <button
            type="button"
            className="error-boundary__reload"
            onClick={() => window.location.reload()}
          >
            Ricarica la pagina
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
