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
import { CoachCard, CoachCardListSkeleton } from "../../coachCard";
import "../../style.css";
import "./style.css";

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
        <CoachCardListSkeleton />
      ) : null}

      {!isPending && !code ? (
        <p className="coach-empty">Codice non disponibile</p>
      ) : null}

      {!isPending && code ? (
        <section className="coach-section">
          <p className="coach-empty invite-code__intro">
            L&apos;atleta crea da solo l&apos;account su mobile, poi collega il tuo codice
            nella sezione Coach. Un atleta può avere un solo coach alla volta.
          </p>
          <CoachCard className="invite-code">
            <p className="coach-empty invite-code__label">Codice invito</p>
            <p className="invite-code__value">{code}</p>
            <div className="coach-card-actions invite-code__actions">
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
