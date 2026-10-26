import assert from "node:assert/strict";
import { test } from "node:test";
import { RefreshCoordinator } from "./refreshCoordinator.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function turn(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

test("stale loads never replace the latest requested state", async () => {
  const first = deferred<string>();
  const second = deferred<string>();
  const queue = [first, second];
  const applied: string[] = [];
  const coordinator = new RefreshCoordinator(
    () => queue.shift()!.promise,
    (value) => {
      applied.push(value);
    },
    () => assert.fail("unexpected failure"),
  );
  coordinator.request();
  coordinator.request();
  first.resolve("stale");
  await turn();
  second.resolve("latest");
  await turn();
  assert.deepEqual(applied, ["latest"]);
});

test("only the latest failed refresh is reported", async () => {
  const load = deferred<string>();
  const failures: string[] = [];
  const coordinator = new RefreshCoordinator(
    () => load.promise,
    () => assert.fail("unexpected apply"),
    (error) => {
      failures.push(String(error));
    },
  );
  coordinator.request();
  load.reject(new Error("boom"));
  await turn();
  assert.deepEqual(failures, ["Error: boom"]);
});

test("dispose suppresses completion", async () => {
  const load = deferred<string>();
  const applied: string[] = [];
  const coordinator = new RefreshCoordinator(
    () => load.promise,
    (value) => {
      applied.push(value);
    },
    () => assert.fail("unexpected failure"),
  );
  coordinator.request();
  coordinator.dispose();
  load.resolve("late");
  await turn();
  assert.deepEqual(applied, []);
});
