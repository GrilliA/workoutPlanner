import { useEffect, useRef, useState } from "react";
import { ApiError, isAbortError } from "./client";

type MutationFnContext = {
  signal: AbortSignal;
};

type MutationOptions<TVars, TData> = {
  mutationFn: (variables: TVars, context: MutationFnContext) => Promise<TData>;
  fallback: string;
  onSuccess?: (data: TData, variables: TVars) => void;
  onError?: (error: ApiError, variables: TVars) => void;
};

type MutationState<TVars> = {
  status: "idle" | "pending";
  variables: TVars | undefined;
};

export function useMutation<TVars = void, TData = unknown>({
  mutationFn,
  fallback,
  onSuccess,
  onError,
}: MutationOptions<TVars, TData>) {
  const [state, setState] = useState<MutationState<TVars>>({
    status: "idle",
    variables: undefined,
  });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  const mutateAsync = async (variables: TVars): Promise<TData> => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "pending", variables });

    try {
      const data = await mutationFn(variables, { signal: controller.signal });

      if (controller.signal.aborted) {
        return data;
      }

      setState({ status: "idle", variables });
      onSuccess?.(data, variables);
      return data;
    } catch (err: unknown) {
      if (controller.signal.aborted || isAbortError(err)) {
        throw err;
      }

      const error = ApiError.from(err, fallback);
      setState({ status: "idle", variables });
      onError?.(error, variables);
      throw error;
    }
  };

  const mutate = (variables: TVars) => {
    void mutateAsync(variables).catch(() => undefined);
  };

  return {
    mutate,
    mutateAsync,
    isPending: state.status === "pending",
    variables: state.variables,
  };
}
