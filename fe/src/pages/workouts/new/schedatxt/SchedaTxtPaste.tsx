import { useState } from "react";
import { Button } from "@components/button";
import {
  parseSchedaTxt,
  SCHEDA_TXT_AI_PROMPT,
  SCHEDA_TXT_EXAMPLE,
  type ParsedScheda,
} from "./parseSchedaTxt";
import "./style.css";

type SchedaTxtPasteProps = {
  onApply: (parsed: ParsedScheda) => void;
  /** Compact mode for assignment form */
  compact?: boolean;
};

export function SchedaTxtPaste({ onApply, compact = false }: SchedaTxtPasteProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleParse = () => {
    const result = parseSchedaTxt(text);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError(null);
    onApply(result.value);
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(SCHEDA_TXT_AI_PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Impossibile copiare il prompt");
    }
  };

  const handleLoadExample = () => {
    setText(SCHEDA_TXT_EXAMPLE);
    setError(null);
  };

  return (
    <section className={`scheda-txt ${compact ? "scheda-txt--compact" : ""}`}>
      <div className="scheda-txt__header">
        <h2>Incolla scheda (TXT)</h2>
        <div className="scheda-txt__actions">
          <button type="button" className="scheda-txt__link" onClick={handleLoadExample}>
            Esempio
          </button>
          <button type="button" className="scheda-txt__link" onClick={() => void handleCopyPrompt()}>
            {copied ? "Prompt copiato" : "Copia prompt AI"}
          </button>
        </div>
      </div>

      <p className="scheda-txt__hint">
        Giorni numerati (Giorno 1, 2…), poi esercizi e serie tipo{" "}
        <code>12@90 10@90 8@120</code>. Il prompt AI genera questo formato.
      </p>

      <textarea
        className="scheda-txt__area"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Incolla qui la scheda…"
        rows={compact ? 10 : 14}
        spellCheck={false}
      />

      {error ? <p className="scheda-txt__error">{error}</p> : null}

      <Button
        type="button"
        variant="secondary"
        onClick={handleParse}
        disabled={!text.trim()}
      >
        {compact ? "Usa questo TXT" : "Applica al builder"}
      </Button>
    </section>
  );
}
