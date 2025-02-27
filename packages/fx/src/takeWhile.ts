import { not } from '@effect/data/Predicate'
import type { Predicate } from '@effect/data/Predicate'
import * as Effect from '@effect/io/Effect'

import { Fx, Sink } from './Fx.js'

export function takeWhile<R, E, A>(fx: Fx<R, E, A>, predicate: Predicate<A>): Fx<R, E, A> {
  return Fx(<R2>(sink: Sink<R2, E, A>) =>
    Effect.asyncEffect<never, never, void, R | R2, never, void>((cb) => {
      const exit = Effect.sync(() => cb(Effect.unit))

      return Effect.tap(
        fx.run(
          Sink(
            (a) =>
              Effect.suspend(() => {
                if (predicate(a)) {
                  return sink.event(a)
                }

                return exit
              }),
            sink.error,
          ),
        ),
        () => exit,
      )
    }),
  )
}

export function takeUntil<R, E, A>(fx: Fx<R, E, A>, predicate: Predicate<A>): Fx<R, E, A> {
  return takeWhile(fx, not(predicate))
}
