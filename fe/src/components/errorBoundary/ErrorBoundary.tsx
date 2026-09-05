import { Component, type ReactNode } from "react";
import { ApiError } from "@api";
import { PageError } from "@components/pageError";
import "./style.css";

const RELOAD_MESSAGE = "Ricarica la pagina per continuare.";

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
      const isLoadError = this.state.error instanceof ApiError;

      return (
        <div className="error-boundary">
          <PageError
            title={
              isLoadError ? "Impossibile caricare" : "Qualcosa è andato storto."
            }
            message={
              isLoadError
                ? ApiError.messageFrom(this.state.error, RELOAD_MESSAGE)
                : RELOAD_MESSAGE
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
