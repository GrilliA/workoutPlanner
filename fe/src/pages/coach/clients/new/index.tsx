import { useEffect, useState } from "react";
import { ApiError, getCoachInviteCode, rotateCoachInviteCode } from "@api";
import { AppShell } from "@components/appshell";
import { Button } from "@components/button";
import { CoachPageHeader } from "../../coachpageheader";
import "../../style.css";

export default function InviteClientPage() {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void getCoachInviteCode()
      .then((invite) => {
        if (!cancelled) {
          setCode(invite.code);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Errore caricamento codice");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Impossibile copiare il codice");
    }
  };

  const handleRotate = async () => {
    setBusy(true);
    setError(null);
    try {
      const invite = await rotateCoachInviteCode();
      setCode(invite.code);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Rigenerazione fallita");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="coach-page page-container">
        <CoachPageHeader
          title="Invita cliente"
          subtitle="Condividi il codice: l'atleta lo inserisce nell'app dopo la registrazione"
        />
        {error ? <p className="coach-empty">{error}</p> : null}
        <section className="coach-section">
          <p className="coach-empty" style={{ marginBottom: "1rem" }}>
            L&apos;atleta crea da solo l&apos;account su mobile, poi collega il tuo codice
            nella sezione Coach. Un atleta può avere un solo coach alla volta.
          </p>
          <div className="coach-card" style={{ textAlign: "center" }}>
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
              {code ?? "……"}
            </p>
            <div className="coach-card-actions" style={{ justifyContent: "center" }}>
              <Button.Root
                type="button"
                variant="primary"
                disabled={!code}
                onClick={() => void handleCopy()}
              >
                <Button.Label>{copied ? "Copiato" : "Copia codice"}</Button.Label>
              </Button.Root>
              <Button.Root
                type="button"
                variant="secondary"
                loading={busy}
                disabled={busy}
                onClick={() => void handleRotate()}
              >
                <Button.Label>Rigenera</Button.Label>
              </Button.Root>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
