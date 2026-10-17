import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { clearApiCache, getAthleteHome, type AthleteHome } from "../../api";
import { ApiError } from "../../api/client";

type HomeDataState = {
  home: AthleteHome | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

/** `GET /athlete/home`: al montaggio, al ritorno sulla tab e al pull-to-refresh. */
export function useHomeData() {
  const [fetchId, setFetchId] = useState(0);
  const [state, setState] = useState<HomeDataState>({
    home: null,
    loading: true,
    refreshing: false,
    error: null,
  });
  const skipNextFocusRefresh = useRef(true);

  // useFocusEffect rilancia l'effetto a ogni nuova identità: serve una callback stabile.
  useFocusEffect(
    useCallback(() => {
      if (skipNextFocusRefresh.current) {
        skipNextFocusRefresh.current = false;
        return;
      }
      setFetchId((id) => id + 1);
    }, []),
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const home = await getAthleteHome();
        if (cancelled) {
          return;
        }
        setState({ home, loading: false, refreshing: false, error: null });
      } catch (err) {
        if (cancelled) {
          return;
        }
        const error = ApiError.messageFrom(err, "Errore di caricamento");
        setState((current) => ({
          ...current,
          loading: false,
          refreshing: false,
          error,
        }));
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetchId]);

  const refresh = () => {
    clearApiCache();
    setState((current) => ({ ...current, refreshing: true }));
    setFetchId((id) => id + 1);
  };

  const retry = () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    setFetchId((id) => id + 1);
  };

  return { ...state, refresh, retry };
}
