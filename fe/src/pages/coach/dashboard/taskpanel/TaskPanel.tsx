import { Link } from "wouter";
import type { DashboardTask } from "../types";
import "./style.css";

type TaskPanelProps = {
  tasks: DashboardTask[];
};

export function TaskPanel({ tasks }: TaskPanelProps) {
  return (
    <section className="task-panel" aria-labelledby="task-panel-title">
      <h2 id="task-panel-title">Task prioritari</h2>
      {tasks.length === 0 ? (
        <p className="coach-empty">Nessun task urgente.</p>
      ) : (
        <div className="task-panel__list">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={task.href}
              className={`task-panel__card task-panel__card--${task.tone}`}
            >
              <span className="task-panel__icon" aria-hidden>
                ✎
              </span>
              <span className="task-panel__body">
                <span className="task-panel__title">{task.title}</span>
                <span className="task-panel__detail">{task.detail}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
