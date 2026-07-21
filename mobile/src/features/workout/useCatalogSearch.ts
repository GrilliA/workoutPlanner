import { useEffect, useState } from "react";
import { searchCatalogExercises, type CatalogExercise } from "../../api";

const DEBOUNCE_MS = 250;

export type CatalogSearchState = {
  query: string;
  setQuery: (query: string) => void;
  results: CatalogExercise[];
  isSearching: boolean;
  error: string | null;
};

/** Debounced search sul catalogo BE (`GET /catalog/exercises`). */
export function useCatalogSearch(minChars = 2): CatalogSearchState {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogExercise[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = query.trim();
  const canSearch = trimmed.length >= minChars;

  useEffect(() => {
    if (!canSearch) {
      setResults([]);
      setIsSearching(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
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
      clearTimeout(timer);
    };
  }, [canSearch, trimmed]);

  return {
    query,
    setQuery,
    results: canSearch ? results : [],
    isSearching: canSearch ? isSearching : false,
    error: canSearch ? error : null,
  };
}
