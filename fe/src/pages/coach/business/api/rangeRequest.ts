import type { BusinessRange } from "@api";

/** One read of the page: the id tells two reads of the same range apart. */
export type RangeRequest = { range: BusinessRange; id: number };

export type RangeFilterState = {
  /** The range the filter shows as selected. */
  selectedRange: BusinessRange;
  /** A read for another range is on its way; the numbers on screen are the old ones. */
  isRefreshing: boolean;
};

/**
 * While a read is on its way the filter shows the range asked for. When it fails, the filter
 * goes back to the range of the numbers on screen, so the two never disagree.
 */
export const rangeFilterState = (input: {
  requested: RangeRequest;
  loaded: RangeRequest | undefined;
  failedRequestId: number | null;
}): RangeFilterState => {
  if (input.loaded === undefined) {
    return { selectedRange: input.requested.range, isRefreshing: false };
  }

  const isAnswered = input.loaded.id === input.requested.id;
  const hasFailed = input.failedRequestId === input.requested.id;
  const isRefreshing = !isAnswered && !hasFailed;

  return { selectedRange: isRefreshing ? input.requested.range : input.loaded.range, isRefreshing };
};
