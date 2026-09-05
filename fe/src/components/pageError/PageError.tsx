import { Button } from "@components/button";
import "./style.css";

export type PageErrorProps = {
  title?: string;
  message?: string;
  actionLabel?: string;
  onRetry: () => void;
};

export function PageError({
  title = "Impossibile caricare",
  message = "Qualcosa è andato storto. Riprova.",
  actionLabel = "Riprova",
  onRetry,
}: PageErrorProps) {
  return (
    <div className="page-error" role="alert">
      <h2 className="page-error__title">{title}</h2>
      <p className="page-error__message">{message}</p>
      <Button type="button" variant="secondary" onClick={onRetry}>
        {actionLabel}
      </Button>
    </div>
  );
}
