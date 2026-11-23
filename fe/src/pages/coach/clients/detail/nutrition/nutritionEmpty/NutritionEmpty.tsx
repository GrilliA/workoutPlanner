import { Button } from "@components/button";
import "./style.css";

type NutritionEmptyProps = {
  clientName: string;
  onCreate: () => void;
  onApplyTemplate: () => void;
};

export function NutritionEmpty({ clientName, onCreate, onApplyTemplate }: NutritionEmptyProps) {
  return (
    <section className="nutrition-empty" aria-labelledby="nutrition-empty-title">
      <h2 id="nutrition-empty-title" className="title">
        Nessun piano pasti
      </h2>
      <p className="message">
        {clientName} non ha ancora un piano pasti. Parti da zero o da una giornata tipo.
      </p>
      <div className="actions">
        <Button variant="primary" onClick={onCreate}>
          Crea piano pasti
        </Button>
        <Button variant="secondary" onClick={onApplyTemplate}>
          Applica un template
        </Button>
      </div>
    </section>
  );
}
