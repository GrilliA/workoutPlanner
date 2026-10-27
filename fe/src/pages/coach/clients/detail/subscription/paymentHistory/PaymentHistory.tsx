import { useState } from "react";
import { undoCoachClientPayment, useMutation, type ApiError, type Payment } from "@api";
import { Button } from "@components/button";
import { ConfirmDialog } from "@components/confirmDialog";
import { Skeleton } from "@components/skeleton";
import { toast } from "@components/toast";
import { formatEuros } from "@utils/money";
import {
  formatShortDate,
  isNumberSpokenWithVowel,
  withDatePreposition,
} from "@utils/romeCalendar";
import { PAYMENT_METHOD_LABELS } from "../mappers/paymentForm";
import "./style.css";

const VISIBLE_PAYMENTS = 5;
const UNDO_ERROR = "Impossibile annullare il pagamento";

type PaymentHistoryProps = {
  athleteId: number;
  /** undefined while loading or after a failed load. */
  payments: Payment[] | undefined;
  isLoading: boolean;
  /** A closed subscription cannot undo payments. */
  isEnded: boolean;
  /** A reload is on its way: `canUndo` may be stale until it arrives. */
  isRefreshing: boolean;
  today: string;
  onChanged: () => void;
  onWriteError: (error: ApiError, fallback: string) => void;
};

export function PaymentHistory({
  athleteId,
  payments,
  isLoading,
  isEnded,
  isRefreshing,
  today,
  onChanged,
  onWriteError,
}: PaymentHistoryProps) {
  const [isShowingAll, setIsShowingAll] = useState(false);
  const [paymentToUndo, setPaymentToUndo] = useState<Payment | null>(null);

  const undo = useMutation({
    mutationFn: (paymentId: number) => undoCoachClientPayment(athleteId, paymentId),
    fallback: UNDO_ERROR,
    onSuccess: () => {
      toast.success("Pagamento annullato");
      onChanged();
    },
    onError: (error) => onWriteError(error, UNDO_ERROR),
  });

  const confirmUndo = () => {
    if (paymentToUndo !== null) {
      undo.mutate(paymentToUndo.id);
    }

    setPaymentToUndo(null);
  };

  const undoMessage =
    paymentToUndo === null
      ? ""
      : `Annullare il pagamento ${withDatePreposition("del", paymentToUndo.paidOn)}? «Pagato fino al» torna com'era prima di questo pagamento.`;

  const allPayments = payments ?? [];
  const visiblePayments = isShowingAll ? allPayments : allPayments.slice(0, VISIBLE_PAYMENTS);
  const hiddenCount = allPayments.length - visiblePayments.length;
  const showAllArticle = isNumberSpokenWithVowel(allPayments.length) ? "gli" : "i";

  return (
    <section className="payment-history" aria-labelledby="payment-history-title">
      <h2 id="payment-history-title" className="title">
        Pagamenti
      </h2>

      {isLoading && payments === undefined ? (
        <div className="loading" role="status">
          <span className="sr-only">Caricamento pagamenti…</span>
          <Skeleton height="2.5rem" />
          <Skeleton height="2.5rem" />
        </div>
      ) : null}

      {!isLoading && payments === undefined ? (
        <p className="empty">Pagamenti non disponibili.</p>
      ) : null}

      {payments !== undefined && payments.length === 0 ? (
        <p className="empty">Nessun pagamento registrato</p>
      ) : null}

      {visiblePayments.length > 0 ? (
        <div className="frame">
          <table>
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Importo</th>
                <th scope="col">Metodo</th>
                <th scope="col">Copre</th>
                <th scope="col">Nota</th>
                <th scope="col">
                  <span className="sr-only">Azioni</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visiblePayments.map((payment) => {
                const canUndo = payment.canUndo && !isEnded;
                const coverage = `${formatShortDate(payment.coversFrom, today)} – ${formatShortDate(payment.coversTo, today)}`;

                return (
                  <tr key={payment.id}>
                    <th scope="row" className="paid-on">
                      {formatShortDate(payment.paidOn, today)}
                    </th>
                    <td data-label="Importo" className="number">
                      {formatEuros(payment.amountCents)}
                    </td>
                    <td data-label="Metodo">{PAYMENT_METHOD_LABELS[payment.method]}</td>
                    <td data-label="Copre">{coverage}</td>
                    <td data-label="Nota" className="note">
                      {payment.note ?? "—"}
                    </td>
                    <td className="actions">
                      {canUndo ? (
                        <button
                          type="button"
                          className="undo"
                          onClick={() => setPaymentToUndo(payment)}
                          aria-label={`Annulla il pagamento ${withDatePreposition("del", payment.paidOn)}`}
                          disabled={undo.isPending || isRefreshing}
                        >
                          Annulla
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {hiddenCount > 0 ? (
        <Button variant="ghost" size="sm" onClick={() => setIsShowingAll(true)}>
          {`Mostra tutti ${showAllArticle} ${allPayments.length} pagamenti`}
        </Button>
      ) : null}

      <ConfirmDialog
        isOpen={paymentToUndo !== null}
        title="Annulla pagamento"
        message={undoMessage}
        confirmLabel="Annulla pagamento"
        cancelLabel="Indietro"
        onConfirm={confirmUndo}
        onCancel={() => setPaymentToUndo(null)}
      />
    </section>
  );
}
