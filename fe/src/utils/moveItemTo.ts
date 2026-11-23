/** A copy of `items` with the one at `fromIndex` moved to `toIndex`; out of range → unchanged. */
export function moveItemTo<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const isOutOfRange =
    fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length;

  if (isOutOfRange || fromIndex === toIndex) {
    return items;
  }

  const moved = items[fromIndex];
  const others = items.filter((_, index) => index !== fromIndex);

  return [...others.slice(0, toIndex), moved, ...others.slice(toIndex)];
}
