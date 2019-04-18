/** @license MIT License (c) copyright 2018 original author or authors */
/** @author YOU */

import { Stream } from "@most/types";
import { curry2 } from "@most/prelude";

export const exhaustMap: ExhaustMapFn = curry2(_exhaustMap);

export type ExhaustMapFn = {
  <A, B>(fn: (value: A) => Stream<B>, stream: Stream<A>): Stream<B>;
  <A, B>(fn: (value: A) => Stream<B>): (stream: Stream<A>) => Stream<B>;
};

function _exhaustMap<A, B>(
  fn: (value: A) => Stream<B>,
  stream: Stream<A>
): Stream<B> {
  // @ts-ignore TODO: Implement
  return null;
}
