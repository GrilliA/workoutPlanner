import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSerialQueue } from "./createSerialQueue.ts";

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const untilIdle = () => {
  const idle = { resolve: () => {} };
  const done = new Promise<void>((resolve) => {
    idle.resolve = resolve;
  });

  return { done, onIdle: () => idle.resolve() };
};

describe("createSerialQueue", () => {
  it("starts a task only when the one before it has finished, even if it is slower", async () => {
    const events: string[] = [];
    const { done, onIdle } = untilIdle();
    const queue = createSerialQueue(onIdle);

    queue.add(async () => {
      events.push("first starts");
      await pause(20);
      events.push("first ends");
    });
    queue.add(async () => {
      events.push("second starts");
      await pause(1);
      events.push("second ends");
    });
    await done;

    assert.deepEqual(events, ["first starts", "first ends", "second starts", "second ends"]);
  });

  it("goes on after a failed task", async () => {
    const events: string[] = [];
    const { done, onIdle } = untilIdle();
    const queue = createSerialQueue(onIdle);

    queue.add(() => Promise.reject(new Error("refused")));
    queue.add(async () => {
      events.push("second ran");
    });
    await done;

    assert.deepEqual(events, ["second ran"]);
  });

  it("is idle once for the whole run, and again for the next one", async () => {
    const idleCount = { value: 0 };
    const queue = createSerialQueue(() => {
      idleCount.value += 1;
    });

    queue.add(() => pause(1));
    queue.add(() => pause(1));
    await pause(30);
    assert.equal(idleCount.value, 1);

    queue.add(() => pause(1));
    await pause(30);
    assert.equal(idleCount.value, 2);
  });
});
