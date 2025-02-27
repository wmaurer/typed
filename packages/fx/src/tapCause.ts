import { pipe } from '@effect/data/Function'
import * as Cause from '@effect/io/Cause'
import * as Effect from '@effect/io/Effect'

import { Fx, Sink } from './Fx.js'

export function tapCause<R, E, A, R2, E2, B>(
  fx: Fx<R, E, A>,
  f: (cause: Cause.Cause<E>) => Effect.Effect<R, E2, B>,
): Fx<R | R2, E | E2, A> {
  return Fx((sink) =>
    fx.run(
      Sink(sink.event, (cause) =>
        Effect.matchCauseEffect(f(cause), {
          onFailure: (cause2) => sink.error(Cause.sequential(cause, cause2)),
          onSuccess: () => sink.error(cause),
        }),
      ),
    ),
  )
}

export function tapCauseSync<R, E, A, B>(
  fx: Fx<R, E, A>,
  f: (cause: Cause.Cause<E>) => B,
): Fx<R, E, A> {
  return tapCause(fx, (cause) => Effect.sync(() => f(cause)))
}

export function tapError<R, E, A, R2, E2, B>(
  fx: Fx<R, E, A>,
  f: (error: E) => Effect.Effect<R, E2, B>,
): Fx<R | R2, E | E2, A> {
  return tapCause(fx, (cause) =>
    pipe(
      Cause.failureOrCause(cause),
      Effect.matchEffect({ onFailure: f, onSuccess: Effect.failCause }),
    ),
  )
}

export function tapErrorSync<R, E, A, B>(fx: Fx<R, E, A>, f: (error: E) => B): Fx<R, E, A> {
  return tapError(fx, (e) => Effect.sync(() => f(e)))
}
