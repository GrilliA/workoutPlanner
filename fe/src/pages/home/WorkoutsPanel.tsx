import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import { ApiError, createWorkout, getWorkouts, type Workout } from "@api";
import { Button } from "@components/button";
import { Card } from "@components/card";
import { Input } from "@components/input";

function formatCreatedAt(date: Date) {
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function WorkoutsPanel() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadWorkouts = useCallback(() => {
    setLoading(true);
    setError(null);

    return getWorkouts()
      .then((data) => {
        setWorkouts(data);
      })
      .catch((err) => {
        setError(
          getErrorMessage(
            err,
            "Could not load workouts. Is the backend running?",
          ),
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    getWorkouts()
      .then((data) => {
        if (!cancelled) {
          setWorkouts(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            getErrorMessage(
              err,
              "Could not load workouts. Is the backend running?",
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const created = await createWorkout({ name });
      setWorkouts((current) => [created, ...current]);
      setName("");
    } catch (err) {
      setFormError(
        getErrorMessage(err, "Could not create workout. Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="workouts">
      <header className="header">
        <h1 className="title">Workouts</h1>
        <p className="subtitle">Plan and track your training sessions.</p>
      </header>

      <form className="form" onSubmit={handleSubmit}>
        <Input.Root error={formError ?? undefined}>
          <Input.Label>New workout</Input.Label>
          <Input.Field
            name="name"
            placeholder="e.g. Leg Day"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={submitting}
            required
          />
          <Input.Error />
        </Input.Root>

        <Button.Root
          type="submit"
          variant="primary"
          loading={submitting}
          disabled={!name.trim()}
        >
          <Button.Spinner />
          <Button.Label>Create workout</Button.Label>
        </Button.Root>
      </form>

      <div className="list" aria-live="polite">
        {loading ? <p className="status">Loading workouts...</p> : null}

        {!loading && error ? (
          <div className="error" role="alert">
            <p>{error}</p>
            <Button.Root type="button" variant="secondary" onClick={loadWorkouts}>
              <Button.Label>Retry</Button.Label>
            </Button.Root>
          </div>
        ) : null}

        {!loading && !error && workouts.length === 0 ? (
          <p className="status">No workouts yet. Create your first one above.</p>
        ) : null}

        {!loading && !error && workouts.length > 0 ? (
          <ul className="workout-list">
            {workouts.map((workout) => (
              <Card.Root key={workout.id} as="li" className="item">
                <Card.Title>{workout.name}</Card.Title>
                <Card.Time dateTime={workout.createdAt.toISOString()}>
                  {formatCreatedAt(workout.createdAt)}
                </Card.Time>
              </Card.Root>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
