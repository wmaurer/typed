import * as Effect from '@effect/io/Effect'
import { Predicate, Refinement } from '@fp-ts/data/Predicate'

import { Fx } from '../Fx.js'

export function filter<A, B extends A>(
  refinement: Refinement<A, B>,
): <R, E>(fx: Fx<R, E, A>) => Fx<R, E, B>

export function filter<A>(predicate: Predicate<A>): <R, E>(fx: Fx<R, E, A>) => Fx<R, E, A>

export function filter<A>(predicate: Predicate<A>) {
  return <R, E>(fx: Fx<R, E, A>): Fx<R, E, A> => {
    return new FilterFx(fx, predicate)
  }
}

class FilterFx<R, E, A> extends Fx.Variance<R, E, A> implements Fx<R, E, A> {
  constructor(readonly fx: Fx<R, E, A>, readonly predicate: Predicate<A>) {
    super()
  }

  run<R2>(sink: Fx.Sink<R2, E, A>) {
    return this.fx.run(new FilterSink(sink, this.predicate))
  }
}

class FilterSink<R, E, A> implements Fx.Sink<R, E, A> {
  constructor(readonly sink: Fx.Sink<R, E, A>, readonly predicate: Predicate<A>) {}

  event = (a: A) => {
    if (this.predicate(a)) {
      return this.sink.event(a)
    }

    return Effect.unit()
  }

  error = this.sink.error
  end = this.sink.end
}
