import { describe, it } from "mocha";
import * as assert from "power-assert";

import { newDefaultScheduler } from "@most/scheduler";
import {
  at,
  mergeArray,
  runEffects,
  tap,
  throwError,
  recoverWith,
  empty,
  now
} from "@most/core";

import { exhaustMap } from ".";

describe("@most/exhaustMap", () => {
  it("should skip mapping when it has an active inner stream", () => {
    // A fast source stream.
    const source = mergeArray([
      at(10, 1),
      at(20, 2),
      at(30, 3),
      at(40, 4),
      at(50, 5),
      at(60, 6),
      at(70, 7),
      at(80, 8),
      at(90, 9)
    ]);

    // Collect mapper called count in this variable.
    let called = 0;

    // A map function which returns a slow stream.
    const mapper = (v: number) => {
      called++;
      return mergeArray([
        at(16, `source: ${v}, mapper: 1`),
        at(32, `source: ${v}, mapper: 2`)
      ]);
    };

    // Create a stream with exhaustMap.
    const stream = exhaustMap(mapper, source);

    // Collect events in this array.
    const result: Array<string> = [];

    // Run effects and assert the result.
    return runEffects(
      tap(result.push.bind(result), stream),
      newDefaultScheduler()
    ).then(_ => {
      assert(called === 3);
      assert.deepEqual(result, [
        "source: 1, mapper: 1",
        "source: 1, mapper: 2",
        "source: 5, mapper: 1",
        "source: 5, mapper: 2",
        "source: 9, mapper: 1",
        "source: 9, mapper: 2"
      ]);
    });
  });

  it("should propagate the error and abort mapping when it receives an error", () => {
    // A source stream.
    const source = mergeArray([at(10, 1), at(20, 2), at(30, 3)]);

    // Collect mapper called count in this variable.
    let called = 0;

    // A map function which returns an error stream on the third call.
    const mapper = (v: number) => {
      called++;
      return called === 3 ? throwError(new Error()) : now(v);
    };

    // Create a stream with exhaustMap.
    const stream = exhaustMap(mapper, source);

    // Collect events in this array.
    const result: Array<number> = [];

    // Activate this flag on recover.
    let recovered = false;

    // Run effects and assert the result.
    return runEffects(
      tap(
        result.push.bind(result),
        recoverWith(_ => {
          recovered = true;
          return empty();
        }, stream)
      ),
      newDefaultScheduler()
    ).then(_ => {
      assert(recovered);
      assert(called === 3);
      assert.deepEqual(result, [1, 2]);
    });
  });
});
