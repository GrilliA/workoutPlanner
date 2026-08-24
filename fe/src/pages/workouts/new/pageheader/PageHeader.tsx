import { Link } from "wouter";
import { Button } from "@components/button";
import { CoachPageHeader } from "../../../coach/coachpageheader";
import "../../../coach/style.css";
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
  const action = (
    <div className="page-header__actions">
      <Link href={backHref} className="coach-btn-link coach-btn-link--secondary">
        Indietro
      </Link>
      <Button.Root
        variant="primary"
        className="page-header__save"
        onClick={onSave}
        loading={isSaving}
        disabled={isSaving}
      >
        <Button.Label>Salva</Button.Label>
      </Button.Root>
    </div>
  );

  return (
    <CoachPageHeader
      title={mode === "edit" ? "Modifica scheda" : "Crea scheda"}
      subtitle={
        mode === "edit"
          ? "Giorni, esercizi e impostazioni del programma"
          : "Nuovo template con giorni, esercizi e impostazioni"
      }
      action={action}
    />
  );
}
