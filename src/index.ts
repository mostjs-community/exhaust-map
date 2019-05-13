/** @license MIT License (c) copyright 2018 original author or authors */
/** @author YOU */

import { Disposable, Scheduler, Sink, Stream, Time } from '@most/types'
import { disposeBoth, tryDispose } from '@most/disposable'
import { curry2 } from '@most/prelude'
import { schedulerRelativeTo, currentTime } from '@most/scheduler'

// Curry the internal `_exhaustMap` and export it as an overloaded interface.
export const exhaustMap: CurriedExhaustMap = curry2(_exhaustMap)

interface CurriedExhaustMap {
  <A, B>(fn: (value: A) => Stream<B>, stream: Stream<A>): Stream<B>
  <A, B>(fn: (value: A) => Stream<B>): (stream: Stream<A>) => Stream<B>
}

// Define an internal and uncurried interface for `exhaustMap`.
function _exhaustMap<A, B> (
  fn: (value: A) => Stream<B>,
  stream: Stream<A>
): Stream<B> {
  return new ExhaustMap(fn, stream)
}

// `ExhaustMap` is a higher-order stream which receives a map function and a source stream.
// It skips applying the map function when it has an active inner stream.
class ExhaustMap<A, B> implements Stream<B> {
  constructor (private fn: (value: A) => Stream<B>, private source: Stream<A>) {}

  run (sink: Sink<B>, scheduler: Scheduler): Disposable {
    const exhaustMapSink = new ExhaustMapSink(this.fn, sink, scheduler)
    return disposeBoth(
      exhaustMapSink,
      this.source.run(exhaustMapSink, scheduler)
    )
  }
}

// `ExhaustMapSink` receives a map function which returns a stream.
// It applies the map function to a value from its source stream to get an inner stream.
// It proxies the events from the inner stream to its upper sink.
// It manages the lifecycle of its inner stream to skip mapping when it has an active stream.
class ExhaustMapSink<A, B> implements Sink<A>, Disposable {
  // An ongoing inner stream's disposable
  current?: Disposable

  // Whether the stream itself is ended
  ended: boolean = false

  constructor (
    private fn: (value: A) => Stream<B>,
    private sink: Sink<B>,
    private scheduler: Scheduler
  ) {}

  // Map the value from its source and run the stream as an inner stream when it does not have an active stream.
  event (t: Time, value: A) {
    if (this.current === undefined) {
      const segment = new Segment(t, this, this.sink)
      // Keep this disposable as its current running one.
      this.current = this.fn(value).run(
        segment,
        schedulerRelativeTo(t, this.scheduler)
      )
    }
  }

  // Mark it as `ended` then check if it has to propagate its upper sink as `ended`.
  end (t: Time) {
    this.ended = true
    this._checkEnd(t)
  }

  // Mark it as `ended` then propagate the error to its upper sink.
  error (t: Time, error: Error) {
    this.ended = true
    this.sink.error(t, error)
  }

  // Propagate `dispose` to its current inner stream.
  dispose () {
    this._disposeCurrent(currentTime(this.scheduler))
  }

  // Try to dispose the current inner stream, then unset the current.
  _disposeCurrent (t: Time) {
    if (this.current !== undefined) {
      tryDispose(t, this.current, this.sink)
      this.current = undefined
    }
  }

  // Dispose the ended inner stream then check if the outer stream should `end` too.
  _endInner (t: Time) {
    this._disposeCurrent(t)
    this._checkEnd(t)
  }

  // Dispose the dead inner stream then propagate the error to its upper sink.
  _errorInner (t: Time, error: Error) {
    this._disposeCurrent(t)
    this.sink.error(t, error)
  }

  // When it is marked as `ended` and does not have any active inner stream, emit `end` to the upper sink.
  _checkEnd (t: Time) {
    if (this.ended && this.current === undefined) {
      this.sink.end(t)
    }
  }
}

// `Segment` receives a base time, an outer sink, and a second-level outer sink.
// It has its local time so that it should add its base time on emitting values to outside.
class Segment<A, B> implements Sink<B> {
  constructor (
    private time: Time,
    private outer: ExhaustMapSink<A, B>,
    private sink: Sink<B>
  ) {}

  // Propagate the value to its second-level outer sink.
  event (t: Time, value: B) {
    this.sink.event(t + this.time, value)
  }

  // Notify its outer sink of its `end`.
  end (t: Time) {
    this.outer._endInner(t + this.time)
  }

  // Notify its outer sink of its `error`.
  error (t: Time, error: Error) {
    this.outer._errorInner(t + this.time, error)
  }
}
