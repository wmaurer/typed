import type { Cause } from '@effect/io/Cause'
import * as Deferred from '@effect/io/Deferred'
import * as Effect from '@effect/io/Effect'
import * as Exit from '@effect/io/Exit'
import * as Fiber from '@effect/io/Fiber'
import type { Scope } from '@effect/io/Scope'
import { pipe } from '@fp-ts/core/Function'

import { Fx } from '../Fx.js'

export interface Emitter<E, A> {
  readonly emit: (a: A) => Fiber.RuntimeFiber<never, unknown>
  readonly failCause: (e: Cause<E>) => Fiber.RuntimeFiber<never, unknown>
  readonly end: () => Fiber.RuntimeFiber<never, unknown>
}

export function fromEmitter<E, A, R, E2>(
  f: (emitter: Emitter<E, A>) => Effect.Effect<R | Scope, E2, void>,
): Fx<Exclude<R, Scope>, E | E2, A> {
  return new FromEmitterFx(f)
}

class FromEmitterFx<R, E, E2, A>
  extends Fx.Variance<Exclude<R, Scope>, E | E2, A>
  implements Fx<Exclude<R, Scope>, E | E2, A>
{
  constructor(readonly f: (emitter: Emitter<E, A>) => Effect.Effect<R | Scope, E2, void>) {
    super()
  }

  run<R2>(sink: Fx.Sink<R2, E | E2, A>) {
    const { f } = this

    return Effect.gen(function* ($) {
      const runtime = yield* $(Effect.runtime<R | R2 | Scope>())
      const deferred = yield* $(Deferred.make<never, Exit.Exit<E | E2, void>>())
      const done = (exit: Exit.Exit<E | E2, void>) => Deferred.done(Exit.succeed(exit))(deferred)
      const emitter: Emitter<E, A> = {
        emit: (a) => runtime.unsafeFork(sink.event(a)),
        failCause: (e) => runtime.unsafeFork(done(Exit.failCause(e))),
        end: () => runtime.unsafeFork(done(Exit.succeed(undefined))),
      }

      const fiber = yield* $(
        pipe(f(emitter), Effect.matchCauseEffect(sink.error, Effect.unit), Effect.forkScoped),
      )

      const exit = yield* $(Deferred.await(deferred))

      yield* $(Fiber.interrupt(fiber))

      return yield* $(
        pipe(
          exit,
          Exit.matchEffect(sink.error, () => sink.end),
        ),
      )
    }) as any
  }
}
