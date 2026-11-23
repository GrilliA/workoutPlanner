export type SerialQueue = {
  add: (task: () => Promise<unknown>) => void;
};

/**
 * Runs tasks one after the other, in the order they were added. For writes that depend on
 * the order (a move uses the positions the previous move left): sent at the same time they
 * could reach the server out of order. A failed task does not stop the next one, and
 * `onIdle` runs once after the last waiting task, not after every one.
 */
export function createSerialQueue(onIdle: () => void): SerialQueue {
  const queue = { tail: Promise.resolve(), waitingCount: 0 };

  const finishTask = () => {
    queue.waitingCount -= 1;

    if (queue.waitingCount === 0) {
      onIdle();
    }
  };

  const add = (task: () => Promise<unknown>) => {
    queue.waitingCount += 1;
    queue.tail = queue.tail
      .then(task)
      .catch(() => undefined)
      .then(finishTask);
  };

  return { add };
}
