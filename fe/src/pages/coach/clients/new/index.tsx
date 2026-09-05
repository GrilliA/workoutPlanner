import { useState } from "react";
import { ApiError, rotateCoachInviteCode } from "@api";
import { Button } from "@components/button";
import { toast } from "@components/toast";
import { PageError } from "@components/pageError";
import { PageHeader } from "@components/pageHeader";
import { CoachCard } from "../../coachCard";
import { useInviteCode } from "./api/useInviteCode";
import "../../style.css";

export default function InviteClientPage() {
  const { code, setCode, loading, error, retry } = useInviteCode();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleCopy = async () => {
    if (!code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossibile copiare il codice");
    }
  };

  const handleRotate = async () => {
    setBusy(true);
    try {
      const invite = await rotateCoachInviteCode();
      setCode(invite.code);
      toast.success("Nuovo codice generato");
    } catch (err) {
      toast.error(ApiError.messageFrom(err, "Rigenerazione fallita"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="coach-page page-container">
      <PageHeader
        title="Invita cliente"
        subtitle="Condividi il codice: l'atleta lo inserisce nell'app dopo la registrazione"
      />

      {error ? <PageError message={error} onRetry={retry} /> : null}

      {!error && loading ? (
        <p className="coach-empty">Caricamento…</p>
      ) : null}

      {!error && !loading && !code ? (
        <p className="coach-empty">Codice non disponibile</p>
      ) : null}

      {!error && !loading && code ? (
        <section className="coach-section">
          <p className="coach-empty" style={{ marginBottom: "1rem" }}>
            L&apos;atleta crea da solo l&apos;account su mobile, poi collega il tuo codice
            nella sezione Coach. Un atleta può avere un solo coach alla volta.
          </p>
          <CoachCard style={{ textAlign: "center" }}>
            <p className="coach-empty" style={{ marginBottom: "0.5rem" }}>
              Codice invito
            </p>
            <p
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                letterSpacing: "0.2em",
                margin: "0.5rem 0 1rem",
              }}
            >
              {code}
            </p>
            <div className="coach-card-actions" style={{ justifyContent: "center" }}>
              <Button
                type="button"
                variant="primary"
                onClick={() => void handleCopy()}
              >
                {copied ? "Copiato" : "Copia codice"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                loading={busy}
                onClick={() => void handleRotate()}
              >
                Rigenera
              </Button>
            </div>
          </CoachCard>
        </section>
      ) : null}
    </div>
  );
}
