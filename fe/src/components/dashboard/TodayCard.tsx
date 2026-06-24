import { Button } from "@components/button";
import "./today-card.css";

type TodayCardProps = {
  name: string;
  exercises: string[];
  goal: string;
  durationMin: number;
};

export function TodayCard({ name, exercises, goal, durationMin }: TodayCardProps) {
  return (
    <section className="today-card" aria-labelledby="today-card-title">
      <div className="header">
        <span className="eyebrow">OGGI</span>
        <h2 id="today-card-title" className="title">
          {name}
        </h2>
      </div>

      <p className="exercises">{exercises.join(" · ")}</p>

      <div className="meta">
        <span className="chip">{goal}</span>
        <span className="chip">{durationMin} min</span>
      </div>

      <Button.Root variant="primary" className="cta">
        <Button.Label>AVVIA WORKOUT</Button.Label>
      </Button.Root>
    </section>
  );
}
