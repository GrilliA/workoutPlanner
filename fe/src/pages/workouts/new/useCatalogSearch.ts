import { useEffect, useState } from "react";
import {
  ApiError,
  isAbortError,
  searchCatalogExercises,
  useQuery,
  type CatalogExercise,
} from "@api";

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
  const [debounced, setDebounced] = useState("");

  const trimmed = query.trim();
  const canSearch = trimmed.length >= minChars;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(trimmed);
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  const searchKey = canSearch ? debounced : "";

  const { data, isPending } = useQuery({
    queryKey: [searchKey],
    queryFn: async ({ signal }) => {
      if (searchKey.length < minChars) {
        return {
          items: [] as CatalogExercise[],
          error: null as string | null,
          query: searchKey,
        };
      }

      try {
        const response = await searchCatalogExercises(
          { q: searchKey, limit: 8 },
          { signal },
        );
        return { items: response.items, error: null, query: searchKey };
      } catch (err) {
        if (isAbortError(err)) {
          throw err;
        }

        return {
          items: [] as CatalogExercise[],
          error: ApiError.messageFrom(err, "Ricerca catalogo non disponibile"),
          query: searchKey,
        };
      }
    },
    fallback: "Ricerca catalogo non disponibile",
    keepPreviousData: true,
    throwOnError: false,
  });

  return {
    query,
    setQuery,
    results: canSearch ? (data?.items ?? []) : [],
    isSearching:
      canSearch && trimmed === searchKey && (isPending || data?.query !== searchKey),
    error:
      canSearch && data?.query === searchKey ? (data.error ?? null) : null,
  };
}
