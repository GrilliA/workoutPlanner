import { useEffect, useState } from "react";
import { searchCatalogExercises, type CatalogExercise } from "@api";

const DEBOUNCE_MS = 250;

export type CatalogSearchState = {
  query: string;
  setQuery: (query: string) => void;
  results: CatalogExercise[];
  isSearching: boolean;
  error: string | null;
};

export function useCatalogSearch(minChars = 2): CatalogSearchState {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogExercise[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < minChars) {
      setResults([]);
      setIsSearching(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setIsSearching(true);
      void searchCatalogExercises({ q: trimmed, limit: 8 })
        .then((response) => {
          if (!cancelled) {
            setResults(response.items);
            setError(null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResults([]);
            setError("Ricerca catalogo non disponibile");
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsSearching(false);
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, minChars]);

  return { query, setQuery, results, isSearching, error };
}
