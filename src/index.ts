/** @license MIT License (c) copyright 2018 original author or authors */
/** @author YOU */

import { Disposable, Scheduler, Sink, Stream, Time } from "@most/types";
import { disposeBoth } from "@most/disposable";
import { curry2 } from "@most/prelude";


export const exhaustMap: CurriedExhaustMap = curry2(_exhaustMap);

interface CurriedExhaustMap {
  <A, B>(fn: (value: A) => Stream<B>, stream: Stream<A>): Stream<B>;
  <A, B>(fn: (value: A) => Stream<B>): (stream: Stream<A>) => Stream<B>;
}

function _exhaustMap<A, B>(
  fn: (value: A) => Stream<B>,
  stream: Stream<A>
): Stream<B> {
  return new ExhaustMap(fn, stream);
}

class ExhaustMap<A, B> implements Stream<B> {
  constructor(private fn: (value: A) => Stream<B>, private source: Stream<A>) {}

  run(sink: Sink<B>, scheduler: Scheduler): Disposable {
    const exhaustMapSink = new ExhaustMapSink(this.fn, sink, scheduler);
    return disposeBoth(
      exhaustMapSink,
      this.source.run(exhaustMapSink, scheduler)
    );
  }
}

class ExhaustMapSink<A, B> implements Sink<A> {
  constructor(
    private fn: (value: A) => Stream<B>,
    private sink: Sink<B>,
    private scheduler: Scheduler
  ) {}

  // TODO: implement
  event(time: Time, value: A) {}

  // TODO: implement
  end(time: Time) {}

  // TODO: implement
  error(time: Time, error: Error) {}

  // TODO: implement
  dispose() {}
}
