import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  getAthleteHome,
  getWorkouts,
  markAssignmentSeen,
  type AthleteHome,
  type Workout,
} from "../../api";
import { ApiError } from "../../api/client";

type WorkoutsDataState = {
  home: AthleteHome | null;
  workouts: Workout[];
  loading: boolean;
  error: string | null;
};

/**
 * Schede in uso (da `GET /athlete/home`) e schede dell'atleta, ricaricate a
 * ogni ritorno sulla tab. Una scheda coach nuova viene segnata come vista.
 */
export function useWorkoutsData() {
  const [fetchId, setFetchId] = useState(0);
  const [state, setState] = useState<WorkoutsDataState>({
    home: null,
    workouts: [],
    loading: true,
    error: null,
  });

  // useFocusEffect rilancia l'effetto a ogni nuova identità: serve una callback stabile.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const load = async () => {
        try {
          const [home, workouts] = await Promise.all([getAthleteHome(), getWorkouts()]);
          if (cancelled) {
            return;
          }
          setState({ home, workouts, loading: false, error: null });
          if (home.hasUnseenAssignment) {
            // Solo il badge dipende da questo: un errore non va mostrato.
            void markAssignmentSeen().catch(() => undefined);
          }
        } catch (err) {
          if (cancelled) {
            return;
          }
          const error = ApiError.messageFrom(err, "Errore di caricamento");
          setState((current) => ({ ...current, loading: false, error }));
        }
      };

      void load();
      return () => {
        cancelled = true;
      };
    }, [fetchId]),
  );

  const reload = () => {
    setState((current) => ({ ...current, error: null }));
    setFetchId((id) => id + 1);
  };

  return { ...state, reload };
}
