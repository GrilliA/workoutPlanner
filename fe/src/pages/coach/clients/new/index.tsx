import { useState } from "react";
import {
  ApiError,
  getCoachInviteCode,
  rotateCoachInviteCode,
  useMutation,
  useQuery,
  type CoachInviteCode,
} from "@api";
import { Button } from "@components/button";
import { toast } from "@components/toast";
import { PageHeader } from "@components/pageHeader";
import { CoachCard } from "../../coachCard";
import "../../style.css";

export default function InviteClientPage() {
  const { data: code, isPending, setData: setCode } = useQuery({
    queryFn: async ({ signal }) => (await getCoachInviteCode({ signal })).code,
    fallback: "Impossibile caricare il codice invito",
  });
  const [copied, setCopied] = useState(false);
  const rotate = useMutation<void, CoachInviteCode>({
    mutationFn: () => rotateCoachInviteCode(),
    fallback: "Rigenerazione fallita",
    onSuccess: (invite) => {
      setCode(invite.code);
      toast.success("Nuovo codice generato");
    },
    onError: (err) => {
      toast.error(ApiError.messageFrom(err, "Rigenerazione fallita"));
    },
  });

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

  return (
    <div className="coach-page page-container">
      <PageHeader
        title="Invita cliente"
        subtitle="Condividi il codice: l'atleta lo inserisce nell'app dopo la registrazione"
      />

      {isPending ? (
        <p className="coach-empty">Caricamento…</p>
      ) : null}

      {!isPending && !code ? (
        <p className="coach-empty">Codice non disponibile</p>
      ) : null}

      {!isPending && code ? (
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
                loading={rotate.isPending}
                onClick={() => rotate.mutate()}
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
