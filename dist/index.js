(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@most/disposable'), require('@most/prelude'), require('@most/scheduler')) :
  typeof define === 'function' && define.amd ? define(['exports', '@most/disposable', '@most/prelude', '@most/scheduler'], factory) :
  (factory((global['most-exhaust-map'] = {}),global.disposable,global.prelude,global.scheduler));
}(this, (function (exports,disposable,prelude,scheduler) { 'use strict';

  /** @license MIT License (c) copyright 2018 original author or authors */
  // Curry the internal `_exhaustMap` and export it as an overloaded interface.
  var exhaustMap = prelude.curry2(_exhaustMap);
  // Define an internal and uncurried interface for `exhaustMap`.
  function _exhaustMap(fn, stream) {
      return new ExhaustMap(fn, stream);
  }
  // `ExhaustMap` is a higher-order stream which receives a map function and a source stream.
  // It skips applying the map function when it has an active inner stream.
  var ExhaustMap = /** @class */ (function () {
      function ExhaustMap(fn, source) {
          this.fn = fn;
          this.source = source;
      }
      ExhaustMap.prototype.run = function (sink, scheduler$$1) {
          var exhaustMapSink = new ExhaustMapSink(this.fn, sink, scheduler$$1);
          return disposable.disposeBoth(exhaustMapSink, this.source.run(exhaustMapSink, scheduler$$1));
      };
      return ExhaustMap;
  }());
  // `ExhaustMapSink` receives a map function which returns a stream.
  // It applies the map function to a value from its source stream to get an inner stream.
  // It proxies the events from the inner stream to its upper sink.
  // It manages the lifecycle of its inner stream to skip mapping when it has an active stream.
  var ExhaustMapSink = /** @class */ (function () {
      function ExhaustMapSink(fn, sink, scheduler$$1) {
          this.fn = fn;
          this.sink = sink;
          this.scheduler = scheduler$$1;
          // Whether the stream itself is ended
          this.ended = false;
      }
      // Map the value from its source and run the stream as an inner stream when it does not have an active stream.
      ExhaustMapSink.prototype.event = function (t, value) {
          if (this.current === undefined) {
              var segment = new Segment(t, this, this.sink);
              // Keep this disposable as its current running one.
              this.current = this.fn(value).run(segment, scheduler.schedulerRelativeTo(t, this.scheduler));
          }
      };
      // Mark it as `ended` then check if it has to propagate its upper sink as `ended`.
      ExhaustMapSink.prototype.end = function (t) {
          this.ended = true;
          this._checkEnd(t);
      };
      // Mark it as `ended` then propagate the error to its upper sink.
      ExhaustMapSink.prototype.error = function (t, error) {
          this.ended = true;
          this.sink.error(t, error);
      };
      // Propagate `dispose` to its current inner stream.
      ExhaustMapSink.prototype.dispose = function () {
          this._disposeCurrent(scheduler.currentTime(this.scheduler));
      };
      // Try to dispose the current inner stream, then unset the current.
      ExhaustMapSink.prototype._disposeCurrent = function (t) {
          if (this.current !== undefined) {
              disposable.tryDispose(t, this.current, this.sink);
              this.current = undefined;
          }
      };
      // Dispose the ended inner stream then check if the outer stream should `end` too.
      ExhaustMapSink.prototype._endInner = function (t) {
          this._disposeCurrent(t);
          this._checkEnd(t);
      };
      // Dispose the dead inner stream then propagate the error to its upper sink.
      ExhaustMapSink.prototype._errorInner = function (t, error) {
          this._disposeCurrent(t);
          this.sink.error(t, error);
      };
      // When it is marked as `ended` and does not have any active inner stream, emit `end` to the upper sink.
      ExhaustMapSink.prototype._checkEnd = function (t) {
          if (this.ended && this.current === undefined) {
              this.sink.end(t);
          }
      };
      return ExhaustMapSink;
  }());
  // `Segment` receives a base time, an outer sink, and a second-level outer sink.
  // It has its local time so that it should add its base time on emitting values to outside.
  var Segment = /** @class */ (function () {
      function Segment(time, outer, sink) {
          this.time = time;
          this.outer = outer;
          this.sink = sink;
      }
      // Propagate the value to its second-level outer sink.
      Segment.prototype.event = function (t, value) {
          this.sink.event(t + this.time, value);
      };
      // Notify its outer sink of its `end`.
      Segment.prototype.end = function (t) {
          this.outer._endInner(t + this.time);
      };
      // Notify its outer sink of its `error`.
      Segment.prototype.error = function (t, error) {
          this.outer._errorInner(t + this.time, error);
      };
      return Segment;
  }());

  exports.exhaustMap = exhaustMap;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
