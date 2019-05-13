(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global['most-exhaust-map'] = {})));
}(this, (function (exports) { 'use strict';

  /** @license MIT License (c) copyright 2010-2016 original author or authors */

  // append :: a -> [a] -> [a]
  // a with x appended
  function append(x, a) {
    var l = a.length;
    var b = new Array(l + 1);
    for (var i = 0; i < l; ++i) {
      b[i] = a[i];
    }

    b[l] = x;
    return b;
  }

  // reduce :: (a -> b -> a) -> a -> [b] -> a
  // accumulate via left-fold
  function reduce(f, z, a) {
    var r = z;
    for (var i = 0, l = a.length; i < l; ++i) {
      r = f(r, a[i], i);
    }
    return r;
  }

  // curry2 :: ((a, b) -> c) -> (a -> b -> c)
  function curry2(f) {
    function curried(a, b) {
      switch (arguments.length) {
        case 0:
          return curried;
        case 1:
          return function (b) {
            return f(a, b);
          };
        default:
          return f(a, b);
      }
    }
    return curried;
  }

  // curry3 :: ((a, b, c) -> d) -> (a -> b -> c -> d)
  function curry3(f) {
    function curried(a, b, c) {
      // eslint-disable-line complexity
      switch (arguments.length) {
        case 0:
          return curried;
        case 1:
          return curry2(function (b, c) {
            return f(a, b, c);
          });
        case 2:
          return function (c) {
            return f(a, b, c);
          };
        default:
          return f(a, b, c);
      }
    }
    return curried;
  }

  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  /** @license MIT License (c) copyright 2010-2017 original author or authors */

  var disposeNone = function disposeNone() {
    return NONE;
  };
  var NONE = /*#__PURE__*/new (function () {
    function DisposeNone() {
      classCallCheck(this, DisposeNone);
    }

    DisposeNone.prototype.dispose = function dispose() {};

    return DisposeNone;
  }())();

  var isDisposeNone = function isDisposeNone(d) {
    return d === NONE;
  };

  /** @license MIT License (c) copyright 2010 original author or authors */
  // Aggregate a list of disposables into a DisposeAll
  var disposeAll = function disposeAll(ds) {
    var merged = reduce(merge, [], ds);
    return merged.length === 0 ? disposeNone() : new DisposeAll(merged);
  };

  // Convenience to aggregate 2 disposables
  var disposeBoth = /*#__PURE__*/curry2(function (d1, d2) {
    return disposeAll([d1, d2]);
  });

  var merge = function merge(ds, d) {
    return isDisposeNone(d) ? ds : d instanceof DisposeAll ? ds.concat(d.disposables) : append(d, ds);
  };

  var DisposeAll = /*#__PURE__*/function () {
    function DisposeAll(disposables) {
      classCallCheck(this, DisposeAll);

      this.disposables = disposables;
    }

    DisposeAll.prototype.dispose = function dispose() {
      throwIfErrors(disposeCollectErrors(this.disposables));
    };

    return DisposeAll;
  }();

  // Dispose all, safely collecting errors into an array


  var disposeCollectErrors = function disposeCollectErrors(disposables) {
    return reduce(appendIfError, [], disposables);
  };

  // Call dispose and if throws, append thrown error to errors
  var appendIfError = function appendIfError(errors, d) {
    try {
      d.dispose();
    } catch (e) {
      errors.push(e);
    }
    return errors;
  };

  // Throw DisposeAllError if errors is non-empty
  var throwIfErrors = function throwIfErrors(errors) {
    if (errors.length > 0) {
      throw new DisposeAllError(errors.length + ' errors', errors);
    }
  };

  var DisposeAllError = /*#__PURE__*/function (Error) {
    function DisposeAllError(message, errors) {
      Error.call(this, message);
      this.message = message;
      this.name = DisposeAllError.name;
      this.errors = errors;

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, DisposeAllError);
      }

      this.stack = '' + this.stack + formatErrorStacks(this.errors);
    }

    DisposeAllError.prototype = /*#__PURE__*/Object.create(Error.prototype);

    return DisposeAllError;
  }(Error);

  var formatErrorStacks = function formatErrorStacks(errors) {
    return reduce(formatErrorStack, '', errors);
  };

  var formatErrorStack = function formatErrorStack(s, e, i) {
    return s + ('\n[' + (i + 1) + '] ' + e.stack);
  };

  /** @license MIT License (c) copyright 2010-2017 original author or authors */
  // Try to dispose the disposable.  If it throws, send
  // the error to sink.error with the provided Time value
  var tryDispose = /*#__PURE__*/curry3(function (t, disposable, sink) {
    try {
      disposable.dispose();
    } catch (e) {
      sink.error(t, e);
    }
  });

  var classCallCheck$1 = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var RelativeScheduler = /*#__PURE__*/function () {
    function RelativeScheduler(origin, scheduler) {
      classCallCheck$1(this, RelativeScheduler);

      this.origin = origin;
      this.scheduler = scheduler;
    }

    RelativeScheduler.prototype.currentTime = function currentTime() {
      return this.scheduler.currentTime() - this.origin;
    };

    RelativeScheduler.prototype.scheduleTask = function scheduleTask(localOffset, delay, period, task) {
      return this.scheduler.scheduleTask(localOffset + this.origin, delay, period, task);
    };

    RelativeScheduler.prototype.relative = function relative(origin) {
      return new RelativeScheduler(origin + this.origin, this.scheduler);
    };

    RelativeScheduler.prototype.cancel = function cancel(task) {
      return this.scheduler.cancel(task);
    };

    RelativeScheduler.prototype.cancelAll = function cancelAll(f) {
      return this.scheduler.cancelAll(f);
    };

    return RelativeScheduler;
  }();

  // Read the current time from the provided Scheduler
  var currentTime = function currentTime(scheduler) {
    return scheduler.currentTime();
  };

  var schedulerRelativeTo = /*#__PURE__*/curry2(function (offset, scheduler) {
    return new RelativeScheduler(offset, scheduler);
  });

  /** @license MIT License (c) copyright 2018 original author or authors */
  // Curry the internal `_exhaustMap` and export it as an overloaded interface.
  var exhaustMap = curry2(_exhaustMap);
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
      ExhaustMap.prototype.run = function (sink, scheduler) {
          var exhaustMapSink = new ExhaustMapSink(this.fn, sink, scheduler);
          return disposeBoth(exhaustMapSink, this.source.run(exhaustMapSink, scheduler));
      };
      return ExhaustMap;
  }());
  // `ExhaustMapSink` receives a map function which returns a stream.
  // It applies the map function to a value from its source stream to get an inner stream.
  // It proxies the events from the inner stream to its upper sink.
  // It manages the lifecycle of its inner stream to skip mapping when it has an active stream.
  var ExhaustMapSink = /** @class */ (function () {
      function ExhaustMapSink(fn, sink, scheduler) {
          this.fn = fn;
          this.sink = sink;
          this.scheduler = scheduler;
          // Whether the stream itself is ended
          this.ended = false;
      }
      // Map the value from its source and run the stream as an inner stream when it does not have an active stream.
      ExhaustMapSink.prototype.event = function (t, value) {
          if (this.current === undefined) {
              var segment = new Segment(t, this, this.sink);
              // Keep this disposable as its current running one.
              this.current = this.fn(value).run(segment, schedulerRelativeTo(t, this.scheduler));
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
          this._disposeCurrent(currentTime(this.scheduler));
      };
      // Try to dispose the current inner stream, then unset the current.
      ExhaustMapSink.prototype._disposeCurrent = function (t) {
          if (this.current !== undefined) {
              tryDispose(t, this.current, this.sink);
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
