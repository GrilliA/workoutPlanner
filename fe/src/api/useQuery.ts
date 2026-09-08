import { useEffect, useRef, useState } from "react";
import { ApiError, isAbortError } from "./client";

const EMPTY_QUERY_KEY: readonly unknown[] = [];

type QueryFnContext = {
  signal: AbortSignal;
};

type ThrowOnError<T> =
  | boolean
  | ((error: ApiError, data: T | undefined) => boolean);

type QueryOptions<T> = {
  queryFn: (context: QueryFnContext) => Promise<T>;
  queryKey?: readonly unknown[];
  fallback: string;
  throwOnError?: ThrowOnError<T>;
  onError?: (error: ApiError) => void;
  keepPreviousData?: boolean;
};

type QueryState<T> = {
  data: T | undefined;
  error: ApiError | null;
  status: "pending" | "success";
};

type QueryLiveOptions<T> = {
  queryFn: (context: QueryFnContext) => Promise<T>;
  fallback: string;
  throwOnError: ThrowOnError<T>;
  onError?: (error: ApiError) => void;
  keepPreviousData: boolean;
};

const shouldThrow = <T>(
  throwOnError: ThrowOnError<T>,
  error: ApiError,
  data: T | undefined,
): boolean =>
  typeof throwOnError === "function" ? throwOnError(error, data) : throwOnError;

export function useQuery<T>({
  queryFn,
  queryKey = EMPTY_QUERY_KEY,
  fallback,
  throwOnError = true,
  onError,
  keepPreviousData = false,
}: QueryOptions<T>) {
  const [state, setState] = useState<QueryState<T>>({
    data: undefined,
    error: null,
    status: "pending",
  });
  const dataRef = useRef(state.data);
  const optionsRef = useRef<QueryLiveOptions<T>>({
    queryFn,
    fallback,
    throwOnError,
    onError,
    keepPreviousData,
  });

  useEffect(() => {
    dataRef.current = state.data;
    optionsRef.current = {
      queryFn,
      fallback,
      throwOnError,
      onError,
      keepPreviousData,
    };
  }, [state.data, queryFn, fallback, throwOnError, onError, keepPreviousData]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const run = optionsRef.current.queryFn;

    if (!optionsRef.current.keepPreviousData) {
      setState((current) =>
        current.status === "pending" && current.data === undefined
          ? current
          : { data: undefined, error: null, status: "pending" },
      );
    }

    void run({ signal })
      .then((data) => {
        if (signal.aborted) {
          return;
        }

        setState({ data, error: null, status: "success" });
      })
      .catch((err: unknown) => {
        if (signal.aborted || isAbortError(err)) {
          return;
        }

        const options = optionsRef.current;
        const error = ApiError.from(err, options.fallback);
        const data = dataRef.current;

        if (shouldThrow(options.throwOnError, error, data)) {
          setState({
            data: options.keepPreviousData ? data : undefined,
            error,
            status: "success",
          });
          return;
        }

        options.onError?.(error);
        setState((current) => ({
          data: current.data,
          error: null,
          status: "success",
        }));
      });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- queryKey is the dep list (TanStack-style)
  }, queryKey);

  if (state.error) {
    throw state.error;
  }

  const setData = (update: T | ((prev: T | undefined) => T)) => {
    setState((current) => ({
      data:
        typeof update === "function"
          ? (update as (prev: T | undefined) => T)(current.data)
          : update,
      error: null,
      status: "success",
    }));
  };

  return {
    data: state.data,
    isPending: state.status === "pending",
    setData,
  };
}
