import { Component, type ReactNode } from "react";
import { PageError } from "@components/pageError";
import "./style.css";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <PageError
            title="Qualcosa è andato storto."
            message={
              this.state.error.message || "Ricarica la pagina per continuare."
            }
            actionLabel="Ricarica la pagina"
            onRetry={() => window.location.reload()}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
