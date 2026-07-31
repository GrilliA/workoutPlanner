import { Link } from "wouter";
import { Button } from "@components/button";
import "./style.css";

export type PageHeaderProps = {
  onSave: () => void;
  isSaving?: boolean;
  mode?: "create" | "edit";
  backHref?: string;
};

export function PageHeader({
  onSave,
  isSaving = false,
  mode = "create",
  backHref = "/dashboard",
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <Link href={backHref} className="back" aria-label="Torna indietro">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M15 18 9 12l6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>

      <h1 className="title">{mode === "edit" ? "MODIFICA SCHEDA" : "CREA SCHEDA"}</h1>

      <Button.Root
        variant="primary"
        size="sm"
        className="save"
        onClick={onSave}
        loading={isSaving}
        disabled={isSaving}
      >
        <Button.Label>SALVA</Button.Label>
      </Button.Root>
    </header>
  );
}
