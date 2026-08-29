import { useEffect, useState } from "react";
import { subscribeToasts, type ToastMessage } from "./toastStore";
import "./style.css";

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-host">
      {toasts.map((item) => (
        <p
          key={item.id}
          className={
            item.kind === "error" ? "toast toast--error" : "toast toast--success"
          }
          role={item.kind === "error" ? "alert" : "status"}
        >
          {item.message}
        </p>
      ))}
    </div>
  );
}
